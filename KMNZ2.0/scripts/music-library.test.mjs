import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadTypeScript } from './load-typescript.mjs'
import { validateIndex } from './update-music-metadata.mjs'

const libraryUrl = new URL('../src/data/musicLibrary.ts', import.meta.url)
const { musicLibrary: library } = await loadTypeScript(libraryUrl)
const model = await loadTypeScript(new URL('../src/lib/musicLibrary.ts', import.meta.url))
const { musicCatalog: catalog, getEmbedUrl } = await loadTypeScript(new URL('../src/data/music.ts', import.meta.url))
const metadata = await loadTypeScript(new URL('../src/lib/musicMetadata.ts', import.meta.url))
const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const legacy = await json('./fixtures/music-c1-legacy.json')
const automatic = await json('../src/data/music-metadata.json')
const manual = await json('../src/data/music-metadata.overrides.json')
const copy = () => structuredClone(library)
const reject = (mutate, pattern) => {
  const value = copy()
  mutate(value)
  assert.throws(() => model.parseMusicLibrary(value), pattern)
}
const wave = library.sources[0]
const mirror = library.sources.find(source => source.id === 'sp-mirror')
const album = library.releases[0]
const spotifyWave = (id, platformId, releaseId) => ({
  ...structuredClone(mirror), id, platformId,
  externalUrl: 'https://open.spotify.com/track/' + platformId,
  target: {type:'song', songId:wave.target.songId, releaseId},
})
const expectedDates = {
  'yt-wave':'2025.06.24', 'yt-growl':'2025.04.29', 'yt-drop-in':'2025.04.24',
  'yt-meta-fiction':'2024.12.25', 'yt-new-days':'2024.12.18', 'yt-verse':'2024.05.25',
  'yt-our-days':'2023.07.29', 'sp-kmnculture':'2025.01.06', 'sp-mirror':'2025.06.13',
}

test('migration preserves all nine legacy entries, source order and embed URLs exactly', () => {
  assert.deepEqual(catalog, legacy)
  assert.deepEqual([library.songs.length, library.releases.length, library.sources.length], [8,1,9])
  assert.equal(library.schemaVersion,1)
  for (const entry of legacy) {
    assert.equal(getEmbedUrl(catalog.find(item => item.id === entry.id)), entry.platform === 'youtube'
      ? 'https://www.youtube.com/embed/' + entry.platformId + '?playsinline=1&rel=0&autoplay=1'
      : 'https://open.spotify.com/embed/' + entry.kind + '/' + entry.platformId)
  }
})

test('B4 source-bound artwork, exact timestamps, precision and dates survive compatibility projection', () => {
  validateIndex(automatic,catalog,metadata)
  validateIndex(manual,catalog,metadata,true)
  for (const entry of catalog) {
    const oldEntry = legacy.find(item => item.id === entry.id)
    const resolved = metadata.resolveMetadata(entry,automatic,manual)
    assert.deepEqual(resolved,metadata.resolveMetadata(oldEntry,automatic,manual))
    assert.equal(metadata.musicDate(entry,resolved).label,expectedDates[entry.id])
    if (entry.platform === 'youtube') {
      assert.equal(resolved.publishedAt.value,manual[entry.id].publishedAt.value)
      assert.deepEqual(metadata.coverCandidates(entry,resolved),[
        'https://i.ytimg.com/vi/'+entry.platformId+'/maxresdefault.jpg',
        'https://i.ytimg.com/vi/'+entry.platformId+'/mqdefault.jpg',
      ])
    } else {
      assert.equal(resolved.cover.url,automatic[entry.id].cover.url)
      assert.equal(resolved.releaseDate.precision,'day')
    }
  }
  for (const platform of ['youtube','spotify']) {
    assert.deepEqual(metadata.sortMusicEntries(catalog.filter(entry=>entry.platform===platform),automatic,manual),
      metadata.sortMusicEntries(legacy.filter(entry=>entry.platform===platform),automatic,manual))
  }
})

test('unverified album memberships and recording versions are not inferred from subtitles or titles', () => {
  assert.equal(album.tracklistStatus,'unknown')
  assert.deepEqual(album.tracks,[])
  assert.equal(mirror.target.releaseId,undefined)
  assert(library.songs.every(song=>song.version.kind==='unspecified'))
  assert.equal(library.releases.some(release=>release.title==='DROPS'),false)
})

test('one recording can explicitly link YouTube and Spotify and appear on multiple releases', () => {
  const value = copy()
  const first = {...structuredClone(album),id:'release-first',tracklistStatus:'complete',tracks:[
    {songId:wave.target.songId,discNumber:1,trackNumber:1,sourceIds:[wave.id,'sp-wave-first']},
  ]}
  const second = {...structuredClone(first),id:'release-second',tracks:[
    {songId:wave.target.songId,discNumber:2,trackNumber:3,sourceIds:[wave.id,'sp-wave-second']},
  ]}
  value.releases.push(first,second)
  value.sources.push(spotifyWave('sp-wave-first','AAAAAAAAAAAAAAAAAAAAAA',first.id),
    spotifyWave('sp-wave-second','BBBBBBBBBBBBBBBBBBBBBB',second.id))
  const index = model.createMusicLibraryIndex(value)
  assert.deepEqual(index.sourcesBySong.get(wave.target.songId).map(source=>source.id),[wave.id,'sp-wave-first','sp-wave-second'])
  assert.deepEqual(index.releasesBySong.get(wave.target.songId).map(release=>release.id),[first.id,second.id])
  assert.equal(index.sources.get('sp-wave-first').target.releaseId,first.id)
  assert.equal(index.sources.get('sp-wave-second').target.releaseId,second.id)
})

test('Remix, Live and Remaster recordings and identically named releases remain distinct', () => {
  const value = copy()
  for (const kind of ['remix','live','remaster']) value.songs.push({
    ...structuredClone(value.songs[0]),id:'song-wave-'+kind,version:{kind,label:kind,relatedSongId:wave.target.songId},
  })
  value.releases.push({...structuredClone(album),id:'release-kmnculture-reissue'})
  const index = model.createMusicLibraryIndex(value)
  assert.equal([...index.songs.values()].filter(song=>song.title==='WAVE').length,4)
  assert.equal([...index.releases.values()].filter(release=>release.title==='KMNCULTURE').length,2)
  assert.deepEqual(index.sourcesBySong.get('song-wave-live'),[])
})

test('local IDs remain stable when a song is renamed and all sources follow the song', () => {
  const value = copy()
  value.songs[0].title='WAVE (corrected title)'
  const entries = model.toMusicCatalog(value)
  assert.equal(entries[0].id,wave.id)
  assert.equal(entries[0].platformId,wave.platformId)
  assert.equal(entries[0].title,'WAVE (corrected title)')
  assert.equal(value.songs[0].id,wave.target.songId)
})

test('canonical source keys ignore sharing parameters and preserve case/resource type', () => {
  const key = model.platformSourceKey('youtube','mv',wave.platformId)
  for (const url of [wave.externalUrl+'&t=20', 'https://youtu.be/'+wave.platformId+'?si=share',
    'https://m.youtube.com/watch?v='+wave.platformId]) assert.equal(model.parseMusicSourceUrl(url).key,key)
  assert.equal(model.parseMusicSourceUrl('https://open.spotify.com/intl-ja/track/'+mirror.platformId+'?si=share').key,
    model.platformSourceKey('spotify','track',mirror.platformId))
  assert.notEqual(model.platformSourceKey('spotify','track',mirror.platformId),model.platformSourceKey('spotify','album',mirror.platformId))
  assert.notEqual(model.platformSourceKey('youtube','mv',wave.platformId),model.platformSourceKey('youtube','mv',wave.platformId.toLowerCase()))
  const index = model.createMusicLibraryIndex(library)
  assert.equal(index.platformSources.get(model.parseMusicSourceUrl(mirror.externalUrl+'?si=share').key).id,mirror.id)
})

test('source identity dedup rejects duplicate URLs/IDs even with different local IDs and share URLs', () => {
  reject(value=>value.sources.push({...structuredClone(wave),id:'yt-wave-duplicate',externalUrl:'https://youtu.be/'+wave.platformId+'?si=copy'}),/duplicate platform source/)
  reject(value=>value.sources.push(structuredClone(wave)),/duplicate ID/)
})

test('unknown fields, schema versions and missing required fields fail with useful paths', () => {
  reject(value=>value.schemaVersion=2,/library.schemaVersion/)
  reject(value=>value.songs[0].titlle='typo',/songs\[0\].titlle/)
  reject(value=>delete value.sources[0].target,/sources\[0\].target/)
  reject(value=>value.songs[0].version.kind='unrecognized',/version.kind/)
  for (const input of [null,[],{schemaVersion:1,songs:null}]) assert.throws(()=>model.parseMusicLibrary(input))
})

test('song, release and source IDs and foreign keys are validated independently', () => {
  reject(value=>value.songs.push(structuredClone(value.songs[0])),/duplicate ID/)
  reject(value=>value.releases.push(structuredClone(album)),/duplicate ID/)
  reject(value=>value.songs[0].id='yt-wave',/invalid stable ID/)
  reject(value=>value.sources[0].target.songId='song-missing',/existing song/)
  reject(value=>value.sources.find(source=>source.kind==='album').target.releaseId='release-missing',/existing release/)
  reject(value=>value.sources[0].target.releaseId='release-missing',/unknown release/)
})

test('platform, resource kind, platform ID, URL host and target must agree', () => {
  reject(value=>value.sources[0].platformId='bad-id',/invalid platform/)
  reject(value=>value.sources[0].kind='album',/kind/)
  reject(value=>value.sources[0].externalUrl='https://youtube.com.evil.test/watch?v='+wave.platformId,/URL does not match/)
  reject(value=>value.sources[0].externalUrl=library.sources[1].externalUrl,/URL does not match/)
  reject(value=>value.sources[0].target={type:'release',releaseId:album.id},/existing song/)
  reject(value=>value.sources.find(source=>source.kind==='album').target={type:'song',songId:wave.target.songId},/album must reference/)
  for (const url of ['http://youtu.be/'+wave.platformId,'https://user:pass@youtu.be/'+wave.platformId,
    'https://open.spotify.com/playlist/'+mirror.platformId,'https://youtu.be/invalid','javascript:alert(1)']) assert.equal(model.parseMusicSourceUrl(url),null)
})

test('unknown/inconsistent tracklists, invalid positions and duplicate disc/track slots are rejected', () => {
  const track = {songId:wave.target.songId,discNumber:1,trackNumber:1,sourceIds:[wave.id]}
  reject(value=>value.releases[0].tracks.push(track),/tracklistStatus/)
  reject(value=>value.releases[0].tracklistStatus='complete',/tracklistStatus/)
  reject(value=>{value.releases[0].tracklistStatus='partial';value.releases[0].tracks=[{...track,trackNumber:0}]},/positive integer/)
  reject(value=>{value.releases[0].tracklistStatus='partial';value.releases[0].tracks=[track,{...track}]},/duplicate disc\/track/)
  reject(value=>{value.releases[0].tracklistStatus='partial';value.releases[0].tracks=[{...track,songId:'song-missing'}]},/unknown song/)
})

test('release tracks cannot borrow unrelated songs, album sources, absent sources or other editions', () => {
  const withSource = sourceIds => value => {
    value.releases[0].tracklistStatus='partial'
    value.releases[0].tracks=[{songId:wave.target.songId,discNumber:1,trackNumber:1,sourceIds}]
  }
  for (const ids of [['missing-source'],[mirror.id],['sp-kmnculture']]) reject(withSource(ids),/source does not match/)
  reject(withSource([wave.id,wave.id]),/duplicate source/)
  reject(value=>value.sources[0].target.releaseId=album.id,/no matching track membership/)
  reject(value=>{
    withSource(['sp-wave-bound'])(value)
    value.releases.push({...structuredClone(album),id:'release-other'})
    value.sources.push(spotifyWave('sp-wave-bound','AAAAAAAAAAAAAAAAAAAAAA','release-other'))
  },/source does not match/)
})

test('version lineage rejects missing songs, self links and cycles', () => {
  reject(value=>value.songs[0].version.relatedSongId='song-missing',/unknown related song/)
  reject(value=>value.songs[0].version.relatedSongId=value.songs[0].id,/cyclic version/)
  reject(value=>{
    value.songs[0].version.relatedSongId=value.songs[1].id
    value.songs[1].version.relatedSongId=value.songs[0].id
  },/cyclic version/)
})

test('validation, indexing and compatibility projection do not mutate or reorder source data', () => {
  const value=copy()
  const original=JSON.stringify(value)
  model.parseMusicLibrary(value)
  model.createMusicLibraryIndex(value)
  const entries=model.toMusicCatalog(value)
  entries[0].title='caller change'
  assert.equal(JSON.stringify(value),original)
  assert.deepEqual(model.toMusicCatalog(model.parseMusicLibrary(JSON.parse(original))),legacy)
})

test('new platform sources do not inherit source-specific dates or manual corrections from a shared song', () => {
  const value=copy()
  value.sources.push({...structuredClone(mirror),id:'sp-wave-unverified',platformId:'AAAAAAAAAAAAAAAAAAAAAA',
    externalUrl:'https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAAA',target:{type:'song',songId:wave.target.songId}})
  const added=model.toMusicCatalog(value).at(-1)
  assert.deepEqual(metadata.resolveMetadata(added,automatic,manual),{platformId:added.platformId})
  assert.equal(metadata.musicDate(added,metadata.resolveMetadata(added,automatic,manual)),null)
})
