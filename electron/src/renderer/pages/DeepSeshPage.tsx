// Main Deep Sesh screen shown after onboarding.
// This page owns the first MVP timer UI and uses a hook for timer logic.

import { useDeepSeshTimer } from '../hooks/useDeepSeshTimer'
import '../styles/deepSesh.css'

export default function DeepSeshPage() {
  const timer = useDeepSeshTimer()

  const modeLabel = timer.mode === 'pomodoro' ? 'Pomodoro' : 'Deep Sesh'
  const isPomodoro = timer.mode === 'pomodoro'
  const deepSeshHours = Math.floor(timer.deepSeshMinutes / 60)
  const deepSeshRemainderMinutes = timer.deepSeshMinutes % 60

  const statusLabel = getStatusLabel(timer.status)
  const helperText = getHelperText({
    mode: timer.mode,
    status: timer.status,
    pomodoroPhase: timer.pomodoroPhase,
    focusMinutes: timer.focusMinutes,
    breakMinutes: timer.breakMinutes,
    deepSeshMinutes: timer.deepSeshMinutes,
  })

  return (
    <section className="deep-sesh-screen">
      <header className="deep-sesh-corner-title" aria-label="Taskmaster Deep Work">
        <p className="deep-sesh-app-name">Taskmaster</p>
        <h1>Deep Work</h1>
      </header>

      <button
        type="button"
        className="deep-sesh-edit-button secondary-button"
        aria-label="Edit setup"
        title="Edit setup"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="deep-sesh-edit-icon"
        >
          <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
          <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.06-1.61-1.95-3.38-2.43.98a7.57 7.57 0 0 0-1.7-.98L15.04 3h-3.9l-.37 3.03c-.6.24-1.17.57-1.7.98l-2.43-.98-1.95 3.38 2.06 1.61c-.04.32-.07.65-.07.98s.03.66.07.98l-2.06 1.61 1.95 3.38 2.43-.98c.53.41 1.1.74 1.7.98l.37 3.03h3.9l.37-3.03c.6-.24 1.17-.57 1.7-.98l2.43.98 1.95-3.38-2.06-1.61Z" />
        </svg>
      </button>

      <div className="deep-sesh-shell">
        <main className="deep-sesh-main">
          <section className="deep-sesh-panel surface-card">
            <div
              className={`deep-sesh-mode-selector ${
                timer.mode === 'deepSesh' ? 'deep-sesh-mode-selector--deep' : ''
              }`}
              aria-label="Session mode"
            >
              <span className="deep-sesh-mode-slider" aria-hidden="true" />

              <button
                type="button"
                className={`deep-sesh-mode-button ${
                  timer.mode === 'pomodoro' ? 'deep-sesh-mode-button--active' : ''
                }`}
                disabled={timer.isSessionActive}
                onClick={() => timer.selectMode('pomodoro')}
              >
                Pomodoro
              </button>

              <button
                type="button"
                className={`deep-sesh-mode-button ${
                  timer.mode === 'deepSesh' ? 'deep-sesh-mode-button--active' : ''
                }`}
                disabled={timer.isSessionActive}
                onClick={() => timer.selectMode('deepSesh')}
              >
                Deep Session
              </button>
            </div>

            <div className="deep-sesh-timer-block">
              <span className="status-pill">{statusLabel}</span>

              <div className="deep-sesh-timer-copy">
                <p className="deep-sesh-timer-mode">{modeLabel}</p>

                <p className="deep-sesh-timer-phase muted-text">
                  {isPomodoro ? (
                    <>
                    {timer.pomodoroPhase === 'focus' ? 'Focus block' : 'Break'} ·
                    Round {timer.currentRound} of {timer.rounds}
                    </>
                  ) : (
                    'Single focus block'
                  )}
                </p>

                <p className="deep-sesh-timer-value">{timer.formattedTime}</p>
                <p className="deep-sesh-timer-helper muted-text">{helperText}</p>
              </div>

              <div className="deep-sesh-timer-actions">
                {(timer.status === 'idle' || timer.status === 'completed') && (
                  <button type="button" className="primary-button" onClick={timer.start}>
                    Start session
                  </button>
                )}

                {timer.status === 'running' && (
                  <button type="button" className="primary-button" onClick={timer.pause}>
                    Pause
                  </button>
                )}

                {timer.status === 'paused' && (
                  <button type="button" className="primary-button" onClick={timer.resume}>
                    Resume
                  </button>
                )}

                {timer.status !== 'idle' && (
                  <button type="button" className="secondary-button" onClick={timer.stop}>
                    Stop
                  </button>
                )}

                <button type="button" className="secondary-button" disabled>
                  Pop out
                </button>
              </div>
            </div>

            {/* Setup controls stay editable only before the session starts. */}
            {isPomodoro ? (
              <div className="deep-sesh-setting-grid">
                <label className="deep-sesh-setting-field">
                  <span>Focus length</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={timer.focusMinutes}
                    disabled={!timer.canEditSettings}
                    onChange={(event) =>
                      timer.updatePomodoroSettings({
                        focusMinutes: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>

                <label className="deep-sesh-setting-field">
                  <span>Break length</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timer.breakMinutes}
                    disabled={!timer.canEditSettings}
                    onChange={(event) =>
                      timer.updatePomodoroSettings({
                        breakMinutes: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>

                <label className="deep-sesh-setting-field">
                  <span>Rounds</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={timer.rounds}
                    disabled={!timer.canEditSettings}
                    onChange={(event) =>
                      timer.updatePomodoroSettings({
                        rounds: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="deep-sesh-setting-grid">
                <label className="deep-sesh-setting-field">
                  <span>Hours</span>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    value={deepSeshHours}
                    disabled={!timer.canEditSettings}
                    onChange={(event) =>
                      timer.updateDeepSeshSettings(
                        event.currentTarget.valueAsNumber * 60 +
                          deepSeshRemainderMinutes,
                      )
                    }
                  />
                </label>

                <label className="deep-sesh-setting-field">
                  <span>Minutes</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={deepSeshRemainderMinutes}
                    disabled={!timer.canEditSettings}
                    onChange={(event) =>
                      timer.updateDeepSeshSettings(
                        deepSeshHours * 60 + event.currentTarget.valueAsNumber,
                      )
                    }
                  />
                </label>

                <div className="deep-sesh-duration-summary">
                  <span>Total</span>
                  <strong>{formatDurationLabel(timer.deepSeshMinutes)}</strong>
                </div>
              </div>
            )}

            {/* This summary stays static until we connect onboarding settings in a later step. */}
            <div className="deep-sesh-summary-grid">
              <div>
                <span className="deep-sesh-summary-label">Main browser</span>
                <strong>Not connected yet</strong>
              </div>

              <div>
                <span className="deep-sesh-summary-label">Allowed apps</span>
                <strong>Coming soon</strong>
              </div>

              <div>
                <span className="deep-sesh-summary-label">Blocked apps</span>
                <strong>Coming soon</strong>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  )
}

/* Converts internal timer status into UI text. */
function getStatusLabel(status: ReturnType<typeof useDeepSeshTimer>['status']) {
  if (status === 'running') return 'Running'
  if (status === 'paused') return 'Paused'
  if (status === 'completed') return 'Session complete'

  return 'Ready to focus'
}

/* Explains what the current timer mode is doing. */
function getHelperText({
  mode,
  status,
  pomodoroPhase,
  focusMinutes,
  breakMinutes,
  deepSeshMinutes,
}: {
  mode: ReturnType<typeof useDeepSeshTimer>['mode']
  status: ReturnType<typeof useDeepSeshTimer>['status']
  pomodoroPhase: ReturnType<typeof useDeepSeshTimer>['pomodoroPhase']
  focusMinutes: number
  breakMinutes: number
  deepSeshMinutes: number
}) {
  if (status === 'completed') {
    return 'Your session is complete. Start another one when you are ready.'
  }

  if (mode === 'deepSesh') {
    return `One countdown session for ${formatDurationLabel(deepSeshMinutes)}.`
  }

  if (pomodoroPhase === 'break') {
    return `Break time. The next focus block starts automatically.`
  }

  return `Focus for ${focusMinutes} minutes, then take a ${breakMinutes} minute break.`
}

/* Writes longer sessions in a friendly hour/minute format. */
function formatDurationLabel(totalMinutes: number) {
  const safeMinutes = Math.max(1, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  const hourText = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
  const minuteText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`

  return `${hourText} ${minuteText}`
}
