import { useEffect, useState } from 'react'
import distractionSoundUrl from '../assets/audio/distraction-alert.mp3'
import { scheduleDistractionSound } from '../lib/distractionSound'

/** Each continuous distraction gets a fresh delay and starts the track at zero. */
export function useDistractionSound(isDistracted: boolean, delayMs: number) {
  const [countdown, setCountdown] = useState({
    isDistracted,
    delayMs,
    secondsRemaining: Math.ceil(delayMs / 1000),
  })

  // Reset before rendering a new episode, so its UI cannot reuse the last zero.
  if (countdown.isDistracted !== isDistracted || countdown.delayMs !== delayMs) {
    setCountdown({ isDistracted, delayMs, secondsRemaining: Math.ceil(delayMs / 1000) })
  }

  useEffect(() => {
    if (!isDistracted) return

    return scheduleDistractionSound(new Audio(distractionSoundUrl), delayMs, (secondsRemaining) => {
      setCountdown({ isDistracted, delayMs, secondsRemaining })
    })
  }, [isDistracted, delayMs])

  return isDistracted ? countdown.secondsRemaining : null
}
