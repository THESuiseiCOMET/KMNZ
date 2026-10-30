import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadTypeScript } from './load-typescript.mjs'

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const { createQueueSelections } = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const routes = await loadTypeScript(new URL('../src/lib/siteRoute.ts', import.meta.url))
const { getMusicMetadata } = await loadTypeScript(new URL('../src/data/musicMetadata.ts', import.meta.url))
const { musicDate, coverCandidates, resolveMetadata, sortMusicEntries } = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const baseline = await read('./fixtures/music-c1-library.json')
const current = { schemaVersion: 1, songs: await read('../src/data/music/songs.json'), releases: await read('../src/data/music/releases.json'), sources: await read('../src/data/music/sources.json') }
const evidence = ['https://www.youtube.com/watch?v=MehG9Ms8ygU']
const cover = fields => ({ contentType: 'cover', evidenceUrls: evidence, ...fields })
const fixture = classification => {
  const value = structuredClone(baseline)
  value.sources[0].classification = classification
  return value
}
const ids = entries => entries.map(entry => entry.id)

test('full imported library initializes without stripping, changing or losing any raw fields or identities', async () => {
  const before = structuredClone(current)
  const parsed = model.parseMusicLibrary(current)
  const { musicLibrary: imported } = await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))
  assert.deepEqual(current, before)
  assert.deepEqual(imported, before)
  assert(current.sources.some(source => source.classification?.coverMembers?.includes('lita')))
  for (const key of ['songs', 'sources', 'releases']) assert.equal(imported[key].length, before[key].length)
  const views = createMusicViews(parsed)
  assert.equal(views.youtubeCards('').length, current.sources.filter(source => source.platform === 'youtube' && source.listed !== false).length)
  assert.equal(new Set(views.youtubeCards('').map(entry => entry.platformId)).size, views.youtubeCards('').length)
})

test('lowercase coverMembers and uppercase legacy performers share one source across every selected member', () => {
  for (const classification of [cover({ coverMembers: ['lita', 'tina', 'nero'] }), cover({ performers: ['LITA', 'TINA', 'NERO'] }), cover({ coverMembers: ['LITA', 'tina'], performers: ['lita', 'NERO'] })]) {
    const value = fixture(classification), before = structuredClone(value)
    assert.doesNotThrow(() => model.parseMusicLibrary(value))
    const views = createMusicViews(value)
    for (const member of ['LITA', 'TINA', 'NERO']) assert.deepEqual(ids(views.youtubeCards('', 'cover', null, member)), [value.sources[0].id])
    assert.equal(views.youtubeCards('', 'cover').length, 1)
    assert.deepEqual(views.youtubeCards('', 'cover', null, 'LIZ'), [])
    const entries = views.youtubeCards('', 'cover', null, 'TINA')
    const queue = createQueueSelections(value).list(entries, entries[0].id)
    assert.equal(queue.items.length, 1); assert.equal(queue.items[0].sourceId, value.sources[0].id)
    assert.equal(queue.items[0].platform, 'youtube')
    assert.deepEqual(value, before)
  }
  const value = fixture(cover({ coverMembers: ['liz'] }))
  assert.deepEqual(ids(createMusicViews(value).youtubeCards('', 'cover', null, 'LIZ')), [value.sources[0].id])
})

test('strict classification validation rejects invalid shapes, unknown members, case duplicates and original-only conflicts', () => {
  for (const fields of [
    { coverMembers: 'lita' }, { coverMembers: null }, { coverMembers: [] }, { coverMembers: [5] },
    { coverMembers: ['other'] }, { coverMembers: ['lita', 'LITA'] }, { coverMembers: [' tina '] },
    { performers: ['liz', 'LIZ'] }, { performers: ['LiTa'] }, { performers: {} },
    { unexpected: true }, { originalGroup: 'lita-liz' },
  ]) assert.throws(() => model.parseMusicLibrary(fixture(cover(fields))), /classification/)
  assert.throws(() => model.parseMusicLibrary(fixture({ contentType: 'original', coverMembers: ['lita'], evidenceUrls: evidence })), /cover only/)
  assert.throws(() => model.parseMusicLibrary(fixture({ contentType: 'cover', coverMembers: ['lita'] })), /evidenceUrls/)
  const value = fixture(cover({ coverMembers: ['lita'] }))
  value.sources[1].platformId = value.sources[0].platformId
  value.sources[1].externalUrl = value.sources[0].externalUrl
  assert.throws(() => model.parseMusicLibrary(value), /duplicate platform source/)
})

test('actual cooperative covers appear once in all covers and once in each confirmed member result', () => {
  const views = createMusicViews(current)
  for (const [videoId, members] of [['D60mNg5ZDi0', ['LITA', 'TINA']], ['KsDh4kfVj_M', ['LITA', 'NERO']], ['07c93sMYrYE', ['TINA', 'NERO']]]) {
    assert.equal(current.sources.filter(source => source.platform === 'youtube' && source.platformId === videoId).length, 1)
    assert.equal(views.youtubeCards('', 'cover').filter(entry => entry.platformId === videoId).length, 1)
    for (const member of members) assert.equal(views.youtubeCards('', 'cover', null, member).filter(entry => entry.platformId === videoId).length, 1)
  }
})

test('both lowercase and uppercase member URLs restore canonical filters without introducing the retired special button', () => {
  for (const member of ['lita', 'liz', 'tina', 'nero', 'LITA', 'LIZ', 'TINA', 'NERO']) {
    const route = routes.parseSiteRoute('#/music/youtube?category=cover&member=' + member, new Set())
    assert.equal(route.music.youtubeMember, member.toUpperCase())
    assert(routes.siteRouteHash(route).endsWith('member=' + member.toUpperCase()))
  }
  assert.equal(routes.parseSiteRoute('#/music/youtube?category=cover&member=unknown', new Set()).music.youtubeMember, null)
  assert.equal(routes.parseSiteRoute('#/music/youtube?category=original&group=special', new Set()).music.youtubeGroup, null)
})

test('missing imported cover dates remain unknown, retain mqdefault fallback, and sort after verified dates', () => {
  const views = createMusicViews(current), entry = views.youtubeCards('', 'cover')[0]
  assert(entry)
  const metadata = resolveMetadata(entry, {}, {})
  assert.equal(musicDate(entry, metadata), null)
  assert(coverCandidates(entry, metadata).includes('https://i.ytimg.com/vi/' + entry.platformId + '/mqdefault.jpg'))
  const known = views.youtubeCards('', 'original').find(entry => getMusicMetadata(entry).publishedAt)
  assert.deepEqual(ids(sortMusicEntries([entry, known], {}, { [known.id]: getMusicMetadata(known) })), [known.id, entry.id])
  assert(views.spotifyCards('').some(entry => entry.id === 'sp-kmnculture'))
})
