// Shows live focus monitoring during an active focus session.
// Blocked activities warn only; Taskmaster does not close apps or block sites.

import type { FocusMonitorViewState } from '../../hooks/useFocusMonitoringSession'

type FocusMonitorPanelProps = {
  focusMonitor: FocusMonitorViewState
}

export default function FocusMonitorPanel({
  focusMonitor,
}: FocusMonitorPanelProps) {
  const { activity, classification, stats } = focusMonitor
  const isBlocked = classification.status === 'blocked'
  const isWarningVisible = focusMonitor.shouldShowWarning

  return (
    <aside
      className={`deep-sesh-monitor-panel ${
        isWarningVisible ? 'deep-sesh-monitor-panel--warning' : ''
      }`}
      aria-label="Focus monitor"
    >
      <div className="deep-sesh-monitor-status">
        <span className="status-pill">{getStatusLabel(classification.status)}</span>
        <h2>{activity?.label ?? 'Waiting for activity'}</h2>
        <p className="muted-text">
          {isBlocked && !isWarningVisible
            ? `Warning in ${focusMonitor.warningDelaySeconds} seconds if this stays active.`
            : classification.reason}
        </p>
      </div>

      <div className="deep-sesh-monitor-current">
        <span>{activity?.kind === 'browser-page' ? 'Browser activity' : 'Active app'}</span>
        <strong>{activity?.detail ?? 'Waiting for browser extension or app'}</strong>
      </div>

      <div className="deep-sesh-monitor-list">
        <div className={`deep-sesh-monitor-rule deep-sesh-monitor-rule--${classification.status}`}>
          <span>Status</span>
          <strong>{getStatusLabel(classification.status)}</strong>
        </div>

        <div>
          <span>Rule</span>
          <strong>{classification.matchedRuleLabel ?? 'No matching rule'}</strong>
        </div>

        <div>
          <span>Source</span>
          <strong>{activity?.source ?? 'Waiting'}</strong>
        </div>

        <div>
          <span>Distractions</span>
          <strong>{stats.distractionEvents}</strong>
        </div>

        <div>
          <span>Unknown found</span>
          <strong>{stats.unknownCount}</strong>
        </div>
      </div>
    </aside>
  )
}

function getStatusLabel(status: FocusMonitorViewState['classification']['status']) {
  if (status === 'allowed') return 'Allowed'
  if (status === 'blocked') return 'Distracting'
  if (status === 'ignored') return 'Ignored'

  return 'Unknown'
}
