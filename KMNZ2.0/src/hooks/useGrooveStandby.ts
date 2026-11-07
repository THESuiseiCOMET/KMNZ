import { useEffect, useState } from 'react'
import type { PlaybackStatus } from '../types/playback'

// A pause, seek, or track change must not flash the standby artwork back on.
export function useGrooveStandby(hasPlayer: boolean, status: PlaybackStatus, captureActive: boolean, receiving: boolean) {
  const [started, setStarted] = useState(false)
  const playing = hasPlayer && status === 'playing' || receiving
  useEffect(() => {
    if (!hasPlayer && !captureActive) setStarted(false)
    else if (playing) setStarted(true)
  }, [hasPlayer, captureActive, playing])
  return !playing && (!started || !hasPlayer && !captureActive)
}
