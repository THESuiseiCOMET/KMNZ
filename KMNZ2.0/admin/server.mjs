import http from 'node:http'
import { createBilibiliTitleLookup } from './bilibili.mjs'
import { replaceLibraryFiles } from './local-data.mjs'
import { artistFromMembers, initialReview, parseLinkRows } from './batch.mjs'
import { readFile, writeFile, mkdir, rename, readdir, rm, lstat, realpath } from 'node:fs/promises'
import { resolve, dirname, basename, join, relative, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash, randomUUID, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { model, metadata, youtubeJson } from '../scripts/discovery/core.mjs'
import { validateIndex, windowsFetch } from '../scripts/update-music-metadata.mjs'

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const repository = 'THESuiseiCOMET/KMNZ'
export const dataPaths = ['src/data/music/songs.json', 'src/data/music/releases.json', 'src/data/music/sources.json', 'src/data/music-metadata.json', 'src/data/music-metadata.overrides.json']
const writablePaths = new Set([dataPaths[0], dataPaths[2], dataPaths[3]])
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex')
export class AdminError extends Error {}
const requireValue = (condition, message) => { if (!condition) throw new AdminError(message) }
const text = (value, max = 500) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const jsonText = value => JSON.stringify(value, null, 2) + '\n'
const batchIdValid = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id)

export function validateData(data) {
  const library = model.parseMusicLibrary({ schemaVersion: 1, songs: data.songs, releases: data.releases, sources: data.sources })
  const catalog = model.toMusicCatalog(library)
  validateIndex(data.automatic, catalog, metadata)
  validateIndex(data.manual, catalog, metadata, true)
  return catalog
}

export async function loadSnapshot(root = projectRoot) {
  const raw = await Promise.all(dataPaths.map(path => readFile(resolve(root, path), 'utf8')))
  const [songs, releases, sources, automatic, manual] = raw.map(JSON.parse)
  const data = { songs, releases, sources, automatic, manual }
  validateData(data)
  return { data, raw, fingerprint: digest(raw) }
}

export function youtubeId(input) {
  requireValue(text(input, 2000), '请输入 YouTube 视频链接。')
  try {
    const url = new URL(input)
    requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port, '只接受 HTTPS 视频链接。')
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      const match = /^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)
      const id = match?.[1] ?? (url.pathname === '/watch' ? url.searchParams.get('v') : null)
      requireValue(/^[A-Za-z0-9_-]{11}$/.test(id ?? ''), '未找到视频 ID；V1 不展开 Playlist。')
      return id
    }
    const parsed = model.parseMusicSourceUrl(input)
    requireValue(parsed?.platform === 'youtube', '只接受 YouTube 视频链接。')
    return parsed.platformId
  } catch (error) { if (error instanceof AdminError) throw error; throw new AdminError('无效的 YouTube 视频链接。') }
}

export function bilibiliLink(input) {
  const raw = typeof input === 'string' ? input.trim() : ''
  const url = /^BV1[1-9A-HJ-NP-Za-km-z]{9}$/.test(raw) ? new URL('https://www.bilibili.com/video/' + raw) : (() => { try { return new URL(raw) } catch { return null } })()
  requireValue(url && model.validBilibiliVideoUrl(url.href), '请输入完整的 HTTPS Bilibili BV 视频链接（不支持短链接和 Playlist）。')
  const bv = /^\/video\/(BV1[1-9A-HJ-NP-Za-km-z]{9})\/?$/.exec(url.pathname)?.[1]
  requireValue(bv, 'V1 只绑定 BV 视频，不接受 av 号。')
  return { bv, url: 'https://www.bilibili.com/video/' + bv }
}

const tokens = value => {
  requireValue(typeof value === 'string' && value.length <= 100000, '输入过长。')
  const list = value.split(/[\s,，]+/).filter(Boolean)
  requireValue(list.length > 0 && list.length <= 200, '每批请输入 1～200 个链接。')
  return list
}
const durationValid = value => typeof value === 'string' && /^PT(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/.test(value) && /[1-9]/.test(value)

export function createAdminTransport({ native = fetch, windows = process.platform === 'win32' ? windowsFetch : null } = {}) {
  return async (url, options) => {
    try { return await native(url, options) }
    catch (error) {
      if (!windows) throw error
      try { return await windows(url, options) } catch { throw error }
    }
  }
}
const adminTransport = createAdminTransport()
const apiReasons = {
  quotaExceeded: 'YouTube API 配额已用完，请检查 Google Cloud 配额或等待恢复。',
  dailyLimitExceeded: 'YouTube API 当日配额已用完，请检查 Google Cloud 配额。',
  rateLimitExceeded: '请求过于频繁，请稍后重试。',
  userRateLimitExceeded: '请求过于频繁，请稍后重试。',
  keyInvalid: 'API Key 无效，请检查 .env.local 并重启 Admin。',
  API_KEY_INVALID: 'API Key 无效，请检查 .env.local 并重启 Admin。',
  API_KEY_EXPIRED: 'API Key 已失效，请更新本地配置并重启 Admin。',
  accessNotConfigured: '该密钥所属项目未启用 YouTube Data API v3。',
  SERVICE_DISABLED: '该密钥所属项目未启用 YouTube Data API v3。',
  ipRefererBlocked: '密钥的 IP 或来源限制拒绝了本地服务请求，请检查密钥限制。',
  API_KEY_HTTP_REFERRER_BLOCKED: '该密钥仅允许指定网页来源，无法用于本地 Node 服务；请检查密钥限制。',
  API_KEY_IP_ADDRESS_BLOCKED: '当前出口 IP 不在密钥允许范围内。',
  API_KEY_SERVICE_BLOCKED: '密钥的 API 限制未允许 YouTube Data API v3。',
}

async function failureReason(response) {
  const copy = response.clone(), reader = copy.body?.getReader()
  if (!reader) return null
  let size = 0, body = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.length
      if (size > 65536) return null
      body += decoder.decode(next.value, { stream: true })
    }
    const data = JSON.parse(body + decoder.decode())
    const reasons = [...(Array.isArray(data.error?.errors) ? data.error.errors : []), ...(Array.isArray(data.error?.details) ? data.error.details : [])].map(item => item?.reason)
    return reasons.find(reason => Object.hasOwn(apiReasons, reason)) ?? null
  } catch { return null }
  finally { void reader.cancel().catch(() => {}) }
}

export async function adminYouTubeRequest(method, params, { apiKey, fetcher = adminTransport, sleep } = {}) {
  let status = null, reason = null, network = false
  const inspect = async (url, options) => {
    let response
    try { response = await fetcher(url, options) }
    catch (error) { network = true; throw error }
    network = false; status = response.status
    reason = response.ok ? null : await failureReason(response)
    return response
  }
  try { return await youtubeJson(method, params, { apiKey, fetcher: inspect, sleep }) }
  catch {
    let detail
    if (network) detail = '网络连接失败或超时，请检查本机代理、DNS 和连接；不能据此认定密钥无效。'
    else if (reason) detail = apiReasons[reason]
    else if (status === 400) detail = '请求参数或密钥被 API 拒绝，请检查链接及密钥，并重启 Admin。'
    else if (status === 401 || status === 403) detail = 'API 拒绝访问，请检查 API 是否启用、密钥限制及配额。'
    else if (status === 429) detail = 'API 限流，请稍后重试。'
    else if (status >= 500) detail = 'YouTube 服务暂时不可用，请稍后重试。'
    else detail = 'API 返回内容无法解析，请重试并检查网络。'
    throw new AdminError('YouTube API 获取失败' + (status && !network ? '（HTTP ' + status + '）' : '') + '：' + detail + ' 已有草稿未删除。')
  }
}

export async function collectVideos(input, data, prior = [], { apiKey = process.env.YOUTUBE_API_KEY, request = adminYouTubeRequest, fetcher = adminTransport, now = new Date().toISOString() } = {}) {
  const seen = new Set(), existing = new Map(data.sources.filter(source => source.platform === 'youtube').map(source => [source.platformId, source.id]))
  const collected = new Set(prior.map(video => video.videoId)), ids = [], notices = []
  for (const value of tokens(input)) {
    let id
    try { id = youtubeId(value) } catch (error) { notices.push({ input: value, reason: error.message }); continue }
    if (seen.has(id)) { notices.push({ videoId: id, reason: '本次输入重复，已跳过。' }); continue }
    seen.add(id)
    if (existing.has(id)) notices.push({ videoId: id, sourceId: existing.get(id), reason: '曲库已收录，未重复导入。' })
    else if (collected.has(id)) notices.push({ videoId: id, reason: '已在当前批次中。' })
    else ids.push(id)
  }
  if (!ids.length) return { videos: [], notices }
  requireValue(prior.length + ids.length <= 200, '当前批次最多保留 200 个新视频，请分批处理。')
  requireValue(text(apiKey, 1000), '未配置服务器环境变量 YOUTUBE_API_KEY；已有视频去重和 Bilibili 绑定仍可使用。')
  const videos = []
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50)
    let response
    try { response = await request('videos', { part: 'snippet,contentDetails,status', id: batch.join(',') }, { apiKey, fetcher }) }
    catch (error) { if (error instanceof AdminError) throw error; throw new AdminError('YouTube API 获取失败。已有草稿未删除，请检查密钥、网络和配额后重试。') }
    requireValue(Array.isArray(response.items) && response.items.every(video => batch.includes(video.id)) && new Set(response.items.map(video => video.id)).size === response.items.length, 'YouTube 返回的视频 ID 不匹配。')
    for (const id of batch) {
      const video = response.items.find(item => item.id === id), snippet = video?.snippet
      if (!snippet || !text(snippet.title) || !text(snippet.channelId) || !text(snippet.channelTitle) || !metadata.validPublishedAt(snippet.publishedAt) || !durationValid(video.contentDetails?.duration) || video.status?.embeddable !== true || !['public', 'unlisted'].includes(video.status?.privacyStatus)) {
        notices.push({ videoId: id, reason: '视频不可用、不可嵌入，或缺少有效标题／原始发布时间／时长；未加入可发布草稿。' }); continue
      }
      videos.push({ videoId: id, apiTitle: snippet.title, publishedAt: snippet.publishedAt, duration: video.contentDetails.duration,
        channelId: snippet.channelId, channelTitle: snippet.channelTitle, verifiedAt: now })
    }
  }
  return { videos, notices }
}

export const sourceIdFor = id => 'yt-admin-' + createHash('sha256').update(id).digest('hex').slice(0, 16)
export const songIdFor = id => 'song-admin-' + createHash('sha256').update(id).digest('hex').slice(0, 16)

export function validateBatchSettings(value = {}) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), '批量设置无效。')
  const settings = { contentType: value.contentType || 'stream', era: value.era || 'new', members: value.members ?? [], autoMembers: value.autoMembers !== false, originalGroup: value.originalGroup || '' }
  requireValue(['cover', 'original', 'stream'].includes(settings.contentType) && ['new', 'classic'].includes(settings.era), '批量类型或时期无效。')
  requireValue(Array.isArray(settings.members) && settings.members.length <= 4, '批量成员无效。')
  settings.members = settings.members.map(model.normalizeKMNZMember)
  requireValue(settings.members.every(Boolean) && new Set(settings.members).size === settings.members.length, '批量成员无效或重复。')
  requireValue(settings.contentType !== 'stream' || settings.members.every(member => model.streamMembers.includes(member)), 'Stream 成员仅支持 LITA / TINA / NERO。')
  requireValue(['', 'lita-liz', 'lita-tina-nero', 'special'].includes(settings.originalGroup), '批量原创组别无效。')
  return settings
}

export function pairingRows(youtubeInput, bilibiliInput) {
  let rows
  try { rows = parseLinkRows(youtubeInput, bilibiliInput) } catch (error) { throw new AdminError(error.message) }
  const videos = new Map(), bvs = new Map()
  return rows.map(row => {
    let videoId, link
    try { videoId = youtubeId(row.youtube); link = row.bilibili ? bilibiliLink(row.bilibili) : null }
    catch (error) { throw new AdminError('第 ' + row.line + ' 行：' + error.message) }
    if (link) {
      requireValue(!videos.has(videoId) || videos.get(videoId) === link.bv, '同一 YouTube 视频在两行对应了不同 BV，未自动绑定。')
      requireValue(!bvs.has(link.bv) || bvs.get(link.bv) === videoId, '同一 BV 对应了不同 YouTube 视频，未自动绑定。')
      videos.set(videoId, link.bv); bvs.set(link.bv, videoId)
    }
    return { ...row, videoId, link }
  })
}

export function pairAvailableBindings(rows, data, videos, prior = []) {
  requireValue(Array.isArray(prior) && prior.length <= 200, '待绑定列表无效或过大。')
  const targets = new Map(data.sources.filter(source => source.platform === 'youtube').map(source => [source.platformId, source.id]))
  for (const video of videos) if (!targets.has(video.videoId)) targets.set(video.videoId, sourceIdFor(video.videoId))
  const allowed = new Set(targets.values()), links = [], bySource = new Map(), byBV = new Map()
  const baseBindings = new Map()
  for (const source of data.sources) if (source.bilibiliUrl) {
    const bv = /\/video\/(BV1[1-9A-HJ-NP-Za-km-z]{9})/.exec(source.bilibiliUrl)?.[1]
    if (bv) { const owners = baseBindings.get(bv) ?? new Set(); owners.add(source.id); baseBindings.set(bv, owners) }
  }
  const add = (sourceId, value) => {
    requireValue(allowed.has(sourceId), '待绑定的 YouTube 来源不存在。')
    const link = bilibiliLink(value)
    requireValue(!bySource.has(sourceId) || bySource.get(sourceId) === link.url, '同一来源存在不同 BV，保留原草稿，请先人工修正绑定。')
    requireValue(!byBV.has(link.bv) || byBV.get(link.bv) === sourceId, '同一 BV 已绑定本批次其他视频。')
    requireValue(!baseBindings.has(link.bv) || [...baseBindings.get(link.bv)].every(id => id === sourceId), '该 BV 已绑定曲库中的其他来源。')
    const existing = data.sources.find(source => source.id === sourceId)?.bilibiliUrl
    if (existing) requireValue(bilibiliLink(existing).bv === link.bv, '曲库已有不同 BV，未覆盖；请先检查对应关系。')
    if (!bySource.has(sourceId)) { links.push({ sourceId, url: link.url }); bySource.set(sourceId, link.url); byBV.set(link.bv, sourceId) }
  }
  for (const binding of prior) add(binding.sourceId, binding.url)
  const notices = []
  for (const row of rows) if (row.link) {
    const sourceId = targets.get(row.videoId)
    if (!sourceId) notices.push({ videoId: row.videoId, reason: '第 ' + row.line + ' 行视频未能获取，BV 未绑定，也没有向其他行移动。' })
    else add(sourceId, row.link.url)
  }
  return { bindings: links, notices }
}

export function prepareSourceEdits(base, edits = []) {
  requireValue(Array.isArray(edits) && edits.length <= 200, '编辑列表无效或过大。')
  const data = structuredClone(base), seen = new Set(), summaries = [], titles = new Map()
  for (const row of edits.filter(row => row.selected !== false)) {
    const source = data.sources.find(source => source.id === row.sourceId)
    requireValue(source?.platform === 'youtube' && !seen.has(source.id), '编辑来源不存在或重复。'); seen.add(source.id)
    requireValue(text(row.title) && ['cover', 'original', 'stream'].includes(row.contentType) && ['new', 'classic'].includes(row.era), '请确认编辑条目的标题、类型和时期。')
    requireValue(Array.isArray(row.members) && row.members.length > 0 && row.members.length <= 4, '请确认编辑条目的成员。')
    const members = row.members.map(model.normalizeKMNZMember)
    requireValue(members.every(Boolean) && new Set(members).size === members.length, '编辑成员无效或重复。')
    requireValue(row.contentType !== 'stream' || members.every(member => model.streamMembers.includes(member)), 'Stream 成员仅支持 LITA / TINA / NERO。')
    if (row.contentType === 'original') requireValue(['lita-liz','lita-tina-nero','special'].includes(row.originalGroup), '请选择原创组别。')
    const song = data.songs.find(song => song.id === source.target.songId)
    requireValue(!titles.has(song.id)||titles.get(song.id)===row.title.trim(),'同一录音被填写了不同标题，请统一后再预览。');titles.set(song.id,row.title.trim())
    if (song.title !== row.title.trim()) {
      const shared = data.sources.filter(other => other.target.type === 'song' && other.target.songId === song.id).length > 1
      requireValue(!shared || row.confirmSharedTitle === true, '该标题关联多个来源，请明确勾选同步标题后再修改。')
      song.title = row.title.trim()
    }
    const before = structuredClone(base.sources.find(item => item.id === source.id))
    source.display.era = row.era
    source.display.subtitle = ({cover:'Cover',original:'Original',stream:'Stream'}[row.contentType]) + ' · ' + members.map(member => 'KMNZ '+member).join(', ')
    source.classification = { contentType:row.contentType,
      ...(row.contentType === 'cover' ? {coverMembers:members.map(member=>member.toLowerCase())} : {performers:members.map(member=>member.toLowerCase()),...(row.contentType === 'original'?{originalGroup:row.originalGroup}:{})}),
      evidenceUrls:source.classification?.evidenceUrls ?? [source.externalUrl] }
    if (row.bilibiliUrl?.trim()) source.bilibiliUrl = bilibiliLink(row.bilibiliUrl).url
    else delete source.bilibiliUrl
    summaries.push({sourceId:source.id,title:song.title,contentType:row.contentType,members,era:row.era,bilibiliUrl:source.bilibiliUrl ?? null})
  }
  for(const id of seen){const source=data.sources.find(source=>source.id===id),original=base.sources.find(source=>source.id===id);if(source.bilibiliUrl&&source.bilibiliUrl!==original.bilibiliUrl)requireValue(!data.sources.some(other=>other.id!==id&&other.bilibiliUrl&&bilibiliLink(other.bilibiliUrl).bv===bilibiliLink(source.bilibiliUrl).bv),'该 BV 已绑定其他来源。')}
  validateData(data)
  return {data,summaries}
}

export function prepareBatch(base, videos, reviews, bindings, edits = []) {
  requireValue(Array.isArray(reviews) && reviews.length <= 200 && Array.isArray(bindings) && bindings.length <= 200, '批次结构无效或过大。')
  const edited = prepareSourceEdits(base, edits)
  const data = edited.data, rawById = new Map(videos.map(video => [video.videoId, video])), used = new Set()
  const selected = reviews.filter(row => row.selected === true), items = [], links = [], additions = { songs: [], sources: [], metadata: {} }
  for (const row of selected) {
    requireValue(rawById.has(row.videoId) && !used.has(row.videoId), '审核记录重复或未经过服务器获取。')
    used.add(row.videoId)
    const raw = rawById.get(row.videoId)
    requireValue(metadata.validPublishedAt(raw.publishedAt) && metadata.validPublishedAt(raw.verifiedAt) && durationValid(raw.duration), '视频缺少有效原始发布时间或时长，禁止发布。')
    requireValue(['cover', 'original', 'stream'].includes(row.contentType) && ['classic', 'new'].includes(row.era), '请选择 Cover / Original / Stream 和时期。')
    requireValue(Array.isArray(row.members) && row.members.length > 0 && row.members.length <= 4, '请确认演唱成员。')
    const members = row.members.map(model.normalizeKMNZMember)
    requireValue(members.every(Boolean) && new Set(members).size === members.length, '演唱成员无效或重复。')
    if (row.contentType === 'stream') requireValue(members.every(member => model.streamMembers.includes(member)), 'Stream 成员仅支持 LITA / TINA / NERO。')
    if (row.contentType === 'original') requireValue(['lita-liz', 'lita-tina-nero', 'special'].includes(row.originalGroup), '请选择原创组别。')
    requireValue(!base.sources.some(source => source.platform === 'youtube' && source.platformId === raw.videoId), '远端或当前曲库已收录视频：' + raw.videoId)
    const sourceId = sourceIdFor(raw.videoId), songId = row.songId || songIdFor(raw.videoId)
    requireValue(!base.sources.some(source => source.id === sourceId) && !base.automatic[sourceId] && !base.manual[sourceId], '新来源 ID 与已有数据冲突。')
    if (!row.songId) {
      const artist = text(row.artist, 300) ? row.artist.trim() : artistFromMembers(members)
      requireValue(text(row.title) && text(artist, 300), '新条目需要确认标题和成员。')
      requireValue(!data.songs.some(song => song.id === songId), '新歌曲 ID 冲突。')
      const song = { id: songId, title: row.title.trim(), artist, version: { kind: 'unspecified' } }
      data.songs.push(song); additions.songs.push(song)
    }
    const externalUrl = 'https://www.youtube.com/watch?v=' + raw.videoId
    const source = { id: sourceId, platform: 'youtube', kind: 'mv', platformId: raw.videoId, externalUrl,
      display: { subtitle: ({ cover: 'Cover', original: 'Original', stream: 'Stream' }[row.contentType]) + ' · ' + members.map(member => 'KMNZ ' + member).join(', '),
        year: Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date(raw.publishedAt))), era: row.era },
      target: { type: 'song', songId }, classification: { contentType: row.contentType,
        ...(row.contentType === 'cover' ? { coverMembers: members.map(member => member.toLowerCase()) } : { ...(row.contentType === 'original' ? { originalGroup: row.originalGroup } : {}), performers: members.map(member => member.toLowerCase()) }), evidenceUrls: [externalUrl] } }
    data.sources.push(source); additions.sources.push(source)
    const record = { platformId: raw.videoId, publishedAt: { value: raw.publishedAt, source: 'youtube-data-api', status: 'verified', verifiedAt: raw.verifiedAt, sourceUrl: externalUrl } }
    data.automatic[sourceId] = record; additions.metadata[sourceId] = record
    items.push({ sourceId, songId, videoId: raw.videoId, duration: raw.duration, publishedAt: raw.publishedAt })
  }
  const sourceById = new Map(data.sources.map(source => [source.id, source])), bvOwners = new Map()
  for (const source of data.sources) if (source.bilibiliUrl) {
    const bv = /\/video\/(BV1[1-9A-HJ-NP-Za-km-z]{9})/.exec(source.bilibiliUrl)?.[1]
    if (bv) { const owners = bvOwners.get(bv) ?? new Set(); owners.add(source.id); bvOwners.set(bv, owners) }
  }
  const targetSeen = new Set(), bvSeen = new Set()
  for (const binding of bindings) {
    const link = bilibiliLink(binding.url), source = sourceById.get(binding.sourceId)
    requireValue(source?.platform === 'youtube', 'Bilibili 必须绑定已有或本批次新增的 YouTube 来源。')
    requireValue(!targetSeen.has(source.id) && !bvSeen.has(link.bv), '本批次存在重复 BV 或同一来源的重复绑定。')
    targetSeen.add(source.id); bvSeen.add(link.bv)
    const owners = bvOwners.get(link.bv)
    requireValue(!owners || [...owners].every(id => id === source.id), '该 BV 已绑定其他来源：' + link.bv)
    if (source.bilibiliUrl) {
      requireValue(/^\/video\/(BV1[1-9A-HJ-NP-Za-km-z]{9})\/?$/.exec(new URL(source.bilibiliUrl).pathname)?.[1] === link.bv, '该来源已有其他 Bilibili 链接，V1 不覆盖已有绑定。')
      continue
    }
    source.bilibiliUrl = link.url; bvOwners.set(link.bv, new Set([source.id]))
    links.push({ sourceId: source.id, url: link.url })
  }
  for (const item of items) requireValue(data.songs.some(song => song.id === item.songId), '关联的歌曲不存在，或本批次对应的新歌曲未被选中。')
  const catalog = validateData(data), catalogById = new Map(catalog.map(entry => [entry.id, entry]))
  for (const item of items) {
    const entry = catalogById.get(item.sourceId), effective = metadata.resolveMetadata(entry, data.automatic, data.manual), date = metadata.musicDate(entry, effective)
    requireValue(date && effective.publishedAt.value === item.publishedAt, '新增日期未通过网站实际读取链路。')
    Object.assign(item, { title: entry.title, artist: entry.artist, date: date.label })
  }
  const values = [data.songs, data.releases, data.sources, data.automatic, data.manual], originals = [base.songs, base.releases, base.sources, base.automatic, base.manual]
  const files = dataPaths.flatMap((path, index) => canonical(values[index]) === canonical(originals[index]) ? [] : [{ path, content: jsonText(values[index]) }])
  requireValue(files.every(file => writablePaths.has(file.path)), '变更超出允许的数据文件。')
  const review = { items, links, additions, ...(edited.summaries.length ? {edits:edited.summaries} : {}), changedFiles: files.map(file => file.path) }
  return { data, files, review, reviewHash: digest(review) }
}

export function assertRemoteIncludesLocal(local, remote) {
  validateData(remote)
  const missing = [], changed = []
  for (const key of ['songs', 'releases', 'sources']) {
    const index = new Map(remote[key].map(item => [item.id, item]))
    for (const item of local[key]) {
      if (!index.has(item.id)) missing.push(item.id)
      else if (canonical(item) !== canonical(index.get(item.id))) changed.push(item.id)
    }
  }
  requireValue(!missing.length && !changed.length, `远端基线未包含当前本地曲库：缺少 ${missing.length} 条，内容不一致 ${changed.length} 条（${[...missing, ...changed].slice(0, 5).join(', ')}）。已停止；不会同步或提交其他本地修改。`)
  const library = data => ({ schemaVersion: 1, songs: data.songs, releases: data.releases, sources: data.sources })
  const remoteEntries = new Map(model.toMusicCatalog(library(remote)).map(entry => [entry.id, entry]))
  for (const entry of model.toMusicCatalog(library(local))) {
    const expected = metadata.resolveMetadata(entry, local.automatic, local.manual), actual = metadata.resolveMetadata(remoteEntries.get(entry.id), remote.automatic, remote.manual)
    for (const key of ['publishedAt', 'releaseDate', 'cover']) {
      if (!expected[key]) continue
      const comparable = field => field && Object.fromEntries(Object.entries(field).filter(([key]) => key !== 'verifiedAt'))
      requireValue(canonical(comparable(expected[key])) === canonical(comparable(actual[key])), '远端缺少或不同于本地已核实的 ' + key + '：' + entry.id + '。已停止发布。')
    }
    for (const key of ['publishedAt', 'releaseDate', 'cover']) {
      if (local.manual[entry.id]?.[key] === null) requireValue(remote.manual[entry.id]?.[key] === null, '远端未保留人工清空字段：' + entry.id)
    }
  }
}

export function commandFailure(command, args, errors, logFile) {
  const stages = { 'install.log': '依赖安装', 'tests.log': '项目测试', 'build.log': '生产构建', 'local-build.log': '本地预览构建' }
  const operation = command === 'git' ? args.find(arg => ['clone', 'checkout', 'rev-parse', 'diff', 'ls-files', 'ls-remote', 'config', 'add', 'commit', 'push'].includes(arg)) : null
  const network = operation === 'clone' && /Could not resolve (?:host|proxy)|Failed to connect|Connection (?:was )?(?:reset|timed out|closed)|Recv failure|Send failure|SSL_ERROR_SYSCALL|TLS.*(?:terminated|handshake)|RPC failed.*(?:curl (?:18|28|35|52|55|56|92)|HTTP\/2)|remote end hung up|early EOF|unexpected disconnect|Empty reply from server|network is unreachable/i.test(errors)
  const stage = stages[logFile && basename(logFile)]
  const gitStage = ({clone:'GitHub 仓库克隆',checkout:'Git 检出',push:'Git 推送',commit:'Git 提交'})[operation] || (operation ? 'Git ' + operation : null)
  const label = stage || gitStage || command
  const error = new AdminError(label + (network ? '时连接 GitHub 失败' : '未通过') + (logFile ? '，请查看恢复目录上一级的 ' + basename(logFile) + '；草稿已保留。' : '。请检查环境；草稿已保留。'))
  error.retryableClone = network
  return error
}

export async function runCommand(command, args, { cwd, env, timeout = 120000, logFile } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', ...env }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    let output = '', errors = '', bytes = 0
    const timer = setTimeout(() => { child.kill(); reject(new AdminError('命令超时：' + command)) }, timeout)
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > 4000000) child.kill(); else output += chunk.toString('utf8') })
    child.stderr.on('data', chunk => { if (errors.length < 2000000) errors += chunk.toString('utf8') })
    child.on('error', () => { clearTimeout(timer); reject(new AdminError('无法运行 ' + command + '，请检查安装和 PATH。')) })
    child.on('close', async code => {
      clearTimeout(timer)
      if (logFile) { try { await writeFile(logFile, output + '\n' + errors, { mode: 0o600 }) } catch { reject(new AdminError('无法保存检查日志。')); return } }
      if (code === 0) accept(output.trim())
      else {
        reject(commandFailure(command, args, errors, logFile))
      }
    })
  })
}

export async function checkEnvironment(repoRoot, runner = runCommand) {
  const problems = []
  if (Number(process.versions.node.split('.')[0]) < 22) problems.push('需要 Node.js 22 或更高版本。')
  for (const [name, args, message] of [['git', ['--version'], '未找到 Git。'], ['gh', ['--version'], '未找到 GitHub CLI（gh）；可先预览，安装后重启工具。']]) {
    try { await runner(name, args, { cwd: repoRoot }) } catch { problems.push(message) }
  }
  if (!problems.some(value => value.includes('GitHub CLI'))) {
    try { await runner('gh', ['auth', 'status', '--hostname', 'github.com'], { cwd: repoRoot }) } catch { problems.push('GitHub CLI 尚未认证，请手动运行 gh auth login。') }
  }
  try {
    requireValue(text(await runner('git', ['config', 'user.name'], { cwd: repoRoot })), '缺少 Git 作者姓名。')
    requireValue(text(await runner('git', ['config', 'user.email'], { cwd: repoRoot })), '缺少 Git 作者邮箱。')
  } catch { problems.push('请先配置 Git 的 user.name 和 user.email。') }
  return { canPublish: problems.length === 0, problems, youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY) }
}

export async function atomicJson(file, data) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = file + '.' + randomUUID() + '.tmp'
  await writeFile(temporary, jsonText(data), { flag: 'wx', mode: 0o600 })
  await rename(temporary, file)
}

function reviewBody(batch, plan) {
  const label = value => value.replace(/([\\`*_\[\]<>])/g, '\\$1').replace(/@/g, '@\u200b').replace(/[\r\n]/g, ' ')
  return `<!-- kmnz-admin:${batch.id} -->\n本批次已在本地审核；只包含音乐数据变更。\n\n` +
    plan.review.items.map(item => `- ${label(item.title)} · ${item.date}（Asia/Tokyo）· ${item.publishedAt}\n  https://www.youtube.com/watch?v=${item.videoId}`).join('\n') +
    '\n\n' + plan.review.links.map(link => `- Bilibili：${link.sourceId} → ${link.url}`).join('\n') +
    '\n\n已通过 Schema、日期读取链路、相关测试和 /KMNZ/ 构建。请人工复核后合并；不自动合并。\n'
}

export async function publishBatch({ batch, snapshot, plan, repoRoot, storeDir, save, runner = runCommand, verifyLocal = async () => {} }) {
  requireValue(batchIdValid(batch.id), '批次 ID 无效。')
  let gitLogDir = null, gitSequence = 0
  const execute = (command, args, options = {}) => {
    const operation = args.find(arg => ['clone','checkout','rev-parse','diff','ls-files','ls-remote','config','add','commit','push'].includes(arg)) || 'command'
    const logFile = command === 'git' && gitLogDir ? join(gitLogDir, 'git-' + String(++gitSequence).padStart(2,'0') + '-' + operation + '.log') : undefined
    return runner(command, args, { cwd: repoRoot, ...(logFile ? {logFile} : {}), ...options })
  }
  const marker = '<!-- kmnz-admin:' + batch.id + ' -->'
  const branch = 'kmnz-admin/batch-' + batch.id
  const defaultBranch = JSON.parse(await execute('gh', ['repo', 'view', repository, '--json', 'defaultBranchRef'])).defaultBranchRef?.name
  requireValue(text(defaultBranch, 250), '无法识别远端默认分支。')
  const persist = async phase => { batch.publication.phase = phase; await save() }
  const lookupPR = async () => {
    const prs = JSON.parse(await execute('gh', ['pr', 'list', '--repo', repository, '--head', branch, '--state', 'all', '--json', 'url,baseRefName,headRefOid,body,state,isDraft']))
    requireValue(Array.isArray(prs) && prs.length <= 1, '批次分支关联的 PR 不唯一，请人工处理。')
    if (!prs.length) return null
    const pr = prs[0]
    requireValue(pr.body?.includes(marker) && pr.baseRefName === batch.publication.base && pr.headRefOid === batch.publication.commit && /^https:\/\/github\.com\/THESuiseiCOMET\/KMNZ\/pull\/\d+$/i.test(pr.url), '已有 PR 与本批次不匹配，未覆盖。')
    return pr.url
  }
  if (batch.publication?.pushAttempted) {
    requireValue(batch.publication.base === defaultBranch, '远端默认分支已改变，保留原分支和草稿，需人工复核。')
    requireValue(batch.publication.reviewHash === plan.reviewHash, '推送尝试后不能修改批次；请恢复原审核内容或开始新批次。')
    const recoveryPath = relative(resolve(storeDir, 'batches', batch.id), resolve(batch.publication.workspace))
    requireValue(recoveryPath && !recoveryPath.startsWith('..') && !isAbsolute(recoveryPath) && sha(batch.publication.commit), '恢复目录或提交无效，未执行推送。')
    gitLogDir = dirname(batch.publication.workspace)
    const existing = await lookupPR()
    if (existing) { batch.publication.prUrl = existing; await persist('complete'); return existing }
    const remote = await execute('git', ['ls-remote', 'https://github.com/' + repository + '.git', 'refs/heads/' + branch])
    if (remote) requireValue(remote.split(/\s+/)[0] === batch.publication.commit, '批次远端分支已被其他操作修改，未覆盖。')
    if (!remote) {
      requireValue(await execute('git', ['rev-parse', 'HEAD'], { cwd: batch.publication.workspace }) === batch.publication.commit, '恢复目录的提交已变化，未执行推送。')
      await execute('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'origin', 'HEAD:refs/heads/' + branch], { cwd: batch.publication.workspace })
    }
  } else {
    const base = defaultBranch
    const workspace = resolve(storeDir, 'batches', batch.id, 'attempt-' + randomUUID(), 'checkout')
    requireValue(!isAbsolute(relative(storeDir, workspace)) && !relative(storeDir, workspace).startsWith('..'), '临时目录无效。')
    batch.publication = { phase: 'clone', base, workspace, reviewHash: plan.reviewHash }
    await save(); await mkdir(dirname(workspace), { recursive: true })
    gitLogDir = dirname(workspace)
    const clone = () => execute('git', ['clone', '--quiet', '--no-checkout', '--single-branch', '--branch', base, '--', 'https://github.com/' + repository + '.git', workspace], { timeout: 180000 })
    try { await clone() }
    catch (error) {
      if (!error.retryableClone) throw error
      // Retry only a read-only clone after Git removed its failed destination.
      const remains = await lstat(workspace).then(() => true, reason => { if (reason.code === 'ENOENT') return false; throw reason })
      if (remains) throw error
      await clone()
    }
    const baseSha = await execute('git', ['rev-parse', 'HEAD'], { cwd: workspace })
    requireValue(sha(baseSha), '远端基线提交无效。'); batch.publication.baseSha = baseSha
    await execute('git', ['checkout', '--detach', baseSha], { cwd: workspace })
    const remote = await loadSnapshot(join(workspace, 'KMNZ2.0'))
    assertRemoteIncludesLocal(snapshot.data, remote.data)
    const remotePlan = prepareBatch(remote.data, batch.videos, batch.reviews, batch.bindings, batch.edits)
    requireValue(remotePlan.reviewHash === plan.reviewHash, '远端生成的变更与已审核内容不同，已停止。')
    requireValue(remotePlan.files.length > 0, '没有需要发布的变更。')
    await persist('validate')
    for (const file of remotePlan.files) await writeFile(join(workspace, 'KMNZ2.0', file.path), file.content, 'utf8')
    validateData((await loadSnapshot(join(workspace, 'KMNZ2.0'))).data)
    const project = join(workspace, 'KMNZ2.0'), npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    const checkEnv = { YOUTUBE_API_KEY: '', GH_TOKEN: '', GITHUB_TOKEN: '', SPOTIFY_ACCESS_TOKEN: '', SPOTIFY_CLIENT_SECRET: '', NPM_TOKEN: '', NODE_AUTH_TOKEN: '', VITE_BASE_PATH: '/KMNZ/' }
    await execute(process.execPath, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: project, env: checkEnv, timeout: 600000, logFile: join(dirname(workspace), 'install.log') })
    const tests = (await readdir(join(project, 'scripts'))).filter(name => name.endsWith('.test.mjs')).map(name => join('scripts', name))
    requireValue(tests.length > 0, '远端缺少已有测试。')
    await execute(process.execPath, ['--test', ...tests], { cwd: project, env: checkEnv, timeout: 600000, logFile: join(dirname(workspace), 'tests.log') })
    await execute(process.execPath, [npmCli, 'run', 'build'], { cwd: project, env: checkEnv, timeout: 600000, logFile: join(dirname(workspace), 'build.log') })
    const changed = (await execute('git', ['diff', '--name-only'], { cwd: workspace })).split(/\r?\n/).filter(Boolean).sort()
    const permitted = remotePlan.files.map(file => 'KMNZ2.0/' + file.path).sort()
    requireValue(canonical(changed) === canonical(permitted), '临时目录出现批次以外的修改，未提交。')
    requireValue(!(await execute('git', ['ls-files', '--others', '--exclude-standard'], { cwd: workspace })), '临时目录出现未跟踪文件，未提交。')
    const latest = await execute('git', ['ls-remote', 'origin', 'refs/heads/' + base], { cwd: workspace })
    requireValue(latest.split(/\s+/)[0] === baseSha, '验证期间远端默认分支已变化；请重试，未推送。')
    await verifyLocal()
    const name = await execute('git', ['config', 'user.name']), email = await execute('git', ['config', 'user.email'])
    await execute('git', ['checkout', '-b', branch], { cwd: workspace })
    await execute('git', ['add', '--', ...permitted], { cwd: workspace })
    await execute('git', ['-c', 'user.name=' + name, '-c', 'user.email=' + email, 'commit', '-m', 'data: KMNZ Admin batch ' + batch.id], { cwd: workspace })
    batch.publication.commit = await execute('git', ['rev-parse', 'HEAD'], { cwd: workspace })
    requireValue(sha(batch.publication.commit), '批次提交无效。')
    const collision = await execute('git', ['ls-remote', 'origin', 'refs/heads/' + branch], { cwd: workspace })
    requireValue(!collision, '远端批次分支已存在，未覆盖。')
    batch.publication.pushAttempted = true
    await persist('push')
    await execute('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'origin', 'HEAD:refs/heads/' + branch], { cwd: workspace })
  }
  await persist('draft-pr')
  const bodyFile = resolve(storeDir, 'batches', batch.id, 'pr-body.md')
  await writeFile(bodyFile, reviewBody(batch, plan), 'utf8')
  await execute('gh', ['pr', 'create', '--repo', repository, '--draft', '--base', batch.publication.base, '--head', branch, '--title', 'data: KMNZ music batch ' + batch.id.slice(0, 8), '--body-file', bodyFile])
  const url = await lookupPR()
  requireValue(url, 'PR 创建结果尚未确认；重试将先检查已有 PR，不重复创建。')
  batch.publication.prUrl = url; await persist('complete')
  return url
}

export async function createAdmin({ root = projectRoot, runner = runCommand, apiKey = process.env.YOUTUBE_API_KEY, collect = collectVideos,
  bilibiliFetcher = adminTransport, storeDir = resolve(process.env.LOCALAPPDATA || tmpdir(), 'KMNZAdminMini', digest(root).slice(0, 12)), port = 4194 } = {}) {
  const repoRoot = resolve(root, '..'), csrf = randomBytes(32).toString('hex')
  const lookupBilibiliTitles = createBilibiliTitleLookup({ fetcher: bilibiliFetcher })
  let snapshot = await loadSnapshot(root)
  requireValue(relative(repoRoot, storeDir).startsWith('..') || isAbsolute(relative(repoRoot, storeDir)), '草稿目录必须在项目仓库之外。')
  const environment = await checkEnvironment(repoRoot, runner)
  environment.youtubeConfigured = Boolean(apiKey)
  let batch, busy = false
  try { batch = JSON.parse(await readFile(join(storeDir, 'active.json'), 'utf8')); requireValue(batchIdValid(batch.id) && Array.isArray(batch.videos) && Array.isArray(batch.bindings), '草稿格式无效。') }
  catch (error) { if (error.code !== 'ENOENT') throw new AdminError('现有草稿无法读取；未覆盖，请检查仓库外草稿目录：' + storeDir) }
  const fresh = (baseline = snapshot) => ({ id: randomUUID(), snapshotDigest: baseline.fingerprint, videos: [], reviews: [], edits: [], bindings: [], notices: [], reviewHash: null, reviewToken: null })
  batch ??= fresh()
  const save = async () => {
    await atomicJson(join(storeDir, 'batches', batch.id, 'draft.json'), batch)
    await atomicJson(join(storeDir, 'active.json'), batch)
  }
  const assertCurrent = async () => {
    requireValue(batch.snapshotDigest === snapshot.fingerprint && (await loadSnapshot(root)).fingerprint === snapshot.fingerprint, '本地曲库已变化，原草稿已保留；请点击“清空列表”读取最新曲库，无需重启工具。')
  }
  const state = () => ({ capabilities: { purge: true, bilibiliTitles: true }, environment, batch: { ...batch, publication: batch.publication ? { ...batch.publication } : undefined },
    stale: batch.snapshotDigest !== snapshot.fingerprint,
    songs: snapshot.data.songs.map(song => ({ id: song.id, title: song.title, artist: song.artist })),
    sources: snapshot.data.sources.filter(source => source.platform === 'youtube').map(source => ({ id: source.id, songId: source.target.songId, videoId: source.platformId, title: snapshot.data.songs.find(song => song.id === source.target.songId)?.title, bilibiliUrl: source.bilibiliUrl, display:source.display, classification:source.classification, sharedTitle:snapshot.data.sources.filter(other=>other.target.type==='song'&&other.target.songId===source.target.songId).length>1 })) })
  const buildLocal = async () => {
    batch.local.previewBuilt=false;await save()
    const npmCli=join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js')
    await runner(process.execPath,[npmCli,'run','build'],{cwd:root,timeout:600000,logFile:join(storeDir,'batches',batch.id,'local-build.log'),env:{YOUTUBE_API_KEY:'',GH_TOKEN:'',GITHUB_TOKEN:'',SPOTIFY_ACCESS_TOKEN:'',SPOTIFY_CLIENT_SECRET:'',NPM_TOKEN:'',NODE_AUTH_TOKEN:'',VITE_BASE_PATH:'/KMNZ/'}})
    await assertCurrent();batch.local.previewBuilt=true;await save()
  }
  let origin
  const headers = { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }
  const server = http.createServer(async (req, res) => {
    const reply = (status, value, type = 'application/json; charset=utf-8') => { res.writeHead(status, { ...headers, 'Content-Type': type }); res.end(type.startsWith('application/json') ? JSON.stringify(value) : value) }
    try {
      requireValue(req.headers.host === new URL(origin).host && (!req.headers.origin || req.headers.origin === origin), '只允许本机同源请求。')
      const path = new URL(req.url, origin).pathname
      if (req.method === 'GET' && path === '/api/health') return reply(200, { app: 'kmnz-admin-mini', projectId: digest(resolve(root)).slice(0, 12), protocolVersion: 1 })
      if (req.method === 'GET' && path === '/batch.mjs') return reply(200, await readFile(new URL('./batch.mjs', import.meta.url), 'utf8'), 'text/javascript; charset=utf-8')
      if (req.method === 'GET' && (path === '/' || path === '/app.js')) {
        const html = await readFile(resolve(root, 'admin/index.html'), 'utf8')
        if (path === '/app.js') return reply(200, html.match(/<script id="app-code" type="text\/plain">([\s\S]*?)<\/script>/)[1], 'text/javascript; charset=utf-8')
        return reply(200, html.replace('KMNZ_CSRF_TOKEN', csrf).replace(/<script id="app-code"[\s\S]*?<\/script>/, '<script src="/app.js" type="module"></script>'), 'text/html; charset=utf-8')
      }
      if (req.method === 'GET' && path === '/api/session') {
        requireValue(req.headers['x-kmnz-session'] === 'refresh', '会话更新需要本机页面请求。')
        return reply(200, { csrf, batchId: batch.id })
      }
      if (req.method === 'GET' && path === '/api/state') {
        const current = await loadSnapshot(root)
        return reply(200, { ...state(), stale: batch.snapshotDigest !== snapshot.fingerprint || current.fingerprint !== snapshot.fingerprint })
      }
      requireValue(req.method === 'POST' && req.headers.origin === origin && req.headers['content-type']?.split(';')[0] === 'application/json', '写操作需要本机页面的有效审核令牌。')
      if (req.headers['x-kmnz-token'] !== csrf) return reply(400, { code: 'SESSION_EXPIRED', error: '页面会话已过期，请刷新 Admin 页面后重试；草稿和恢复资料已保留。' })
      let body = '', size = 0
      for await (const chunk of req) { size += chunk.length; requireValue(size <= 1000000, '请求内容过大。'); body += chunk.toString('utf8') }
      let input
      try { input = JSON.parse(body) } catch { throw new AdminError('请求 JSON 无效。') }
      if (path === '/api/bilibili-titles') {
        requireValue(Array.isArray(input.urls) && input.urls.length <= 200, '待查询链接无效或过多。')
        const bvs = input.urls.map(url => bilibiliLink(url).bv)
        return reply(200, { titles: await lookupBilibiliTitles(bvs, { refresh: input.refresh === true }) })
      }
      requireValue(!busy, '当前操作尚未完成，请稍候。')
      busy = true
      try {
        if (path === '/api/purge') {
          requireValue(input.confirmed === true && input.batchId === batch.id, '请确认彻底清除当前草稿；批次已变化时请刷新。')
          requireValue(!batch.publication?.pushAttempted || batch.publication.phase === 'complete', '此批次远程发布结果尚未确认，请先恢复发布结果，再清除草稿。')
          const directory = resolve(storeDir,'batches',batch.id), parent = resolve(storeDir,'batches')
          requireValue(dirname(directory) === parent && batchIdValid(basename(directory)), '草稿目录无效，未清除。')
          const info = await lstat(directory).catch(error=>{if(error.code==='ENOENT')return null;throw error})
          requireValue(!info || info.isDirectory() && !info.isSymbolicLink(), '草稿目录不是普通目录，未清除。')
          requireValue(!info || dirname(await realpath(directory)) === await realpath(parent), '草稿目录超出允许范围，未清除。')
          const defaults = validateBatchSettings(input.settings ?? batch.defaults)
          if (batch.local && batch.local.status !== 'reverted' && !batch.publication?.pushAttempted) {
            const saved = JSON.parse(await readFile(join(directory,'local-change.json'),'utf8'))
            await replaceLibraryFiles(root,dataPaths,saved.after.raw,saved.before.raw,{allowPartial:true})
            snapshot=await loadSnapshot(root);batch.snapshotDigest=snapshot.fingerprint
            batch.local.status='reverted';batch.local.previewBuilt=false;batch.reviewToken=null;batch.reviewHash=null
            await save()
          }
          if (batch.local?.status === 'reverted' && !batch.local.previewBuilt && !batch.publication?.pushAttempted) await buildLocal()
          const nextSnapshot=await loadSnapshot(root), previousBatch=batch, previousSnapshot=snapshot
          batch={...fresh(nextSnapshot),defaults};snapshot=nextSnapshot
          try { await save() } catch(error) {batch=previousBatch;snapshot=previousSnapshot;throw error}
          try {
            if (info) {
            requireValue(!(await lstat(directory)).isSymbolicLink() && dirname(await realpath(directory)) === await realpath(parent), '草稿目录在清除前发生变化。')
            await rm(directory,{recursive:true,force:false})
            }
          } catch {
            batch.notices.push('新批次已就绪，但旧草稿目录未完全清除，请检查：'+directory);await save()
          }
          return reply(200,state())
        }
        if (path === '/api/new') {
          requireValue(!batch.local || batch.local.status === 'reverted' || batch.publication?.phase === 'complete', '本地修改尚未提交 PR，请先创建 PR 或撤回本地修改，再清空列表。')
          const nextSnapshot = await loadSnapshot(root)
          const defaults = validateBatchSettings(input.settings ?? batch.defaults)
          await save()
          const previousBatch = batch, previousSnapshot = snapshot
          batch = { ...fresh(nextSnapshot), defaults }; snapshot = nextSnapshot
          try { await save() }
          catch (error) { batch = previousBatch; snapshot = previousSnapshot; throw error }
          return reply(200, state())
        }
        if (path === '/api/undo-local') {
          requireValue(batch.local && batch.local.status !== 'reverted' && !batch.publication?.pushAttempted, '该批次不能撤回本地修改。')
          const saved = JSON.parse(await readFile(join(storeDir,'batches',batch.id,'local-change.json'),'utf8'))
          await replaceLibraryFiles(root,dataPaths,saved.after.raw,saved.before.raw,{allowPartial:true})
          snapshot = await loadSnapshot(root);batch.snapshotDigest = snapshot.fingerprint;batch.local.status = 'reverted';batch.local.previewBuilt=false;batch.reviewToken = null;batch.reviewHash = null
          await save();await buildLocal();return reply(200,state())
        }
        await assertCurrent()
        requireValue(!batch.publication?.pushAttempted || path === '/api/publish', '此批次已经尝试发布，只能重试同一批次或开始新批次。')
        if (batch.local && batch.local.status !== 'reverted' && !['/api/publish','/api/local-build'].includes(path)) throw new AdminError('请先撤回本地应用后继续编辑，或验收后创建 PR。')
        if (path === '/api/edit-source') {
          const source = snapshot.data.sources.find(source=>source.id===input.sourceId&&source.platform==='youtube')
          requireValue(source, '未找到 YouTube 来源。')
          batch.edits ??= []
          if (!batch.edits.some(row=>row.sourceId===source.id)) {
            const c = source.classification
            batch.edits.push({sourceId:source.id,videoId:source.platformId,selected:true,title:snapshot.data.songs.find(song=>song.id===source.target.songId).title,
              contentType:c?.contentType ?? '',era:source.display.era,members:[...new Set([...(c?.coverMembers??[]),...(c?.performers??[])].map(model.normalizeKMNZMember).filter(Boolean))],
              originalGroup:c?.originalGroup??'',bilibiliUrl:source.bilibiliUrl??'',memberMode:'manual',songId:'',confirmSharedTitle:false})
          }
          batch.reviewToken=null;batch.reviewHash=null;batch.preview=null;await save();return reply(200,state())
        }
        if (path === '/api/remove') {
          const removingEdit = typeof input.sourceId === 'string'
          const row = removingEdit ? batch.edits?.find(row=>row.sourceId===input.sourceId) : batch.videos.find(row=>row.videoId===input.videoId)
          requireValue(row, '该条目已不在待处理列表中。')
          const removedSource = removingEdit ? row.sourceId : sourceIdFor(row.videoId)
          await atomicJson(join(storeDir,'batches',batch.id,'before-remove-'+randomUUID()+'.json'),batch)
          const oldReviews = Array.isArray(input.reviews) ? input.reviews : batch.reviews
          const oldEdits = Array.isArray(input.edits) ? input.edits : batch.edits ?? []
          batch.videos = batch.videos.filter(video=>removingEdit||video.videoId!==row.videoId)
          batch.reviews = oldReviews.filter(review=>batch.videos.some(video=>video.videoId===review.videoId)).map(review=>!removingEdit&&review.songId===songIdFor(row.videoId)?{...review,songId:''}:review)
          batch.edits = oldEdits.filter(edit=>batch.edits?.some(saved=>saved.sourceId===edit.sourceId)&&(!removingEdit||edit.sourceId!==row.sourceId))
          batch.bindings = (Array.isArray(input.bindings)?input.bindings:batch.bindings).filter(binding=>binding.sourceId!==removedSource)
          const currentInputs = input.inputRows ?? batch.inputRows
          if (currentInputs && !removingEdit) {
            const yt=String(currentInputs.youtube??'').trimEnd().split(/\r?\n/),bv=String(currentInputs.bilibili??'').trimEnd().split(/\r?\n/)
            const drop=yt.map(value=>{try{return youtubeId(value.trim())===row.videoId}catch{return false}})
            if (!String(currentInputs.bilibili??'').trim() || yt.length===bv.length) batch.inputRows={youtube:yt.filter((_,i)=>!drop[i]).join('\n'),bilibili:String(currentInputs.bilibili??'').trim()?bv.filter((_,i)=>!drop[i]).join('\n'):''}
            else batch.inputRows=currentInputs
          }
          batch.reviewToken=null;batch.reviewHash=null;batch.preview=null;await save();return reply(200,state())
        }
        if (path === '/api/apply') {
          requireValue(input.reviewToken && input.reviewToken === batch.reviewToken, '请先生成有效预览。')
          const plan=prepareBatch(snapshot.data,batch.videos,batch.reviews,batch.bindings,batch.edits)
          requireValue(plan.reviewHash===batch.reviewHash&&plan.files.length>0,'预览已变化，请重新确认。')
          const after={data:plan.data,raw:snapshot.raw.map((raw,i)=>plan.files.find(file=>file.path===dataPaths[i])?.content??raw)}
          after.fingerprint=digest(after.raw)
          await atomicJson(join(storeDir,'batches',batch.id,'local-change.json'),{before:snapshot,after,reviewHash:plan.reviewHash})
          batch.local={status:'applying',afterFingerprint:after.fingerprint,previewBuilt:false};await save()
          try {await replaceLibraryFiles(root,dataPaths,snapshot.raw,after.raw)}
          catch(error){throw new AdminError(error.message+' 原始数据备份保留在本批次目录，可撤回。')}
          snapshot=await loadSnapshot(root);batch.snapshotDigest=snapshot.fingerprint;batch.local.status='applied';await save()
          await buildLocal();return reply(200,state())
        }
        if (path === '/api/local-build') {
          requireValue(['applied','reverted'].includes(batch.local?.status),'请先应用到本地曲库。');await buildLocal();return reply(200,state())
        }
        if (path === '/api/youtube') {
          const settings = validateBatchSettings(input.settings ?? batch.defaults)
          const paired = typeof input.bilibiliInput === 'string' && input.bilibiliInput.trim().length > 0
          const rows = paired ? pairingRows(input.input, input.bilibiliInput) : []
          if (paired) pairAvailableBindings(rows, snapshot.data, [...batch.videos, ...rows.map(row => ({ videoId: row.videoId }))], input.bindings ?? batch.bindings)
          const result = await collect(input.input, snapshot.data, batch.videos, { apiKey })
          const videos = [...batch.videos, ...result.videos]
          const pairing = pairAvailableBindings(rows, snapshot.data, videos, input.bindings ?? batch.bindings)
          const priorReviews = input.reviews ?? batch.reviews ?? []
          requireValue(Array.isArray(priorReviews) && priorReviews.length <= 200, '现有审核数据无效。')
          const existingReviews = new Map(priorReviews.filter(row => row && batch.videos.some(video => video.videoId === row.videoId)).map(row => [row.videoId, row]))
          const reviews = videos.map(video => existingReviews.get(video.videoId) ?? initialReview(video, settings))
          batch.videos = videos; batch.reviews = reviews; batch.bindings = pairing.bindings
          batch.defaults = settings; batch.inputRows = { youtube: input.input, bilibili: input.bilibiliInput ?? '' }
          batch.notices = [...result.notices, ...pairing.notices]; batch.reviewToken = null; batch.reviewHash = null; batch.preview = null
          await save(); return reply(200, state())
        }
        if (path === '/api/bilibili') return reply(200, { links: tokens(input.input).map(bilibiliLink) })
        if (path === '/api/preview') {
          const plan = prepareBatch(snapshot.data, batch.videos, input.reviews, input.bindings, input.edits ?? batch.edits)
          requireValue(plan.files.length > 0, '没有新增变更；相同绑定不会重复写入。')
          if (input.settings) batch.defaults = validateBatchSettings(input.settings)
          batch.edits = input.edits ?? batch.edits ?? []
          batch.reviews = input.reviews; batch.bindings = input.bindings; batch.reviewHash = plan.reviewHash; batch.preview = plan.review; batch.reviewToken = randomBytes(24).toString('hex')
          await save(); return reply(200, { review: plan.review, reviewToken: batch.reviewToken })
        }
        if (path === '/api/publish') {
          requireValue((batch.local?.status==='applied'&&batch.local.previewBuilt&&input.localConfirmed===true)||batch.publication?.pushAttempted,'请先应用到本地、完成构建，并在本地网页验收后确认。')
          const base = batch.local?.status==='applied' ? (JSON.parse(await readFile(join(storeDir,'batches',batch.id,'local-change.json'),'utf8'))).before : snapshot
          requireValue(input.confirmed === true && input.reviewToken && input.reviewToken === batch.reviewToken, '请先生成并人工确认本批次预览。')
          const checked = await checkEnvironment(repoRoot, runner)
          requireValue(checked.canPublish, checked.problems.join(' '))
          const plan = prepareBatch(base.data, batch.videos, batch.reviews, batch.bindings, batch.edits)
          requireValue(plan.reviewHash === batch.reviewHash, '审核内容已变化，请重新预览确认。')
          const url = await publishBatch({ batch, snapshot:base, plan, repoRoot, storeDir, save, runner, verifyLocal: assertCurrent })
          return reply(200, { url })
        }
        throw new AdminError('未知操作。')
      } finally { busy = false }
    } catch (error) {
      reply(error instanceof AdminError ? 400 : 500, { error: error instanceof AdminError ? error.message : '操作失败；草稿和原始曲库未被覆盖。请检查环境或在保留的临时目录中复核。', recovery: req.url?.split('?')[0] === '/api/publish' ? batch?.publication?.workspace : ['/api/apply','/api/local-build','/api/undo-local','/api/purge'].includes(req.url?.split('?')[0]) ? join(storeDir,'batches',batch.id) : undefined })
    }
  })
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept) })
  origin = 'http://127.0.0.1:' + server.address().port
  return { server, origin, csrf, get snapshot() { return snapshot }, get batch() { return batch }, environment, close: () => new Promise(accept => { server.closeIdleConnections(); server.close(accept) }) }
}

export async function startAdmin({ root = projectRoot, port = 4194, ...options } = {}) {
  const origin = 'http://127.0.0.1:' + port
  const occupied = () => new AdminError(port + ' 端口已被其他程序或旧版 Admin 占用。请关闭对应的服务窗口后重试；不会终止其他程序，草稿已保留。')
  const probe = async () => {
    try {
      const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(1500), redirect: 'error' })
      if (!response.ok) return { matches: false }
      let value
      try { value = await response.json() } catch { return { matches: false } }
      return { matches: value?.app === 'kmnz-admin-mini' && value.projectId === digest(resolve(root)).slice(0, 12) && value.protocolVersion === 1 }
    } catch { return null }
  }
  const existing = port ? await probe() : null
  if (existing?.matches) return { origin, reused: true }
  if (existing) throw occupied()
  try { return { ...await createAdmin({ root, port, ...options }), reused: false } }
  catch (error) {
    if (error.code !== 'EADDRINUSE') throw error
    if ((await probe())?.matches) return { origin, reused: true }
    throw occupied()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    try { process.loadEnvFile(resolve(projectRoot, '.env.local')) } catch (error) { if (error.code !== 'ENOENT') throw new AdminError('无法读取 .env.local，请检查文件格式。') }
    const app = await startAdmin()
    console.log((app.reused ? 'KMNZ Admin Mini 已在运行，使用现有服务：' : 'KMNZ Admin Mini：') + app.origin)
    for (const problem of app.environment?.problems ?? []) console.log(problem)
    if (!app.reused && !app.environment.youtubeConfigured) console.log('未配置 YOUTUBE_API_KEY；可先测试已有视频去重及 Bilibili 绑定。')
    if (process.argv.includes('--open')) {
      if (process.platform === 'win32') spawn('rundll32.exe', ['url.dll,FileProtocolHandler', app.origin], { windowsHide: true, stdio: 'ignore' }).on('error', () => console.log('请手动打开上述地址。'))
    }
  } catch (error) { console.error(error instanceof AdminError ? error.message : '启动失败，请检查 Node.js 22、项目依赖和 4194 端口。'); process.exitCode = 1 }
}
