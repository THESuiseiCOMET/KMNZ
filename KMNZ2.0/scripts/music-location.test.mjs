import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {loadTypeScript} from './load-typescript.mjs'
const {findMusicLocation:locate}=await loadTypeScript(new URL('../src/lib/musicLocation.ts',import.meta.url))
const {toMusicCatalog}=await loadTypeScript(new URL('../src/lib/musicLibrary.ts',import.meta.url))
const {defaultMusicRoute}=await loadTypeScript(new URL('../src/lib/siteRoute.ts',import.meta.url))
const base=JSON.parse(await readFile(new URL('./fixtures/music-c1-library.json',import.meta.url),'utf8'))
const route=patch=>({...defaultMusicRoute,...patch})
const current=(sourceId,patch={})=>({sourceId,key:sourceId,platform:sourceId.startsWith('yt-')?'youtube':'spotify',...patch})
function albumLibrary(){
 const value=structuredClone(base),album=value.releases[0],source=structuredClone(value.sources.find(s=>s.id==='sp-mirror'))
 source.id='sp-wave-test';source.platformId='AAAAAAAAAAAAAAAAAAAAAA';source.externalUrl='https://open.spotify.com/track/'+source.platformId
 source.target={type:'song',songId:'song-wave',releaseId:album.id}
 value.sources.push(source);album.tracklistStatus='partial';album.tracks=[{songId:'song-wave',discNumber:1,trackNumber:3,sourceIds:[source.id]}]
 return value
}
test('YouTube location preserves the selected member, category and search instead of clearing filters',()=>{
 const value=structuredClone(base),source=value.sources.find(s=>s.id==='yt-wave')
 source.classification={contentType:'cover',coverMembers:['LITA'],evidenceUrls:['https://www.youtube.com/watch?v='+source.platformId]}
 const selected=route({youtubeCategory:'cover',youtubeMember:'LITA',search:'WAVE'})
 const result=locate(value,toMusicCatalog(value),current(source.id),selected)
 assert.deepEqual(result,{route:selected,cardId:source.id})
 assert.equal(locate(value,toMusicCatalog(value),current(source.id),route({platform:'spotify'})).route.platform,'youtube')
})
test('a stale filter safely reveals the actual YouTube source; hidden and unknown sources are not invented',()=>{
 const value=structuredClone(base),catalog=toMusicCatalog(value)
 assert.equal(locate(value,catalog,current('yt-wave'),route({search:'no matching title'})).cardId,'yt-wave')
 assert.equal(locate(value,catalog,current('missing'),route()),null)
 value.sources.find(s=>s.id==='yt-wave').listed=false
 assert.equal(locate(value,toMusicCatalog(value),current('yt-wave'),route()),null)
})
test('confirmed album track locates the precise release and track while retaining search/category',()=>{
 const value=albumLibrary(),catalog=toMusicCatalog(value),selected=route({platform:'spotify',category:'albums',search:'WAVE',releaseSourceId:'sp-kmnculture'})
 const result=locate(value,catalog,current('sp-wave-test',{releaseId:value.releases[0].id,discNumber:1,trackNumber:3}),selected)
 assert.deepEqual(result,{route:selected,cardId:'sp-kmnculture',sourceId:'sp-wave-test',discNumber:1,trackNumber:3})
})
test('native Spotify track URI is used only for confirmed tracks in the active release',()=>{
 const value=albumLibrary(),catalog=toMusicCatalog(value),selected=route({platform:'spotify',releaseSourceId:'sp-kmnculture'})
 const album=current('sp-kmnculture')
 assert.equal(locate(value,catalog,album,selected,'spotify:track:AAAAAAAAAAAAAAAAAAAAAA').sourceId,'sp-wave-test')
 const unknown=locate(value,catalog,album,selected,'spotify:track:BBBBBBBBBBBBBBBBBBBBBB')
 assert.equal(unknown.cardId,'sp-kmnculture');assert.equal(unknown.sourceId,undefined)
})
test('same recording in two releases locates the explicitly selected edition, not the first album',()=>{
 const value=albumLibrary(),first=value.releases[0],second=structuredClone(first),source=structuredClone(value.sources.find(s=>s.id==='sp-kmnculture'))
 delete value.sources.find(s=>s.id==='sp-wave-test').target.releaseId;second.id='release-other-edition';value.releases.push(second)
 source.id='sp-other-edition';source.platformId='BBBBBBBBBBBBBBBBBBBBBB';source.externalUrl='https://open.spotify.com/album/'+source.platformId;source.target.releaseId=second.id;value.sources.push(source)
 const result=locate(value,toMusicCatalog(value),current('sp-wave-test',{releaseId:second.id,discNumber:1,trackNumber:3}),route({platform:'spotify'}))
 assert.equal(result.cardId,source.id);assert.equal(result.route.releaseSourceId,source.id)
})
test('album detail remains locatable even when an unrelated list search hides its card',()=>{
 const value=albumLibrary(),selected=route({platform:'spotify',search:'no matching title',releaseSourceId:'sp-kmnculture'})
 const result=locate(value,toMusicCatalog(value),current('sp-wave-test',{releaseId:value.releases[0].id}),selected)
 assert.deepEqual(result.route,selected)
})

test('YouTube playback selected inside a confirmed Spotify album locates that album context',()=>{
 const value=albumLibrary(),release=value.releases[0]
 release.tracks[0].sourceIds.push('yt-wave')
 const selected=route({platform:'spotify',category:'albums',releaseSourceId:'sp-kmnculture'})
 const result=locate(value,toMusicCatalog(value),current('yt-wave',{releaseId:release.id,discNumber:1,trackNumber:3}),selected)
 assert.deepEqual(result,{route:selected,cardId:'sp-kmnculture',sourceId:'yt-wave',discNumber:1,trackNumber:3})
})
