// Shows browser extension activity during an active focus session.
// This prototype reports active tab metadata only and does not classify or block.

import type { BrowserActivityPayload } from '../../../shared/browserActivity'

type FocusMonitorPanelProps = {
  browserActivity: BrowserActivityPayload | null
}

export default function FocusMonitorPanel({
  browserActivity,
}: FocusMonitorPanelProps) {
  return (
    <aside className="deep-sesh-monitor-panel" aria-label="Focus monitor">
      <div className="deep-sesh-monitor-status">
        <span className="status-pill">Timer active</span>
        <h2>Browser activity</h2>
        <p className="muted-text">
          {browserActivity
            ? 'Extension connected through the local dev bridge.'
            : 'Waiting for browser extension.'}
        </p>
      </div>

      <div className="deep-sesh-monitor-current">
        <span>Browser activity</span>
        <strong>{browserActivity?.domain ?? 'Waiting for browser extension'}</strong>
      </div>

      <div className="deep-sesh-monitor-list">
        <div>
          <span>Title</span>
          <strong>{browserActivity?.title ?? 'No active tab reported yet'}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong>{browserActivity ? 'Extension connected' : 'Waiting'}</strong>
        </div>

        <div>
          <span>Source</span>
          <strong>{browserActivity?.browser ?? 'Chromium extension'}</strong>
        </div>
      </div>
    </aside>
  )
}
