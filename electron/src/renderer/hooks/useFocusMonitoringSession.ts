// Combines desktop app snapshots and browser tab payloads into one focus monitor session.
// This hook owns classification, warning delay, unknown review, and lightweight stats.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COMMON_APPS } from '../../shared/appDetection/commonApps.ts'
import type { BrowserActivityPayload } from '../../shared/browserActivity'
import type {
  DesktopActivityPayload,
  FocusActivity,
  FocusClassification,
  FocusSessionStats,
  UnknownActivityReviewItem,
} from '../../shared/focusMonitoring'
import {
  useFocusEnvironmentSettings,
  type AppRuleStatus,
  type BrowserActivityRuleStatus,
} from './useFocusEnvironmentSettings'

const WARNING_DELAY_MS = 3000

// The camera can surface two distractions of its own, independent of which app
// or site is focused: a phone in view, or the user looking away from the screen.
// Each gets a stable key so one continuous stretch counts as a single event
// (see the dedupe-by-key in handleBlockedActivity).
const PHONE_DISTRACTION_ACTIVITY: FocusActivity = {
  kind: 'desktop-app',
  key: 'camera:phone',
  label: 'On your phone',
  detail: 'Phone detected by the camera',
  source: 'active-window',
  timestamp: 0,
}

const PHONE_DISTRACTION_CLASSIFICATION: FocusClassification = {
  status: 'blocked',
  reason: 'Phone detected by the camera.',
  matchedRuleLabel: 'Phone (camera)',
}

const GAZE_DISTRACTION_ACTIVITY: FocusActivity = {
  kind: 'desktop-app',
  key: 'camera:gaze',
  label: 'Looking away',
  detail: 'Not looking at the screen',
  source: 'active-window',
  timestamp: 0,
}

const GAZE_DISTRACTION_CLASSIFICATION: FocusClassification = {
  status: 'blocked',
  reason: 'You looked away from the screen.',
  matchedRuleLabel: 'Gaze (camera)',
}

// Keep a camera distraction latched briefly after the last positive frame, so a
// one-frame gap doesn't split a single stretch into several distractions.
const CAMERA_DISTRACTION_GRACE_MS = 2000

type CameraDistraction = 'phone' | 'gaze' | null

type UseFocusMonitoringSessionOptions = {
  isSessionActive: boolean
  browserActivity: BrowserActivityPayload | null
  desktopActivity: DesktopActivityPayload | null
  // True while the camera currently sees a phone (from the CV worker).
  phoneDetected: boolean
  // True while the camera reports the user is not looking at the screen.
  lookingAway: boolean
}

export type FocusMonitorViewState = {
  activity: FocusActivity | null
  classification: FocusClassification
  shouldShowWarning: boolean
  warningDelaySeconds: number
  unknownActivities: UnknownActivityReviewItem[]
  stats: FocusSessionStats
  hasCompletedSessionSummary: boolean
  reviewUnknownActivity: (
    item: UnknownActivityReviewItem,
    status: AppRuleStatus | BrowserActivityRuleStatus
  ) => void
  dismissSessionSummary: (options?: { keepUnknownActivities?: boolean }) => void
}

type DistractionTracker = {
  key: string
  label: string
  startedAt: number
}

const initialStats: FocusSessionStats = {
  distractionEvents: 0,
  distractedSeconds: 0,
  unknownCount: 0,
  allowedFocusSeconds: 0,
  mostCommonDistractionLabel: null,
}

/* Creates the focus monitor view model for DeepSeshPage. */
export function useFocusMonitoringSession({
  isSessionActive,
  browserActivity,
  desktopActivity,
  phoneDetected,
  lookingAway,
}: UseFocusMonitoringSessionOptions): FocusMonitorViewState {
  const {
    settings,
    addAppRule,
    addBrowserActivityRule,
  } = useFocusEnvironmentSettings()
  const [warningStartedAt, setWarningStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [unknownActivities, setUnknownActivities] = useState<
    UnknownActivityReviewItem[]
  >([])
  const [stats, setStats] = useState<FocusSessionStats>(initialStats)
  const [sessionStartedAt, setSessionStartedAt] = useState(0)
  const [hasCompletedSessionSummary, setHasCompletedSessionSummary] =
    useState(false)
  const previousSessionActiveRef = useRef(false)
  const activeDistractionRef = useRef<DistractionTracker | null>(null)
  const distractionCountsRef = useRef<Record<string, number>>({})
  const activityRef = useRef<FocusActivity | null>(null)
  const classificationRef = useRef<FocusClassification>({
    status: 'unknown',
    reason: 'No activity detected yet.',
  })

  const baseActivity = useMemo(() => {
    return getCurrentActivity({
      browserActivity,
      desktopActivity,
      settings,
      sessionStartedAt,
    })
  }, [browserActivity, desktopActivity, sessionStartedAt, settings])

  const baseClassification = useMemo(() => {
    return classifyActivity(baseActivity, settings)
  }, [baseActivity, settings])

  // Latest camera signals, read by the session ticker below. Refs keep the
  // ticker from re-subscribing on every frame; the timestamps drive the grace
  // period that keeps a distraction latched through brief detection gaps.
  const phoneDetectedRef = useRef(false)
  const lastPhoneDetectedAtRef = useRef(0)
  const lookingAwayRef = useRef(false)
  const lastLookingAwayAtRef = useRef(0)
  useEffect(() => {
    phoneDetectedRef.current = phoneDetected
    if (phoneDetected) {
      lastPhoneDetectedAtRef.current = Date.now()
    }
  }, [phoneDetected])
  useEffect(() => {
    lookingAwayRef.current = lookingAway
    if (lookingAway) {
      lastLookingAwayAtRef.current = Date.now()
    }
  }, [lookingAway])

  // Which camera distraction the ticker currently sees (if any). The ticker owns
  // the timing and updates this. A camera distraction takes priority over the
  // focused app/site, and a phone in view takes priority over looking away.
  const [cameraDistraction, setCameraDistraction] =
    useState<CameraDistraction>(null)

  const activity =
    cameraDistraction === 'phone'
      ? PHONE_DISTRACTION_ACTIVITY
      : cameraDistraction === 'gaze'
        ? GAZE_DISTRACTION_ACTIVITY
        : baseActivity
  const classification =
    cameraDistraction === 'phone'
      ? PHONE_DISTRACTION_CLASSIFICATION
      : cameraDistraction === 'gaze'
        ? GAZE_DISTRACTION_CLASSIFICATION
        : baseClassification

  const reviewableUnknownActivities = useMemo(() => {
    return unknownActivities.filter((item) => {
      return classifyActivity(createReviewActivity(item), settings).status === 'unknown'
    })
  }, [settings, unknownActivities])

  const shouldShowWarning =
    classification.status === 'blocked' &&
    warningStartedAt !== null &&
    now - warningStartedAt >= WARNING_DELAY_MS

  const getMostCommonDistractionLabel = useCallback(() => {
    return Object.entries(distractionCountsRef.current).sort(
      ([, leftCount], [, rightCount]) => rightCount - leftCount,
    )[0]?.[0] ?? null
  }, [])

  const closeActiveDistraction = useCallback(
    (endedAt: number) => {
      const activeDistraction = activeDistractionRef.current

      if (!activeDistraction) {
        setWarningStartedAt(null)
        return
      }

      const durationSeconds = Math.max(
        1,
        Math.round((endedAt - activeDistraction.startedAt) / 1000),
      )

      activeDistractionRef.current = null
      setWarningStartedAt(null)
      setStats((currentStats) => ({
        ...currentStats,
        distractedSeconds: currentStats.distractedSeconds + durationSeconds,
        mostCommonDistractionLabel: getMostCommonDistractionLabel(),
      }))
    },
    [getMostCommonDistractionLabel],
  )

  const handleBlockedActivity = useCallback(
    (blockedActivity: FocusActivity, tickNow: number) => {
      setWarningStartedAt((currentStart) => currentStart ?? tickNow)

      if (activeDistractionRef.current?.key === blockedActivity.key) {
        return
      }

      closeActiveDistraction(tickNow)
      activeDistractionRef.current = {
        key: blockedActivity.key,
        label: blockedActivity.label,
        startedAt: tickNow,
      }

      distractionCountsRef.current[blockedActivity.label] =
        (distractionCountsRef.current[blockedActivity.label] ?? 0) + 1

      setStats((currentStats) => ({
        ...currentStats,
        distractionEvents: currentStats.distractionEvents + 1,
        mostCommonDistractionLabel: getMostCommonDistractionLabel(),
      }))
    },
    [closeActiveDistraction, getMostCommonDistractionLabel],
  )

  const rememberUnknownActivity = useCallback((unknownActivity: FocusActivity) => {
    setUnknownActivities((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === unknownActivity.key)

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === unknownActivity.key
            ? {
                ...item,
                totalSeconds: item.totalSeconds + 1,
              }
            : item,
        )
      }

      return [
        ...currentItems,
        {
          id: unknownActivity.key,
          kind: unknownActivity.kind,
          label: unknownActivity.label,
          detail: unknownActivity.detail,
          firstSeenAt: unknownActivity.timestamp,
          totalSeconds: 1,
        },
      ]
    })
  }, [])

  /* Keeps the latest app/site values available to the session ticker. Phone
   * detection is handled separately in the ticker, so these track the base
   * (non-phone) activity to avoid double-counting. */
  useEffect(() => {
    activityRef.current = baseActivity
    classificationRef.current = baseClassification
  }, [baseActivity, baseClassification])

  /* Ticks one monitoring loop for warning delay, unknown tracking, and stats. */
  useEffect(() => {
    if (!isSessionActive) return

    const intervalId = window.setInterval(() => {
      const tickNow = Date.now()
      setNow(tickNow)

      // Camera distractions come ahead of any app/site, and each stays latched
      // for a short grace period after its last positive frame. A phone in view
      // wins over looking away.
      const onPhone =
        phoneDetectedRef.current ||
        tickNow - lastPhoneDetectedAtRef.current < CAMERA_DISTRACTION_GRACE_MS
      const isLookingAway =
        lookingAwayRef.current ||
        tickNow - lastLookingAwayAtRef.current < CAMERA_DISTRACTION_GRACE_MS
      const currentCameraDistraction: CameraDistraction = onPhone
        ? 'phone'
        : isLookingAway
          ? 'gaze'
          : null
      setCameraDistraction(currentCameraDistraction)

      if (currentCameraDistraction === 'phone') {
        handleBlockedActivity(PHONE_DISTRACTION_ACTIVITY, tickNow)
        return
      }
      if (currentCameraDistraction === 'gaze') {
        handleBlockedActivity(GAZE_DISTRACTION_ACTIVITY, tickNow)
        return
      }

      const currentActivity = activityRef.current
      const currentClassification = classificationRef.current

      if (!currentActivity) {
        closeActiveDistraction(tickNow)
        return
      }

      if (currentClassification.status === 'blocked') {
        handleBlockedActivity(currentActivity, tickNow)
        return
      }

      closeActiveDistraction(tickNow)

      if (currentClassification.status === 'unknown') {
        rememberUnknownActivity(currentActivity)
        return
      }

      if (currentClassification.status === 'allowed') {
        setStats((currentStats) => ({
          ...currentStats,
          allowedFocusSeconds: currentStats.allowedFocusSeconds + 1,
        }))
      }
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    closeActiveDistraction,
    handleBlockedActivity,
    isSessionActive,
    rememberUnknownActivity,
  ])

  /* Starts and stops desktop app polling with the focus session lifecycle. */
  useEffect(() => {
    if (isSessionActive) {
      window.taskmaster?.startDesktopMonitoring()
      return () => {
        window.taskmaster?.stopDesktopMonitoring()
      }
    }

    window.taskmaster?.stopDesktopMonitoring()
  }, [isSessionActive])

  /* Opens and closes a completed-session summary when the focus session ends. */
  useEffect(() => {
    const wasActive = previousSessionActiveRef.current
    previousSessionActiveRef.current = isSessionActive

    if (!wasActive && isSessionActive) {
      const resetSessionId = window.setTimeout(() => {
        setSessionStartedAt(Date.now())
        setHasCompletedSessionSummary(false)
        setStats(initialStats)
        setWarningStartedAt(null)
        setCameraDistraction(null)
        activeDistractionRef.current = null
        distractionCountsRef.current = {}
      }, 0)

      return () => {
        window.clearTimeout(resetSessionId)
      }
    }

    if (wasActive && !isSessionActive) {
      const finishSessionId = window.setTimeout(() => {
        closeActiveDistraction(Date.now())
        setHasCompletedSessionSummary(true)
        setWarningStartedAt(null)
      }, 0)

      return () => {
        window.clearTimeout(finishSessionId)
      }
    }
  }, [closeActiveDistraction, isSessionActive])

  function reviewUnknownActivity(
    item: UnknownActivityReviewItem,
    status: AppRuleStatus | BrowserActivityRuleStatus,
  ) {
    if (item.kind === 'desktop-app') {
      addAppRule({
        id: createRuleId('app', item.label),
        name: item.label,
        category: status === 'blocked' ? 'distraction' : 'productivity',
        status: status as AppRuleStatus,
      })
    } else {
      addBrowserActivityRule({
        id: createRuleId('page', item.detail || item.label),
        label: item.label,
        description: `Learned from ${item.detail || item.label}.`,
        matchText: [item.detail || item.label],
        category: 'custom',
        status: status as BrowserActivityRuleStatus,
      })
    }

    setUnknownActivities((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    )
  }

  function dismissSessionSummary(options?: { keepUnknownActivities?: boolean }) {
    setHasCompletedSessionSummary(false)

    if (!options?.keepUnknownActivities) {
      setUnknownActivities([])
    }

    setStats(initialStats)
    distractionCountsRef.current = {}
  }

  return {
    activity,
    classification,
    shouldShowWarning,
    warningDelaySeconds: WARNING_DELAY_MS / 1000,
    unknownActivities: reviewableUnknownActivities,
    stats: {
      ...stats,
      unknownCount: reviewableUnknownActivities.length,
    },
    hasCompletedSessionSummary,
    reviewUnknownActivity,
    dismissSessionSummary,
  }
}

function getCurrentActivity({
  browserActivity,
  desktopActivity,
  settings,
  sessionStartedAt,
}: {
  browserActivity: BrowserActivityPayload | null
  desktopActivity: DesktopActivityPayload | null
  settings: ReturnType<typeof useFocusEnvironmentSettings>['settings']
  sessionStartedAt: number
}): FocusActivity | null {
  if (!desktopActivity) {
    return isBrowserActivityFromCurrentSession(browserActivity, sessionStartedAt)
      ? createBrowserActivity(browserActivity)
      : null
  }

  const desktopFocusActivity = createDesktopActivity(desktopActivity)
  const activeBrowser = findKnownBrowserForActivity(desktopFocusActivity)

  if (activeBrowser) {
    /*
     * Browser tabs are the useful signal while a known browser is active.
     * The desktop poll still reports opera.exe/chrome.exe/msedge.exe, but once the
     * extension has sent a tab for this session we keep showing that page
     * instead of bouncing back to the browser executable between tab events.
     */
    if (
      !(settings.blockSelectedBrowser && activeBrowser.id === settings.selectedBrowserId) &&
      isBrowserActivityFromCurrentSession(browserActivity, sessionStartedAt)
    ) {
      return createBrowserActivity(browserActivity)
    }

    return desktopFocusActivity
  }

  return desktopFocusActivity
}

function createBrowserActivity(
  browserActivity: BrowserActivityPayload,
): FocusActivity {
  return {
    kind: 'browser-page',
    key: `browser:${browserActivity.domain}`,
    label: getBrowserActivityLabel(browserActivity),
    detail: browserActivity.domain,
    source: 'browser-extension',
    timestamp: browserActivity.timestamp,
  }
}

function createDesktopActivity(
  desktopActivity: DesktopActivityPayload,
): FocusActivity {
  return {
    kind: 'desktop-app',
    key: `app:${desktopActivity.processName.toLowerCase()}`,
    label: desktopActivity.appName,
    detail: desktopActivity.processName,
    source: 'active-window',
    timestamp: desktopActivity.timestamp,
  }
}

function isBrowserActivityFromCurrentSession(
  browserActivity: BrowserActivityPayload | null,
  sessionStartedAt: number,
): browserActivity is BrowserActivityPayload {
  return (
    sessionStartedAt > 0 &&
    browserActivity !== null &&
    browserActivity.timestamp >= sessionStartedAt
  )
}

// Taskmaster's own window never counts as activity: focusing the app itself
// (e.g. to check the timer or stats) should not be tracked as a distraction.
// Packaged the app reports as "Taskmaster"; in dev it reports as "Electron".
const OWN_APP_NAMES = ['taskmaster', 'electron']

function isOwnAppActivity(activity: FocusActivity): boolean {
  return (
    activity.kind === 'desktop-app' &&
    OWN_APP_NAMES.includes(activity.label.trim().toLowerCase())
  )
}

function classifyActivity(
  activity: FocusActivity | null,
  settings: ReturnType<typeof useFocusEnvironmentSettings>['settings'],
): FocusClassification {
  if (!activity) {
    return {
      status: 'unknown',
      reason: 'No activity detected yet.',
    }
  }

  if (isOwnAppActivity(activity)) {
    return {
      status: 'ignored',
      reason: 'Taskmaster is ignored during sessions.',
    }
  }

  if (activity.kind === 'browser-page') {
    return classifyBrowserActivity(activity, settings)
  }

  const knownBrowserClassification = classifyKnownBrowserDesktopActivity(
    activity,
    settings,
  )

  if (knownBrowserClassification) {
    return knownBrowserClassification
  }

  return classifyDesktopActivity(activity, settings)
}

function classifyKnownBrowserDesktopActivity(
  activity: FocusActivity,
  settings: ReturnType<typeof useFocusEnvironmentSettings>['settings'],
): FocusClassification | null {
  const matchedBrowser = findKnownBrowserForActivity(activity)

  if (!matchedBrowser) {
    return null
  }

  if (
    settings.blockSelectedBrowser &&
    matchedBrowser.id === settings.selectedBrowserId
  ) {
    return {
      status: 'blocked',
      reason: `${matchedBrowser.displayName} is blocked for this session.`,
      matchedRuleId: settings.selectedBrowserId,
      matchedRuleLabel: matchedBrowser.displayName,
    }
  }

  return {
    status: 'allowed',
    reason: `${matchedBrowser.displayName} is a known browser. Tab rules apply when the extension reports the active page.`,
    matchedRuleId: matchedBrowser.id,
    matchedRuleLabel: matchedBrowser.displayName,
  }
}

function classifyBrowserActivity(
  activity: FocusActivity,
  settings: ReturnType<typeof useFocusEnvironmentSettings>['settings'],
): FocusClassification {
  if (settings.blockSelectedBrowser) {
    return {
      status: 'blocked',
      reason: 'The selected browser is blocked for this session.',
      matchedRuleId: settings.selectedBrowserId,
      matchedRuleLabel: 'Selected browser',
    }
  }

  const normalizedLabel = normalizeForMatch(activity.label)
  const normalizedDetail = normalizeForMatch(activity.detail)
  const matchedRule = settings.browserActivityRules.find((rule) => {
    return rule.matchText.some((matchText) => {
      const normalizedMatchText = normalizeForMatch(matchText)

      return (
        normalizedLabel.includes(normalizedMatchText) ||
        normalizedDetail.includes(normalizedMatchText)
      )
    })
  })

  if (!matchedRule) {
    return {
      status: 'unknown',
      reason: `${activity.label} is not in your browser rules yet.`,
    }
  }

  return {
    status: matchedRule.status,
    reason:
      matchedRule.status === 'blocked'
        ? `${matchedRule.label} is blocked by your browser rules.`
        : `${matchedRule.label} is ${matchedRule.status} by your browser rules.`,
    matchedRuleId: matchedRule.id,
    matchedRuleLabel: matchedRule.label,
  }
}

function classifyDesktopActivity(
  activity: FocusActivity,
  settings: ReturnType<typeof useFocusEnvironmentSettings>['settings'],
): FocusClassification {
  const matchedRule = settings.appRules.find((rule) => {
    return doesAppRuleMatchActivity(rule, activity)
  })

  if (!matchedRule) {
    return {
      status: 'unknown',
      reason: `${activity.label} is not in your app rules yet.`,
    }
  }

  return {
    status: matchedRule.status,
    reason:
      matchedRule.status === 'blocked'
        ? `${matchedRule.name} is blocked for this session.`
        : `${matchedRule.name} is ${matchedRule.status} for this session.`,
    matchedRuleId: matchedRule.id,
    matchedRuleLabel: matchedRule.name,
  }
}

function doesAppRuleMatchActivity(
  rule: ReturnType<typeof useFocusEnvironmentSettings>['settings']['appRules'][number],
  activity: FocusActivity,
) {
  const commonAppDefinition = COMMON_APPS.find((app) => app.id === rule.id)
  const normalizedLabel = normalizeForMatch(activity.label)
  const normalizedDetail = normalizeForMatch(activity.detail)
  const normalizedRuleName = normalizeForMatch(rule.name)

  if (commonAppDefinition?.executableNames.some((executableName) => {
    return normalizeForMatch(executableName) === normalizedDetail
  })) {
    return true
  }

  return (
    normalizedLabel.includes(normalizedRuleName) ||
    normalizedRuleName.includes(normalizedLabel)
  )
}

function createReviewActivity(item: UnknownActivityReviewItem): FocusActivity {
  return {
    kind: item.kind,
    key: item.id,
    label: item.label,
    detail: item.detail,
    source: item.kind === 'browser-page' ? 'browser-extension' : 'active-window',
    timestamp: item.firstSeenAt,
  }
}

function findKnownBrowserForActivity(activity: FocusActivity) {
  if (activity.kind !== 'desktop-app') {
    return null
  }

  const normalizedLabel = normalizeForMatch(activity.label)
  const normalizedDetail = normalizeForMatch(activity.detail)

  return COMMON_APPS.find((app) => {
    if (app.category !== 'browser') {
      return false
    }

    return app.executableNames.some((executableName) => {
      return normalizeForMatch(executableName) === normalizedDetail
    }) || normalizedLabel.includes(normalizeForMatch(app.displayName))
  }) ?? null
}

function getBrowserActivityLabel(activity: BrowserActivityPayload) {
  const titlePrefix = activity.title.split(' - ')[0]?.trim()

  return titlePrefix || activity.domain
}

function normalizeForMatch(value: string) {
  return value.trim().toLowerCase()
}

function createRuleId(prefix: string, value: string) {
  return `${prefix}-${normalizeForMatch(value).replace(/[^a-z0-9]+/g, '-')}`
}
