// Shared focus monitoring types for desktop apps, browser pages, warnings, and review.
// These types keep renderer UI and main-process activity snapshots aligned.

export type FocusActivityKind = 'desktop-app' | 'browser-page'
export type FocusActivitySource = 'active-window' | 'browser-extension'
export type FocusClassificationStatus = 'allowed' | 'blocked' | 'ignored' | 'unknown'

export type DesktopActivityPayload = {
  appName: string
  processName: string
  windowTitle: string
  timestamp: number
}

export type FocusActivity = {
  kind: FocusActivityKind
  key: string
  label: string
  detail: string
  source: FocusActivitySource
  timestamp: number
}

export type FocusClassification = {
  status: FocusClassificationStatus
  reason: string
  matchedRuleId?: string
  matchedRuleLabel?: string
}

export type UnknownActivityReviewItem = {
  id: string
  kind: FocusActivityKind
  label: string
  detail: string
  firstSeenAt: number
  totalSeconds: number
}

export type FocusSessionStats = {
  distractionEvents: number
  distractedSeconds: number
  unknownCount: number
  allowedFocusSeconds: number
  mostCommonDistractionLabel: string | null
}
