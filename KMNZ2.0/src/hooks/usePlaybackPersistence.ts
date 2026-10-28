import { useCallback, useEffect, useRef } from 'react'
import { currentQueueItem } from '../lib/playbackQueue'
import { savePlaybackSession } from '../lib/playbackSession'
import type { PlaybackQueue, PlayerCheckpoint } from '../types/playback'

export function usePlaybackPersistence(queue: PlaybackQueue, initial: PlayerCheckpoint | null) {
  const latest = useRef(queue)
  const checkpoint = useRef(initial)
  latest.current = queue
  useEffect(() => {
    const current = currentQueueItem(queue)
    if (checkpoint.current?.sourceId !== current?.sourceId || checkpoint.current?.requestId !== queue.requestId) checkpoint.current = null
    savePlaybackSession(queue, checkpoint.current)
  }, [queue])
  const remember = useCallback((point: PlayerCheckpoint) => {
    const current = latest.current
    if (point.sourceId !== currentQueueItem(current)?.sourceId || point.requestId !== current.requestId) return
    checkpoint.current = point
    savePlaybackSession(current, point)
  }, [])
  useEffect(() => {
    const save = () => savePlaybackSession(latest.current, checkpoint.current)
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', save)
    return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', save) }
  }, [])
  return remember
}
