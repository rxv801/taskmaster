// Polls the active OS window while a focus session is active.
// The renderer classifies these raw snapshots against saved focus rules.

import { createRequire } from 'node:module'
import path from 'node:path'
import type { DesktopActivityPayload } from '../shared/focusMonitoring.ts'

type ActiveWindowModule = typeof import('active-win')
type DesktopActivityListener = (activity: DesktopActivityPayload) => void

const require = createRequire(import.meta.url)
const activeWindow = require('active-win') as ActiveWindowModule
const POLL_INTERVAL_MS = 1000

let pollTimer: NodeJS.Timeout | null = null
let isPolling = false
let latestActivity: DesktopActivityPayload | null = null
let notifyRenderer: DesktopActivityListener | null = null

/* Starts active-window polling and immediately emits the first snapshot. */
export function startDesktopActivityMonitoring(onActivity: DesktopActivityListener) {
  notifyRenderer = onActivity
  clearPollTimer()
  void pollActiveWindow()
  pollTimer = setInterval(() => {
    void pollActiveWindow()
  }, POLL_INTERVAL_MS)
}

/* Pauses polling while leaving the last snapshot available to the renderer. */
export function pauseDesktopActivityMonitoring() {
  clearPollTimer()
}

/* Stops polling and clears the last in-memory desktop snapshot. */
export function stopDesktopActivityMonitoring() {
  clearPollTimer()
  latestActivity = null
}

export function getLatestDesktopActivity() {
  return latestActivity
}

async function pollActiveWindow() {
  if (isPolling) {
    return
  }

  isPolling = true

  try {
    const focusedWindow = await activeWindow()

    if (!focusedWindow) {
      return
    }

    latestActivity = {
      appName: focusedWindow.owner.name || 'Unknown app',
      processName: getProcessName(
        focusedWindow.owner.path,
        focusedWindow.owner.name,
      ),
      windowTitle: focusedWindow.title || 'Untitled window',
      timestamp: Date.now(),
    }
    notifyRenderer?.(latestActivity)
  } catch (error) {
    console.error('[Taskmaster] Could not read active window:', error)
  } finally {
    isPolling = false
  }
}

function clearPollTimer() {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
}

function getProcessName(executablePath: string | undefined, fallbackName: string) {
  if (!executablePath) {
    return fallbackName || 'Unknown process'
  }

  return path.basename(executablePath)
}
