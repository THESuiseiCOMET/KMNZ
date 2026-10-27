import type { MusicEntry, MusicLibrary } from '../types/music'
import type { PlaybackQueue, PlaybackSelection, QueueAction, QueueItem, QueueOrigin } from '../types/playback'
import { createMusicLibraryIndex } from './musicLibrary'

export const emptyQueue: PlaybackQueue = {
  items: [], index: -1, origin: { kind: 'list', platform: 'youtube' }, requestId: 0,
  mode: 'sequence', status: 'idle', canLoad: false,
}

export function createQueueSelections(library: MusicLibrary) {
  const index = createMusicLibraryIndex(library)
  function item(sourceId: string, key = sourceId): QueueItem | undefined {
    const source = index.sources.get(sourceId)
    if (!source) return undefined
    return { key, sourceId, platform: source.platform, ...(source.target.type === 'song' ? { songId: source.target.songId } : {}),
      ...(source.target.releaseId ? { releaseId: source.target.releaseId } : {}) }
  }
  function list(entries: MusicEntry[], selectedId: string, query = ''): PlaybackSelection | null {
    const selected = index.sources.get(selectedId)
    if (!selected) return null
    if (selected.kind === 'album') return {
      items: [item(selectedId)!], index: 0,
      origin: { kind: 'native-collection', platform: selected.platform, releaseId: selected.target.releaseId },
    }
    const seen = new Set<string>()
    const items = entries.flatMap(entry => {
      const source = index.sources.get(entry.id)
      if (!source || source.platform !== selected.platform || source.kind === 'album' || source.listed === false || seen.has(source.id)) return []
      seen.add(source.id)
      return [item(source.id)!]
    })
    const position = items.findIndex(entry => entry.sourceId === selectedId)
    if (position < 0) return null
    const origin: QueueOrigin = { kind: query.trim() ? 'search' : 'list', platform: selected.platform,
      ...(query.trim() ? { query: query.trim() } : {}) }
    return { items, index: position, origin }
  }
  function album(releaseId: string, selectedId: string, position?: { discNumber: number; trackNumber: number }): PlaybackSelection | null {
    const release = index.releases.get(releaseId)
    const selected = index.sources.get(selectedId)
    if (!release || release.tracklistStatus === 'unknown' || !selected || selected.kind === 'album') return null
    const selectedTrack = release.tracks.find(track => track.sourceIds.includes(selectedId)
      && (!position || track.discNumber === position.discNumber && track.trackNumber === position.trackNumber))
    if (!selectedTrack) return null
    const items = [...release.tracks].sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber).flatMap(track => {
      const sources = track.sourceIds.map(id => index.sources.get(id)!).filter(source => source.target.type === 'song' && source.target.songId === track.songId)
      const source = track === selectedTrack ? selected : sources.find(source => source.platform === 'spotify') ?? sources[0]
      if (!source) return []
      return [{ ...item(source.id, `${releaseId}:${track.discNumber}:${track.trackNumber}:${source.id}`)!,
        releaseId, discNumber: track.discNumber, trackNumber: track.trackNumber }]
    })
    const selectedKey = `${releaseId}:${selectedTrack.discNumber}:${selectedTrack.trackNumber}:${selectedId}`
    return { items, index: items.findIndex(item => item.key === selectedKey), origin: { kind: 'album', releaseId, platform: selected.platform } }
  }
  return { list, album }
}

export function currentQueueItem(queue: PlaybackQueue): QueueItem | undefined { return queue.items[queue.index] }

export function queueAvailability(queue: PlaybackQueue) {
  const controlled = queue.canLoad && queue.origin.kind !== 'native-collection'
  return { previous: controlled && queue.index > 0, next: controlled && queue.index >= 0 && queue.index < queue.items.length - 1 }
}

function moveTo(queue: PlaybackQueue, index: number): PlaybackQueue {
  const changedPlatform = queue.items[index].platform !== queue.items[queue.index].platform
  return { ...queue, index, requestId: queue.requestId + 1, status: 'loading', error: undefined,
    canLoad: changedPlatform ? false : queue.canLoad, mode: queue.items[index].platform === 'youtube' ? queue.mode : 'sequence' }
}

export function queueReducer(queue: PlaybackQueue, action: QueueAction): PlaybackQueue {
  const current = currentQueueItem(queue)
  switch (action.type) {
    case 'select': {
      const { items, index, origin } = action.selection
      if (!items[index]) return queue
      return { items: items.map(item => ({ ...item })), index, origin: { ...origin }, requestId: queue.requestId + 1,
        mode: items[index].platform === 'youtube' ? queue.mode : 'sequence', status: 'loading', canLoad: false }
    }
    case 'move': {
      const available = queueAvailability(queue)
      if (!(action.direction === 1 ? available.next : available.previous)) return queue
      return moveTo(queue, queue.index + action.direction)
    }
    case 'ended':
      if (!current || action.requestId !== queue.requestId || action.sourceId !== current.sourceId
        || queue.status === 'ended' || current.platform !== 'youtube') return queue
      if (queue.mode === 'repeat-one') return moveTo(queue, queue.index)
      if (queue.index < queue.items.length - 1) return moveTo(queue, queue.index + 1)
      return { ...queue, status: 'ended' }
    case 'observe': {
      const event = action.observation
      if (!current || event.requestId !== queue.requestId || event.sourceId !== current.sourceId) return queue
      if (queue.status === 'ended' && event.status === 'paused') return queue
      return { ...queue, status: event.status, canLoad: event.canLoad ?? queue.canLoad,
        observedUri: event.uri ?? queue.observedUri, error: event.error }
    }
    case 'mode':
      return current?.platform === 'youtube' ? { ...queue, mode: action.mode } : queue
    case 'close':
      return { ...emptyQueue, requestId: queue.requestId + 1 }
  }
}
