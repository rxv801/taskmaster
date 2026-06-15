/* Placeholder for the future live focus monitor shown during active sessions. */
export default function FocusMonitorPanel() {
  return (
    <aside className="deep-sesh-monitor-panel" aria-label="Focus monitor">
      <div className="deep-sesh-monitor-status">
        <span className="status-pill">Timer active</span>
        <h2>Focus monitor</h2>
        <p className="muted-text">
          Camera, app monitoring, and focus detection will connect here later.
        </p>
      </div>

      <div className="deep-sesh-monitor-list">
        <div>
          <span>Camera preview</span>
          <strong>Coming soon</strong>
        </div>

        <div>
          <span>App monitoring</span>
          <strong>Coming soon</strong>
        </div>

        <div>
          <span>Focus detection</span>
          <strong>Coming soon</strong>
        </div>
      </div>
    </aside>
  )
}
