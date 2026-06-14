type PomodoroSettings = {
  focusMinutes?: number
  breakMinutes?: number
  rounds?: number
}

type DeepSeshSetupPanelProps = {
  isPomodoro: boolean
  canEditSettings: boolean
  focusMinutes: number
  breakMinutes: number
  rounds: number
  deepSeshHours: number
  deepSeshRemainderMinutes: number
  deepSeshDurationLabel: string
  onUpdatePomodoroSettings: (settings: PomodoroSettings) => void
  onUpdateDeepSeshSettings: (minutes: number) => void
}

/* Renders editable setup fields while delegating all timer validation to the hook. */
export default function DeepSeshSetupPanel({
  isPomodoro,
  canEditSettings,
  focusMinutes,
  breakMinutes,
  rounds,
  deepSeshHours,
  deepSeshRemainderMinutes,
  deepSeshDurationLabel,
  onUpdatePomodoroSettings,
  onUpdateDeepSeshSettings,
}: DeepSeshSetupPanelProps) {
  if (!isPomodoro) {
    /* Deep Sesh stores duration as minutes, but the UI exposes hours/minutes. */
    return (
      <div className="deep-sesh-setting-grid">
        <label className="deep-sesh-setting-field">
          <span>Hours</span>
          <input
            type="number"
            min="0"
            max="8"
            value={deepSeshHours}
            disabled={!canEditSettings}
            onChange={(event) =>
              onUpdateDeepSeshSettings(
                event.currentTarget.valueAsNumber * 60 + deepSeshRemainderMinutes,
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
            disabled={!canEditSettings}
            onChange={(event) =>
              onUpdateDeepSeshSettings(
                deepSeshHours * 60 + event.currentTarget.valueAsNumber,
              )
            }
          />
        </label>

        <div className="deep-sesh-duration-summary">
          <span>Total</span>
          <strong>{deepSeshDurationLabel}</strong>
        </div>
      </div>
    )
  }

  return (
    <div className="deep-sesh-setting-grid">
      <label className="deep-sesh-setting-field">
        <span>Focus length</span>
        <input
          type="number"
          min="1"
          max="180"
          value={focusMinutes}
          disabled={!canEditSettings}
          onChange={(event) =>
            onUpdatePomodoroSettings({
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
          value={breakMinutes}
          disabled={!canEditSettings}
          onChange={(event) =>
            onUpdatePomodoroSettings({
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
          value={rounds}
          disabled={!canEditSettings}
          onChange={(event) =>
            onUpdatePomodoroSettings({
              rounds: event.currentTarget.valueAsNumber,
            })
          }
        />
      </label>
    </div>
  )
}
