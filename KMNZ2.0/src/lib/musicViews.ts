import type { MusicEntry, MusicLibrary, MusicRelease, ReleaseTrack, Song } from '../types/music'
import { createMusicLibraryIndex, toMusicCatalog } from './musicLibrary'

export interface ReleaseTrackView extends ReleaseTrack {
  song: Song
  playback?: MusicEntry
}

export interface ReleaseView {
  release: MusicRelease
  entry: MusicEntry
  tracks: ReleaseTrackView[]
}

export type SpotifyCategory = 'all' | 'albums' | 'ep'

export function createMusicViews(library: MusicLibrary, catalog = toMusicCatalog(library)) {
  const index = createMusicLibraryIndex(library)
  const entries = new Map(catalog.map(entry => [entry.id, entry]))
  const releaseCards = new Map<string, MusicEntry>()
  const releaseEntries = new Map<string, MusicEntry>()
  for (const entry of catalog) {
    const source = index.sources.get(entry.id)
    if (entry.platform === 'spotify' && source?.target.type === 'release') {
      if (!releaseEntries.has(source.target.releaseId)) releaseEntries.set(source.target.releaseId, entry)
      if (source.listed !== false && !releaseCards.has(source.target.releaseId)) releaseCards.set(source.target.releaseId, entry)
    }
  }
  const containedSources = new Set<string>()
  for (const releaseId of releaseCards.keys()) {
    for (const track of index.releases.get(releaseId)!.tracks) for (const sourceId of track.sourceIds) containedSources.add(sourceId)
  }
  const includes = (query: string, values: string[]) => values.some(value => value.toLocaleLowerCase().includes(query))
  const matchesEntry = (entry: MusicEntry, query: string) => includes(query,
    [entry.title, entry.subtitle, entry.artist, String(entry.year), entry.platform === 'spotify' ? 'Spotify' : 'YouTube'])

  function releaseDetail(sourceId: string): ReleaseView | null {
    const source = index.sources.get(sourceId)
    const entry = entries.get(sourceId)
    if (!entry || source?.platform !== 'spotify' || source.target.type !== 'release') return null
    const release = index.releases.get(source.target.releaseId)!
    const tracks = [...release.tracks].sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber).map(track => {
      const available = track.sourceIds.map(id => entries.get(id)).filter((entry): entry is MusicEntry => Boolean(entry))
      return { ...track, song: index.songs.get(track.songId)!, playback: available.find(entry => entry.platform === 'spotify') ?? available[0] }
    })
    return { release, entry, tracks }
  }

  function spotifySections(search: string): { albums: MusicEntry[]; singles: MusicEntry[] } {
    const query = search.trim().toLocaleLowerCase()
    const albums: MusicEntry[] = []
    const singles: MusicEntry[] = []
    for (const [releaseId, entry] of releaseCards) {
      const release = index.releases.get(releaseId)!
      const trackMatch = release.tracks.some(track => {
        const song = index.songs.get(track.songId)!
        return includes(query, [song.title, song.artist, song.version.label ?? ''])
      })
      if (query && !matchesEntry(entry, query) && !trackMatch) continue
      const section = ['single', 'ep'].includes(release.kind) ? singles : albums
      section.push(entry)
    }
    for (const entry of catalog) {
      if (entry.platform !== 'spotify' || entry.kind !== 'track' || index.sources.get(entry.id)?.listed === false || containedSources.has(entry.id)) continue
      if (!query || matchesEntry(entry, query)) singles.push(entry)
    }
    return { albums, singles }
  }

  function sourceRelease(sourceId: string): MusicRelease | undefined {
    const target = index.sources.get(sourceId)?.target
    return target?.releaseId ? index.releases.get(target.releaseId) : undefined
  }

  function releaseEntryForSource(sourceId: string): MusicEntry | undefined {
    const release = sourceRelease(sourceId)
    return release ? releaseEntries.get(release.id) : undefined
  }

  function spotifyCards(search: string, category: SpotifyCategory = 'all'): MusicEntry[] {
    const sections = spotifySections(search)
    const singles = new Map<string, MusicEntry>()
    for (const entry of sections.singles) {
      const release = sourceRelease(entry.id)
      const parent = releaseEntryForSource(entry.id)
      const card = entry.kind === 'track' && release?.tracklistStatus === 'complete'
        && ['single', 'ep'].includes(release.kind) && parent ? parent : entry
      singles.set(card.id, card)
    }
    return category === 'albums' ? sections.albums
      : category === 'ep' ? [...singles.values()] : [...sections.albums, ...singles.values()]
  }

  return { releaseDetail, spotifySections, spotifyCards, sourceRelease, releaseEntryForSource }
}
