import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from '../load-typescript.mjs'
export const music=await loadTypeScript(new URL('../../src/data/music.ts',import.meta.url))
const source=await readFile(new URL('../../src/hooks/useOfficialPlayer.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
export const tick=()=>new Promise(resolve=>setImmediate(resolve))

export function harness(api,initialEntry=music.musicCatalog[0],{storage=new Map(),onObservation,onEnded}={}) {
  const slots=[];let cursor=0;let effects=[];let entry=initialEntry;let requestId=1;let loop=false;let now=2000
  const observations=[];const completions=[];const intervals=new Map();let timerId=0
  const host={children:[],replacements:0,replaceChildren(...children){this.children=children;this.replacements++}}
  const react={
    useRef(value){const i=cursor++;return slots[i]??={current:value}},
    useState(value){const i=cursor++;slots[i]??={value:typeof value==='function'?value():value};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value}]},
    useCallback(fn,deps){const i=cursor++;const old=slots[i];if(!old||deps.some((value,j)=>!Object.is(value,old.deps[j])))slots[i]={fn,deps};return slots[i].fn},
    useEffect(fn,deps){const i=cursor++;const old=slots[i];if(!old||deps.some((value,j)=>!Object.is(value,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  const win={location:{origin:'http://127.0.0.1:5173'},setInterval:fn=>{intervals.set(++timerId,fn);return timerId},clearInterval:id=>intervals.delete(id)}
  const dependencies={react,'../data/music':music,'../lib/playerApi':api}
  const module={exports:{}}
  new Function('require','module','exports','window','document','localStorage','Date',code)(
    name=>{if(!(name in dependencies))throw new Error('Unexpected dependency: '+name);return dependencies[name]},module,module.exports,win,
    {createElement:tag=>({tag})},{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},{now:()=>now})
  const options={requestId,onObservation:event=>{observations.push(event);onObservation?.(event)},onEnded:(id,sourceId)=>{completions.push({requestId:id,sourceId});onEnded?.(id,sourceId)}}
  return {
    render(value=entry,id=requestId,nextLoop=loop){entry=value;requestId=id;loop=nextLoop;options.requestId=id;cursor=0;const result=module.exports.useOfficialPlayer(entry,loop,()=>{},options);result.hostRef.current=host;const pending=effects;effects=[];pending.forEach(fn=>fn());return result},
    unmount(){slots.forEach(slot=>slot?.cleanup?.())},poll(){now+=1001;[...intervals.values()].forEach(fn=>fn())},
    host,storage,observations,completions,get intervalCount(){return intervals.size},
  }
}

export function youtubeApi() {
  const players=[]
  const api={Player:class {
    constructor(frame,options){this.frame=frame;this.events=options.events;this.calls=[];this.videoId=new URL(frame.src).searchParams.get('v')??frame.src.split('/embed/')[1].split('?')[0];this.state=5;this.volume=100;this.muted=false;this.currentTime=0;this.duration=0;players.push(this)}
    getVideoUrl(){return 'https://www.youtube.com/watch?v='+this.videoId}
    getPlayerState(){return this.state}
    getCurrentTime(){return this.currentTime}
    getDuration(){return this.duration}
    loadVideoById(id){this.videoId=id;this.state=-1;this.currentTime=0;this.duration=0;this.calls.push(['load',id])}
    playVideo(){this.calls.push('play')}
    pauseVideo(){this.calls.push('pause')}
    seekTo(value){this.currentTime=value;this.calls.push(['seek',value])}
    setVolume(value){this.volume=value;this.calls.push(['volume',value])}
    getVolume(){return this.volume}
    mute(){this.muted=true;this.calls.push('mute')}
    unMute(){this.muted=false;this.calls.push('unmute')}
    isMuted(){return this.muted}
    destroy(){this.calls.push('destroy')}
    ready(){this.events.onReady({target:this})}
    emit(value,actual=value){this.state=actual;this.events.onStateChange({target:this,data:value})}
  }}
  return {players,loadYouTubeApi:async()=>api,api}
}

export function spotifyApi({supported=true,modern=false}={}) {
  const controllers=[]
  return {controllers,loadSpotifyApi:async()=>({createController(target,options,callback){
    const calls=[];const listeners={}
    const controller={target,options,calls,listeners,play(){calls.push('play')},pause(){calls.push('pause')},destroy(){calls.push('destroy')},addListener(name,fn){listeners[name]=fn}}
    if(supported)controller[modern?'loadEntity':'loadUri']=uri=>calls.push(['load',uri])
    controllers.push(controller);callback(controller)
  }})}
}
