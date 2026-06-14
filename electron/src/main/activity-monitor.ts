// Polls and classifies the active OS window during a running Deep Sesh session.
// This phase reports allowed/blocked/unknown status only. Blocking and warnings come later.

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

type ActiveWindowModule = typeof import('active-win')
type ActivityMonitorListener = (state: ActivityMonitorState) => void

const require = createRequire(import.meta.url)
const activeWindow = require('active-win') as ActiveWindowModule
const POLL_INTERVAL_MS = 1000

let pollTimer: NodeJS.Timeout | null = null
let isPollingActiveWindow = false
let latestState: ActivityMonitorState = {
  status: 'idle',
  snapshot: null,
}
let notifyRenderer: ActivityMonitorListener | null = null
let activeRules: ActivityMonitorAppRule[] = []

/* Starts or resumes polling with the latest saved app rules from the renderer. */
export function startActivityMonitoring(
  onState: ActivityMonitorListener,
  options: ActivityMonitorStartOptions = { appRules: [] }
) {
  notifyRenderer = onState
  activeRules = options.appRules
  clearPollTimer()
  setState({ status: 'monitoring', snapshot: latestState.snapshot })

  void pollActiveWindow()
  pollTimer = setInterval(() => {
    void pollActiveWindow()
  }, POLL_INTERVAL_MS)
}

/* Pauses polling while keeping the last snapshot visible for the active session. */
export function pauseActivityMonitoring() {
  clearPollTimer()
  setState({ status: 'paused', snapshot: latestState.snapshot })
}

/* Stops polling and clears the renderer snapshot when the timer leaves active mode. */
export function stopActivityMonitoring() {
  clearPollTimer()
  setState({ status: 'idle', snapshot: null })
}

/* Reads the current OS foreground window and converts it into a safe UI snapshot. */
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

/* Emits state through the current IPC listener and stores it for pause/resume display. */
function setState(nextState: ActivityMonitorState) {
  latestState = nextState
  notifyRenderer?.(latestState)
}

/* Stops the interval without changing the visible monitoring state. */
function clearPollTimer() {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
}

/* Uses the executable file name when available, with the app name as the safe fallback. */
function getProcessName(executablePath: string | undefined, fallbackName: string) {
  if (!executablePath) {
    return fallbackName || 'Unknown process'
  }

  return path.basename(executablePath)
}

/* Combines raw active-window data with the saved app rule classification. */
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
  const classification = classifyActiveWindow({
    appName,
    processName,
    executablePath,
  })

  return {
    appName,
    processName,
    windowTitle,
    classification: classification.status,
    matchedRuleId: classification.rule?.id ?? null,
    matchedRuleLabel: classification.rule?.name ?? null,
    timestamp: Date.now(),
    reason: classification.reason,
  }
}

/* Matches the foreground app against onboarding rules using known app ids and process names. */
function classifyActiveWindow({
  appName,
  processName,
  executablePath,
}: {
  appName: string
  processName: string
  executablePath: string | undefined
}): {
  status: ActivityClassification
  rule: ActivityMonitorAppRule | null
  reason: string
} {
  const matchedRule = activeRules.find((rule) => {
    return doesRuleMatchActiveWindow({
      rule,
      appName,
      processName,
      executablePath,
    })
  })

  if (!matchedRule) {
    return {
      status: 'unknown',
      rule: null,
      reason: 'No saved focus app rule matched this active window.',
    }
  }

  return {
    status: matchedRule.status,
    rule: matchedRule,
    reason: `Matched saved ${matchedRule.status} rule: ${matchedRule.name}.`,
  }
}

/* Uses exact executable matches first, then falls back to app/rule name matching. */
function doesRuleMatchActiveWindow({
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

/* Normalizes app names and process names so matching is stable across Windows labels. */
function normalizeForMatch(value: string) {
  return value.trim().toLowerCase()
}

/* Creates snapshots that keep the UI stable when active-win returns no usable window. */
function createFallbackSnapshot(reason: string): ActivityMonitorSnapshot {
  return {
    appName: 'Unknown app',
    processName: 'Unknown process',
    windowTitle: 'No window title',
    classification: 'unknown',
    matchedRuleId: null,
    matchedRuleLabel: null,
    timestamp: Date.now(),
    reason,
  }
}
