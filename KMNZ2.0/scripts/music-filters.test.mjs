import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { loadTypeScript } from './load-typescript.mjs'

const { musicLibrary: library } = await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))
const routes = await loadTypeScript(new URL('../src/lib/siteRoute.ts', import.meta.url))
const { createQueueSelections, queueReducer, emptyQueue } = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const { sortMusicByDate, getMusicMetadata } = await loadTypeScript(new URL('../src/data/musicMetadata.ts', import.meta.url))
const { musicDate, coverCandidates } = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const ids = entries => entries.map(entry => entry.id)
const base = () => ({ ...routes.defaultMusicRoute })
const filter = routes.changeMusicFilter

test('YouTube primary and secondary toggles deselect, clear dependent filters and reject inactive platform actions', () => {
  let route = filter(base(), { type: 'youtube', value: 'original' })
  route = filter(route, { type: 'group', value: 'lita-liz' })
  assert.equal(route.youtubeGroup, 'lita-liz')
  route = filter(route, { type: 'group', value: 'lita-liz' })
  assert.equal(route.youtubeGroup, null)
  route = filter(route, { type: 'group', value: 'lita-liz' })
  route = filter(route, { type: 'youtube', value: 'cover' })
  assert.equal(route.youtubeGroup, null)
  route = filter(route, { type: 'member', value: 'LITA' })
  assert.equal(route.youtubeMember, 'LITA')
  route = filter(route, { type: 'member', value: 'LITA' })
  assert.equal(route.youtubeMember, null)
  route = filter(route, { type: 'member', value: 'LIZ' })
  route = filter(route, { type: 'youtube', value: 'cover' })
  assert.equal(route.youtubeCategory, 'all'); assert.equal(route.youtubeMember, null)
  assert.deepEqual(filter(route, { type: 'spotify', value: 'ep' }), route)
})

test('Spotify album and EP categories toggle to all, retain Single membership and reset when switching platforms', () => {
  let route = filter(base(), { type: 'platform', value: 'spotify' })
  for (const value of ['albums', 'ep']) {
    route = filter(route, { type: 'spotify', value })
    assert.equal(route.category, value)
    route = filter(route, { type: 'spotify', value })
    assert.equal(route.category, 'all')
  }
  route = filter(filter(route, { type: 'spotify', value: 'ep' }), { type: 'platform', value: 'youtube' })
  assert.deepEqual(route, base())
  route = filter(filter(route, { type: 'youtube', value: 'original' }), { type: 'group', value: 'lita-liz' })
  route = filter(route, { type: 'platform', value: 'spotify' })
  assert.equal(route.youtubeCategory, 'all'); assert.equal(route.youtubeGroup, null)
  assert.deepEqual(filter(route, { type: 'youtube', value: 'cover' }), route)
  const views = createMusicViews(library)
  assert(views.spotifyCards('', 'ep').some(entry => entry.id === 'sp-drops'))
  assert.equal(library.releases.find(release => release.id === 'release-drops').kind, 'single')
  assert.deepEqual(new Set(ids(views.spotifyCards(''))), new Set([...ids(views.spotifyCards('', 'albums')), ...ids(views.spotifyCards('', 'ep'))]))
})

test('original classification preserves manually assigned group membership and verified source metadata', () => {
  const views = createMusicViews(library)
  assert.deepEqual(new Set(ids(views.youtubeCards('', 'original'))), new Set([
    ...ids(views.youtubeCards('', 'original', 'lita-liz')), ...ids(views.youtubeCards('', 'original', 'lita-tina-nero')),
  ]))
  for(const id of ['yt-fiction','yt-miraizu']) assert(views.youtubeCards('', 'original', 'lita-liz').some(entry => entry.id === id))
  assert(views.youtubeCards('', 'original', 'lita-tina-nero').some(entry => entry.id === 'yt-boarding-tina'))
  assert(views.youtubeCards('', 'original', 'lita-liz').some(entry => entry.id === 'yt-our-days'))
  for(const id of ['yt-wave','yt-reload','yt-wanted']) assert(views.youtubeCards('', 'original', 'lita-tina-nero').some(entry => entry.id === id))
  for (const source of library.sources.filter(source => source.platform === 'youtube')) {
    assert(source.classification.evidenceUrls.length)
    assert(source.classification.evidenceUrls.every(url => url.startsWith('https://www.youtube.com/')))
  }
  assert.equal(library.sources.filter(source => source.platformId === 'tUXZqCTGk_o').length, 1)
  const boarding = views.youtubeCards('Boarding')[0]
  assert.equal(boarding.artist, 'SEE, KMNZ TINA')
  assert.equal(getMusicMetadata(boarding).publishedAt.value, '2026-07-17T04:00:26-07:00')
  assert.equal(musicDate(boarding, getMusicMetadata(boarding)).label, '2026.07.17')
  assert(coverCandidates(boarding, getMusicMetadata(boarding)).at(-1).endsWith('/mqdefault.jpg'))
})

test('multi-member covers belong to each confirmed member once; unknown historical sources remain in all results', () => {
  const value = structuredClone(library)
  value.sources.filter(source => source.platform === 'youtube').forEach(source => { delete source.classification })
  const videos = value.sources.filter(source => source.platform === 'youtube')
  videos[0].classification = { contentType: 'cover', performers: ['LITA', 'TINA', 'NERO'], evidenceUrls: [videos[0].externalUrl] }
  delete videos[1].classification
  const catalog = model.toMusicCatalog(value)
  const views = createMusicViews(value, [...catalog, catalog[0]])
  assert.equal(views.youtubeCards('').length, videos.length)
  for (const member of ['LITA', 'TINA', 'NERO']) assert.deepEqual(ids(views.youtubeCards('', 'cover', null, member)), [videos[0].id])
  assert.deepEqual(views.youtubeCards('', 'cover', null, 'LIZ'), [])
  assert.equal(views.youtubeCards('', 'cover').length, 1)
  assert(views.youtubeCards('').some(entry => entry.id === videos[1].id))
  assert(!views.youtubeCards('', 'original').some(entry => entry.id === videos[1].id))
  videos[0].classification.performers = ['LIZ']
  assert.deepEqual(ids(createMusicViews(value).youtubeCards('', 'cover', null, 'LIZ')), [videos[0].id])
  videos[0].listed = false
  assert(!createMusicViews(value).youtubeCards('').some(entry => entry.id === videos[0].id))
})

test('YouTube search, date sorting and queue snapshots use exactly the visible classification results', () => {
  const views = createMusicViews(library), selections = createQueueSelections(library)
  const entries = sortMusicByDate(views.youtubeCards('', 'original', 'lita-liz'))
  const selection = selections.list(entries, entries[2].id)
  assert.deepEqual(selection.items.map(item => item.sourceId), ids(entries))
  const queue = queueReducer(emptyQueue, { type: 'select', selection })
  const before = structuredClone(queue)
  views.youtubeCards('WAVE', 'original', 'lita-tina-nero')
  filter(base(), { type: 'youtube', value: 'cover' })
  assert.deepEqual(queue, before)
  const dates = entries.map(entry => musicDate(entry, getMusicMetadata(entry))).filter(Boolean).map(date => date.order)
  const firstUnknown = entries.findIndex(entry => !musicDate(entry, getMusicMetadata(entry)))
  if (firstUnknown >= 0) assert(entries.slice(firstUnknown).every(entry => !musicDate(entry, getMusicMetadata(entry))))
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a))
  const searched = sortMusicByDate(views.youtubeCards('VR', 'original', 'lita-liz'))
  const searchQueue = selections.list(searched, searched[0].id, 'VR')
  assert.equal(searchQueue.origin.kind, 'search')
  assert.deepEqual(searchQueue.items.map(item => item.sourceId), ids(searched))
  assert.equal(views.youtubeCards('WAVE', 'original', 'lita-liz').length, 0)
})

test('classification validation rejects guessed categories, duplicate members, missing evidence and Spotify classification', () => {
  const mutate = classification => { const value = structuredClone(library); value.sources[0].classification = classification; return value }
  const valid = { contentType: 'cover', performers: ['LITA', 'LIZ'], evidenceUrls: ['https://www.youtube.com/watch?v=MehG9Ms8ygU'] }
  assert.doesNotThrow(() => model.parseMusicLibrary(mutate(valid)))
  for (const invalid of [
    { ...valid, contentType: 'live' }, { ...valid, originalGroup: 'special' },
    { ...valid, performers: 'LITA' }, { ...valid, performers: ['LITA', 'LITA'] },
    { ...valid, performers: ['UNKNOWN'] }, { ...valid, evidenceUrls: [] },
    { ...valid, evidenceUrls: ['javascript:alert(1)'] }, { ...valid, extra: true },
    { contentType: 'original', originalGroup: '2025', evidenceUrls: valid.evidenceUrls },
  ]) assert.throws(() => model.parseMusicLibrary(mutate(invalid)), /classification/)
  const spotify = structuredClone(library)
  spotify.sources.find(source => source.platform === 'spotify').classification = valid
  assert.throws(() => model.parseMusicLibrary(spotify), /YouTube only/)
})

test('Bilibili links accept only trusted HTTPS video pages, stay optional, and never become platform sources', () => {
  for (const url of ['https://www.bilibili.com/video/av170001', 'https://bilibili.com/video/BV17x411w7KC/?p=2']) assert(model.validBilibiliVideoUrl(url), url)
  for (const url of [undefined, null, '', 'javascript:alert(1)', 'http://www.bilibili.com/video/av170001', 'https://bilibili.com.evil.test/video/av170001', 'https://evil.test/?next=https://bilibili.com/video/av170001', 'https://user@bilibili.com/video/av170001', 'https://bilibili.com:8080/video/av170001', 'https://space.bilibili.com/2149710', 'https://b23.tv/example', 'https://bilibili.com/video/BVxxxxxxxxxx', 'https://bilibili.com/video/av0', 'https://bilibili.com\\@evil.test/video/av170001', ' https://bilibili.com/video/av170001']) assert(!model.validBilibiliVideoUrl(url), String(url))
  const value = structuredClone(library)
  value.sources[0].bilibiliUrl = 'https://www.bilibili.com/video/av170001'
  assert.doesNotThrow(() => model.parseMusicLibrary(value))
  assert.equal(model.toMusicCatalog(value)[0].bilibiliUrl, value.sources[0].bilibiliUrl)
  value.sources[0].bilibiliUrl = 'https://evil.test/video/av170001'
  assert.throws(() => model.parseMusicLibrary(value), /bilibiliUrl/)
  delete value.sources[0].bilibiliUrl
  value.sources.find(source => source.platform === 'spotify').bilibiliUrl = 'https://www.bilibili.com/video/av170001'
  assert.throws(() => model.parseMusicLibrary(value), /bilibiliUrl/)
  assert(!library.sources.some(source => source.bilibiliUrl))
})

test('filter routes round-trip both levels and sanitize irrelevant or invalid filters without changing old Spotify URLs', () => {
  const releaseIds = new Set()
  for (const url of ['#/music/youtube?category=original&group=special&q=猫', '#/music/youtube?category=cover&member=LIZ', '#/music/spotify?category=ep', '#/music/spotify?category=albums']) {
    const route = routes.parseSiteRoute(url, releaseIds)
    assert.deepEqual(routes.parseSiteRoute(routes.siteRouteHash(route), releaseIds), route)
  }
  const read = url => routes.parseSiteRoute(url, releaseIds).music
  assert.equal(read('#/music/youtube?category=albums').youtubeCategory, 'all')
  assert.equal(read('#/music/youtube?category=cover&group=special&member=LIZ').youtubeGroup, null)
  assert.equal(read('#/music/youtube?category=original&group=invalid&member=LITA').youtubeMember, null)
  assert.equal(read('#/music/spotify?category=cover&group=special&member=LITA').category, 'all')
  assert.equal(read('#/music/spotify?category=ep').category, 'ep')
})

test('rendered filters omit All; Bilibili renders only for bound safe URLs and adds no player or duplicate card', async () => {
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../', import.meta.url)), base: '/KMNZ/', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { default: Music } = await server.ssrLoadModule('/src/pages/Music.tsx')
    const { musicCatalog } = await server.ssrLoadModule('/src/data/music.ts')
    const render = music => renderToStaticMarkup(createElement(Music, { route: music, selectedId: null, onSelect: () => {} }))
    for (const platform of ['youtube', 'spotify']) {
      const html = render({ ...base(), platform })
      assert(!html.includes('data-segment-value="all"'))
      assert(!html.includes('在 Bilibili 查看转载视频'))
      assert(!html.includes('<iframe'))
    }
    for (const category of ['original', 'cover']) {
      const html = render({ ...base(), youtubeCategory: category })
      assert(!html.includes('特别收录'))
      if(category === 'cover') assert((html.match(/<article\b/g)??[]).length === createMusicViews(library).youtubeCards('', 'cover').length)
      for (const label of category === 'original' ? ['LITA &amp; LIZ', 'LITA &amp; TINA &amp; NERO'] : ['LITA', 'LIZ', 'TINA', 'NERO']) assert(html.includes(label))
    }
    const entry = musicCatalog.find(entry => entry.platform === 'youtube')
    try {
      entry.bilibiliUrl = 'https://www.bilibili.com/video/av170001'
      const html = render(base())
      const link = html.match(/<a[^>]*class="music-external music-bilibili-link"[^>]*>/)?.[0]
      assert(link); assert(link.includes('target="_blank"')); assert(link.includes('rel="noopener noreferrer"'))
      assert(link.includes('在 Bilibili 查看转载视频'))
      assert.equal((html.match(/class="music-card music-card-youtube/g) ?? []).length, createMusicViews(library).youtubeCards('').length)
      entry.bilibiliUrl = 'javascript:alert(1)'
      assert(!render(base()).includes('music-bilibili-link'))
    } finally { delete entry.bilibiliUrl }
  } finally { await server.close() }
})

test('removed special-filter URLs normalize to all originals without changing music data',()=>{
  const route = routes.parseSiteRoute('#/music/youtube?category=original&group=special',new Set())
  assert.equal(route.music.youtubeCategory,'original');assert.equal(route.music.youtubeGroup,null)
  assert.equal(routes.siteRouteHash(route),'#/music/youtube?category=original')
  assert.equal(filter({...base(),youtubeCategory:'original'},{type:'group',value:'special'}).youtubeGroup,null)
})
