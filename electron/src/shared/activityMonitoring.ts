// Shared activity monitoring types used by Electron main and the renderer.
// These contracts keep the monitor IPC payloads reviewable as the feature grows.

export type ActivityMonitorStatus = 'idle' | 'monitoring' | 'paused' | 'unavailable'
export type ActivityClassification = 'allowed' | 'blocked' | 'unknown'

export type ActivityMonitorAppRule = {
  id: string
  name: string
  category: 'productivity' | 'distraction' | 'browser'
  status: 'allowed' | 'blocked'
}

export type ActivityMonitorStartOptions = {
  appRules: ActivityMonitorAppRule[]
}

export type ActivityMonitorSnapshot = {
  appName: string
  processName: string
  windowTitle: string
  classification: ActivityClassification
  matchedRuleId: string | null
  matchedRuleLabel: string | null
  timestamp: number
  reason: string
}

export type ActivityMonitorState = {
  status: ActivityMonitorStatus
  snapshot: ActivityMonitorSnapshot | null
}
