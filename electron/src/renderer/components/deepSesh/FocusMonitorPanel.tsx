// Shows raw desktop activity while a Deep Sesh or Pomodoro session is active.
// Phase 2 adds app classification; warnings and blocking come later.

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

  return (
    <aside className="deep-sesh-monitor-panel" aria-label="Focus monitor">
      <div className="deep-sesh-monitor-status">
        <span className="status-pill">{statusLabel}</span>
        <h2>Current activity</h2>
        <p className="muted-text">
          App rules are being matched against the active desktop window.
        </p>
      </div>

      <div className="deep-sesh-monitor-current">
        <span>Active app</span>
        <strong>{snapshot?.appName ?? 'Waiting for activity'}</strong>
      </div>

      <div className="deep-sesh-monitor-list">
        <div className={`deep-sesh-monitor-rule deep-sesh-monitor-rule--${snapshot?.classification ?? 'unknown'}`}>
          <span>Rule status</span>
          <strong>{classificationLabel}</strong>
        </div>

        <div>
          <span>Matched rule</span>
          <strong>{snapshot?.matchedRuleLabel ?? 'No matching app rule'}</strong>
        </div>

        <div>
          <span>Process</span>
          <strong>{snapshot?.processName ?? 'Waiting'}</strong>
        </div>

        <div>
          <span>Window title</span>
          <strong>{snapshot?.windowTitle ?? 'Waiting for active window'}</strong>
        </div>

        <div>
          <span>Monitor note</span>
          <strong>{snapshot?.reason ?? 'Session monitoring will start soon'}</strong>
        </div>
      </div>
    </aside>
  )
}

/* Keeps status wording local to this presentational panel. */
function getMonitorStatusLabel(status: ActivityMonitorStatus) {
  if (status === 'monitoring') return 'Monitoring'
  if (status === 'paused') return 'Paused'
  if (status === 'unavailable') return 'Unavailable'

  return 'Waiting'
}

/* Turns classifier values into short labels that fit inside the compact panel. */
function getClassificationLabel(classification: ActivityClassification | undefined) {
  if (classification === 'allowed') return 'Allowed app'
  if (classification === 'blocked') return 'Blocked app'

  return 'Unknown app'
}
