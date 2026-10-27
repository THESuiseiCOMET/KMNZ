import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {loadTypeScript} from './load-typescript.mjs'
import {validateIndex} from './update-music-metadata.mjs'
const {musicLibrary:library}=await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
const model=await loadTypeScript(new URL('../src/lib/musicLibrary.ts',import.meta.url))
const {musicCatalog:catalog,getEmbedUrl}=await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
const helpers=await loadTypeScript(new URL('../src/lib/musicMetadata.ts',import.meta.url))
const {createMusicViews}=await loadTypeScript(new URL('../src/lib/musicViews.ts',import.meta.url))
const {createQueueSelections}=await loadTypeScript(new URL('../src/lib/playbackQueue.ts',import.meta.url))
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'))
const fixture=await read('./fixtures/music-c4-official.json')
const manual=await read('../src/data/music-metadata.overrides.json')
const automatic=await read('../src/data/music-metadata.json')
const index=model.createMusicLibraryIndex(library)
const entry=id=>catalog.find(item=>item.id===id)
const metadata=id=>helpers.resolveMetadata(entry(id),automatic,manual)

test('C4 catalog passes C1 validation with unique stable identities, exact official sources and no orphan recordings',()=>{
  assert.doesNotThrow(()=>model.parseMusicLibrary(library))
  for(const [key,count] of Object.entries(fixture.counts.after))assert.equal(library[key].length,count)
  for(const key of ['songs','releases','sources'])assert.equal(new Set(library[key].map(item=>item.id)).size,library[key].length)
  const keys=library.sources.map(s=>model.platformSourceKey(s.platform,s.kind,s.platformId))
  assert.equal(new Set(keys).size,keys.length)
  for(const source of library.sources)assert.equal(model.parseMusicSourceUrl(source.externalUrl).key,model.platformSourceKey(source.platform,source.kind,source.platformId))
  for(const song of library.songs)assert(index.sourcesBySong.get(song.id).length>0,song.id)
  for(const release of library.releases)assert(library.sources.some(s=>s.target.type==='release'&&s.target.releaseId===release.id),release.id)
})

test('all previous IDs, platform bindings and manual metadata survive; artist corrections are explicit and sourced',()=>{
  for(const source of fixture.preserved.sources)assert.deepEqual(index.sources.get(source.id),source)
  for(const song of fixture.preserved.songs){
    const correction=fixture.corrections.find(item=>item.songId===song.id)
    assert.deepEqual(index.songs.get(song.id),correction?{...song,artist:correction.artist}:song)
    if(correction)assert.match(correction.sourceUrl,/^https:\/\/open\.spotify\.com\/track\//)
  }
  for(const [id,value] of Object.entries(fixture.preserved.manual))assert.deepEqual(manual[id],value)
})

test('all publicly verified official artist albums, singles/EPs and appears-on releases are represented once',()=>{
  const covered=[...fixture.coverage.albums,...fixture.coverage.singles,...fixture.coverage.appearsOn]
  const ids=new Set(covered.map(item=>new URL(item.url).pathname.split('/').at(-1)))
  assert.equal(ids.size,fixture.releases.length)
  assert.deepEqual(new Set(fixture.releases.map(item=>item.platformId)),ids)
  for(const id of ids)assert.equal(library.sources.filter(s=>s.platform==='spotify'&&s.kind==='album'&&s.platformId===id).length,1)
  assert.equal(index.releases.get('release-harmonics').kind,'ep')
  assert.equal(index.releases.get('release-drops').kind,'single')
})

test('Spotify track identities, artists, edition bindings, disc numbers and sequence match verified release pages',()=>{
  for(const fact of fixture.sources.filter(item=>item.releaseId)){
    const source=index.sources.get(fact.sourceId)
    const song=index.songs.get(source.target.songId)
    assert.equal(source.platform,'spotify');assert.equal(source.platformId,fact.platformId)
    assert.equal(source.externalUrl,fact.sourceUrl)
    assert.equal(source.target.releaseId,fact.releaseId)
    assert.equal(song.title,fact.title);assert.equal(song.artist,fact.artists.join(', '))
    const track=index.releases.get(fact.releaseId).tracks.find(t=>t.discNumber===fact.discNumber&&t.trackNumber===fact.trackNumber)
    assert.equal(track.songId,song.id);assert(track.sourceIds.includes(source.id))
  }
  for(const fact of fixture.releases){
    const release=index.releases.get(fact.releaseId)
    assert.equal(release.title,fact.title);assert.equal(release.kind,fact.kind)
    assert.equal(release.tracks.length,fact.selectedTracks)
    assert.equal(release.tracklistStatus,fact.selectedTracks===fact.totalTracks?'complete':'partial')
    const positions=release.tracks.map(t=>t.discNumber*10000+t.trackNumber)
    assert.deepEqual(positions,[...positions].sort((a,b)=>a-b))
  }
  assert.deepEqual(index.releases.get('release-drops').tracks.map(t=>index.songs.get(t.songId).title),['DROP IN','GROWL','MIRROR'])
})

test('every source resolves verified official artwork and its own precise date, retaining Tokyo display and mq fallback',()=>{
  validateIndex(automatic,catalog,helpers)
  validateIndex(manual,catalog,helpers,true)
  for(const source of library.sources){
    const data=metadata(source.id)
    assert(data.cover,source.id)
    assert(helpers.musicDate(entry(source.id),data),source.id)
    if(source.platform==='youtube'){
      assert(helpers.validPublishedAt(data.publishedAt.value))
      const candidates=helpers.coverCandidates(entry(source.id),data)
      assert(candidates.includes('https://i.ytimg.com/vi/'+source.platformId+'/mqdefault.jpg'))
      assert(!candidates.some(url=>url.includes('/hqdefault.jpg')))
    }else{
      assert.equal(data.releaseDate.precision,'day')
      assert(helpers.spotifyImageHost(new URL(data.cover.url).hostname))
      assert.equal(data.cover.width,data.cover.height)
    }
  }
  for(const fact of [...fixture.sources,...fixture.releases]){
    const data=metadata(fact.sourceId)
    if(fixture.preserved.sources.some(source=>source.id===fact.sourceId))assert.equal(new URL(data.cover.url).pathname,new URL(fact.cover.url).pathname)
    else assert.equal(data.cover.url,fact.cover.url)
    assert.deepEqual([data.cover.width,data.cover.height],[fact.cover.width,fact.cover.height])
    if(fact.publishedAt)assert.equal(data.publishedAt.value,fact.publishedAt)
    if(fact.date)assert.equal(data.releaseDate.value,fact.date)
  }
  assert.equal(helpers.musicDate(entry('yt-wave'),metadata('yt-wave')).label,'2025.06.24')
  assert.equal(metadata('sp-wave').releaseDate.value,'2025-08-13')
  assert.equal(helpers.musicDate(entry('yt-posse'),metadata('yt-posse')).label,'2025.09.30')
  assert.equal(metadata('sp-posse').releaseDate.value,'2025-11-05')
})

test('cross-platform links require explicit verified video-to-distribution-to-release evidence',()=>{
  assert(fixture.crossLinks.length>0)
  for(const link of fixture.crossLinks){
    assert.match(link.distributionUrl,/^https:\/\/linkco\.re\//)
    const video=library.sources.find(s=>s.platform==='youtube'&&s.platformId===link.videoId)
    const track=library.sources.find(s=>s.platform==='spotify'&&s.kind==='track'&&s.platformId===link.spotifyTrackId)
    assert.equal(video.target.songId,track.target.songId)
    assert.equal(video.target.releaseId,link.releaseId)
    assert.equal(track.target.releaseId,link.releaseId)
    const releaseSource=library.sources.find(s=>s.target.type==='release'&&s.target.releaseId===link.releaseId)
    assert.equal(releaseSource.externalUrl,link.releaseUrl)
    assert.equal(index.songs.get(video.target.songId).version.kind,'unspecified')
  }
})

test('remixes, studio live sessions, 2025 versions and same-name editions remain independent',()=>{
  const titled=title=>library.songs.filter(s=>s.title===title)
  assert(titled('OPENING').length>=2)
  const original=titled('TOKONATSU STYLE');const revised=titled('TOKONATSU STYLE 2025')
  assert(original.length>0&&revised.length>0)
  assert(revised.every(song=>song.version.kind==='other'))
  for(const song of library.songs.filter(s=>/remix/i.test(s.title)))assert.equal(song.version.kind,'remix',song.title)
  const live=library.songs.filter(s=>s.version.kind==='live')
  assert.equal(live.length,2)
  for(const song of live)assert.match(song.title,/Studio Live Session/)
  const vrLive=live.find(s=>s.title.startsWith('VR'))
  assert(!titled('VR').some(s=>s.id===vrLive.id))
  assert.notEqual(index.sources.get('yt-verse').target.songId,index.sources.get('sp-kmnculture-verse').target.songId)
})

test('expanded views retain one release card, hide contained tracks, search confirmed songs and build exact album queues',()=>{
  const views=createMusicViews(library,catalog);const selections=createQueueSelections(library)
  const sections=views.spotifySections('');const visible=[...sections.albums,...sections.singles]
  assert.equal(new Set(visible.map(x=>x.id)).size,visible.length)
  for(const fact of fixture.releases){
    const source=index.sources.get(fact.sourceId)
    const detail=views.releaseDetail(source.id)
    assert.equal(detail.tracks.length,fact.selectedTracks)
    assert(detail.tracks.every(track=>track.playback?.platform==='spotify'))
    if(source.listed!==false){
      assert.equal(visible.filter(entry=>entry.id===source.id).length,1)
      for(const track of detail.tracks)assert(!visible.some(entry=>entry.id===track.playback.id))
      const found=views.spotifySections(detail.tracks[0].song.title)
      assert([...found.albums,...found.singles].some(entry=>entry.id===source.id))
    }
    const middle=detail.tracks[Math.floor(detail.tracks.length/2)]
    const queue=selections.album(detail.release.id,middle.playback.id,middle)
    assert.equal(queue.items[queue.index].sourceId,middle.playback.id)
    assert.deepEqual(queue.items.map(item=>[item.discNumber,item.trackNumber]),detail.tracks.map(item=>[item.discNumber,item.trackNumber]))
  }
  for(const item of catalog)assert.match(getEmbedUrl(item),/^https:\/\/(?:www\.youtube\.com|open\.spotify\.com)\/embed\//)
})
