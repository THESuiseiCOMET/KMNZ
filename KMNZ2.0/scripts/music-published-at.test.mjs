import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTypeScript, validateIndex, updateMetadata } from './update-music-metadata.mjs'
import { readFile } from 'node:fs/promises'

const { musicCatalog: catalog } = await loadTypeScript(new URL('../src/data/music.ts', import.meta.url))
const { musicLibrary: library } = await loadTypeScript(new URL('../src/data/musicLibrary.ts', import.meta.url))
const { createMusicViews } = await loadTypeScript(new URL('../src/lib/musicViews.ts', import.meta.url))
const helpers = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const automatic = JSON.parse(await readFile(new URL('../src/data/music-metadata.json', import.meta.url), 'utf8'))
const manual = JSON.parse(await readFile(new URL('../src/data/music-metadata.overrides.json', import.meta.url), 'utf8'))
const youtube = catalog.filter(entry => entry.platform === 'youtube')
const data = entry => helpers.resolveMetadata(entry, automatic, manual)

test('every imported YouTube source resolves a valid source-bound full publication timestamp', () => {
  validateIndex(automatic, catalog, helpers)
  validateIndex(manual, catalog, helpers, true)
  for (const entry of youtube) {
    const resolved = data(entry)
    assert.equal(resolved.platformId, entry.platformId)
    assert(helpers.validPublishedAt(resolved.publishedAt?.value), entry.id)
    const stored = manual[entry.id]?.publishedAt ?? automatic[entry.id]?.publishedAt
    assert(stored); assert.equal(resolved.publishedAt.value, stored.value)
    assert.equal(helpers.musicDate(entry, resolved).dateTime, stored.value)
    assert.match(helpers.musicDate(entry, resolved).label, /^\d{4}\.\d{2}\.\d{2}$/)
  }
})

test('classic originals, covers and TINA originals all sort newest first using actual timestamps', () => {
  const views = createMusicViews(library)
  const sorted = entries => helpers.sortMusicEntries(entries, automatic, manual)
  const tinaIds = new Set(library.sources.filter(source => source.classification?.contentType === 'original'
    && source.classification?.performers?.some(member => member.toUpperCase() === 'TINA')).map(source => source.id))
  const lists = [youtube, views.youtubeCards('', 'original', 'lita-liz'), views.youtubeCards('', 'cover'), youtube.filter(entry => tinaIds.has(entry.id))]
  assert(lists[1].length >= 55); assert(lists[2].length > 0); assert(lists[3].length > 0)
  for (const entries of lists) {
    const dates = sorted(entries).map(entry => Date.parse(data(entry).publishedAt.value))
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a))
    assert.equal(new Set(sorted(entries).map(entry => entry.id)).size, entries.length)
  }
})

const entry = youtube[0]
const proof = { source: 'youtube-data-api', status: 'verified', verifiedAt: '2026-10-30T00:00:00Z', sourceUrl: entry.externalUrl }
const imported = { [entry.id]: { platformId: entry.platformId, publishedAt: { value: '2025-05-24T15:30:00Z', ...proof }, cover: null } }

test('verified API dates in the override index retain priority and are never overwritten by refresh', async () => {
  const before = structuredClone(imported)
  assert.doesNotThrow(() => validateIndex(imported, [entry], helpers, true))
  const result = await updateMetadata({ catalog: [entry], metadata: {}, manual: imported, helpers, env: { YOUTUBE_API_KEY: 'fixture-key' }, refresh: true,
    now: new Date('2026-10-30T01:00:00Z'), fetcher: () => { throw new Error('Override dates must not be fetched again') } })
  assert.deepEqual(imported, before)
  assert.equal(helpers.resolveMetadata(entry, result, imported).publishedAt.value, before[entry.id].publishedAt.value)
  assert.equal(helpers.musicDate(entry, helpers.resolveMetadata(entry, result, imported)).label, '2025.05.25')
})

test('imported override date validation rejects mismatched videos, wrong providers, invalid dates and credential URLs', () => {
  for (const patch of [
    { sourceUrl: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' },
    { sourceUrl: entry.externalUrl + '&key=fixture-secret' },
    { sourceUrl: 'https://evil.example/watch?v=' + entry.platformId },
    { source: 'spotify-oembed' }, { status: 'unknown' }, { value: '2023-02-30T12:00:00Z' }, { value: '2023-01-01' },
  ]) {
    const value = structuredClone(imported)
    Object.assign(value[entry.id].publishedAt, patch)
    assert.throws(() => validateIndex(value, [entry], helpers, true), error => !error.message.includes('fixture-secret'))
  }
  const mismatch = structuredClone(imported)
  mismatch[entry.id].platformId = 'AAAAAAAAAAA'
  assert.throws(() => validateIndex(mismatch, [entry], helpers, true), /mismatch/)
})
