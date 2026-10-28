import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
import {harness,music,tick,youtubeApi,spotifyApi} from './helpers/player-harness.mjs'
const youtube=music.musicCatalog.filter(entry=>entry.platform==='youtube')
const spotify=music.musicCatalog.filter(entry=>entry.platform==='spotify')
const uri=entry=>'spotify:'+entry.kind+':'+entry.platformId
const update=(entry,extra={})=>({data:{playingURI:uri(entry),isPaused:false,isBuffering:false,position:1000,duration:30000,...extra}})

test('YouTube timeline uses official times; seeking clamps to duration without restarting paused playback',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  assert.equal(h.render().canSeek,false)
  await tick();const player=api.players[0];player.ready()
  assert.equal(h.render().seekTo(10),false)
  player.duration=180;player.currentTime=12.5;player.emit(1)
  assert.equal(h.render().currentTime,12.5);assert.equal(h.render().duration,180)
  assert.equal(h.render().canSeek,true)
  player.currentTime=25;h.poll();assert.equal(h.render().currentTime,25)
  player.emit(2)
  const before=player.calls.length
  assert.equal(h.render().seekTo(90),true)
  assert.deepEqual(player.calls.slice(before),[['seek',90]])
  assert.equal(h.render().currentTime,90);assert.equal(h.render().paused,true)
  assert.equal(h.render().seekTo(1000),true);assert.equal(h.render().currentTime,180)
  assert.equal(h.render().seekTo(-8),true);assert.equal(h.render().currentTime,0)
  const count=player.calls.length
  assert.equal(h.render().seekTo(NaN),false);assert.equal(h.render().seekTo(Infinity),false)
  assert.equal(player.calls.length,count);assert.equal(h.completions.length,0)
  assert.equal(api.players.length,1);assert.equal(h.intervalCount,1)
  h.unmount();assert.equal(h.intervalCount,0)
})

test('switching tracks invalidates old drag callbacks and ignores stale source progress',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready()
  player.duration=200;player.currentTime=50;player.emit(1)
  const oldSeek=h.render().seekTo
  h.render(youtube[1],2)
  assert.equal(h.render().currentTime,0);assert.equal(h.render().duration,0)
  assert.equal(h.render().canSeek,false)
  const before=player.calls.length
  assert.equal(oldSeek(90),false);assert.equal(player.calls.length,before)
  player.videoId=youtube[0].platformId;player.duration=200;player.currentTime=51;player.emit(1);h.poll()
  assert.equal(h.render().duration,0)
  player.videoId=youtube[1].platformId;player.duration=100;player.currentTime=5;player.emit(1)
  assert.equal(h.render().duration,100);assert.equal(h.render().currentTime,5)
  h.render(youtube[1],3)
  assert.equal(h.render().canSeek,false)
  player.emit(1);assert.equal(h.render().canSeek,true)
  assert.equal(api.players.length,1)
  h.unmount()
})

test('invalid times, video failures and failed seeks do not fake progress or queue transitions',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready()
  for(const duration of [0,-1,NaN,Infinity]) {
    player.duration=duration;player.currentTime=12;player.emit(1)
    assert.equal(h.render().canSeek,false);assert.equal(h.render().currentTime,0)
  }
  player.duration=100;player.currentTime=NaN;h.poll();assert.equal(h.render().canSeek,false)
  player.currentTime=12;h.poll();assert.equal(h.render().canSeek,true)
  player.seekTo=()=>{throw new Error('offline')}
  assert.equal(h.render().seekTo(70),false);assert.equal(h.render().currentTime,12)
  assert(h.render().error.includes('进度跳转失败'))
  player.events.onError({target:player,data:100})
  assert.equal(h.render().canSeek,false);assert.equal(h.completions.length,0)
  h.unmount()
})

test('Spotify music retains native progress instead of claiming unsupported podcast seeking',async()=>{
  const api=spotifyApi();const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  controller.listeners.playback_update(update(spotify[1]))
  assert.equal(h.render().canSeek,false);assert.equal(h.render().seekTo(10),false)
  assert.deepEqual(controller.calls,['play'])
  h.unmount()
})

test('Spotify album and track selections request playback once after ready; blocked starts remain paused',async()=>{
  for(const entry of [spotify.find(entry=>entry.kind==='album'),spotify.find(entry=>entry.kind==='track')]) {
    const api=spotifyApi();const h=harness(api,entry)
    h.render();await tick();const controller=api.controllers[0]
    assert.equal(controller.options.uri,uri(entry));assert.equal(controller.options.height,152)
    assert.deepEqual(controller.calls,[])
    controller.listeners.ready();controller.listeners.ready()
    assert.deepEqual(controller.calls,['play'])
    assert.equal(h.render().paused,true);assert.equal(h.render().ready,true)
    controller.listeners.playback_started({data:{playingURI:entry.kind==='album'?uri(spotify[1]):uri(entry)}})
    assert.equal(h.render().paused,false)
    h.render().togglePlayback();assert.equal(controller.calls.at(-1),'pause')
    h.unmount()
  }
})

test('Spotify dynamic track loading reuses one controller and ignores older track events',async()=>{
  const api=spotifyApi();const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  controller.listeners.playback_started({data:{playingURI:uri(spotify[1])}})
  const replacements=h.host.replacements
  h.render(spotify[2],2)
  assert.deepEqual(controller.calls.slice(-2),[['load',uri(spotify[2])],'play'])
  assert.equal(api.controllers.length,1);assert.equal(h.host.replacements,replacements)
  controller.listeners.playback_started({data:{playingURI:uri(spotify[1])}})
  assert.equal(h.render().paused,true)
  controller.listeners.playback_started({data:{playingURI:uri(spotify[2])}})
  assert.equal(h.render().paused,false)
  controller.listeners.playback_update(update(spotify[2],{isPaused:true}))
  assert.equal(h.render().paused,true)
  h.render().togglePlayback();assert.equal(controller.calls.at(-1),'play')
  h.unmount();controller.listeners.playback_started({data:{playingURI:uri(spotify[2])}})
  assert.equal(controller.calls.at(-1),'destroy')
})

test('Spotify rapid changes preserve the latest exact source and support the official loadEntity alternative',async()=>{
  const api=spotifyApi({modern:true});const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  h.render(spotify[2],2);h.render(spotify[3],3);h.render(spotify[4],4)
  controller.listeners.playback_started({data:{playingURI:uri(spotify[3])}})
  assert.equal(h.render().paused,true)
  controller.listeners.playback_started({data:{playingURI:uri(spotify[4])}})
  assert.equal(h.render().paused,false)
  assert.equal(h.observations.at(-1).sourceId,spotify[4].id)
  assert.equal(h.observations.at(-1).requestId,4)
  assert.equal(api.controllers.length,1)
  assert.deepEqual(Object.keys(controller.listeners).sort(),['playback_started','playback_update','ready'])
  h.unmount()
})

test('Spotify preview endings and native album transitions never schedule website auto-next or repeat',async()=>{
  const api=spotifyApi();const h=harness(api,spotify[0])
  h.render(spotify[0],1,true);await tick();const controller=api.controllers[0];controller.listeners.ready()
  controller.listeners.playback_started({data:{playingURI:uri(spotify[2])}})
  controller.listeners.playback_update(update(spotify[2],{position:30000,isPaused:true}))
  controller.listeners.playback_update(update(spotify[2],{position:30000,isPaused:true}))
  controller.listeners.playback_started({data:{playingURI:uri(spotify[3])}})
  assert.equal(h.completions.length,0)
  assert.deepEqual(controller.calls,['play'])
  assert.equal(h.render().canRepeat,false)
  assert.equal(h.observations.at(-1).uri,uri(spotify[3]))
  assert.equal(h.observations.at(-1).sourceId,spotify[0].id)
  h.unmount()
})

test('unsupported Spotify remote loading is reported, never emulated with a replacement player or fake success',async()=>{
  const api=spotifyApi({supported:false});const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  assert.equal(h.render().canChangeSource,false)
  const replacements=h.host.replacements
  h.render(spotify[2],2)
  assert(h.render().error.includes('不支持远程切换'))
  assert.equal(h.observations.at(-1).status,'error')
  assert.equal(h.render().paused,true)
  assert.deepEqual(controller.calls,['play'])
  assert.equal(api.controllers.length,1);assert.equal(h.host.replacements,replacements)
  h.unmount()
})

test('Spotify preview can reach its duration without isPaused: show play without advancing the queue',async()=>{
  const api=spotifyApi();const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  controller.listeners.playback_started({data:{playingURI:uri(spotify[1])}})
  controller.listeners.playback_update(update(spotify[1],{position:30000,isPaused:false}))
  assert.equal(h.render().paused,true)
  assert.equal(h.observations.at(-1).status,'paused')
  assert.equal(h.completions.length,0)
  h.render().togglePlayback();assert.equal(controller.calls.at(-1),'play')
  controller.listeners.playback_update(update(spotify[1],{position:30000,isBuffering:true}))
  assert.equal(h.render().paused,false)
  for(const duration of [0,NaN,Infinity]) {
    controller.listeners.playback_update(update(spotify[1],{duration,position:30000}))
    assert.equal(h.render().paused,false)
  }
  h.unmount()
})

test('Spotify unexpected native content is reported without forcing another source or pretending queue advancement',async()=>{
  const api=spotifyApi();const h=harness(api,spotify[1])
  h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
  controller.listeners.playback_started({data:{playingURI:uri(spotify[1])}})
  controller.listeners.playback_update(update(spotify[2]))
  assert.equal(h.observations.at(-1).status,'error')
  assert.equal(h.observations.at(-1).uri,uri(spotify[2]))
  assert.deepEqual(controller.calls,['play'])
  assert.equal(h.completions.length,0)
  h.unmount()
})

test('closing before an API resolves never creates an abandoned controller; late callbacks are inert',async()=>{
  let resolve;let created=0
  const h=harness({loadSpotifyApi:()=>new Promise(accept=>{resolve=accept})},spotify[1])
  h.render();h.unmount();resolve({createController(){created++}});await tick()
  assert.equal(created,0)
  let callback
  const later=harness({loadSpotifyApi:async()=>({createController(target,options,accept){callback=accept}})},spotify[1])
  later.render();await tick();later.unmount()
  const calls=[];callback({destroy:()=>calls.push('destroy')})
  assert.deepEqual(calls,['destroy'])
})

test('API failure preserves native fallback and reports the latest requested source; explicit retry can recover',async()=>{
  let reject
  const deferred=harness({loadSpotifyApi:()=>new Promise((accept,fail)=>{reject=fail})},spotify[1])
  deferred.render();deferred.render(spotify[2],2);reject(new Error('offline'));await tick()
  assert.equal(deferred.render().ready,false)
  assert.equal(deferred.observations.at(-1).sourceId,spotify[2].id)
  assert.equal(deferred.observations.at(-1).requestId,2)
  assert.equal(deferred.host.children[0].tag,'iframe')
  deferred.unmount()
  const api=spotifyApi();let attempts=0
  const retry=harness({loadSpotifyApi:()=>++attempts===1?Promise.reject(new Error('offline')):api.loadSpotifyApi()},spotify[1])
  retry.render();await tick();retry.render(spotify[1],2);retry.render();await tick()
  assert.equal(api.controllers.length,1)
  api.controllers[0].listeners.ready();assert.equal(retry.render().ready,true)
  retry.unmount()
})

test('YouTube uses one iframe/controller across selections, callbacks and repeated renders',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready();player.emit(1)
  assert.equal(h.render().paused,false)
  const frame=player.frame;const replacements=h.host.replacements
  h.render(youtube[1],2)
  assert.deepEqual(player.calls.at(-1),['load',youtube[1].platformId])
  h.render({...youtube[1]},2)
  assert.equal(api.players.length,1);assert.equal(player.frame,frame);assert.equal(h.host.replacements,replacements)
  player.emit(1);h.render().togglePlayback();assert.equal(player.calls.at(-1),'pause')
  player.emit(2);h.render().togglePlayback();assert.equal(player.calls.at(-1),'play')
  h.unmount();assert.equal(player.calls.at(-1),'destroy');assert.equal(h.intervalCount,0)
})

test('YouTube completion is armed by real playback and deduplicated; stale states do not skip new selections',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready()
  player.emit(0);assert.equal(h.completions.length,0)
  player.emit(1);player.emit(0);player.emit(0)
  assert.deepEqual(h.completions,[{requestId:1,sourceId:youtube[0].id}])
  h.render(youtube[1],2)
  player.emit(0);assert.equal(h.completions.length,1)
  player.videoId=youtube[0].platformId;player.emit(1);player.emit(0)
  assert.equal(h.completions.length,1)
  player.videoId=youtube[1].platformId;player.emit(1);player.emit(0,1)
  assert.equal(h.completions.length,1)
  player.emit(0);assert.equal(h.completions.length,2)
  h.unmount();player.emit(0);assert.equal(h.completions.length,2)
})

test('YouTube rapid clicks before readiness load only the latest target and repeated source requests replay safely',async()=>{
  const api=youtubeApi();let resolve
  const h=harness({loadYouTubeApi:()=>new Promise(accept=>{resolve=accept})},youtube[0])
  h.render();h.render(youtube[1],2);h.render(youtube[2],3)
  resolve(api.api);await tick();const player=api.players[0];player.ready()
  assert.deepEqual(player.calls.filter(call=>Array.isArray(call)&&call[0]==='load'),[['load',youtube[2].platformId]])
  player.emit(1);player.emit(0)
  h.render(youtube[2],4)
  assert.deepEqual(player.calls.slice(-2),[['seek',0],'play'])
  assert.equal(api.players.length,1)
  h.unmount()
})

test('YouTube error/autoplay-block events do not clear the selection or invent playing state',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready()
  player.events.onError({target:player,data:100})
  assert.equal(h.observations.at(-1).status,'error')
  assert.equal(h.observations.at(-1).sourceId,youtube[0].id)
  assert.equal(h.render().paused,true)
  h.render(youtube[1],2);player.emit(1)
  assert.equal(h.render().error,undefined)
  player.events.onAutoplayBlocked();assert.equal(h.render().paused,true)
  assert.equal(h.completions.length,0)
  h.unmount()
})

test('YouTube volume, mute restoration, native synchronization and stored settings survive queue changes',async()=>{
  const api=youtubeApi();const h=harness(api,youtube[0])
  h.render();await tick();const player=api.players[0];player.ready()
  assert.equal(h.render().volume,70)
  h.render().setVolume(43);h.render().toggleMute();assert.equal(h.render().volume,0);assert(player.muted)
  h.render().toggleMute();assert.equal(h.render().volume,43)
  h.render().adjustVolume(5);assert.equal(h.render().volume,48)
  h.render().setVolume(1000);assert.equal(h.render().volume,100)
  h.render().setVolume(-1);assert.equal(h.render().volume,0)
  h.render().setVolume(NaN);assert.equal(h.render().volume,0)
  h.render().toggleMute();assert.equal(h.render().volume,100)
  player.volume=31;h.poll();assert.equal(h.render().volume,31)
  const stored=JSON.parse(h.storage.get('kmnzPlayerVolume'));assert.equal(stored.value,31)
  h.render(youtube[1],2);assert.equal(player.volume,31);assert.equal(api.players.length,1);assert.equal(h.intervalCount,1)
  h.unmount();assert.equal(h.intervalCount,0)
  for(const saved of ['not json','null','{"value":"loud","previous":70}']) {
    const bad=harness(api,youtube[0],{storage:new Map([['kmnzPlayerVolume',saved]])})
    assert.equal(bad.render().volume,70);bad.unmount()
  }
})

test('platform switches destroy the old controller exactly once and stale listeners cannot affect the new one',async()=>{
  const yt=youtubeApi();const sp=spotifyApi();const h=harness({...yt,...sp},youtube[0])
  h.render();await tick();const player=yt.players[0];player.ready();player.emit(1)
  h.render(spotify[1],2);await tick();const controller=sp.controllers[0];controller.listeners.ready()
  assert.equal(player.calls.filter(call=>call==='destroy').length,1)
  const count=h.observations.length;player.emit(0);assert.equal(h.observations.length,count)
  assert.equal(h.intervalCount,0)
  h.render(youtube[1],3);await tick();assert.equal(controller.calls.at(-1),'destroy')
  const after=h.observations.length;controller.listeners.playback_started({data:{playingURI:uri(spotify[1])}})
  assert.equal(h.observations.length,after)
  h.unmount()
})

test('YouTube end events drive the real queue once while retaining the same player',async()=>{
  const q=await loadTypeScript(new URL('../src/lib/playbackQueue.ts',import.meta.url))
  const {musicLibrary}=await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
  let queue=q.queueReducer(q.emptyQueue,{type:'select',selection:q.createQueueSelections(musicLibrary).list(youtube,youtube[0].id)})
  const api=youtubeApi()
  const h=harness(api,youtube[0],{onObservation:event=>{queue=q.queueReducer(queue,{type:'observe',observation:event})},
    onEnded:(requestId,sourceId)=>{queue=q.queueReducer(queue,{type:'ended',requestId,sourceId})}})
  h.render(youtube[0],queue.requestId);await tick();const player=api.players[0];player.ready();player.emit(1);player.emit(0);player.emit(0)
  assert.equal(queue.index,1)
  h.render(youtube[1],queue.requestId)
  assert.equal(api.players.length,1)
  player.emit(1)
  queue=q.queueReducer(queue,{type:'mode',mode:'repeat-one'})
  player.emit(0);assert.equal(queue.index,1)
  h.render(youtube[1],queue.requestId)
  assert.deepEqual(player.calls.slice(-2),[['seek',0],'play'])
  h.unmount()
})

test('YouTube refresh loads the saved second once and persists only confirmed source progress',async()=>{
  const api=youtubeApi(),points=[]
  const resume={sourceId:youtube[0].id,requestId:1,seconds:65.25,autoplay:true}
  const h=harness(api,youtube[0],{resume,onCheckpoint:point=>points.push(point)})
  try {
    h.render();await tick();const player=api.players[0]
    assert.equal(new URL(player.frame.src).searchParams.get('autoplay'),'0')
    player.ready();assert(player.calls.some(call=>Array.isArray(call)&&call[0]==='load'&&call[2]===65.25))
    assert.equal(h.render().paused,true)
    player.duration=180;player.currentTime=0;player.emit(5);assert.equal(points.length,0)
    player.currentTime=65.5;player.emit(1);assert.equal(h.render().paused,false)
    assert.equal(points.at(-1).seconds,65.5);assert.equal(points.at(-1).paused,false)
    player.events.onAutoplayBlocked();assert.equal(h.render().paused,true)
    h.render(youtube[1],2);player.videoId=youtube[0].platformId;player.emit(1)
    assert.equal(points.at(-1).sourceId,youtube[0].id)
    assert.equal(api.players.length,1);assert.equal(h.intervalCount,1)
  } finally {h.unmount()}
})

test('paused refresh cues YouTube at its saved second without issuing play or recreating the controller',async()=>{
  const api=youtubeApi(),resume={sourceId:youtube[0].id,requestId:1,seconds:42,autoplay:false}
  const h=harness(api,youtube[0],{resume})
  try {
    h.render();await tick();const player=api.players[0];player.ready()
    assert(player.calls.some(call=>Array.isArray(call)&&call[0]==='cue'&&call[2]===42))
    assert(!player.calls.includes('play'));assert.equal(h.render().paused,true)
    h.render().togglePlayback();assert.equal(player.calls.at(-1),'play')
    h.render(youtube[0],2);assert.equal(player.calls.filter(call=>Array.isArray(call)&&call[0]==='cue').length,1)
    assert.equal(api.players.length,1)
  } finally {h.unmount()}
})

test('Spotify paused refresh retains the selected entity and uses native music controls without seeking',async()=>{
  const api=spotifyApi(),entry=spotify.find(item=>item.kind==='track'),points=[]
  const h=harness(api,entry,{resume:{sourceId:entry.id,requestId:1,seconds:0,autoplay:false},onCheckpoint:point=>points.push(point)})
  try {
    h.render();await tick();const controller=api.controllers[0];controller.listeners.ready()
    assert.deepEqual(controller.calls,['pause']);assert.equal(controller.options.uri,uri(entry))
    controller.listeners.playback_update(update(entry,{isPaused:true,position:12000,duration:180000}))
    assert.equal(points.at(-1).seconds,12);assert.equal(points.at(-1).paused,true)
    assert.equal(h.render().canSeek,false);h.render().togglePlayback();assert.equal(controller.calls.at(-1),'play')
  } finally {h.unmount()}
})
