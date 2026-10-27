import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript, updateMetadata, validateIndex, imageSize} from './update-music-metadata.mjs'

const helpers = await loadTypeScript(new URL('../src/lib/musicMetadata.ts',import.meta.url))
const {musicCatalog: catalog} = await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
const now = new Date('2026-10-26T12:00:00Z')
const proof = source => ({source,status:'verified',verifiedAt:now.toISOString(),sourceUrl:'https://www.youtube.com/watch?v=MehG9Ms8ygU'})
const youtube = catalog[0]
const spotify = catalog.find(entry => entry.id === 'sp-mirror')
const empty = Object.fromEntries(catalog.map(entry => [entry.id,{platformId:entry.platformId}]))
const json = value => new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}})
function png(width,height) {
  const bytes = Buffer.alloc(24)
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes)
  bytes.writeUInt32BE(width,16); bytes.writeUInt32BE(height,20)
  return new Response(bytes,{headers:{'content-type':'image/png'}})
}
function source({hd = 'missing', fail = false} = {}) {
  const calls = []
  const fetcher = async (input, options) => {
    const url = new URL(input)
    calls.push({url:url.toString(),headers:options?.headers})
    if (fail) return new Response('',{status:503})
    if (url.hostname === 'www.googleapis.com') return json({items:catalog.filter(entry=>entry.platform==='youtube').map(entry=>({id:entry.platformId,snippet:{publishedAt:'2025-05-24T15:30:00Z',thumbnails:{maxres:{url:'https://i.ytimg.com/vi/'+entry.platformId+'/maxresdefault.jpg'},medium:{url:'https://i.ytimg.com/vi/'+entry.platformId+'/mqdefault.jpg'}}}}))})
    if (url.hostname === 'i.ytimg.com') {
      if (url.pathname.endsWith('mqdefault.jpg')) return png(320,180)
      return hd === 'valid' ? png(1280,720) : hd === 'placeholder' ? png(120,90) : new Response('',{status:404})
    }
    if (url.pathname === '/oembed') return json({provider_name:'Spotify',type:'rich',thumbnail_url:'https://i.scdn.co/image/official-fixture'})
    if (url.hostname === 'i.scdn.co') return png(640,640)
    if (url.hostname === 'api.spotify.com') {
      const id = url.pathname.split('/').at(-1)
      const album = {id:'fixture-release',release_date:'2025-05',release_date_precision:'month',images:[]}
      return json(url.pathname.includes('/tracks/') ? {id,album} : {...album,id})
    }
    throw new Error('Unexpected request')
  }
  return {fetcher,calls}
}
const update = options => updateMetadata({catalog,metadata:empty,manual:{},helpers,now,...options})

test('precision, calendar validation, Tokyo boundary and unknown dates',()=>{
  assert(helpers.validReleaseDate('2025','year'))
  assert(helpers.validReleaseDate('2025-05','month'))
  assert(helpers.validReleaseDate('2024-02-29','day'))
  assert(!helpers.validReleaseDate('2025-02-29','day'))
  assert(!helpers.validReleaseDate('2025-05-01','month'))
  assert(!helpers.validPublishedAt('2025-02-30T00:00:00Z'))
  assert.equal(helpers.musicDate(youtube,{platformId:youtube.platformId}),null)
  const metadata = {...empty,[youtube.id]:{platformId:youtube.platformId,publishedAt:{value:'2025-05-24T15:30:00Z',...proof('youtube-data-api')}}}
  assert.equal(helpers.musicDate(youtube,helpers.resolveMetadata(youtube,metadata)).label,'2025.05.25')
  for (const [value,precision,label] of [['2025','year','2025'],['2025-05','month','2025.05'],['2025-05-25','day','2025.05.25']]) {
    assert.equal(helpers.musicDate(spotify,{releaseDate:{value,precision}}).label,label)
  }
})

test('newest first, unknown last, stable ties, no mutation or legacy year guessing',()=>{
  const entries = catalog.filter(entry=>entry.platform==='youtube')
  const metadata = structuredClone(empty)
  metadata[entries[2].id].publishedAt = {value:'2025-05-25T00:00:00Z',...proof('youtube-data-api')}
  metadata[entries[3].id].publishedAt = {value:'2025-05-25T00:00:00Z',...proof('youtube-data-api')}
  metadata[entries[4].id].publishedAt = {value:'2025-05-26T00:00:00Z',...proof('youtube-data-api')}
  const sorted = helpers.sortMusicEntries(entries,metadata).map(entry=>entry.id)
  assert.deepEqual(sorted.slice(0,3),[entries[4].id,entries[2].id,entries[3].id])
  assert.deepEqual(sorted.slice(3),[entries[0].id,entries[1].id,entries[5].id,entries[6].id])
  assert.equal(entries[0].id,'yt-wave')
})

test('Spotify partial dates sort consistently without filling missing month/day values',()=>{
  const values=['2025','2025-05','2025-05-25',undefined,'2025-05-25']
  const entries=values.map((value,index)=>({...spotify,id:'date-case-'+index,year:2099}))
  const index=Object.fromEntries(entries.map((entry,i)=>[entry.id,{platformId:entry.platformId,...(values[i]?{releaseDate:{value:values[i],precision:['year','month','day'][values[i].split('-').length-1],...proof('spotify-web-api')}}:{})}]))
  assert.deepEqual(helpers.sortMusicEntries(entries,index).map(entry=>entry.id),[entries[2].id,entries[4].id,entries[1].id,entries[0].id,entries[3].id])
  assert.equal(index[entries[0].id].releaseDate.value,'2025')
  assert.equal(index[entries[1].id].releaseDate.value,'2025-05')
})

test('without credentials only oEmbed/images are requested; dates stay unknown; fresh rerun is cached',async()=>{
  const api=source()
  const result=await update({fetcher:api.fetcher})
  assert.equal(api.calls.length,4)
  for (const entry of catalog.filter(item=>item.platform==='youtube')) assert.equal(result[entry.id].publishedAt,undefined)
  for (const entry of catalog.filter(item=>item.platform==='spotify')) {
    assert.equal(result[entry.id].cover.width,640)
    assert.equal(result[entry.id].releaseDate,undefined)
  }
  const cached=source()
  assert.deepEqual(await update({metadata:result,fetcher:cached.fetcher}),result)
  assert.equal(cached.calls.length,0)
})

for (const hd of ['missing','placeholder','valid']) test('YouTube maxres '+hd+' falls back safely, keeping original ISO',async()=>{
  const api=source({hd})
  const result=await update({fetcher:api.fetcher,env:{YOUTUBE_API_KEY:'TEST_SECRET_DO_NOT_SAVE'}})
  assert(result[youtube.id].cover.url.endsWith(hd==='valid'?'maxresdefault.jpg':'mqdefault.jpg'))
  assert.equal(result[youtube.id].publishedAt.value,'2025-05-24T15:30:00Z')
  assert(!JSON.stringify(result).includes('TEST_SECRET_DO_NOT_SAVE'))
  assert(!JSON.stringify(result).includes('hqdefault'))
})

test('Spotify date comes from the current release, keeping month precision; oEmbed cover wins',async()=>{
  const api=source()
  const result=await update({fetcher:api.fetcher,env:{SPOTIFY_ACCESS_TOKEN:'TOKEN_NOT_FOR_FRONTEND'},refresh:true})
  assert.equal(result[spotify.id].releaseDate.value,'2025-05')
  assert.equal(result[spotify.id].releaseDate.precision,'month')
  assert.equal(result[spotify.id].cover.source,'spotify-oembed')
  assert(!JSON.stringify(result).includes('TOKEN_NOT_FOR_FRONTEND'))
})

test('manual fields and explicit unknowns override automation and are never written over',async()=>{
  const manual = {[youtube.id]:{platformId:youtube.platformId,cover:null,publishedAt:{value:'2024-04-01T03:00:00Z',...proof('manual')}}}
  const original=structuredClone(manual)
  const api=source({hd:'valid'})
  const result=await update({fetcher:api.fetcher,env:{YOUTUBE_API_KEY:'test'},manual,refresh:true})
  assert.deepEqual(manual,original)
  const resolved=helpers.resolveMetadata(youtube,result,manual)
  assert.equal(resolved.cover,undefined)
  assert.equal(resolved.publishedAt.value,'2024-04-01T03:00:00Z')
  assert(!api.calls.some(call=>call.url.includes('/vi/'+youtube.platformId+'/')))
  assert.throws(()=>validateIndex({bad:{platformId:'bad'}},catalog,helpers))
  assert.throws(()=>validateIndex({[youtube.id]:{platformId:youtube.platformId,publishedAt:{value:'2025',...proof('manual')}}},catalog,helpers,true))
})

test('API failures retain all previous valid fields; retry backoff avoids repeated failures',async()=>{
  const good=await update({fetcher:source({hd:'valid'}).fetcher,env:{YOUTUBE_API_KEY:'test',SPOTIFY_ACCESS_TOKEN:'test'}})
  const failed=await update({metadata:good,fetcher:source({fail:true}).fetcher,env:{YOUTUBE_API_KEY:'test',SPOTIFY_ACCESS_TOKEN:'test'},refresh:true})
  for(const entry of catalog) for(const key of ['cover','publishedAt','releaseDate']) assert.deepEqual(failed[entry.id][key],good[entry.id][key])
  const api=source({fail:true})
  const first=await update({fetcher:api.fetcher,env:{YOUTUBE_API_KEY:'test',SPOTIFY_ACCESS_TOKEN:'test'}})
  const retries=source({fail:true})
  await update({metadata:first,fetcher:retries.fetcher,env:{YOUTUBE_API_KEY:'test',SPOTIFY_ACCESS_TOKEN:'test'}})
  assert.equal(retries.calls.length,0)
})

test('image size and fallback validation reject HTTP-200 low resolution placeholders and wrong aspect ratios',()=>{
  assert.equal(imageSize(Buffer.from('not an image')),null)
  assert(!helpers.validCoverSize(120,90,'youtube',true))
  assert(!helpers.validCoverSize(480,360,'youtube'))
  assert(!helpers.validCoverSize(640,480,'spotify'))
  assert(helpers.validCoverSize(1280,720,'youtube',true))
  assert(helpers.validCoverSize(640,640,'spotify'))
  assert(helpers.spotifyImageHost('image-cdn-ak.spotifycdn.com'))
  assert(helpers.spotifyImageHost('image-cdn-fa.spotifycdn.com'))
  assert(!helpers.spotifyImageHost('image-cdn-ak.spotifycdn.com.attacker.example'))
  assert.deepEqual(helpers.coverCandidates(youtube,{cover:{url:'https://i.ytimg.com/vi/'+youtube.platformId+'/maxresdefault.jpg'}}),[
    'https://i.ytimg.com/vi/'+youtube.platformId+'/maxresdefault.jpg','https://i.ytimg.com/vi/'+youtube.platformId+'/mqdefault.jpg'])
})
