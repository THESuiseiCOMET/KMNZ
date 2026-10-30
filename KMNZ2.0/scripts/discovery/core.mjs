import { loadTypeScript } from '../load-typescript.mjs'
import { probeCover } from '../update-music-metadata.mjs'

export const model = await loadTypeScript(new URL('../../src/lib/musicLibrary.ts', import.meta.url))
export const metadata = await loadTypeScript(new URL('../../src/lib/musicMetadata.ts', import.meta.url))
export const emptyCandidates = () => ({ schemaVersion: 1, candidates: [] })
export const serialize = value => JSON.stringify(value, null, 2) + '\n'
const apiRoot = 'https://www.googleapis.com/youtube/v3/'
const videoId = /^[A-Za-z0-9_-]{11}$/
const channelId = /^UC[A-Za-z0-9_-]{22}$/
const playlistId = /^[A-Za-z0-9_-]{10,100}$/

function ensure(condition, message) { if (!condition) throw new Error(message) }
function object(value, keys) {
  ensure(value && typeof value === 'object' && !Array.isArray(value), 'Expected object')
  ensure(Object.keys(value).every(key => keys.includes(key)), 'Unknown discovery field')
}
function text(value, max = 10000) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max }
export function apiUrl(method, params) {
  const url = new URL(method, apiRoot)
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value))
  return url.href
}

export function validateAllowlist(config) {
  object(config, ['schemaVersion', 'youtube'])
  ensure(config.schemaVersion === 1, 'Unsupported allowlist version')
  object(config.youtube, ['maxPagesPerChannel', 'channels'])
  ensure(Number.isInteger(config.youtube.maxPagesPerChannel) && config.youtube.maxPagesPerChannel >= 1 && config.youtube.maxPagesPerChannel <= 5, 'Page limit must be 1..5')
  ensure(Array.isArray(config.youtube.channels) && config.youtube.channels.length >= 1 && config.youtube.channels.length <= 5, 'Expected 1..5 official channels')
  const ids = new Set(), channels = new Set()
  for (const source of config.youtube.channels) {
    object(source, ['id', 'channelId', 'channelUrl', 'evidenceUrl', 'categoryIds'])
    ensure(text(source.id, 100) && /^[a-z][a-z0-9-]*$/.test(source.id) && !ids.has(source.id), 'Invalid or duplicate allowlist ID')
    ensure(channelId.test(source.channelId) && !channels.has(source.channelId), 'Invalid or duplicate channel ID')
    ensure(source.channelUrl === 'https://www.youtube.com/channel/' + source.channelId, 'Channel URL mismatch')
    ensure(/^https:\/\/www\.youtube\.com\/@[A-Za-z0-9_.-]+$/.test(source.evidenceUrl), 'Official handle URL required')
    ensure(Array.isArray(source.categoryIds) && source.categoryIds.length > 0 && source.categoryIds.every(id => /^\d{1,3}$/.test(id)), 'Invalid categories')
    ids.add(source.id); channels.add(source.channelId)
  }
  return config
}

export function validateCandidates(document, config) {
  validateAllowlist(config)
  object(document, ['schemaVersion', 'candidates'])
  ensure(document.schemaVersion === 1 && Array.isArray(document.candidates) && document.candidates.length <= 3000, 'Invalid candidate document or ledger full')
  const keys = new Set(), allowed = new Map(config.youtube.channels.map(source => [source.id, source]))
  for (const candidate of document.candidates) {
    object(candidate, ['key', 'platform', 'kind', 'platformId', 'officialSourceId', 'sourceUrl', 'discoveredAt', 'raw', 'evidence', 'cover', 'review'])
    ensure(candidate.platform === 'youtube' && candidate.kind === 'video' && videoId.test(candidate.platformId), 'Invalid candidate platform source')
    ensure(candidate.key === model.platformSourceKey('youtube', 'mv', candidate.platformId) && !keys.has(candidate.key), 'Duplicate or mismatched candidate key')
    keys.add(candidate.key)
    ensure(candidate.sourceUrl === 'https://www.youtube.com/watch?v=' + candidate.platformId, 'Video URL mismatch')
    ensure(metadata.validPublishedAt(candidate.discoveredAt), 'Invalid discovery timestamp')
    const source = allowed.get(candidate.officialSourceId)
    ensure(source, 'Candidate channel is not allowlisted')
    const raw = candidate.raw
    object(raw, ['id', 'title', 'description', 'publishedAt', 'channelId', 'channelTitle', 'categoryId', 'liveBroadcastContent', 'duration', 'privacyStatus', 'embeddable'])
    ensure(raw.id === candidate.platformId && raw.channelId === source.channelId, 'Candidate owner mismatch')
    ensure(text(raw.title, 500) && text(raw.channelTitle, 500) && (raw.description === null || typeof raw.description === 'string' && raw.description.length <= 10000), 'Missing or oversized original text')
    ensure(metadata.validPublishedAt(raw.publishedAt), 'Full official publication timestamp required')
    ensure(source.categoryIds.includes(raw.categoryId) && raw.liveBroadcastContent === 'none' && raw.privacyStatus === 'public' && raw.embeddable === true, 'Video is not eligible for review')
    ensure(typeof raw.duration === 'string' && /^PT(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/.test(raw.duration) && /[1-9]/.test(raw.duration), 'Invalid or empty video duration')
    const evidence = candidate.evidence
    object(evidence, ['provider', 'channelUrl', 'uploadsPlaylistId', 'channelsApiUrl', 'playlistApiUrl', 'videoApiUrl'])
    ensure(evidence.provider === 'youtube-data-api' && evidence.channelUrl === source.channelUrl && playlistId.test(evidence.uploadsPlaylistId), 'Invalid official evidence')
    ensure(evidence.channelsApiUrl === apiUrl('channels', { part: 'contentDetails', id: source.channelId })
      && evidence.playlistApiUrl === apiUrl('playlistItems', { part: 'contentDetails', playlistId: evidence.uploadsPlaylistId, maxResults: 50 })
      && evidence.videoApiUrl === apiUrl('videos', { part: 'snippet,contentDetails,status', id: candidate.platformId }), 'Evidence URL mismatch')
    if (candidate.cover !== null) {
      object(candidate.cover, ['url', 'width', 'height', 'source', 'status', 'verifiedAt', 'sourceUrl'])
      ensure(metadata.validCover(candidate.cover, { platform: 'youtube', platformId: candidate.platformId }) && candidate.cover.sourceUrl === candidate.sourceUrl, 'Invalid verified cover')
    }
    object(candidate.review, ['status', 'note'])
    ensure(['pending', 'dismissed'].includes(candidate.review.status) && typeof candidate.review.note === 'string' && candidate.review.note.length <= 10000, 'Invalid human review')
  }
  return document
}

export async function youtubeJson(method, params, { apiKey, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const url = new URL(apiUrl(method, params))
  url.searchParams.set('key', apiKey)
  for (let attempt = 0; attempt < 3; attempt++) {
    let response
    try { response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' }) }
    catch { if (attempt < 2) { await sleep(250 * 2 ** attempt); continue }; throw new Error('YouTube network request failed') }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.body?.cancel(); await sleep(250 * 2 ** attempt); continue
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error('YouTube API HTTP ' + response.status) }
    let bytes = 0, content = ''
    const reader = response.body?.getReader(), decoder = new TextDecoder()
    ensure(reader, 'Empty YouTube response')
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.length
        ensure(bytes <= 2000000, 'YouTube response too large')
        content += decoder.decode(chunk.value, { stream: true })
      }
      content += decoder.decode()
      const data = JSON.parse(content)
      ensure(data && Array.isArray(data.items) && !data.error, 'Invalid YouTube response')
      return data
    } catch { throw new Error('Invalid YouTube response body') }
    finally { await reader.cancel().catch(() => {}) }
  }
}

export async function discover({ library, config, previous = emptyCandidates(), apiKey, now = new Date().toISOString(), fetcher = fetch, sleep, probe = probeCover }) {
  model.parseMusicLibrary(library)
  validateCandidates(previous, config)
  ensure(metadata.validPublishedAt(now), 'Invalid run timestamp')
  const document = structuredClone(previous)
  const report = { schemaVersion: 1, startedAt: now, status: 'ok', added: 0, existing: 0, rejected: [], channels: [], spotify: 'not-implemented' }
  if (!apiKey) { report.status = 'no-credentials'; return { document, report } }
  const known = new Set(library.sources.map(source => model.platformSourceKey(source.platform, source.kind, source.platformId)))
  const seen = new Set(document.candidates.map(candidate => candidate.key))
  const request = (method, params) => youtubeJson(method, params, { apiKey, fetcher, sleep })
  for (const source of config.youtube.channels) {
    const channel = await request('channels', { part: 'contentDetails', id: source.channelId })
    ensure(channel.items.length === 1 && channel.items[0].id === source.channelId, 'Official channel not found')
    const uploads = channel.items[0].contentDetails?.relatedPlaylists?.uploads
    ensure(typeof uploads === 'string' && playlistId.test(uploads), 'Official uploads playlist missing')
    const ids = new Set(), pageTokens = new Set()
    let pageToken, pages = 0
    do {
      const page = await request('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50, pageToken })
      for (const item of page.items) {
        const id = item.contentDetails?.videoId
        if (typeof id !== 'string' || !videoId.test(id)) { report.rejected.push({ source: source.id, reason: 'invalid-playlist-item' }); continue }
        const key = model.platformSourceKey('youtube', 'mv', id)
        if (known.has(key) || seen.has(key)) { report.existing++; continue }
        ids.add(id)
      }
      pages++
      pageToken = page.nextPageToken
      if (pageToken !== undefined) {
        ensure(text(pageToken, 1000) && !pageTokens.has(pageToken), 'Invalid or repeated playlist page token')
        pageTokens.add(pageToken)
      }
    } while (pageToken && pages < config.youtube.maxPagesPerChannel)
    report.channels.push({ id: source.id, pages, truncated: Boolean(pageToken) })
    const pending = [...ids].sort()
    for (let offset = 0; offset < pending.length; offset += 50) {
      const batch = pending.slice(offset, offset + 50)
      const videos = await request('videos', { part: 'snippet,contentDetails,status', id: batch.join(',') })
      ensure(videos.items.every(video => batch.includes(video.id)) && new Set(videos.items.map(video => video.id)).size === videos.items.length, 'Unexpected video ID response')
      for (const id of batch) {
        const video = videos.items.find(video => video.id === id)
        if (!video) { report.rejected.push({ platformId: id, reason: 'unavailable-video' }); continue }
        const snippet = video.snippet ?? {}, status = video.status ?? {}
        const candidate = {
          key: model.platformSourceKey('youtube', 'mv', id), platform: 'youtube', kind: 'video', platformId: id, officialSourceId: source.id,
          sourceUrl: 'https://www.youtube.com/watch?v=' + id, discoveredAt: now,
          raw: { id, title: snippet.title, description: snippet.description ?? null, publishedAt: snippet.publishedAt, channelId: snippet.channelId,
            channelTitle: snippet.channelTitle, categoryId: snippet.categoryId, liveBroadcastContent: snippet.liveBroadcastContent,
            duration: video.contentDetails?.duration, privacyStatus: status.privacyStatus, embeddable: status.embeddable },
          evidence: { provider: 'youtube-data-api', channelUrl: source.channelUrl, uploadsPlaylistId: uploads,
            channelsApiUrl: apiUrl('channels', { part: 'contentDetails', id: source.channelId }),
            playlistApiUrl: apiUrl('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50 }),
            videoApiUrl: apiUrl('videos', { part: 'snippet,contentDetails,status', id }) },
          cover: null, review: { status: 'pending', note: '' },
        }
        try { validateCandidates({ schemaVersion: 1, candidates: [candidate] }, config) }
        catch { report.rejected.push({ platformId: id, reason: 'invalid-or-ineligible-video' }); continue }
        const thumbnails = [snippet.thumbnails?.maxres?.url, snippet.thumbnails?.medium?.url]
        for (const url of [...new Set(thumbnails.filter(value => typeof value === 'string'))]) {
          if (!new RegExp('^https://i\\.ytimg\\.com/vi/' + id + '/(?:maxresdefault|mqdefault)\\.jpg$').test(url)) continue
          let size
          try { size = await probe(url, { platform: 'youtube', platformId: id }, metadata, fetcher) } catch { size = null }
          if (size) {
            const cover = { url, ...size, source: 'youtube-data-api', status: 'verified', verifiedAt: now, sourceUrl: candidate.sourceUrl }
            if (metadata.validCover(cover, { platform: 'youtube', platformId: id })) { candidate.cover = cover; break }
          }
        }
        document.candidates.push(candidate); seen.add(candidate.key); report.added++
      }
    }
  }
  document.candidates.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  validateCandidates(document, config)
  return { document, report }
}
