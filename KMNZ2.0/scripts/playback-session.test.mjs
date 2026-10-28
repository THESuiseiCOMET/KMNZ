import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'

const {musicLibrary:library}=await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
const {musicCatalog:catalog}=await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
const {createQueueSelections,emptyQueue,queueReducer}=await loadTypeScript(new URL('../src/lib/playbackQueue.ts',import.meta.url))
const {parsePlaybackSession:parse,savePlaybackSession:save,readPlaybackSession:read,playbackSessionKey:key}=await loadTypeScript(new URL('../src/lib/playbackSession.ts',import.meta.url))
const choices=createQueueSelections(library)
const youtube=catalog.filter(item=>item.platform==='youtube')
function storage(){const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}}
function setup(){const selection=choices.list(youtube.slice(0,4),youtube[2].id,'KMNZ');const queue={...queueReducer(emptyQueue,{type:'select',selection}),status:'playing',mode:'repeat-one'};return {queue,point:{sourceId:youtube[2].id,requestId:queue.requestId,seconds:37.25,duration:180,paused:false}}}

test('refresh restores exact source, search queue order, position, mode and playback intent without claiming playing',()=>{
  const s=storage(),{queue,point}=setup();save(queue,point,s)
  const restored=read(library,catalog,s)
  assert.deepEqual(restored.queue.items,queue.items);assert.equal(restored.queue.index,2);assert.equal(restored.queue.mode,'repeat-one')
  assert.equal(restored.queue.status,'loading');assert.equal(restored.queue.canLoad,false)
  assert.equal(restored.resume.seconds,37.25);assert.equal(restored.resume.autoplay,true)
  save({...queue,status:'paused'},point,s);assert.equal(read(library,catalog,s).resume.autoplay,false)
  save({...queue,status:'ended'},point,s);assert.equal(read(library,catalog,s).resume.autoplay,false)
})

test('confirmed album queue restores its own disc and track order rather than the global catalog',()=>{
  let selection
  for(const release of library.releases)for(const track of release.tracks??[])for(const id of track.sourceIds){const candidate=choices.album(release.id,id,{discNumber:track.discNumber,trackNumber:track.trackNumber});if(candidate?.index>=2){selection=candidate;break}}
  assert(selection)
  const s=storage(),queue=queueReducer(emptyQueue,{type:'select',selection});save(queue,null,s)
  const restored=read(library,catalog,s)
  assert.deepEqual(restored.queue.items,selection.items);assert.equal(restored.queue.index,selection.index)
})

test('corrupt, stale, missing or forged sources cannot enter a restored queue',()=>{
  const s=storage(),{queue,point}=setup();save(queue,point,s);const valid=JSON.parse(s.getItem(key))
  for(const patch of [{version:9},{index:-1},{index:9000},{seconds:-1},{seconds:null},{autoplay:'yes'},{origin:{kind:'list',platform:'spotify'}},{items:[{sourceId:'missing'}],index:0}])assert.equal(parse(JSON.stringify({...valid,...patch}),library,catalog),null)
  assert.equal(parse('{broken',library,catalog),null);assert.equal(parse(null,library,catalog),null)
  save(queue,{...point,requestId:999},s);assert.equal(read(library,catalog,s).resume.seconds,0)
  save(emptyQueue,null,s);assert.equal(s.getItem(key),null)
  const blocked={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')},removeItem(){throw new Error('blocked')}}
  assert.equal(read(library,catalog,blocked),null);assert.doesNotThrow(()=>save(queue,point,blocked))
})

test('Spotify restores its actual selected source and queue without inventing music seek support',()=>{
  const entry=catalog.find(item=>item.platform==='spotify'&&item.kind==='track')
  const queue=queueReducer(emptyQueue,{type:'select',selection:choices.list([entry],entry.id)})
  const s=storage();save(queue,{sourceId:entry.id,requestId:queue.requestId,seconds:45,duration:180,paused:false},s)
  const restored=read(library,catalog,s)
  assert.equal(restored.resume.sourceId,entry.id);assert.equal(restored.resume.seconds,0);assert.equal(restored.queue.items[0].platform,'spotify')
})
