import { useEffect, useState } from 'react'
import type { MiniTimerState } from '../types/miniTimer'
import '../styles/deepSesh.css'

/**
 * Small always-on-top timer surface.
 *
 * Timer state is mirrored from DeepSeshPage through Electron IPC. This keeps
 * the first mini-window pass lightweight until session state moves into main.
 */
export default function MiniTimerPage() {
  const [timerState, setTimerState] = useState<MiniTimerState | null>(null)

  useEffect(() => {
    return window.taskmaster?.onMiniTimerState((nextState) => {
      setTimerState(nextState)
    })
  }, [])

  if (!timerState) {
    return (
      <main className="mini-timer-screen">
        <section className="mini-timer-card">
          <MiniTimerWindowControls isPinned />

          <div className="mini-timer-empty-state">
            <p className="mini-timer-kicker">Taskmaster</p>
            <h1>Timer not active</h1>
          </div>

          <div className="mini-timer-actions mini-timer-actions--single">
            <IconButton
              label="Open full app"
              onClick={() => window.taskmaster?.sendMiniTimerCommand('open-main')}
            >
              <OpenIcon />
            </IconButton>
          </div>
        </section>
      </main>
    )
  }

  const primaryCommand = timerState.status === 'running' ? 'pause' : 'resume'
  const canUsePrimaryAction =
    timerState.status === 'running' || timerState.status === 'paused'

  return (
    <main className="mini-timer-screen">
      <section className="mini-timer-card">
        <MiniTimerWindowControls isPinned={timerState.isPinned} />

        <div className="mini-timer-copy">
          <p className="mini-timer-kicker">{timerState.modeLabel}</p>
          <p className="mini-timer-phase muted-text">{timerState.phaseLabel}</p>
          <h1>{timerState.formattedTime}</h1>
        </div>

        <div className="mini-timer-actions">
          <IconButton
            label={timerState.status === 'running' ? 'Pause' : 'Resume'}
            disabled={!canUsePrimaryAction}
            onClick={() => window.taskmaster?.sendMiniTimerCommand(primaryCommand)}
          >
            {timerState.status === 'running' ? <PauseIcon /> : <PlayIcon />}
          </IconButton>

          <IconButton
            label="Stop"
            disabled={timerState.status === 'idle'}
            onClick={() => window.taskmaster?.sendMiniTimerCommand('stop')}
          >
            <StopIcon />
          </IconButton>

          <IconButton
            label="Open full app"
            onClick={() => window.taskmaster?.sendMiniTimerCommand('open-main')}
          >
            <OpenIcon />
          </IconButton>
        </div>
      </section>
    </main>
  )
}

type MiniTimerWindowControlsProps = {
  isPinned: boolean
}

/* Custom window controls replace the hidden native title bar. */
function MiniTimerWindowControls({ isPinned }: MiniTimerWindowControlsProps) {
  return (
    <div className="mini-timer-window-controls">
      <IconButton
        label={isPinned ? 'Unpin mini timer' : 'Pin mini timer on top'}
        variant="window"
        onClick={() => window.taskmaster?.sendMiniTimerCommand('toggle-pin')}
      >
        {isPinned ? <PinnedIcon /> : <UnpinnedIcon />}
      </IconButton>

      <IconButton
        label="Close mini timer"
        variant="window"
        onClick={() => window.taskmaster?.sendMiniTimerCommand('close')}
      >
        <CloseIcon />
      </IconButton>
    </div>
  )
}

type IconButtonProps = {
  children: React.ReactNode
  label: string
  disabled?: boolean
  variant?: 'action' | 'window'
  onClick: () => void
}

/* Shared icon button keeps mini timer controls compact and accessible. */
function IconButton({
  children,
  label,
  disabled = false,
  variant = 'action',
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`mini-timer-icon-button mini-timer-icon-button--${variant}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 5v14M16 5v14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7-11-7Z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 7h10v10H7z" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 5H5v14h14v-4M14 5h5v5M19 5l-9 9" />
    </svg>
  )
}

function PinnedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 4 20 10 17.5 12.5 19 14 17 16 13.5 12.5 8 18 6 16 11.5 10.5 8 7 10 5 11.5 6.5 14 4Z" />
    </svg>
  )
}

function UnpinnedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 4 20 10 17.5 12.5 19 14 17 16 13.5 12.5 8 18 6 16 11.5 10.5 8 7 10 5 11.5 6.5 14 4Z" />
      <path d="M5 5 19 19" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  )
}
