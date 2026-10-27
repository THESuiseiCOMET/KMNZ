import type { MediaKind, MusicEntry, MusicLibrary, MusicPlatform, MusicSource } from '../types/music'

type ObjectValue = Record<string, unknown>

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`)
}

function object(value: unknown, path: string, keys: string[]): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected object')
  const result = value as ObjectValue
  for (const key of Object.keys(result)) if (!keys.includes(key)) fail(`${path}.${key}`, 'unknown field')
  return result
}

function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected non-empty string')
}

function choice(value: unknown, path: string, choices: readonly string[]): void {
  if (typeof value !== 'string' || !choices.includes(value)) fail(path, `expected ${choices.join(' | ')}`)
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected array')
  return value
}

function positiveInteger(value: unknown, path: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) fail(path, 'expected positive integer')
}

function id(value: unknown, path: string, prefix = ''): asserts value is string {
  text(value, path)
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) || !value.startsWith(prefix)) fail(path, 'invalid stable ID')
}

export function platformSourceKey(platform: MusicPlatform, kind: MediaKind, platformId: string): string {
  const valid = platform === 'youtube' && kind === 'mv' && /^[A-Za-z0-9_-]{11}$/.test(platformId)
    || platform === 'spotify' && ['track', 'album'].includes(kind) && /^[A-Za-z0-9]{22}$/.test(platformId)
  if (!valid) fail('source', 'invalid platform, kind or platform ID')
  return `${platform}:${kind === 'mv' ? 'video' : kind}:${platformId}`
}

export function parseMusicSourceUrl(value: string): { platform: MusicPlatform; kind: MediaKind; platformId: string; key: string } | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    let platform: MusicPlatform
    let kind: MediaKind
    let platformId: string
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') {
      platform = 'youtube'; kind = 'mv'; platformId = url.searchParams.get('v') ?? ''
    } else if (url.hostname === 'youtu.be' && /^\/[^/]+$/.test(url.pathname)) {
      platform = 'youtube'; kind = 'mv'; platformId = url.pathname.slice(1)
    } else if (url.hostname === 'open.spotify.com') {
      const match = /^\/(?:intl-[a-z]{2}\/)?(track|album)\/([A-Za-z0-9]+)\/?$/.exec(url.pathname)
      if (!match) return null
      platform = 'spotify'; kind = match[1] as 'track' | 'album'; platformId = match[2]
    } else return null
    return { platform, kind, platformId, key: platformSourceKey(platform, kind, platformId) }
  } catch { return null }
}

export function parseMusicLibrary(value: unknown): MusicLibrary {
  const root = object(value, 'library', ['schemaVersion', 'songs', 'releases', 'sources'])
  if (root.schemaVersion !== 1) fail('library.schemaVersion', 'unsupported schema version')
  const songIds = new Set<string>()
  const releaseIds = new Set<string>()
  const sourceIds = new Set<string>()
  const platformKeys = new Set<string>()
  const uniqueId = (value: unknown, path: string, ids: Set<string>, prefix = '') => {
    id(value, path, prefix)
    if (ids.has(value)) fail(path, 'duplicate ID')
    ids.add(value)
  }
  const songs = array(root.songs, 'library.songs')
  songs.forEach((value, i) => {
    const path = `songs[${i}]`
    const song = object(value, path, ['id', 'title', 'artist', 'version'])
    uniqueId(song.id, `${path}.id`, songIds, 'song-')
    text(song.title, `${path}.title`); text(song.artist, `${path}.artist`)
    const version = object(song.version, `${path}.version`, ['kind', 'label', 'relatedSongId'])
    choice(version.kind, `${path}.version.kind`, ['unspecified', 'original', 'remix', 'live', 'remaster', 'other'])
    if (version.label !== undefined) text(version.label, `${path}.version.label`)
    if (version.relatedSongId !== undefined) id(version.relatedSongId, `${path}.version.relatedSongId`, 'song-')
  })
  const releases = array(root.releases, 'library.releases')
  releases.forEach((value, i) => {
    const path = `releases[${i}]`
    const release = object(value, path, ['id', 'title', 'artist', 'kind', 'tracklistStatus', 'tracks'])
    uniqueId(release.id, `${path}.id`, releaseIds, 'release-')
    text(release.title, `${path}.title`); text(release.artist, `${path}.artist`)
    choice(release.kind, `${path}.kind`, ['album', 'ep', 'single', 'compilation', 'unknown'])
    choice(release.tracklistStatus, `${path}.tracklistStatus`, ['unknown', 'partial', 'complete'])
    const tracks = array(release.tracks, `${path}.tracks`)
    if (release.tracklistStatus === 'unknown' && tracks.length || release.tracklistStatus !== 'unknown' && !tracks.length) {
      fail(`${path}.tracklistStatus`, 'does not match tracklist contents')
    }
    const positions = new Set<string>()
    tracks.forEach((value, j) => {
      const trackPath = `${path}.tracks[${j}]`
      const track = object(value, trackPath, ['songId', 'discNumber', 'trackNumber', 'sourceIds'])
      if (!songIds.has(String(track.songId))) fail(`${trackPath}.songId`, 'unknown song')
      positiveInteger(track.discNumber, `${trackPath}.discNumber`)
      positiveInteger(track.trackNumber, `${trackPath}.trackNumber`)
      const position = `${track.discNumber}:${track.trackNumber}`
      if (positions.has(position)) fail(trackPath, 'duplicate disc/track position')
      positions.add(position)
      const ids = array(track.sourceIds, `${trackPath}.sourceIds`)
      ids.forEach(value => id(value, `${trackPath}.sourceIds`))
      if (new Set(ids).size !== ids.length) fail(`${trackPath}.sourceIds`, 'duplicate source')
    })
  })
  array(root.sources, 'library.sources').forEach((value, i) => {
    const path = `sources[${i}]`
    const source = object(value, path, ['id', 'listed', 'platform', 'kind', 'platformId', 'externalUrl', 'display', 'target'])
    uniqueId(source.id, `${path}.id`, sourceIds)
    if (source.listed !== undefined && typeof source.listed !== 'boolean') fail(`${path}.listed`, 'expected boolean')
    choice(source.platform, `${path}.platform`, ['youtube', 'spotify'])
    choice(source.kind, `${path}.kind`, source.platform === 'youtube' ? ['mv'] : ['track', 'album'])
    text(source.platformId, `${path}.platformId`)
    const key = platformSourceKey(source.platform as MusicPlatform, source.kind as MediaKind, source.platformId)
    if (platformKeys.has(key)) fail(path, 'duplicate platform source')
    platformKeys.add(key)
    text(source.externalUrl, `${path}.externalUrl`)
    if (parseMusicSourceUrl(source.externalUrl)?.key !== key) fail(`${path}.externalUrl`, 'URL does not match platform ID')
    const display = object(source.display, `${path}.display`, ['subtitle', 'year', 'era'])
    text(display.subtitle, `${path}.display.subtitle`)
    if (!Number.isInteger(display.year) || Number(display.year) < 1000 || Number(display.year) > 9999) fail(`${path}.display.year`, 'invalid legacy year')
    choice(display.era, `${path}.display.era`, ['new', 'classic'])
    const target = object(source.target, `${path}.target`, ['type', 'songId', 'releaseId'])
    if (source.kind === 'album') {
      if (target.type !== 'release' || target.songId !== undefined || !releaseIds.has(String(target.releaseId))) fail(`${path}.target`, 'album must reference an existing release')
    } else {
      if (target.type !== 'song' || !songIds.has(String(target.songId))) fail(`${path}.target`, 'track/video must reference an existing song version')
      if (target.releaseId !== undefined && !releaseIds.has(String(target.releaseId))) fail(`${path}.target.releaseId`, 'unknown release')
    }
  })
  const library = value as MusicLibrary
  const bySong = new Map(library.songs.map(song => [song.id, song]))
  for (const song of library.songs) {
    const visited = new Set([song.id])
    let related = song.version.relatedSongId
    while (related !== undefined) {
      if (!bySong.has(related)) fail(`songs.${song.id}.version.relatedSongId`, 'unknown related song')
      if (visited.has(related)) fail(`songs.${song.id}.version.relatedSongId`, 'cyclic version relationship')
      visited.add(related)
      related = bySong.get(related)!.version.relatedSongId
    }
  }
  const bySource = new Map(library.sources.map(source => [source.id, source]))
  for (const release of library.releases) for (const track of release.tracks) for (const sourceId of track.sourceIds) {
    const target = bySource.get(sourceId)?.target
    if (!target || target.type !== 'song' || target.songId !== track.songId
      || target.releaseId !== undefined && target.releaseId !== release.id) fail(`releases.${release.id}.tracks`, 'source does not match song/release')
  }
  for (const source of library.sources) {
    const target = source.target
    if (target.type === 'song' && target.releaseId !== undefined
      && !library.releases.find(release => release.id === target.releaseId)?.tracks.some(track => track.songId === target.songId && track.sourceIds.includes(source.id))) {
      fail(`sources.${source.id}.target`, 'release binding has no matching track membership')
    }
  }
  return library
}

export function createMusicLibraryIndex(library: MusicLibrary) {
  parseMusicLibrary(library)
  const songs = new Map(library.songs.map(song => [song.id, song]))
  const releases = new Map(library.releases.map(release => [release.id, release]))
  const sources = new Map(library.sources.map(source => [source.id, source]))
  const platformSources = new Map(library.sources.map(source => [platformSourceKey(source.platform, source.kind, source.platformId), source]))
  const sourcesBySong = new Map(library.songs.map(song => [song.id, [] as MusicSource[]]))
  const releasesBySong = new Map(library.songs.map(song => [song.id, [] as typeof library.releases]))
  for (const source of library.sources) if (source.target.type === 'song') sourcesBySong.get(source.target.songId)!.push(source)
  for (const release of library.releases) for (const songId of new Set(release.tracks.map(track => track.songId))) releasesBySong.get(songId)!.push(release)
  return { songs, releases, sources, platformSources, sourcesBySong, releasesBySong }
}

export function toMusicCatalog(library: MusicLibrary): MusicEntry[] {
  const index = createMusicLibraryIndex(library)
  return library.sources.map(source => {
    const item = source.target.type === 'song' ? index.songs.get(source.target.songId)! : index.releases.get(source.target.releaseId)!
    return { id: source.id, title: item.title, subtitle: source.display.subtitle, artist: item.artist,
      year: source.display.year, platform: source.platform, kind: source.kind, era: source.display.era,
      platformId: source.platformId, externalUrl: source.externalUrl }
  })
}
