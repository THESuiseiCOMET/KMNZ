import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { loadTypeScript } from './load-typescript.mjs'

const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))
const routes = await loadTypeScript(new URL('../src/lib/siteRoute.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const { createQueueSelections, queueReducer, emptyQueue } = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const { sortMusicEntries, musicDate } = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const baseline = JSON.parse(await readFile(new URL('./fixtures/music-c1-library.json', import.meta.url), 'utf8'))
const fixture = () => {
  const value = structuredClone(baseline)
  const videos = value.sources.filter(source => source.platform === 'youtube')
  for (const [i, members] of [['lita', 'tina'], ['NERO'], ['LITA']].entries()) videos[i].classification = {
    contentType: i === 2 ? 'cover' : 'stream',
    ...(i === 2 ? { coverMembers: members } : { performers: members }),
    evidenceUrls: [videos[i].externalUrl],
  }
  return { value, videos }
}
const ids = entries => entries.map(entry => entry.id)

test('Stream validates confirmed members without admitting Cover fields, Original groups, or Spotify classification', () => {
  const { value, videos } = fixture()
  assert.doesNotThrow(() => model.parseMusicLibrary(value))
  assert.deepEqual(model.youtubeStreamMembers(videos[0].classification), ['LITA', 'TINA'])
  assert.deepEqual(model.youtubeCoverMembers(videos[0].classification), [])
  for (const members of [undefined, [], ['LIZ'], ['lita', 'LITA'], ['other']]) {
    const invalid = structuredClone(value)
    invalid.sources[0].classification.performers = members
    assert.throws(() => model.parseMusicLibrary(invalid), /classification/)
  }
  for (const extra of [{ coverMembers: ['lita'] }, { originalGroup: 'lita-tina-nero' }, { evidenceUrls: [] }]) {
    const invalid = structuredClone(value)
    Object.assign(invalid.sources[0].classification, extra)
    assert.throws(() => model.parseMusicLibrary(invalid), /classification/)
  }
  const invalid = structuredClone(value)
  invalid.sources.find(source => source.platform === 'spotify').classification = videos[0].classification
  assert.throws(() => model.parseMusicLibrary(invalid), /YouTube only/)
})

test('Stream search/member filters remain separate from Cover and keep one source per video and queue item', () => {
  const { value, videos } = fixture(), views = createMusicViews(value)
  assert.deepEqual(ids(views.youtubeCards('', 'stream')), [videos[0].id, videos[1].id])
  for (const member of ['LITA', 'TINA']) assert.deepEqual(ids(views.youtubeCards('', 'stream', null, member)), [videos[0].id])
  assert.deepEqual(ids(views.youtubeCards('', 'stream', null, 'NERO')), [videos[1].id])
  assert.deepEqual(views.youtubeCards('', 'stream', null, 'LIZ'), [])
  assert(!views.youtubeCards('', 'cover').some(entry => entry.id === videos[0].id))
  const entries = views.youtubeCards('', 'stream', null, 'TINA')
  const title = entries[0].title
  assert.deepEqual(ids(views.youtubeCards(title, 'stream', null, 'TINA')), ids(entries))
  assert.deepEqual(views.youtubeCards('missing-fixture-stream-title', 'stream'), [])
  const selection = createQueueSelections(value).list(entries, entries[0].id, title)
  const queue = queueReducer(emptyQueue, { type: 'select', selection })
  assert.deepEqual(queue.items.map(item => item.sourceId), ids(entries))
  const before = structuredClone(queue)
  views.youtubeCards('', 'cover')
  assert.deepEqual(queue, before)
  videos[1].listed = false
  assert.deepEqual(ids(createMusicViews(value).youtubeCards('', 'stream')), [videos[0].id])
})

test('Stream route toggles and stored playlist positions survive serialization with only its three members', () => {
  const filter = routes.changeMusicFilter
  let route = filter({ ...routes.defaultMusicRoute }, { type: 'youtube', value: 'stream' })
  route = filter(route, { type: 'member', value: 'TINA' })
  assert.equal(route.youtubeMember, 'TINA')
  assert.deepEqual(filter(route, { type: 'member', value: 'LIZ' }), route)
  const hash = routes.siteRouteHash({ page: 'music', music: route })
  assert.equal(hash, '#/music/youtube?category=stream&member=TINA')
  assert.deepEqual(routes.parseSiteRoute(hash, new Set()).music, route)
  const memory = routes.parseMusicMemory(JSON.stringify({ hash, scroll: 1500, panelScroll: 0, sourceIds: ['stream-fixture'] }), new Set())
  assert.deepEqual(memory.route, route); assert.equal(memory.scroll, 1500)
  for (const member of ['lita', 'tina', 'nero']) assert.equal(routes.parseSiteRoute('#/music/youtube?category=stream&member=' + member, new Set()).music.youtubeMember, member.toUpperCase())
  assert.equal(routes.parseSiteRoute('#/music/youtube?category=stream&member=LIZ', new Set()).music.youtubeMember, null)
  assert(!routes.siteRouteHash({ page: 'music', music: { ...route, youtubeMember: 'LIZ' } }).includes('member='))
  assert.equal(filter(route, { type: 'member', value: 'TINA' }).youtubeMember, null)
  assert.equal(filter(route, { type: 'youtube', value: 'cover' }).youtubeMember, null)
  assert.equal(filter(route, { type: 'youtube', value: 'stream' }).youtubeCategory, 'all')
  const spotify = filter(route, { type: 'platform', value: 'spotify' })
  assert.equal(spotify.youtubeCategory, 'all'); assert.equal(spotify.youtubeMember, null)
  assert.deepEqual(filter(spotify, { type: 'member', value: 'TINA' }), spotify)
})

test('Stream uses the same exact publication timestamp, Tokyo date, and unknown-last ordering', () => {
  const { value } = fixture(), entries = createMusicViews(value).youtubeCards('', 'stream')
  const publishedAt = { value: '2026-10-11T16:00:10Z', source: 'youtube-data-api', status: 'verified', verifiedAt: '2026-11-02T00:00:00Z', sourceUrl: entries[0].externalUrl }
  const automatic = { [entries[0].id]: { platformId: entries[0].platformId, publishedAt } }
  assert.equal(musicDate(entries[0], automatic[entries[0].id]).label, '2026.10.12')
  assert.equal(musicDate(entries[0], automatic[entries[0].id]).dateTime, publishedAt.value)
  assert.equal(musicDate(entries[1], {}), null)
  assert.deepEqual(ids(sortMusicEntries([entries[1], entries[0]], automatic, {})), ids(entries))
})

test('actual Music page renders Stream with LITA/TINA/NERO, no LIZ, and an empty state without inventing records', async () => {
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../', import.meta.url)), base: '/KMNZ/', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { default: Music } = await server.ssrLoadModule('/src/pages/Music.tsx')
    const render = route => renderToStaticMarkup(createElement(Music, { route, selectedId: null, onSelect: () => {} }))
    const stream = render({ ...routes.defaultMusicRoute, youtubeCategory: 'stream' })
    for (const label of ['original', 'cover', 'stream', 'LITA', 'TINA', 'NERO']) assert(stream.includes('data-segment-value="' + label + '"'))
    assert(stream.includes('aria-label="Stream 成员"'))
    assert(!stream.includes('data-segment-value="LIZ"'))
    assert(!stream.includes('<iframe'))
    const cover = render({ ...routes.defaultMusicRoute, youtubeCategory: 'cover' })
    assert(cover.includes('data-segment-value="LIZ"'))
    const spotify = render({ ...routes.defaultMusicRoute, platform: 'spotify' })
    assert(!spotify.includes('data-segment-value="stream"'))
  } finally { await server.close() }
})
