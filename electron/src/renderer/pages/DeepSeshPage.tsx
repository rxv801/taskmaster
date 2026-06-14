// Main Deep Sesh screen shown after onboarding.
// This page composes the Deep Sesh UI and keeps timer display text together.

import { useEffect, useMemo, useState } from 'react'
import DeepSeshModeSelector from '../components/deepSesh/DeepSeshModeSelector'
import DeepSeshSetupPanel from '../components/deepSesh/DeepSeshSetupPanel'
import DeepSeshTimerCard from '../components/deepSesh/DeepSeshTimerCard'
import FocusEnvironmentSummary from '../components/deepSesh/FocusEnvironmentSummary'
import FocusMonitorPanel from '../components/deepSesh/FocusMonitorPanel'
import { useDeepSeshTimer } from '../hooks/useDeepSeshTimer'
import { useFocusEnvironmentSettings } from '../hooks/useFocusEnvironmentSettings'
import type {
  ActivityMonitorAppRule,
  ActivityMonitorState,
} from '../../shared/activityMonitoring'
import '../styles/deepSesh.css'

export default function DeepSeshPage() {
  const timer = useDeepSeshTimer()
  const { settings, browserOptions } = useFocusEnvironmentSettings()
  const pauseTimer = timer.pause
  const resumeTimer = timer.resume
  const stopTimer = timer.stop
  const [activityMonitorState, setActivityMonitorState] = useState<ActivityMonitorState>({
    status: 'idle',
    snapshot: null,
  })
  const layoutClass = timer.isSessionActive
    ? 'deep-sesh-screen--active'
    : 'deep-sesh-screen--setup'

  /* Keep display-only derived values in the page so child components stay presentational. */
  const modeLabel = timer.mode === 'pomodoro' ? 'Pomodoro' : 'Deep Sesh'
  const isPomodoro = timer.mode === 'pomodoro'
  const deepSeshHours = Math.floor(timer.deepSeshMinutes / 60)
  const deepSeshRemainderMinutes = timer.deepSeshMinutes % 60
  const deepSeshDurationLabel = formatDurationLabel(timer.deepSeshMinutes)

  const statusLabel = getStatusLabel(timer.status)
  const phaseLabel = getPhaseLabel({
    mode: timer.mode,
    pomodoroPhase: timer.pomodoroPhase,
    currentRound: timer.currentRound,
    rounds: timer.rounds,
  })

  const helperText = getHelperText({
    mode: timer.mode,
    status: timer.status,
    pomodoroPhase: timer.pomodoroPhase,
    focusMinutes: timer.focusMinutes,
    breakMinutes: timer.breakMinutes,
    deepSeshMinutes: timer.deepSeshMinutes,
  })

  /**
   * Converts onboarding settings into the small rule payload Electron needs.
   *
   * Browser page/title rules stay out of scope here; this only classifies the
   * foreground desktop app or browser app.
   */
  const activityMonitorStartOptions = useMemo(() => {
    const selectedBrowser = browserOptions.find(
      (browser) => browser.id === settings.selectedBrowserId
    )
    const browserRule: ActivityMonitorAppRule[] = selectedBrowser
      ? [
          {
            id: selectedBrowser.id,
            name: selectedBrowser.name,
            category: 'browser',
            status: settings.blockSelectedBrowser ? 'blocked' : 'allowed',
          },
        ]
      : []

    return {
      appRules: [...settings.appRules, ...browserRule],
    }
  }, [
    browserOptions,
    settings.appRules,
    settings.blockSelectedBrowser,
    settings.selectedBrowserId,
  ])

  /**
   * Pushes the current timer snapshot to the mini window.
   *
   * The renderer still owns timer state for now. Electron only opens the mini
   * window and relays commands back to this page.
   */
  useEffect(() => {
    window.taskmaster?.sendMiniTimerState({
      mode: timer.mode,
      status: timer.status,
      isPinned: true,
      modeLabel,
      statusLabel,
      phaseLabel,
      formattedTime: timer.formattedTime,
      helperText,
    })
  }, [
    timer.mode,
    timer.status,
    timer.formattedTime,
    modeLabel,
    statusLabel,
    phaseLabel,
    helperText,
  ])

  /**
   * Handles button presses from the mini timer window.
   *
   * These call the same hook actions as the full Deep Sesh screen controls.
   */
  useEffect(() => {
    return window.taskmaster?.onMiniTimerCommand((command) => {
      if (command === 'pause') {
        pauseTimer()
        return
      }

      if (command === 'resume') {
        resumeTimer()
        return
      }

      if (command === 'stop') {
        stopTimer()
      }
    })
  }, [pauseTimer, resumeTimer, stopTimer])

  /* Receives raw active-window snapshots from Electron main while the timer is active. */
  useEffect(() => {
    return window.taskmaster?.onActivityMonitorState((state) => {
      setActivityMonitorState(state)
    })
  }, [])

  /**
   * Starts, pauses, or stops desktop monitoring to match the timer lifecycle.
   *
   * Monitoring remains passive in Phase 2. It classifies the active app, but
   * does not warn, block, or enforce focus rules yet.
   */
  useEffect(() => {
    if (timer.status === 'running') {
      window.taskmaster?.startActivityMonitoring(activityMonitorStartOptions)
      return
    }

    if (timer.status === 'paused') {
      window.taskmaster?.pauseActivityMonitoring()
      return
    }

    window.taskmaster?.stopActivityMonitoring()
  }, [activityMonitorStartOptions, timer.status])

  /* Opens the mini timer window and reports IPC setup issues during development. */
  async function openMiniTimer() {
    try {
      await window.taskmaster?.openMiniTimer()
    } catch (error) {
      console.error('[Taskmaster] Could not open mini timer window:', error)
    }
  }


  return (
    <section className={`deep-sesh-screen ${layoutClass}`}>
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
            <div className="deep-sesh-session-column">
              {/* Mode, timer, setup, and summary are split for reviewable UI changes. */}
              <DeepSeshModeSelector
                mode={timer.mode}
                disabled={timer.isSessionActive}
                onSelectMode={timer.selectMode}
              />

              <DeepSeshTimerCard
                status={timer.status}
                statusLabel={statusLabel}
                modeLabel={modeLabel}
                phaseLabel={phaseLabel}
                formattedTime={timer.formattedTime}
                helperText={helperText}
                onStart={timer.start}
                onPause={timer.pause}
                onResume={timer.resume}
                onStop={timer.stop}
                onOpenMiniTimer={openMiniTimer}
              />

              {/* Setup controls collapse during active sessions to keep focus on the timer. */}
              {!timer.isSessionActive && (
                <DeepSeshSetupPanel
                  isPomodoro={isPomodoro}
                  canEditSettings={timer.canEditSettings}
                  focusMinutes={timer.focusMinutes}
                  breakMinutes={timer.breakMinutes}
                  rounds={timer.rounds}
                  deepSeshHours={deepSeshHours}
                  deepSeshRemainderMinutes={deepSeshRemainderMinutes}
                  deepSeshDurationLabel={deepSeshDurationLabel}
                  onUpdatePomodoroSettings={timer.updatePomodoroSettings}
                  onUpdateDeepSeshSettings={timer.updateDeepSeshSettings}
                />
              )}

              {/* This summary stays static until we connect onboarding settings in a later step. */}
              {!timer.isSessionActive && <FocusEnvironmentSummary />}
            </div>

            {timer.isSessionActive && (
              <FocusMonitorPanel activityMonitorState={activityMonitorState} />
            )}
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

/* Converts the active timer block into the short phase label. */
function getPhaseLabel({
  mode,
  pomodoroPhase,
  currentRound,
  rounds,
}: {
  mode: ReturnType<typeof useDeepSeshTimer>['mode']
  pomodoroPhase: ReturnType<typeof useDeepSeshTimer>['pomodoroPhase']
  currentRound: number
  rounds: number
}) {
  if (mode === 'deepSesh') return 'Single focus block'

  const phaseLabel = pomodoroPhase === 'focus' ? 'Focus block' : 'Break'

  return `${phaseLabel} · Round ${currentRound} of ${rounds}`
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
