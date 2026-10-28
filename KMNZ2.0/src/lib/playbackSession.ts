import type { MusicEntry, MusicLibrary } from '../types/music'
import type { PlaybackQueue, PlaybackResume, PlayerCheckpoint, QueueItem } from '../types/playback'
import { createQueueSelections, currentQueueItem, emptyQueue } from './playbackQueue'

export const playbackSessionKey = 'kmnzPlaybackSession'
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export interface RestoredPlayback { queue: PlaybackQueue; resume: PlaybackResume; checkpoint: PlayerCheckpoint }

export function parsePlaybackSession(raw: string | null, library: MusicLibrary, catalog: MusicEntry[]): RestoredPlayback | null {
  if (!raw || raw.length > 2_000_000) return null
  try {
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || !Array.isArray(saved.items) || saved.items.length > 5000
      || !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= saved.items.length
      || typeof saved.autoplay !== 'boolean' || !Number.isFinite(saved.seconds) || saved.seconds < 0 || saved.seconds > 86400
      || !['sequence', 'repeat-one'].includes(saved.mode) || !saved.origin) return null
    const current = saved.items[saved.index]
    const entry = catalog.find(item => item.id === current?.sourceId)
    if (!entry || saved.origin.platform !== entry.platform) return null
    const selections = createQueueSelections(library)
    let selection
    if (saved.origin.kind === 'album') {
      if (!Number.isInteger(current.discNumber) || !Number.isInteger(current.trackNumber)) return null
      selection = selections.album(saved.origin.releaseId, entry.id, { discNumber: current.discNumber, trackNumber: current.trackNumber })
    } else if (['list', 'search', 'native-collection'].includes(saved.origin.kind)) {
      const entries = saved.items.flatMap((item: QueueItem) => {
        const found = catalog.find(entry => entry.id === item?.sourceId)
        return found ? [found] : []
      })
      selection = selections.list(entries, entry.id, saved.origin.kind === 'search' && typeof saved.origin.query === 'string' ? saved.origin.query.slice(0,512) : '')
      if (selection?.origin.kind !== saved.origin.kind) return null
    } else return null
    if (!selection?.items[selection.index]) return null
    const queue: PlaybackQueue = { ...emptyQueue, ...selection, requestId: 1, status: 'loading',
      mode: entry.platform === 'youtube' ? saved.mode : 'sequence' }
    const seconds = entry.platform === 'youtube' ? saved.seconds : 0
    return { queue,
      resume: { sourceId: entry.id, requestId: 1, seconds, autoplay: saved.autoplay },
      checkpoint: { sourceId: entry.id, requestId: 1, seconds, duration: 0, paused: !saved.autoplay },
    }
  } catch { return null }
}

export function readPlaybackSession(library: MusicLibrary, catalog: MusicEntry[], storage?: SessionStorage): RestoredPlayback | null {
  try { return parsePlaybackSession((storage ?? window.sessionStorage).getItem(playbackSessionKey), library, catalog) } catch { return null }
}

export function savePlaybackSession(queue: PlaybackQueue, checkpoint: PlayerCheckpoint | null, storage?: SessionStorage) {
  try {
    const target = storage ?? window.sessionStorage
    const current = currentQueueItem(queue)
    if (!current) { target.removeItem(playbackSessionKey); return }
    const point = checkpoint?.sourceId === current.sourceId && checkpoint.requestId === queue.requestId ? checkpoint : null
    const seconds = point && Number.isFinite(point.seconds) && point.seconds >= 0 ? Math.min(86400, point.seconds) : 0
    const autoplay = queue.status === 'ended' || queue.status === 'error' || queue.status === 'paused' ? false
      : point ? !point.paused : queue.status === 'playing' || queue.status === 'loading'
    target.setItem(playbackSessionKey, JSON.stringify({ version: 1, items: queue.items, index: queue.index, origin: queue.origin,
      mode: queue.mode, seconds, autoplay }))
  } catch { /* unavailable */ }
}
