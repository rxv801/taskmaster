// Polls and classifies the active OS window during a running focus session.
// Electron main owns OS access; renderer only sends session rules and displays snapshots.

import { createRequire } from 'node:module'
import path from 'node:path'
import { COMMON_APPS } from '../shared/appDetection/commonApps.ts'
import type {
  ActivityClassification,
  ActivityMonitorAppRule,
  ActivityMonitorSnapshot,
  ActivityMonitorStartOptions,
  ActivityMonitorState,
} from '../shared/activityMonitoring.ts'
import type { BrowserActivityRule } from '../shared/browserActivity/commonBrowserActivityRules.ts'

type ActiveWindowModule = typeof import('active-win')
type ActivityMonitorListener = (state: ActivityMonitorState) => void

const require = createRequire(import.meta.url)
const activeWindow = require('active-win') as ActiveWindowModule
const POLL_INTERVAL_MS = 1000

let pollTimer: NodeJS.Timeout | null = null
let isPollingActiveWindow = false
let notifyRenderer: ActivityMonitorListener | null = null
let latestState: ActivityMonitorState = {
  status: 'idle',
  snapshot: null,
}
let sessionOptions: ActivityMonitorStartOptions = createEmptyStartOptions()

/* Starts or resumes active-window polling with the latest onboarding settings. */
export function startActivityMonitoring(
  onState: ActivityMonitorListener,
  options: ActivityMonitorStartOptions = createEmptyStartOptions()
) {
  notifyRenderer = onState
  sessionOptions = options
  clearPollTimer()
  setState({ status: 'monitoring', snapshot: latestState.snapshot })

  void pollActiveWindow()
  pollTimer = setInterval(() => {
    void pollActiveWindow()
  }, POLL_INTERVAL_MS)
}

/* Pauses polling while preserving the most recent classification in the panel. */
export function pauseActivityMonitoring() {
  clearPollTimer()
  setState({ status: 'paused', snapshot: latestState.snapshot })
}

/* Stops polling and clears session-specific rules and UI state. */
export function stopActivityMonitoring() {
  clearPollTimer()
  sessionOptions = createEmptyStartOptions()
  setState({ status: 'idle', snapshot: null })
}

/* Reads the foreground window and emits a classified snapshot. */
async function pollActiveWindow() {
  if (isPollingActiveWindow) {
    return
  }

  isPollingActiveWindow = true

  try {
    const focusedWindow = await activeWindow()

    if (!focusedWindow) {
      setState({
        status: 'monitoring',
        snapshot: createFallbackSnapshot('No active window detected'),
      })
      return
    }

    setState({
      status: 'monitoring',
      snapshot: createSnapshotFromActiveWindow({
        appName: focusedWindow.owner.name || 'Unknown app',
        executablePath: focusedWindow.owner.path,
        windowTitle: focusedWindow.title || 'Untitled window',
      }),
    })
  } catch (error) {
    console.error('[Taskmaster] Activity monitor could not read active window:', error)
    setState({
      status: 'unavailable',
      snapshot: createFallbackSnapshot('Active window monitoring is unavailable right now'),
    })
  } finally {
    isPollingActiveWindow = false
  }
}

/* Converts active-win data into the snapshot shape consumed by the renderer. */
function createSnapshotFromActiveWindow({
  appName,
  executablePath,
  windowTitle,
}: {
  appName: string
  executablePath: string | undefined
  windowTitle: string
}): ActivityMonitorSnapshot {
  const processName = getProcessName(executablePath, appName)
  const browserMatch = matchBrowser({
    appName,
    processName,
    executablePath,
  })
  const classification = browserMatch.isBrowser
    ? classifyBrowserWindow(windowTitle, browserMatch.rule)
    : classifyDesktopApp({
        appName,
        processName,
        executablePath,
      })

  return {
    appName,
    processName,
    windowTitle,
    isBrowser: browserMatch.isBrowser,
    classification: classification.status,
    matchedRuleId: classification.ruleId,
    matchedRuleLabel: classification.ruleLabel,
    reason: classification.reason,
    timestamp: Date.now(),
  }
}

/* Classifies regular desktop apps against saved onboarding app rules. */
function classifyDesktopApp({
  appName,
  processName,
  executablePath,
}: {
  appName: string
  processName: string
  executablePath: string | undefined
}) {
  const matchedRule = sessionOptions.appRules.find((rule) => {
    return doesAppRuleMatchWindow({
      rule,
      appName,
      processName,
      executablePath,
    })
  })

  if (!matchedRule) {
    return createClassification('unknown', null, null, 'No saved focus app rule matched this active window.')
  }

  return createClassification(
    matchedRule.status,
    matchedRule.id,
    matchedRule.name,
    matchedRule.status === 'blocked'
      ? `${matchedRule.name} is blocked for this session.`
      : `${matchedRule.name} is allowed for this session.`
  )
}

/* Classifies browser windows using the selected browser setting and title rules. */
function classifyBrowserWindow(
  windowTitle: string,
  browserRule: ActivityMonitorAppRule | null
) {
  if (browserRule && sessionOptions.blockSelectedBrowser) {
    return createClassification(
      'blocked',
      browserRule.id,
      browserRule.name,
      `${browserRule.name} is blocked for this session.`
    )
  }

  const matchedBrowserActivity = matchBrowserActivityRule(windowTitle)

  if (!matchedBrowserActivity) {
    return createClassification(
      browserRule?.status ?? 'neutral',
      browserRule?.id ?? null,
      browserRule?.name ?? null,
      'No browser title rule matched this window.'
    )
  }

  if (matchedBrowserActivity.status === 'ignored') {
    return createClassification(
      'neutral',
      matchedBrowserActivity.id,
      matchedBrowserActivity.label,
      `${matchedBrowserActivity.label} is ignored by your browser rules.`
    )
  }

  return createClassification(
    matchedBrowserActivity.status,
    matchedBrowserActivity.id,
    matchedBrowserActivity.label,
    matchedBrowserActivity.status === 'blocked'
      ? `${matchedBrowserActivity.label} is blocked by your browser rules.`
      : `${matchedBrowserActivity.label} is allowed by your browser rules.`
  )
}

/* Detects whether the active app is one of the configured or known browsers. */
function matchBrowser({
  appName,
  processName,
  executablePath,
}: {
  appName: string
  processName: string
  executablePath: string | undefined
}) {
  const browserRules = getBrowserRules()
  const matchedRule = browserRules.find((rule) => {
    return doesAppRuleMatchWindow({
      rule,
      appName,
      processName,
      executablePath,
    })
  }) ?? null

  return {
    isBrowser: matchedRule !== null,
    rule: matchedRule,
  }
}

/* Merges the selected browser option with known browser definitions for process matching. */
function getBrowserRules(): ActivityMonitorAppRule[] {
  const selectedBrowser = sessionOptions.browserOptions.find((browser) => {
    return browser.id === sessionOptions.selectedBrowserId
  })
  const selectedBrowserRule = selectedBrowser
    ? [{
        id: selectedBrowser.id,
        name: selectedBrowser.name,
        category: 'browser' as const,
        status: sessionOptions.blockSelectedBrowser ? 'blocked' as const : 'allowed' as const,
      }]
    : []

  return [
    ...selectedBrowserRule,
    ...COMMON_APPS
      .filter((app) => app.category === 'browser')
      .map((app) => ({
        id: app.id,
        name: app.displayName,
        category: 'browser' as const,
        status: app.defaultStatus,
      })),
  ]
}

/* Matches browser title text against saved browser activity rules. */
function matchBrowserActivityRule(windowTitle: string): BrowserActivityRule | null {
  const normalizedWindowTitle = normalizeForMatch(windowTitle)

  return sessionOptions.browserActivityRules.find((rule) => {
    return rule.matchText.some((matchText) => {
      return normalizedWindowTitle.includes(normalizeForMatch(matchText))
    })
  }) ?? null
}

/* Uses executable definitions first, then falls back to display-name matching. */
function doesAppRuleMatchWindow({
  rule,
  appName,
  processName,
  executablePath,
}: {
  rule: ActivityMonitorAppRule
  appName: string
  processName: string
  executablePath: string | undefined
}) {
  const normalizedAppName = normalizeForMatch(appName)
  const normalizedProcessName = normalizeForMatch(processName)
  const normalizedExecutablePath = normalizeForMatch(executablePath ?? '')
  const normalizedRuleName = normalizeForMatch(rule.name)
  const commonAppDefinition = COMMON_APPS.find((app) => app.id === rule.id)

  if (commonAppDefinition?.executableNames.some((executableName) => {
    const normalizedExecutableName = normalizeForMatch(executableName)

    return (
      normalizedProcessName === normalizedExecutableName ||
      normalizedExecutablePath.endsWith(normalizedExecutableName)
    )
  })) {
    return true
  }

  return (
    normalizedAppName.includes(normalizedRuleName) ||
    normalizedRuleName.includes(normalizedAppName)
  )
}

/* Stores and sends state through the current renderer listener. */
function setState(nextState: ActivityMonitorState) {
  latestState = nextState
  notifyRenderer?.(latestState)
}

/* Stops the poll interval without mutating the current visible snapshot. */
function clearPollTimer() {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
}

/* Uses the executable file name when available, with app name as fallback. */
function getProcessName(executablePath: string | undefined, fallbackName: string) {
  if (!executablePath) {
    return fallbackName || 'Unknown process'
  }

  return path.basename(executablePath)
}

/* Keeps string comparisons stable across process names, app names, and titles. */
function normalizeForMatch(value: string) {
  return value.trim().toLowerCase()
}

/* Creates a typed classification result for app and browser matchers. */
function createClassification(
  status: ActivityClassification,
  ruleId: string | null,
  ruleLabel: string | null,
  reason: string
) {
  return {
    status,
    ruleId,
    ruleLabel,
    reason,
  }
}

/* Creates snapshots that keep the UI stable when active-win cannot report a window. */
function createFallbackSnapshot(reason: string): ActivityMonitorSnapshot {
  return {
    appName: 'Unknown app',
    processName: 'Unknown process',
    windowTitle: 'No window title',
    isBrowser: false,
    classification: 'unknown',
    matchedRuleId: null,
    matchedRuleLabel: null,
    timestamp: Date.now(),
    reason,
  }
}

/* Provides a safe default when IPC starts before settings are available. */
function createEmptyStartOptions(): ActivityMonitorStartOptions {
  return {
    selectedBrowserId: '',
    blockSelectedBrowser: false,
    appRules: [],
    browserOptions: [],
    browserActivityRules: [],
  }
}
