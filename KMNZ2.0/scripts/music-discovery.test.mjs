import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { discover, validateAllowlist, validateCandidates, serialize, youtubeJson, emptyCandidates } from './discovery/core.mjs'
import { loadContext, runLocal, protectedPaths, configPath, candidatePath, saveCandidates } from './discover-music.mjs'

const context = await loadContext()
const config = context.config, channel = config.youtube.channels[0]
const uploads = 'UU' + channel.channelId.slice(2), id = 'NewVideo001', second = 'NewVideo002'
const known = context.library.sources.find(source => source.platform === 'youtube')
const now = '2026-10-29T06:00:00.000Z'
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const rawVideo = (videoId = id, overrides = {}) => ({
  id: videoId,
  snippet: { title: 'WAVE', description: 'Official video description', channelId: channel.channelId, channelTitle: 'KMNZ', publishedAt: '2026-10-28T23:30:00Z', categoryId: '10', liveBroadcastContent: 'none',
    thumbnails: { maxres: { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` }, medium: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` } } },
  contentDetails: { duration: 'PT3M12S' }, status: { privacyStatus: 'public', embeddable: true }, ...overrides,
})
function service({ videos = [rawVideo()], pages = [[id]], fail, imageSizes = {} } = {}) {
  const calls = []
  const fetcher = async value => {
    const url = new URL(value), method = url.pathname.split('/').pop()
    calls.push(url)
    if (fail) return fail(url)
    if (url.hostname === 'i.ytimg.com') {
      const size = imageSizes[method] ?? [1280, 720]
      const bytes = Buffer.alloc(21)
      bytes.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8])
      bytes.writeUInt16BE(size[1], 7); bytes.writeUInt16BE(size[0], 9)
      return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } })
    }
    if (method === 'channels') return json({ items: [{ id: channel.channelId, contentDetails: { relatedPlaylists: { uploads } } }] })
    if (method === 'playlistItems') {
      const index = Number(url.searchParams.get('pageToken') ?? 0)
      return json({ items: (pages[index] ?? []).map(id => ({ contentDetails: { videoId: id } })), ...(index < pages.length - 1 ? { nextPageToken: String(index + 1) } : {}) })
    }
    if (method === 'videos') return json({ items: videos.filter(video => url.searchParams.get('id').split(',').includes(video.id)) })
    throw new Error('Unexpected fixture request')
  }
  return { fetcher, calls }
}
const collect = (options = {}, fixture = service()) => discover({ ...context, now, apiKey: 'fixture-secret', fetcher: fixture.fetcher, sleep: async () => {}, ...options })

test('D1 allowlist is explicit and validated; official fixture owns an existing source', async () => {
  validateAllowlist(config)
  const fixture = JSON.parse(await readFile(new URL('./fixtures/music-c4-official.json', import.meta.url), 'utf8'))
  assert(JSON.stringify(fixture).includes(channel.channelId))
  for (const mutate of [value => value.youtube.channels.push(value.youtube.channels[0]), value => value.youtube.maxPagesPerChannel = 99, value => value.youtube.channels[0].channelUrl = 'https://example.com/']) {
    const invalid = structuredClone(config); mutate(invalid)
    assert.throws(() => validateAllowlist(invalid))
  }
})

test('platform ID dedup includes listed:false; same title is never a song or release association', async () => {
  const library = structuredClone(context.library)
  library.sources.find(source => source.id === known.id).listed = false
  const fixture = service({ pages: [[known.platformId, id, id, second]], videos: [rawVideo(), rawVideo(second)] })
  const before = serialize(library)
  const result = await collect({ library }, fixture)
  assert.equal(result.report.added, 2)
  assert.equal(new Set(result.document.candidates.map(candidate => candidate.key)).size, 2)
  for (const candidate of result.document.candidates) {
    assert.equal(candidate.raw.title, 'WAVE')
    assert.equal(candidate.review.status, 'pending')
    assert.equal(candidate.raw.publishedAt, '2026-10-28T23:30:00Z')
    for (const field of ['songId', 'releaseId', 'target', 'releaseDate', 'trackNumber']) assert.equal(Object.hasOwn(candidate, field), false)
    assert.equal(candidate.discoveredAt, now)
    assert(!serialize(candidate).includes('fixture-secret'))
  }
  assert.equal(serialize(library), before)
})

test('repeated discovery is byte-stable, retains dismissed items and every manual candidate edit', async () => {
  const first = await collect()
  first.document.candidates[0].review = { status: 'dismissed', note: 'Not an original recording; manual decision' }
  first.document.candidates[0].raw.title = 'Manually corrected display note'
  const fixture = service({ videos: [rawVideo(id, { snippet: { title: 'Changed remote title' } })] })
  const again = await collect({ previous: first.document, now: '2026-11-01T00:00:00Z' }, fixture)
  assert.equal(again.report.added, 0)
  assert.equal(serialize(again.document), serialize(first.document))
  assert.equal(fixture.calls.filter(url => url.pathname.endsWith('/videos')).length, 0)
})

test('pagination continues through known uploads; reports truncation and never uses playlist insertion dates', async () => {
  const fixture = service({ pages: [[known.platformId], [id], [second]] })
  const result = await collect({}, fixture)
  assert.equal(result.report.added, 1)
  assert.equal(result.report.channels[0].pages, 2)
  assert.equal(result.report.channels[0].truncated, true)
  assert.equal(result.document.candidates[0].raw.publishedAt, rawVideo().snippet.publishedAt)
  const malicious = service({ fail: url => url.pathname.endsWith('/channels')
    ? json({ items: [{ id: channel.channelId, contentDetails: { relatedPlaylists: { uploads } } }] })
    : json({ items: [], nextPageToken: 'same' }) })
  await assert.rejects(collect({}, malicious), /repeated/)
})

test('missing dates, wrong owners, nonmusic, private, live, unembeddable and empty videos stay out of candidate changes', async () => {
  const base = rawVideo()
  for (const video of [
    { ...base, snippet: { ...base.snippet, publishedAt: '2025' } },
    { ...base, snippet: { ...base.snippet, channelId: 'UC0000000000000000000000' } },
    { ...base, snippet: { ...base.snippet, categoryId: '22' } },
    { ...base, snippet: { ...base.snippet, liveBroadcastContent: 'upcoming' } },
    { ...base, status: { ...base.status, privacyStatus: 'private' } },
    { ...base, status: { ...base.status, embeddable: false } },
    { ...base, contentDetails: { duration: 'PT0S' } },
    { ...base, snippet: { ...base.snippet, title: '' } },
  ]) {
    const result = await collect({}, service({ videos: [video] }))
    assert.equal(result.document.candidates.length, 0)
    assert.equal(result.report.rejected[0].reason, 'invalid-or-ineligible-video')
  }
  const missing = await collect({}, service({ videos: [] }))
  assert.equal(missing.report.rejected[0].reason, 'unavailable-video')
})

test('HTTP 200 low-resolution maxres placeholders fall back to real mqdefault dimensions; failed images stay null', async () => {
  const fixture = service({ imageSizes: { 'maxresdefault.jpg': [120, 90], 'mqdefault.jpg': [320, 180] } })
  const result = await collect({}, fixture)
  const cover = result.document.candidates[0].cover
  assert.equal(cover.width, 320); assert.equal(cover.height, 180)
  assert(cover.url.endsWith('/mqdefault.jpg'))
  assert.equal(fixture.calls.some(url => url.href.includes('hqdefault')), false)
  const empty = await collect({ probe: async () => null })
  assert.equal(empty.document.candidates[0].cover, null)
})

test('network/429/5xx retries are bounded, 403 does not retry, and sensitive error payloads are not propagated', async () => {
  for (const status of [403, 429, 500]) {
    let calls = 0
    await assert.rejects(youtubeJson('channels', { id: channel.channelId }, { apiKey: 'fixture-secret', sleep: async () => {}, fetcher: async () => {
      calls++; return new Response('{"error":{"message":"fixture-secret"}}', { status })
    } }), error => error.message === 'YouTube API HTTP ' + status && !error.message.includes('fixture-secret'))
    assert.equal(calls, status === 403 ? 1 : 3)
  }
  let network = 0
  await assert.rejects(youtubeJson('channels', {}, { apiKey: 'fixture-secret', sleep: async () => {}, fetcher: async () => { network++; throw new Error('request URL includes fixture-secret') } }), /YouTube network request failed/)
  assert.equal(network, 3)
  await assert.rejects(collect({}, service({ fail: () => json({ error: { message: 'fixture-secret' } }) })), /Invalid YouTube response/)
  await assert.rejects(collect({}, service({ fail: () => new Response('not json') })), /Invalid YouTube response body/)
})

async function temporaryProject() {
  const root = await mkdtemp(join(tmpdir(), 'kmnz-d1-'))
  for (const [path, content] of context.originals) {
    await mkdir(dirname(resolve(root, path)), { recursive: true })
    await writeFile(resolve(root, path), content)
  }
  return root
}
async function cleanProject(root) {
  assert.equal(dirname(root), resolve(tmpdir()))
  assert(root.startsWith(join(tmpdir(), 'kmnz-d1-')))
  await rm(root, { recursive: true, force: true })
}

test('CLI dry-run/no credentials and API failure preserve all five live JSONs, overrides and existing candidate bytes', async () => {
  const root = await temporaryProject()
  try {
    const before = new Map(await Promise.all([...protectedPaths, candidatePath, configPath].map(async path => [path, await readFile(resolve(root, path), 'utf8')])))
    const noKey = await runLocal({ root, write: true, apiKey: '', fetcher: async () => { throw new Error('No request expected') } })
    assert.equal(noKey.report.status, 'no-credentials')
    await runLocal({ root, apiKey: 'fixture-secret', now, fetcher: service().fetcher })
    await assert.rejects(runLocal({ root, write: true, apiKey: 'fixture-secret', fetcher: service({ fail: () => new Response('quota', { status: 403 }) }).fetcher }))
    for (const [path, bytes] of before) assert.equal(await readFile(resolve(root, path), 'utf8'), bytes, path)
    await runLocal({ root, write: true, apiKey: 'fixture-secret', now, fetcher: service().fetcher })
    const candidateBytes = await readFile(resolve(root, candidatePath), 'utf8')
    await runLocal({ root, write: true, apiKey: 'fixture-secret', now: '2026-11-01T00:00:00Z', fetcher: service().fetcher })
    assert.equal(await readFile(resolve(root, candidatePath), 'utf8'), candidateBytes)
    for (const path of protectedPaths) assert.equal(await readFile(resolve(root, path), 'utf8'), before.get(path), path)
  } finally { await cleanProject(root) }
})

test('candidate validation rejects invented relationships and secrets in evidence URLs; concurrent local edits block saves', async () => {
  const result = await collect(), candidate = result.document.candidates[0]
  for (const mutate of [value => value.songId = 'song-wave', value => value.evidence.videoApiUrl += '&key=fixture-secret', value => value.platformId = 'wrong', value => value.review.status = 'approved', value => value.raw.publishedAt = '2026-02-30T00:00:00Z']) {
    const changed = structuredClone(candidate); mutate(changed)
    assert.throws(() => validateCandidates({ schemaVersion: 1, candidates: [changed] }, config))
  }
  const root = await temporaryProject()
  try {
    const local = await loadContext(root)
    await writeFile(resolve(root, protectedPaths[4]), local.originals.get(protectedPaths[4]) + '\n')
    await assert.rejects(saveCandidates(local, result.document), /Local input changed/)
    assert.equal(await readFile(resolve(root, candidatePath), 'utf8'), local.originals.get(candidatePath))
  } finally { await cleanProject(root) }
  assert.deepEqual(emptyCandidates(), context.previous)
})
