import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadTypeScript } from './load-typescript.mjs'

const facts = JSON.parse(await readFile(new URL('./fixtures/music-extra-covers.json', import.meta.url), 'utf8'))
const { musicLibrary: library } = await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const { createQueueSelections } = await loadTypeScript(new URL('../src/lib/playbackQueue.ts', import.meta.url))
const { getMusicMetadata } = await loadTypeScript(new URL('../src/data/musicMetadata.ts', import.meta.url))
const { musicDate, coverCandidates, sortMusicEntries } = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const views = createMusicViews(library)

test('four additional cooperative covers retain independent identities, credited artists and confirmed KMNZ members', () => {
  assert.equal(facts.length, 4)
  for (const fact of facts) {
    const matches = library.sources.filter(source => source.platform === 'youtube' && source.platformId === fact.videoId)
    assert.equal(matches.length, 1)
    const source = matches[0], song = library.songs.find(song => song.id === source.target.songId)
    assert.equal(source.id, fact.sourceId); assert.equal(song.id, fact.songId)
    assert.equal(song.title, fact.title); assert.equal(song.artist, fact.artist)
    assert.equal(source.target.releaseId, undefined)
    assert.equal(source.classification.contentType, 'cover')
    assert.deepEqual(source.classification.coverMembers, fact.members)
    for (const member of ['lita', 'liz', 'tina', 'nero']) {
      assert.equal(views.youtubeCards('', 'cover', null, member.toUpperCase()).filter(entry => entry.id === source.id).length, Number(fact.members.includes(member)))
    }
  }
})

test('additional covers preserve true date provenance, timezone conversion, official artwork and mqdefault fallback', () => {
  for (const fact of facts) {
    const entry = views.youtubeCards('', 'cover').find(entry => entry.id === fact.sourceId)
    const data = getMusicMetadata(entry)
    assert.equal(data.publishedAt.value, fact.publishedAt)
    assert.equal(data.publishedAt.source, fact.dateSource)
    assert.equal(data.publishedAt.sourceUrl, entry.externalUrl)
    assert(data.cover); assert(data.cover.width >= 320)
    assert(coverCandidates(entry, data).includes('https://i.ytimg.com/vi/' + fact.videoId + '/mqdefault.jpg'))
    assert(coverCandidates(entry, data).every(url => !url.includes('/hqdefault.jpg')))
    const dates = { DFkSCdbwdZY: '2018.11.06', z8sPS1kyOv0: '2022.05.20', vt_A0P9jhYI: '2026.10.28', 'yTASHD-MWwE': '2025.04.09' }
    assert.equal(musicDate(entry, data).label, dates[fact.videoId])
  }
})

test('cooperative source search returns one playable item and preserves source-specific queue selection', () => {
  for (const fact of facts) {
    const entries = views.youtubeCards(fact.title, 'cover', null, fact.members[0].toUpperCase())
    assert.equal(entries.filter(entry => entry.id === fact.sourceId).length, 1)
    const selection = createQueueSelections(library).list(entries, fact.sourceId, fact.title)
    assert(selection); assert.equal(selection.items[selection.index].sourceId, fact.sourceId)
    assert.equal(selection.items[selection.index].songId, fact.songId)
    assert.equal(selection.items[selection.index].platform, 'youtube')
    assert.equal(selection.origin.kind, 'search')
  }
})
