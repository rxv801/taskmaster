import type { DeepSeshStatus } from '../../hooks/useDeepSeshTimer'

type DeepSeshTimerCardProps = {
  status: DeepSeshStatus
  statusLabel: string
  modeLabel: string
  phaseLabel: string
  formattedTime: string
  helperText: string
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

/* Displays the active countdown and maps timer status to the visible controls. */
export default function DeepSeshTimerCard({
  status,
  statusLabel,
  modeLabel,
  phaseLabel,
  formattedTime,
  helperText,
  onStart,
  onPause,
  onResume,
  onStop,
}: DeepSeshTimerCardProps) {
  return (
    <div className="deep-sesh-timer-block">
      <span className="status-pill">{statusLabel}</span>

      <div className="deep-sesh-timer-copy">
        <p className="deep-sesh-timer-mode">{modeLabel}</p>
        <p className="deep-sesh-timer-phase muted-text">{phaseLabel}</p>
        <p className="deep-sesh-timer-value">{formattedTime}</p>
        <p className="deep-sesh-timer-helper muted-text">{helperText}</p>
      </div>

      <div className="deep-sesh-timer-actions">
        {(status === 'idle' || status === 'completed') && (
          <button type="button" className="primary-button" onClick={onStart}>
            Start session
          </button>
        )}

        {status === 'running' && (
          <button type="button" className="primary-button" onClick={onPause}>
            Pause
          </button>
        )}

        {status === 'paused' && (
          <button type="button" className="primary-button" onClick={onResume}>
            Resume
          </button>
        )}

        {status !== 'idle' && (
          <button type="button" className="secondary-button" onClick={onStop}>
            Stop
          </button>
        )}

        <button type="button" className="secondary-button" disabled>
          Pop out
        </button>
      </div>
    </div>
  )
}
