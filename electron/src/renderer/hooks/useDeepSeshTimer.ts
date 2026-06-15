// Deep Sesh timer hook.
// Keeps Pomodoro and Deep Sesh timer logic separate from the UI.

import { useEffect, useMemo, useRef, useState } from 'react'

export type DeepSeshMode = 'pomodoro' | 'deepSesh'
export type DeepSeshStatus = 'idle' | 'running' | 'paused' | 'completed'
export type PomodoroPhase = 'focus' | 'break'

const DEFAULT_FOCUS_MINUTES = 25
const DEFAULT_BREAK_MINUTES = 5
const DEFAULT_ROUNDS = 4
const DEFAULT_DEEP_SESH_MINUTES = 60
const MAX_DEEP_SESH_MINUTES = 480

function minutesToSeconds(minutes: number) {
  return minutes * 60
}

/* Keeps numeric settings inside safe MVP limits. */
function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback

  return Math.min(max, Math.max(min, Math.round(value)))
}

/* Converts seconds into the clock format shown in the UI. */
function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function useDeepSeshTimer() {
  const endAtRef = useRef<number | null>(null)
  const [mode, setMode] = useState<DeepSeshMode>('pomodoro')
  const [status, setStatus] = useState<DeepSeshStatus>('idle')

  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES)
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS)
  const [deepSeshMinutes, setDeepSeshMinutes] = useState(DEFAULT_DEEP_SESH_MINUTES)

  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus')
  const [currentRound, setCurrentRound] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(
    minutesToSeconds(DEFAULT_FOCUS_MINUTES),
  )

  const isSessionActive = status === 'running' || status === 'paused'
  const canEditSettings = !isSessionActive

  const formattedTime = useMemo(() => {
    return formatSeconds(remainingSeconds)
  }, [remainingSeconds])

  /*
   * Stores a wall-clock end timestamp instead of trusting interval ticks.
   *
   * Electron can throttle renderer timers while the window is backgrounded, so
   * each tick recomputes remaining time from Date.now() instead of subtracting
   * one second from previous state.
   */
  function startCountdownForSeconds(seconds: number) {
    endAtRef.current = Date.now() + seconds * 1000
    setRemainingSeconds(seconds)
  }

  /* Clears the active end timestamp when the timer is reset or completed. */
  function clearCountdownEndTime() {
    endAtRef.current = null
  }

  /* Resets the timer to the beginning of the selected mode. */
  function resetTimerForMode(nextMode: DeepSeshMode) {
    clearCountdownEndTime()
    setPomodoroPhase('focus')
    setCurrentRound(1)

    if (nextMode === 'pomodoro') {
      setRemainingSeconds(minutesToSeconds(focusMinutes))
      return
    }

    setRemainingSeconds(minutesToSeconds(deepSeshMinutes))
  }

  /* Switches between Pomodoro and Deep Sesh before the timer starts. */
  function selectMode(nextMode: DeepSeshMode) {
    if (isSessionActive) return

    clearCountdownEndTime()
    setMode(nextMode)
    setStatus('idle')

    if (nextMode === 'pomodoro') {
      setPomodoroPhase('focus')
      setCurrentRound(1)
      setRemainingSeconds(minutesToSeconds(focusMinutes))
      return
    }

    setRemainingSeconds(minutesToSeconds(deepSeshMinutes))
  }

  /* Starts a fresh session using the current settings. */
  function start() {
    setStatus('running')
    setPomodoroPhase('focus')
    setCurrentRound(1)

    if (mode === 'pomodoro') {
      startCountdownForSeconds(minutesToSeconds(focusMinutes))
      return
    }

    startCountdownForSeconds(minutesToSeconds(deepSeshMinutes))
  }

  /* Pauses the active countdown. */
  function pause() {
    if (status !== 'running') return

    setStatus('paused')
  }

  /* Resumes a paused countdown. */
  function resume() {
    if (status !== 'paused') return

    startCountdownForSeconds(remainingSeconds)
    setStatus('running')
  }

  /* Stops the session and resets the current mode. */
  function stop() {
    if (status === 'idle') return

    setStatus('idle')
    clearCountdownEndTime()
    resetTimerForMode(mode)
  }

  /* Ticks from wall-clock time so drift and background throttling cannot accumulate. */
  useEffect(() => {
    if (status !== 'running' || endAtRef.current === null) return

    function finishCurrentBlock() {
      // Timer reached zero, so move to the next session state.
      if (mode === 'deepSesh') {
        clearCountdownEndTime()
        setStatus('completed')
        setRemainingSeconds(0)
        return
      }

      if (pomodoroPhase === 'focus') {
        setPomodoroPhase('break')
        startCountdownForSeconds(minutesToSeconds(breakMinutes))
        return
      }

      if (currentRound < rounds) {
        setCurrentRound((round) => round + 1)
        setPomodoroPhase('focus')
        startCountdownForSeconds(minutesToSeconds(focusMinutes))
        return
      }

      clearCountdownEndTime()
      setStatus('completed')
      setRemainingSeconds(0)
    }

    function syncRemainingSecondsToClock() {
      if (endAtRef.current === null) return

      const secondsLeft = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000),
      )

      if (secondsLeft > 0) {
        setRemainingSeconds(secondsLeft)
        return
      }

      finishCurrentBlock()
    }

    syncRemainingSecondsToClock()

    const intervalId = window.setInterval(syncRemainingSecondsToClock, 1000)

    window.addEventListener('focus', syncRemainingSecondsToClock)
    document.addEventListener('visibilitychange', syncRemainingSecondsToClock)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncRemainingSecondsToClock)
      document.removeEventListener('visibilitychange', syncRemainingSecondsToClock)
    }
  }, [
    status,
    mode,
    pomodoroPhase,
    currentRound,
    rounds,
    focusMinutes,
    breakMinutes,
  ])

  
  /* Updates Pomodoro settings while the session is not active. */
  function updatePomodoroSettings(nextSettings: {
    focusMinutes?: number
    breakMinutes?: number
    rounds?: number
  }) {
    if (!canEditSettings) return

    const nextFocusMinutes = clampNumber(
      nextSettings.focusMinutes ?? focusMinutes,
      1,
      180,
      focusMinutes,
    )

    const nextBreakMinutes = clampNumber(
      nextSettings.breakMinutes ?? breakMinutes,
      1,
      60,
      breakMinutes,
    )

    const nextRounds = clampNumber(nextSettings.rounds ?? rounds, 1, 12, rounds)

    setFocusMinutes(nextFocusMinutes)
    setBreakMinutes(nextBreakMinutes)
    setRounds(nextRounds)

    if (mode === 'pomodoro') {
      clearCountdownEndTime()
      setStatus('idle')
      setPomodoroPhase('focus')
      setCurrentRound(1)
      setRemainingSeconds(minutesToSeconds(nextFocusMinutes))
    }
  }

  /* Updates Deep Sesh settings while the session is not active. */
  function updateDeepSeshSettings(minutes: number) {
    if (!canEditSettings) return

    const nextMinutes = clampNumber(minutes, 1, MAX_DEEP_SESH_MINUTES, deepSeshMinutes)

    setDeepSeshMinutes(nextMinutes)

    if (mode === 'deepSesh') {
      clearCountdownEndTime()
      setStatus('idle')
      setRemainingSeconds(minutesToSeconds(nextMinutes))
    }
  }

  return {
    mode,
    status,
    pomodoroPhase,
    currentRound,
    remainingSeconds,
    formattedTime,

    focusMinutes,
    breakMinutes,
    rounds,
    deepSeshMinutes,

    isSessionActive,
    canEditSettings,

    selectMode,
    start,
    pause,
    resume,
    stop,
    updatePomodoroSettings,
    updateDeepSeshSettings,
  }
}
