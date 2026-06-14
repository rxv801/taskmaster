import type { DeepSeshMode } from '../../hooks/useDeepSeshTimer'

type DeepSeshModeSelectorProps = {
  mode: DeepSeshMode
  disabled: boolean
  onSelectMode: (mode: DeepSeshMode) => void
}

/* Renders the segmented control. The slider span is animated only with CSS. */
export default function DeepSeshModeSelector({
  mode,
  disabled,
  onSelectMode,
}: DeepSeshModeSelectorProps) {
  return (
    <div
      className={`deep-sesh-mode-selector ${
        mode === 'deepSesh' ? 'deep-sesh-mode-selector--deep' : ''
      }`}
      aria-label="Session mode"
    >
      <span className="deep-sesh-mode-slider" aria-hidden="true" />

      <button
        type="button"
        className={`deep-sesh-mode-button ${
          mode === 'pomodoro' ? 'deep-sesh-mode-button--active' : ''
        }`}
        disabled={disabled}
        onClick={() => onSelectMode('pomodoro')}
      >
        Pomodoro
      </button>

      <button
        type="button"
        className={`deep-sesh-mode-button ${
          mode === 'deepSesh' ? 'deep-sesh-mode-button--active' : ''
        }`}
        disabled={disabled}
        onClick={() => onSelectMode('deepSesh')}
      >
        Deep Session
      </button>
    </div>
  )
}
