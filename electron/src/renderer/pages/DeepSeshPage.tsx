// Main Deep Sesh screen shown after onboarding.
// This page composes the Deep Sesh UI and keeps timer display text together.

import { useEffect, useMemo, useState } from 'react'
import DeepSeshModeSelector from '../components/deepSesh/DeepSeshModeSelector'
import DeepSeshSetupPanel from '../components/deepSesh/DeepSeshSetupPanel'
import DeepSeshTimerCard from '../components/deepSesh/DeepSeshTimerCard'
import FocusEnvironmentSummary from '../components/deepSesh/FocusEnvironmentSummary'
import FocusMonitorPanel from '../components/deepSesh/FocusMonitorPanel'
import SettingsPage from './SettingsPage'
import CameraSetupStep from '../components/onboarding/OnboardingCameraSetup'
import FocusEnvironmentStep from '../components/onboarding/WhitelistSelectionStep'
import BrowserActivitySelectionStep from '../components/onboarding/BrowserActivitySelectionStep'
import settingsCog from '../assets/icons/setting.svg'
import {
  useFocusMonitoringSession,
} from '../hooks/useFocusMonitoringSession'
import { useDeepSeshTimer } from '../hooks/useDeepSeshTimer'
import type { BrowserActivityPayload } from '../../shared/browserActivity'
import type { DesktopActivityPayload } from '../../shared/focusMonitoring'
import type {
  AppRuleStatus,
  BrowserActivityRuleStatus,
} from '../hooks/useFocusEnvironmentSettings'
import '../styles/deepSesh.css'

type DeepSeshPageProps = {
  onOpenOnboardingStep: (step: number) => void
}

export default function DeepSeshPage({
  onOpenOnboardingStep,
}: DeepSeshPageProps) {
  const timer = useDeepSeshTimer()
  const pauseTimer = timer.pause
  const resumeTimer = timer.resume
  const stopTimer = timer.stop
  const [browserActivity, setBrowserActivity] =
    useState<BrowserActivityPayload | null>(null)
  const [desktopActivity, setDesktopActivity] =
    useState<DesktopActivityPayload | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Settings edits reuse configuration screens without restarting onboarding.
  const [settingsScreen, setSettingsScreen] = useState<'menu' | 'camera' | 'apps' | 'browser'>('menu')
  const focusMonitor = useFocusMonitoringSession({
    isSessionActive: timer.isSessionActive,
    browserActivity,
    desktopActivity,
  })
  const shouldShowReviewScreen =
    !timer.isSessionActive &&
    focusMonitor.hasCompletedSessionSummary &&
    focusMonitor.unknownActivities.length > 0
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

  /* Receives browser extension activity while the focus monitor is visible. */
  useEffect(() => {
    return window.taskmaster?.onBrowserActivity((activity) => {
      setBrowserActivity(activity)
    })
  }, [])

  /* Receives active desktop app snapshots from Electron main. */
  useEffect(() => {
    return window.taskmaster?.onDesktopActivity((activity) => {
      setDesktopActivity(activity)
    })
  }, [])

  /**
   * Tells the local browser extension bridge when it may receive tab metadata.
   *
   * The extension checks this status before reading the active tab URL/title.
   */
  useEffect(() => {
    window.taskmaster?.setBrowserMonitoringActive(timer.isSessionActive)

    return () => {
      window.taskmaster?.setBrowserMonitoringActive(false)
    }
  }, [timer.isSessionActive])

  /* Opens the mini timer window and reports IPC setup issues during development. */
  async function openMiniTimer() {
    try {
      await window.taskmaster?.openMiniTimer()
    } catch (error) {
      console.error('[Taskmaster] Could not open mini timer window:', error)
    }
  }

  if (isSettingsOpen) {
    const returnToSettings = () => setSettingsScreen('menu')
    if (settingsScreen === 'camera') {
      return (
        <CameraSetupStep
          onBack={returnToSettings}
          onContinue={returnToSettings}
          continueLabel="Finish"
          stepLabel="Camera settings"
        />
      )
    }
    if (settingsScreen === 'apps') {
      return (
        <FocusEnvironmentStep
          onBack={returnToSettings}
          onContinue={() => setSettingsScreen('browser')}
          stepLabel="App settings"
        />
      )
    }
    if (settingsScreen === 'browser') {
      return (
        <BrowserActivitySelectionStep
          onBack={() => setSettingsScreen('apps')}
          onContinue={returnToSettings}
          continueLabel="Finish"
          stepLabel="Browser settings"
        />
      )
    }
    return (
      <SettingsPage
        onBack={() => setIsSettingsOpen(false)}
        onOpenCameraSetup={() => setSettingsScreen('camera')}
        onOpenFocusRules={() => setSettingsScreen('apps')}
        onRerunSetup={() => onOpenOnboardingStep(0)}
      />
    )
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
        title={
          timer.isSessionActive
            ? 'Settings unavailable during a session'
            : 'Edit setup'
        }
        disabled={timer.isSessionActive}
        onClick={() => setIsSettingsOpen(true)}
      >
        <img
          src={settingsCog}
          alt=""
          aria-hidden="true"
          className="deep-sesh-edit-icon"
          draggable={false}
        />
      </button>

      <div
        className={`deep-sesh-shell ${
          shouldShowReviewScreen ? 'deep-sesh-shell--reviewing' : ''
        }`}
      >
        <main className="deep-sesh-main deep-sesh-main--timer">
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
              <FocusMonitorPanel focusMonitor={focusMonitor} />
            )}
          </section>

        </main>

        {shouldShowReviewScreen && (
          <SessionReviewPanel focusMonitor={focusMonitor} />
        )}
      </div>
    </section>
  )
}

function SessionReviewPanel({
  focusMonitor,
}: {
  focusMonitor: ReturnType<typeof useFocusMonitoringSession>
}) {
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, AppRuleStatus | BrowserActivityRuleStatus>
  >({})
  const selectedCount = Object.keys(selectedStatuses).length
  const unresolvedCount = Math.max(
    0,
    focusMonitor.unknownActivities.length - selectedCount,
  )
  const canContinue = selectedCount > 0

  const sortedUnknownActivities = useMemo(() => {
    return [...focusMonitor.unknownActivities].sort((leftItem, rightItem) => {
      return leftItem.kind.localeCompare(rightItem.kind) ||
        leftItem.label.localeCompare(rightItem.label)
    })
  }, [focusMonitor.unknownActivities])

  /* Stores the review choice locally so the user can change their mind before saving. */
  function selectUnknownStatus(
    itemId: string,
    status: AppRuleStatus | BrowserActivityRuleStatus,
  ) {
    setSelectedStatuses((currentStatuses) => ({
      ...currentStatuses,
      [itemId]: status,
    }))
  }

  function doLater() {
    focusMonitor.dismissSessionSummary({ keepUnknownActivities: true })
  }

  function continueReview() {
    if (!canContinue) {
      return
    }

    if (
      unresolvedCount > 0 &&
      !window.confirm(
        `${unresolvedCount} unknown item${unresolvedCount === 1 ? '' : 's'} ` +
          'still need a choice. Taskmaster will ask you again after a later session.',
      )
    ) {
      return
    }

    focusMonitor.unknownActivities.forEach((item) => {
      const selectedStatus = selectedStatuses[item.id]

      if (selectedStatus) {
        focusMonitor.reviewUnknownActivity(item, selectedStatus)
      }
    })
    focusMonitor.dismissSessionSummary({ keepUnknownActivities: true })
  }

  return (
    <section className="deep-sesh-review-screen" aria-label="Review unknown activity">
      <button
        className="deep-sesh-review-later-button secondary-button"
        type="button"
        onClick={doLater}
      >
        Do later
      </button>

      <div className="deep-sesh-review-panel surface-card">
        <div className="deep-sesh-review-header">
          <span className="status-pill">Session summary</span>
          <h2>Review new activity</h2>
        </div>

        <p className="muted-text">
          Choose what Taskmaster should do with anything new it saw. Unchosen
          items stay unknown and will come back after a future session.
        </p>

        <div className="deep-sesh-review-stats">
          <div>
            <span>Distractions</span>
            <strong>{focusMonitor.stats.distractionEvents}</strong>
          </div>
          <div>
            <span>Distracted time</span>
            <strong>{formatSecondsLabel(focusMonitor.stats.distractedSeconds)}</strong>
          </div>
          <div>
            <span>Unknown</span>
            <strong>{focusMonitor.stats.unknownCount}</strong>
          </div>
        </div>

        <div className="deep-sesh-review-list">
          {sortedUnknownActivities.map((item) => {
            const selectedStatus = selectedStatuses[item.id]

            return (
              <div className="deep-sesh-review-item" key={item.id}>
                <div>
                  <span>{item.kind === 'desktop-app' ? 'Unknown app' : 'Unknown page'}</span>
                  <strong>{item.label}</strong>
                  <p className="muted-text">{item.detail}</p>
                </div>
                <div className="deep-sesh-review-actions">
                  <button
                    className={`secondary-button ${
                      selectedStatus === 'allowed' ? 'deep-sesh-review-choice--active' : ''
                    }`}
                    type="button"
                    onClick={() => selectUnknownStatus(item.id, 'allowed')}
                  >
                    Allow
                  </button>
                  <button
                    className={`secondary-button ${
                      selectedStatus === 'blocked' ? 'deep-sesh-review-choice--active' : ''
                    }`}
                    type="button"
                    onClick={() => selectUnknownStatus(item.id, 'blocked')}
                  >
                    Block
                  </button>
                  <button
                    className={`secondary-button ${
                      selectedStatus === 'ignored' ? 'deep-sesh-review-choice--active' : ''
                    }`}
                    type="button"
                    onClick={() => selectUnknownStatus(item.id, 'ignored')}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="deep-sesh-review-footer">
          <span className="muted-text">
            {selectedCount === 0
              ? 'Choose at least one item to continue.'
              : `${selectedCount} selected, ${unresolvedCount} left for later.`}
          </span>
          <button
            className="primary-button"
            type="button"
            disabled={!canContinue}
            onClick={continueReview}
          >
            Continue
          </button>
        </div>
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

function formatSecondsLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}
