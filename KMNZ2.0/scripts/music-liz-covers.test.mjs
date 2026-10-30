import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadTypeScript, validateIndex } from './update-music-metadata.mjs'

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const facts = await read('./fixtures/music-liz-covers.json')
const { musicLibrary: library } = await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))
const { musicCatalog: catalog } = await loadTypeScript(new URL('../src/data/music.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const { createQueueSelections } = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const metadata = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const automatic = await read('../src/data/music-metadata.json')
const manual = await read('../src/data/music-metadata.overrides.json')
const views = createMusicViews(library)
const source = id => library.sources.find(item => item.platform === 'youtube' && item.platformId === id)

test('LIZ official playlist and five personal covers resolve to 82 unique source-bound recordings', () => {
  assert.equal(facts.videos.length, 82)
  assert.equal(new Set(facts.videos.map(item => item.videoId)).size, 82)
  for (const fact of facts.videos) {
    const matches = library.sources.filter(item => item.platform === 'youtube' && item.platformId === fact.videoId)
    assert.equal(matches.length, 1, fact.videoId)
    const item = matches[0], song = library.songs.find(song => song.id === item.target.songId)
    assert.equal(item.id, fact.sourceId); assert.equal(song.id, fact.songId)
    assert.equal(song.title, fact.title)
    assert.equal(item.externalUrl, 'https://www.youtube.com/watch?v=' + fact.videoId)
    assert.equal(item.classification.contentType, 'cover')
    assert.deepEqual(item.classification.coverMembers, fact.members)
    assert(item.classification.evidenceUrls.includes(item.externalUrl))
    assert.equal(item.target.releaseId, undefined)
    assert.equal(item.listed, undefined)
    assert.equal(item.display.era, 'classic')
  }
  assert.equal(new Set(facts.videos.map(fact => source(fact.videoId).target.songId)).size, 82)
  for (const id of ['RLpRiyblt-s', 'puq0ZayTaAs', 'eTEVPS3p6k0', 'abCmrPAE84A', 'Rz7QVJ6FgJY']) assert(source(id))
  const darlin = ['P_PEOYLIkBM', 'ObxjUIeEGuY'].map(id => source(id).target.songId)
  assert.notEqual(darlin[0], darlin[1])
})

test('LITA and LIZ duet appears once per member and once overall; solo social links do not create LITA associations', () => {
  const duet = source('puq0ZayTaAs')
  const liz = views.youtubeCards('', 'cover', null, 'LIZ')
  assert.equal(liz.length, 82)
  assert.equal(new Set(liz.map(entry => entry.id)).size, 82)
  for (const member of ['LITA', 'LIZ']) assert.equal(views.youtubeCards('', 'cover', null, member).filter(entry => entry.id === duet.id).length, 1)
  assert.equal(views.youtubeCards('', 'cover').filter(entry => entry.id === duet.id).length, 1)
  const solos = new Set(facts.videos.filter(fact => fact.members.length === 1).map(fact => fact.sourceId))
  assert(!views.youtubeCards('', 'cover', null, 'LITA').some(entry => solos.has(entry.id)))
})

test('all LIZ dates match full videos.list timestamps and sort by video publication, with verified 16:9 covers and mq fallback', () => {
  validateIndex(automatic, catalog, metadata)
  validateIndex(manual, catalog, metadata, true)
  for (const fact of facts.videos) {
    const entry = catalog.find(entry => entry.id === fact.sourceId)
    const data = metadata.resolveMetadata(entry, automatic, manual)
    assert.equal(data.publishedAt.value, fact.publishedAt)
    assert.equal(data.publishedAt.source, 'youtube-data-api')
    assert.equal(data.publishedAt.sourceUrl, entry.externalUrl)
    assert.match(metadata.musicDate(entry, data).label, /^\d{4}\.\d{2}\.\d{2}$/)
    assert(metadata.validCover(data.cover, entry), fact.videoId)
    const candidates = metadata.coverCandidates(entry, data)
    assert(candidates.includes('https://i.ytimg.com/vi/' + fact.videoId + '/mqdefault.jpg'))
    assert(candidates.every(url => !url.includes('/hqdefault.jpg')))
  }
  const sorted = metadata.sortMusicEntries(views.youtubeCards('', 'cover', null, 'LIZ'), automatic, manual)
  const timestamps = sorted.map(entry => Date.parse(metadata.resolveMetadata(entry, automatic, manual).publishedAt.value))
  assert.deepEqual(timestamps, [...timestamps].sort((a, b) => b - a))
  for (const id of ['_EJF7RhBe-U', 'yB2YtqVn4ro']) assert(automatic[source(id).id].cover.url.endsWith('/mqdefault.jpg'))
})

test('LIZ search results create a source-specific playback queue without unrelated covers or Spotify entries', () => {
  const entries = metadata.sortMusicEntries(views.youtubeCards('ダーリン', 'cover', null, 'LIZ'), automatic, manual)
  assert.equal(entries.length, 3)
  const selected = entries[1]
  const selection = createQueueSelections(library).list(entries, selected.id, 'ダーリン')
  assert.equal(selection.index, 1)
  assert.equal(selection.origin.kind, 'search')
  assert.deepEqual(selection.items.map(item => item.sourceId), entries.map(entry => entry.id))
  for (const item of selection.items) {
    assert.equal(item.platform, 'youtube')
    assert.equal(item.songId, library.sources.find(source => source.id === item.sourceId).target.songId)
  }
})
