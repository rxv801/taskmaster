// Shared activity monitoring contracts for Electron main, preload, and renderer.
// The monitor reports what is active and why it was classified that way.

import type { BrowserActivityRule } from './browserActivity/commonBrowserActivityRules.ts'

export type ActivityClassification = 'allowed' | 'blocked' | 'unknown' | 'neutral'
export type ActivityMonitorStatus = 'idle' | 'monitoring' | 'paused' | 'unavailable'

export type ActivityMonitorAppRule = {
  id: string
  name: string
  category: 'productivity' | 'distraction' | 'browser'
  status: 'allowed' | 'blocked'
}

export type ActivityMonitorBrowserOption = {
  id: string
  name: string
}

export type ActivityMonitorStartOptions = {
  selectedBrowserId: string
  blockSelectedBrowser: boolean
  appRules: ActivityMonitorAppRule[]
  browserOptions: ActivityMonitorBrowserOption[]
  browserActivityRules: BrowserActivityRule[]
}

export type ActivityMonitorSnapshot = {
  appName: string
  processName: string
  windowTitle: string
  isBrowser: boolean
  classification: ActivityClassification
  reason: string
  matchedRuleId: string | null
  matchedRuleLabel: string | null
  timestamp: number
}

export type ActivityMonitorState = {
  status: ActivityMonitorStatus
  snapshot: ActivityMonitorSnapshot | null
}
