/**
 * Gates onboarding Continue buttons while the CV worker is still connecting.
 *
 * The user should wait for the detector when possible, but this hook releases
 * the gate after a short grace period so setup is not permanently blocked by a
 * missing camera permission, unavailable worker, or local machine issue.
 */

import { useEffect, useState } from 'react'

const DETECTOR_GRACE_MS = 10_000

export function useDetectorContinueGate(connected: boolean) {
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (connected) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setHasTimedOut(true)
    }, DETECTOR_GRACE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [connected])

  return {
    canContinue: connected || hasTimedOut,
    hasTimedOut,
  }
}
