import type { MusicEntry } from '../data/music'

export type DatePrecision = 'year' | 'month' | 'day'
export type MetadataSource = 'youtube-data-api' | 'spotify-oembed' | 'spotify-web-api' | 'manual'

interface Verification {
  source: MetadataSource
  status: 'verified'
  verifiedAt: string
  sourceUrl: string
}
export interface CoverMetadata extends Verification { url: string; width: number; height: number }
export interface PublishedMetadata extends Verification { value: string }
export interface ReleaseMetadata extends Verification { value: string; precision: DatePrecision }
export interface MetadataAttempt {
  checkedAt: string
  status: 'ok' | 'partial' | 'failed' | 'no-credentials' | 'unavailable'
}
export interface MusicMetadata {
  platformId: string
  cover?: CoverMetadata | null
  publishedAt?: PublishedMetadata | null
  releaseDate?: ReleaseMetadata | null
  attempts?: Partial<Record<Exclude<MetadataSource, 'manual'>, MetadataAttempt>>
}
export type MusicMetadataIndex = Record<string, MusicMetadata>

function calendarDate(value: string): boolean {
  const parts = value.split('-').map(Number)
  const [year, month, day] = parts
  return year >= 1000 && year <= 9999 && month >= 1 && month <= 12
    && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function validPublishedAt(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
    && calendarDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
}

export function validReleaseDate(value: unknown, precision: unknown): value is string {
  if (typeof value !== 'string') return false
  if (precision === 'year') return /^[1-9]\d{3}$/.test(value)
  if (precision === 'month') return /^[1-9]\d{3}-(?:0[1-9]|1[0-2])$/.test(value)
  return precision === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(value) && calendarDate(value)
}

export function validHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}

function verified(value: unknown): value is Verification {
  if (!value || typeof value !== 'object') return false
  const field = value as Verification
  return field.status === 'verified' && ['youtube-data-api', 'spotify-oembed', 'spotify-web-api', 'manual'].includes(field.source)
    && validPublishedAt(field.verifiedAt) && validHttpsUrl(field.sourceUrl)
}

export function validCoverSize(width: number, height: number, platform: MusicEntry['platform'], highResolution = false): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false
  if (platform === 'spotify') return width >= 160 && height >= 160 && Math.abs(width - height) <= 1
  return width >= (highResolution ? 1280 : 320) && height >= (highResolution ? 720 : 180)
    && Math.abs(width / height - 16 / 9) < .025
}

export function spotifyImageHost(hostname: string): boolean {
  return hostname === 'i.scdn.co' || /^image-cdn-[a-z0-9-]+\.spotifycdn\.com$/.test(hostname)
}

export function validCover(field: unknown, entry: MusicEntry): field is CoverMetadata {
  if (!verified(field)) return false
  const cover = field as CoverMetadata
  if (!validHttpsUrl(cover.url) || !validCoverSize(cover.width, cover.height, entry.platform, cover.url.includes('/maxresdefault.'))) return false
  if (cover.source === 'manual') return true
  const url = new URL(cover.url)
  if (entry.platform === 'spotify') return ['spotify-oembed', 'spotify-web-api'].includes(cover.source)
    && spotifyImageHost(url.hostname) && url.pathname.startsWith('/image/')
  return cover.source === 'youtube-data-api' && url.hostname === 'i.ytimg.com'
    && url.pathname.startsWith('/vi/' + entry.platformId + '/') && /\/(?:maxresdefault|mqdefault)\.jpg$/.test(url.pathname)
}

export function resolveMetadata(entry: MusicEntry, automatic: MusicMetadataIndex, manual: MusicMetadataIndex = {}): MusicMetadata {
  const auto = automatic[entry.id]?.platformId === entry.platformId ? automatic[entry.id] : undefined
  const override = manual[entry.id]?.platformId === entry.platformId ? manual[entry.id] : undefined
  const select = (key: 'cover' | 'publishedAt' | 'releaseDate') => override && Object.hasOwn(override, key) ? override[key] : auto?.[key]
  const cover = select('cover')
  const publishedAt = select('publishedAt') as PublishedMetadata | undefined
  const releaseDate = select('releaseDate') as ReleaseMetadata | undefined
  return {
    platformId: entry.platformId,
    ...(validCover(cover, entry) ? { cover } : {}),
    ...(entry.platform === 'youtube' && verified(publishedAt) && ['youtube-data-api', 'manual'].includes(publishedAt.source)
      && validPublishedAt(publishedAt.value) ? { publishedAt } : {}),
    ...(entry.platform === 'spotify' && verified(releaseDate) && ['spotify-web-api', 'manual'].includes(releaseDate.source)
      && validReleaseDate(releaseDate.value, releaseDate.precision) ? { releaseDate } : {}),
  }
}

export function musicDate(entry: MusicEntry, metadata: MusicMetadata): { label: string; dateTime: string; order: string | number } | null {
  if (entry.platform === 'youtube' && metadata.publishedAt) {
    const value = metadata.publishedAt.value
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(value))
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
    return { label: [part('year'), part('month'), part('day')].join('.'), dateTime: value, order: Date.parse(value) }
  }
  if (entry.platform === 'spotify' && metadata.releaseDate) {
    const value = metadata.releaseDate.value
    return { label: value.replaceAll('-', '.'), dateTime: value, order: value }
  }
  return null
}

export function sortMusicEntries(entries: MusicEntry[], metadata: MusicMetadataIndex, manual: MusicMetadataIndex = {}): MusicEntry[] {
  return entries.map((entry, index) => ({entry, index, date: musicDate(entry, resolveMetadata(entry, metadata, manual))}))
    .sort((a, b) => {
      if (!a.date || !b.date) return Number(Boolean(b.date)) - Number(Boolean(a.date)) || a.index - b.index
      const order = typeof a.date.order === 'number' && typeof b.date.order === 'number'
        ? b.date.order - a.date.order : String(b.date.order).localeCompare(String(a.date.order))
      return order || a.index - b.index
    }).map(item => item.entry)
}

export function coverCandidates(entry: MusicEntry, metadata: MusicMetadata): string[] {
  const urls = metadata.cover ? [metadata.cover.url] : []
  if (entry.platform === 'youtube') urls.push('https://i.ytimg.com/vi/' + entry.platformId + '/mqdefault.jpg')
  return [...new Set(urls)]
}
