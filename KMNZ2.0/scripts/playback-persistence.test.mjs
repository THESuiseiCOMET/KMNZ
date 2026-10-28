import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const session=await loadTypeScript(new URL('../src/lib/playbackSession.ts',import.meta.url))
const queueLogic=await loadTypeScript(new URL('../src/lib/playbackQueue.ts',import.meta.url))
const {musicCatalog:catalog}=await loadTypeScript(new URL('../src/data/music.ts',import.meta.url))
const {musicLibrary:library}=await loadTypeScript(new URL('../src/data/musicLibrary.ts',import.meta.url))
const source=await readFile(new URL('../src/hooks/usePlaybackPersistence.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText

test('persistence follows live requests, saves on pagehide and visibility change, and closing cannot resurrect an old track',()=>{
  const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document')
  const windowListeners=new Map(),documentListeners=new Map(),values=new Map(),slots=[],effects=[];let cursor=0
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}
  Object.defineProperty(globalThis,'window',{configurable:true,value:{sessionStorage:storage,addEventListener:(name,fn)=>windowListeners.set(name,fn),removeEventListener:name=>windowListeners.delete(name)}})
  Object.defineProperty(globalThis,'document',{configurable:true,value:{addEventListener:(name,fn)=>documentListeners.set(name,fn),removeEventListener:name=>documentListeners.delete(name)}})
  const react={useRef(value){const i=cursor++;return slots[i]??={current:value}},useCallback(fn){cursor++;return fn},useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j])))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})}}
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='react'?react:name==='../lib/playbackSession'?session:queueLogic,module,module.exports)
  const youtube=catalog.filter(item=>item.platform==='youtube')
  const selection=queueLogic.createQueueSelections(library).list(youtube.slice(0,3),youtube[0].id)
  let queue=queueLogic.queueReducer(queueLogic.emptyQueue,{type:'select',selection})
  const initial={sourceId:youtube[0].id,requestId:queue.requestId,seconds:29,duration:0,paused:true}
  function render(){cursor=0;const result=module.exports.usePlaybackPersistence(queue,initial);effects.splice(0).forEach(fn=>fn());return result}
  try {
    const remember=render();let restored=session.readPlaybackSession(library,catalog,storage)
    assert.equal(restored.resume.seconds,29);assert.equal(restored.resume.autoplay,false)
    queue={...queue,status:'playing'};render();remember({...initial,seconds:31,duration:180,paused:false})
    windowListeners.get('pagehide')();restored=session.readPlaybackSession(library,catalog,storage)
    assert.equal(restored.resume.seconds,31);assert.equal(restored.resume.autoplay,true)
    queue={...queue,status:'paused'};render();documentListeners.get('visibilitychange')()
    assert.equal(session.readPlaybackSession(library,catalog,storage).resume.autoplay,false)
    queue=queueLogic.queueReducer(queue,{type:'select',selection:queueLogic.createQueueSelections(library).list(youtube.slice(0,3),youtube[1].id)})
    render();remember({...initial,seconds:90,duration:180,paused:false})
    restored=session.readPlaybackSession(library,catalog,storage)
    assert.equal(restored.resume.sourceId,youtube[1].id);assert.equal(restored.resume.seconds,0)
    queue=queueLogic.queueReducer(queue,{type:'close'});render();remember({...initial,seconds:91,duration:180,paused:false});windowListeners.get('pagehide')()
    assert.equal(storage.getItem(session.playbackSessionKey),null)
  } finally {
    slots.forEach(slot=>slot?.cleanup?.());assert.equal(windowListeners.size,0);assert.equal(documentListeners.size,0)
    if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else delete globalThis.window
    if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else delete globalThis.document
  }
})
