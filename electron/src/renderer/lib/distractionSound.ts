type AlertAudio = Pick<HTMLAudioElement, 'loop' | 'play' | 'pause' | 'currentTime'>

/** Starts a looping alert after the delay; cleanup cancels it and rewinds it. */
export function scheduleDistractionSound(
  audio: AlertAudio,
  delayMs: number,
  onCountdown?: (secondsRemaining: number) => void,
) {
  let stopped = false
  const startedAt = Date.now()
  audio.loop = true
  audio.currentTime = 0

  const countdownId = onCountdown
    ? setInterval(() => {
        const secondsRemaining = Math.ceil((delayMs - (Date.now() - startedAt)) / 1000)
        if (secondsRemaining > 0) onCountdown(secondsRemaining)
      }, 1000)
    : null

  const timeoutId = setTimeout(() => {
    if (countdownId !== null) clearInterval(countdownId)
    onCountdown?.(0)
    void audio.play().catch((error: unknown) => {
      // Pausing while play() is pending can reject it with AbortError.
      if (!stopped) {
        console.error('[Taskmaster] Could not play distraction alert:', error)
      }
    })
  }, delayMs)

  return () => {
    stopped = true
    clearTimeout(timeoutId)
    if (countdownId !== null) clearInterval(countdownId)
    audio.pause()
    audio.currentTime = 0
  }
}
