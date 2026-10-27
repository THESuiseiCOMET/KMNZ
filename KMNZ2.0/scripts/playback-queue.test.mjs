import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {musicLibrary:library}=await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
const {musicCatalog:catalog}=await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
const {createQueueSelections,emptyQueue,queueReducer:reduce,currentQueueItem,queueAvailability}=await loadTypeScript(new URL('../src/lib/playbackQueue.ts',import.meta.url))
const factory=createQueueSelections(library)
const youtube=catalog.filter(entry=>entry.platform==='youtube')
const select=selection=>reduce(emptyQueue,{type:'select',selection})
const ready=queue=>reduce(queue,{type:'observe',observation:{requestId:queue.requestId,sourceId:currentQueueItem(queue).sourceId,status:'playing',canLoad:true}})
const ended=queue=>({type:'ended',requestId:queue.requestId,sourceId:currentQueueItem(queue).sourceId})

test('YouTube list navigation follows the supplied order and stops at both boundaries',()=>{
  let queue=ready(select(factory.list(youtube,youtube[1].id)))
  assert.deepEqual(queueAvailability(queue),{previous:true,next:true})
  queue=reduce(queue,{type:'move',direction:-1})
  assert.equal(currentQueueItem(queue).sourceId,youtube[0].id)
  assert.equal(reduce(queue,{type:'move',direction:-1}),queue)
  for(let i=1;i<youtube.length;i++)queue=reduce(queue,{type:'move',direction:1})
  assert.equal(currentQueueItem(queue).sourceId,youtube.at(-1).id)
  assert.equal(reduce(queue,{type:'move',direction:1}),queue)
})

test('search queue is a snapshot: later filtering, array changes and page navigation cannot reorder it',()=>{
  const results=[youtube[4],youtube[0],youtube[2]]
  const selection=factory.list(results,youtube[0].id,' DAYS ')
  const queue=ready(select(selection))
  assert.equal(queue.origin.kind,'search')
  assert.equal(queue.origin.query,'DAYS')
  results.reverse();selection.items.reverse()
  assert.deepEqual(queue.items.map(item=>item.sourceId),[youtube[4].id,youtube[0].id,youtube[2].id])
  assert.equal(currentQueueItem(reduce(queue,{type:'move',direction:1})).sourceId,youtube[2].id)
  assert(!queue.items.some(item=>item.platform==='spotify'))
})

test('album queue starts at track three and follows confirmed album order, not global year order',()=>{
  let queue=ready(select(factory.album('release-kmnculture','sp-kmnculture-mid-journey',{discNumber:1,trackNumber:3})))
  assert.equal(queue.index,2)
  assert.equal(queue.items.length,9)
  assert.equal(queue.origin.releaseId,'release-kmnculture')
  assert.equal(currentQueueItem(reduce(queue,{type:'move',direction:-1})).sourceId,'sp-kmnculture-new-days')
  assert.equal(currentQueueItem(reduce(queue,{type:'move',direction:1})).sourceId,'sp-kmnculture-lunatic-beast')
  assert.deepEqual(queue.items.map(item=>item.trackNumber),[1,2,3,4,5,6,7,8,9])
  assert(queue.items.every(item=>item.releaseId==='release-kmnculture'&&item.songId&&item.sourceId!==item.songId))
  queue=ready(select(factory.album('release-drops','sp-mirror')))
  assert.deepEqual(queue.items.map(item=>item.trackNumber),[1,2,3])
  assert.deepEqual(queueAvailability(queue),{previous:true,next:false})
  assert.equal(factory.album('release-kmnculture','sp-mirror'),null)
})

test('unknown tracks and missing sources do not enter album queues',()=>{
  const value=structuredClone(library)
  value.releases[0].tracklistStatus='unknown';value.releases[0].tracks=[]
  for(const source of value.sources) if(source.target.type==='song'&&source.target.releaseId===value.releases[0].id) delete source.target.releaseId
  assert.equal(createQueueSelections(value).album(value.releases[0].id,'sp-kmnculture-verse'),null)
  const partial=structuredClone(library)
  partial.releases[0].tracklistStatus='partial'
  partial.releases[0].tracks[1].sourceIds=[]
  delete partial.sources.find(source=>source.id==='sp-kmnculture-new-days').target.releaseId
  const selection=createQueueSelections(partial).album(partial.releases[0].id,'sp-kmnculture-verse')
  assert.equal(selection.items.length,8)
  assert(!selection.items.some(item=>item.trackNumber===2))
})

test('the exact selected platform source and album identity survive shared song IDs',()=>{
  const value=structuredClone(library)
  const source=value.sources.find(source=>source.id==='sp-kmnculture-verse')
  source.target.songId='song-verse'
  const release=value.releases[0]
  release.tracks[0].songId='song-verse'
  release.tracks[0].sourceIds.push('yt-verse')
  const selections=createQueueSelections(value)
  assert.equal(selections.album(release.id,'yt-verse').items[0].sourceId,'yt-verse')
  assert.equal(selections.album(release.id,source.id).items[0].sourceId,source.id)
  value.releases.push({id:'release-alternate',title:'Alternate',artist:'KMNZ',kind:'album',tracklistStatus:'complete',tracks:[
    {songId:'song-verse',discNumber:1,trackNumber:7,sourceIds:['yt-verse']},
  ]})
  const alternate=createQueueSelections(value).album('release-alternate','yt-verse')
  assert.equal(alternate.items[0].trackNumber,7)
  assert.equal(alternate.origin.releaseId,'release-alternate')
})

test('duplicate recordings in separate album slots retain their disc and track identity',()=>{
  const value=structuredClone(library)
  value.releases[0].tracks.push({...structuredClone(value.releases[0].tracks[0]),discNumber:2,trackNumber:1})
  const selection=createQueueSelections(value).album(value.releases[0].id,'sp-kmnculture-verse',{discNumber:2,trackNumber:1})
  assert.equal(selection.index,9)
  assert.notEqual(selection.items[0].key,selection.items[9].key)
})

test('YouTube completion advances once, ends normally, and repeat-one replays without changing index',()=>{
  let queue=ready(select(factory.list(youtube,youtube[0].id)))
  const completion=ended(queue)
  queue=reduce(queue,completion)
  assert.equal(queue.index,1)
  assert.equal(reduce(queue,completion),queue)
  queue=ready(select(factory.list([youtube[0]],youtube[0].id)))
  queue=reduce(queue,ended(queue))
  assert.equal(queue.status,'ended')
  assert.equal(reduce(queue,ended(queue)),queue)
  assert.equal(reduce(queue,{type:'observe',observation:{requestId:queue.requestId,sourceId:currentQueueItem(queue).sourceId,status:'paused'}}),queue)
  queue=ready(select(factory.list(youtube,youtube[2].id)))
  queue=reduce(queue,{type:'mode',mode:'repeat-one'})
  const requestId=queue.requestId
  queue=reduce(queue,ended(queue))
  assert.equal(queue.index,2)
  assert.equal(queue.requestId,requestId+1)
  assert.equal(queue.mode,'repeat-one')
})

test('rapid skip actions are sequential and stale playback/error callbacks cannot change the newest request',()=>{
  let queue=ready(select(factory.list(youtube,youtube[0].id)))
  const stale=ended(queue)
  queue=reduce(queue,{type:'move',direction:1})
  queue=reduce(queue,{type:'move',direction:1})
  queue=reduce(queue,{type:'move',direction:-1})
  assert.equal(queue.index,1)
  assert.equal(reduce(queue,stale),queue)
  assert.equal(reduce(queue,{type:'observe',observation:{requestId:stale.requestId,sourceId:stale.sourceId,status:'error',error:'late'}}),queue)
})

test('Spotify preview completion does not advance; native collections remain under official control',()=>{
  let queue=ready(select(factory.album('release-kmnculture','sp-kmnculture-mid-journey')))
  assert.equal(reduce(queue,ended(queue)),queue)
  assert.equal(reduce(queue,{type:'mode',mode:'repeat-one'}),queue)
  queue=ready(select(factory.list([], 'sp-kmnculture')))
  assert.equal(queue.origin.kind,'native-collection')
  assert.equal(queue.items.length,1)
  assert.deepEqual(queueAvailability(queue),{previous:false,next:false})
  queue=reduce(queue,{type:'observe',observation:{requestId:queue.requestId,sourceId:'sp-kmnculture',status:'playing',uri:'spotify:track:unknown-native-track'}})
  assert.equal(queue.observedUri,'spotify:track:unknown-native-track')
  assert.equal(currentQueueItem(queue).sourceId,'sp-kmnculture')
})

test('unsupported remote loading and errors preserve queue state without pretending navigation succeeded',()=>{
  let queue=ready(select(factory.list(youtube,youtube[1].id)))
  const items=queue.items
  queue=reduce(queue,{type:'observe',observation:{requestId:queue.requestId,sourceId:currentQueueItem(queue).sourceId,status:'error',canLoad:false,error:'unavailable'}})
  assert.equal(queue.items,items)
  assert.equal(queue.index,1)
  assert.equal(reduce(queue,{type:'move',direction:1}),queue)
  const closed=reduce(queue,{type:'close'})
  assert.equal(closed.status,'idle')
  assert.equal(closed.items.length,0)
  assert(closed.requestId>queue.requestId)
})

test('drag bounds preserve the player inside desktop and mobile viewports',async()=>{
  const {clampPlayerPosition}=await loadTypeScript(new URL('../src/lib/playerControls.ts',import.meta.url))
  assert.deepEqual(clampPlayerPosition({x:5000,y:5000},{width:360,height:340},{left:0,top:0,width:1440,height:900}),{x:1068,y:548})
  assert.deepEqual(clampPlayerPosition({x:-100,y:-100},{width:296,height:500},{left:0,top:0,width:320,height:640}),{x:12,y:12})
  assert.deepEqual(clampPlayerPosition({x:900,y:900},{width:296,height:500},{left:0,top:100,width:320,height:640}),{x:12,y:228})
})
