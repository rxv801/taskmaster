// Deep Sesh timer hook.
// Keeps Pomodoro and Deep Sesh timer logic separate from the UI.

import { useEffect, useMemo, useState } from 'react'

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

  /* Resets the timer to the beginning of the selected mode. */
  function resetTimerForMode(nextMode: DeepSeshMode) {
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
      setRemainingSeconds(minutesToSeconds(focusMinutes))
      return
    }

    setRemainingSeconds(minutesToSeconds(deepSeshMinutes))
  }

  /* Pauses the active countdown. */
  function pause() {
    if (status !== 'running') return

    setStatus('paused')
  }

  /* Resumes a paused countdown. */
  function resume() {
    if (status !== 'paused') return

    setStatus('running')
  }

  /* Stops the session and resets the current mode. */
  function stop() {
    if (status === 'idle') return

    setStatus('idle')
    resetTimerForMode(mode)
  }

  /* Ticks the countdown while the session is running. */
  useEffect(() => {
    if (status !== 'running') return

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds > 1) {
          return seconds - 1
        }

        // Timer reached zero, so move to the next session state.
        if (mode === 'deepSesh') {
          setStatus('completed')
          return 0
        }

        if (pomodoroPhase === 'focus') {
          setPomodoroPhase('break')
          return minutesToSeconds(breakMinutes)
        }

        if (currentRound < rounds) {
          setCurrentRound((round) => round + 1)
          setPomodoroPhase('focus')
          return minutesToSeconds(focusMinutes)
        }

        setStatus('completed')
        return 0
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
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
