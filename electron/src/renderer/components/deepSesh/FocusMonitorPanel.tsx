// Shows live desktop and browser-title monitoring during active focus sessions.
// The panel warns only; it does not block apps or websites.

import type {
  ActivityClassification,
  ActivityMonitorState,
  ActivityMonitorStatus,
} from '../../../shared/activityMonitoring'

type FocusMonitorPanelProps = {
  activityMonitorState: ActivityMonitorState
}

export default function FocusMonitorPanel({
  activityMonitorState,
}: FocusMonitorPanelProps) {
  const snapshot = activityMonitorState.snapshot
  const statusLabel = getMonitorStatusLabel(activityMonitorState.status)
  const classificationLabel = getClassificationLabel(snapshot?.classification)
  const isWarning = snapshot?.classification === 'blocked'

  return (
    <aside
      className={`deep-sesh-monitor-panel ${isWarning ? 'deep-sesh-monitor-panel--warning' : ''}`}
      aria-label="Focus monitor"
    >
      <div className="deep-sesh-monitor-status">
        <span className="status-pill">{statusLabel}</span>
        <h2>Current activity</h2>
        <p className="muted-text">
          {isWarning
            ? snapshot.reason
            : 'Taskmaster is matching your active app and browser title.'}
        </p>
      </div>

      <div className="deep-sesh-monitor-current">
        <span>{snapshot?.isBrowser ? 'Browser activity' : 'Active app'}</span>
        <strong>{snapshot?.matchedRuleLabel ?? snapshot?.appName ?? 'Waiting for activity'}</strong>
      </div>

      <div className="deep-sesh-monitor-list">
        <div className={`deep-sesh-monitor-rule deep-sesh-monitor-rule--${snapshot?.classification ?? 'unknown'}`}>
          <span>Status</span>
          <strong>{classificationLabel}</strong>
        </div>

        <div>
          <span>App</span>
          <strong>{snapshot?.appName ?? 'Waiting'}</strong>
        </div>

        <div>
          <span>Window title</span>
          <strong>{snapshot?.windowTitle ?? 'Waiting for active window'}</strong>
        </div>

        <div>
          <span>Process</span>
          <strong>{snapshot?.processName ?? 'Waiting'}</strong>
        </div>

        <div>
          <span>Rule</span>
          <strong>{snapshot?.matchedRuleLabel ?? 'No matching rule'}</strong>
        </div>
      </div>
    </aside>
  )
}

/* Keeps monitor lifecycle wording compact for the active-session layout. */
function getMonitorStatusLabel(status: ActivityMonitorStatus) {
  if (status === 'monitoring') return 'Monitoring'
  if (status === 'paused') return 'Paused'
  if (status === 'unavailable') return 'Unavailable'

  return 'Waiting'
}

/* Converts classification values into user-facing labels. */
function getClassificationLabel(classification: ActivityClassification | undefined) {
  if (classification === 'allowed') return 'Allowed'
  if (classification === 'blocked') return 'Distracting'
  if (classification === 'neutral') return 'Neutral'

  return 'Unknown'
}
