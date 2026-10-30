import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const {captureTabAudio,captureInputAudio,readAudioInputs,captureErrorMessage}=await loadTypeScript(new URL('../src/lib/audioCapture.ts',import.meta.url))
const {audioShape,audioLevel,audioSignalThreshold}=await loadTypeScript(new URL('../src/lib/audioGeometry.ts',import.meta.url))
const {monitorAudioSignal}=await loadTypeScript(new URL('../src/lib/audioSignal.ts',import.meta.url))

function environment({audio=true,surface='browser',resumeError=false}={}) {
  const calls=[]
  function track(kind) {
    const listeners=new Map()
    return {kind,readyState:'live',stop(){calls.push(['stop',kind]);this.readyState='ended'},
      getSettings(){return {displaySurface:surface}},addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)},
      end(){this.readyState='ended';listeners.get('ended')?.()},get listenerCount(){return listeners.size}}
  }
  const video=track('video'),sound=track('audio'),tracks=audio?[video,sound]:[video]
  const analyser={disconnect(){calls.push('disconnect-analyser')}}
  const source={connect(node){assert.equal(node,analyser);calls.push('connect-analyser')},disconnect(){calls.push('disconnect-source')}}
  const context={state:'running',sampleRate:48000,createAnalyser(){return analyser},
    createMediaStreamSource(stream){assert.deepEqual(stream,[sound]);return source},
    async resume(){if(resumeError)throw new Error('resume failed')},async close(){this.state='closed';calls.push('close-context')}}
  const env={async getDisplayMedia(options){calls.push(['request',options]);return {getTracks:()=>tracks,getAudioTracks:()=>audio?[sound]:[],getVideoTracks:()=>[video]}},
    createContext(){return context},audioStream(value){return value}}
  return {env,calls,video,sound,analyser,context}
}

test('capture requests a browser tab with audio and never connects sound to speakers',async()=>{
  const h=environment(),session=await captureTabAudio(h.env)
  const options=h.calls[0][1]
  assert.equal(options.video.displaySurface,'browser')
  assert.equal(options.selfBrowserSurface,'include')
  assert.equal(options.systemAudio,'exclude')
  assert.equal(options.audio.suppressLocalAudioPlayback,false)
  assert.equal(session.analyser,h.analyser)
  assert.equal(session.sampleRate,48000)
  assert.equal(session.sourceKind,'tab')
  assert.deepEqual(session.getState(),{context:'running',muted:false})
  assert.equal(h.analyser.fftSize,2048)
  assert.equal(h.calls.filter(call=>call==='connect-analyser').length,1)
  assert.equal(h.video.readyState,'ended')
  assert.equal(h.video.listenerCount,0)
  assert.equal(h.sound.readyState,'live')
  assert.equal(h.sound.listenerCount,1)
  assert.equal(h.context.state,'running')
  session.stop();session.stop()
  assert.equal(h.calls.filter(call=>call==='close-context').length,1)
  assert.equal(h.video.listenerCount,0);assert.equal(h.sound.listenerCount,0)
  assert.equal(h.calls.filter(call=>Array.isArray(call)&&call[0]==='stop').length,2)
})

test('missing audio, wrong surface and context errors clean every captured track',async()=>{
  for(const options of [{audio:false},{surface:'monitor'},{surface:'window'},{resumeError:true}]) {
    const h=environment(options)
    await assert.rejects(captureTabAudio(h.env))
    assert.equal(h.video.readyState,'ended')
    if(options.audio!==false)assert.equal(h.sound.readyState,'ended')
    if(options.resumeError)assert.equal(h.context.state,'closed')
  }
})

test('releasing unused tab video leaves audio analysis alive',async()=>{
  const h=environment(),session=await captureTabAudio(h.env)
  let ended=0;session.onEnded(()=>ended++)
  h.video.end()
  assert.equal(ended,0)
  assert.equal(h.sound.readyState,'live')
  assert.equal(h.context.state,'running')
  assert.deepEqual(session.getState(),{context:'running',muted:false})
  assert.equal(h.calls.filter(call=>call==='disconnect-source').length,0)
  session.stop()
  assert.equal(ended,0)
  assert.equal(h.sound.readyState,'ended')
  assert.equal(h.context.state,'closed')
})

test('ending shared audio ends exactly one session and releases all remaining resources',async()=>{
  const h=environment(),session=await captureTabAudio(h.env)
  let ended=0;session.onEnded(()=>ended++)
  h.sound.end();h.sound.end()
  assert.equal(ended,1)
  assert.equal(h.context.state,'closed')
  assert.equal(h.video.readyState,'ended');assert.equal(h.sound.readyState,'ended')
  assert.equal(h.sound.listenerCount,0)
  session.stop();assert.equal(h.calls.filter(call=>call==='close-context').length,1)
})

test('sharing that ends during initialization never produces an active session',async()=>{
  const h=environment()
  h.context.resume=async()=>{h.sound.readyState='ended'}
  await assert.rejects(captureTabAudio(h.env),/共享已结束/)
  assert.equal(h.context.state,'closed')
})

test('permission rejection has a concrete retry message',()=>{
  const denied=new Error();denied.name='NotAllowedError'
  assert.match(captureErrorMessage(denied),/重新选择当前标签页/)
  assert.equal(captureErrorMessage(new Error('no audio')),'no audio')
})

function inputEnvironment() {
  const h=environment()
  h.sound.getSettings=()=>({deviceId:'stereo-mix'})
  const stream={getTracks:()=>[h.sound],getAudioTracks:()=>[h.sound],getVideoTracks:()=>[]}
  h.env.getUserMedia=async options=>{h.calls.push(['input-request',options]);return stream}
  h.env.enumerateDevices=async()=>[]
  h.env.getDisplayMedia=()=>{throw new Error('Input capture must not share a screen')}
  return {...h,stream}
}

test('input capture selects one exact device without video or speaker monitoring',async()=>{
  const h=inputEnvironment(),session=await captureInputAudio('stereo-mix',h.env)
  const options=h.calls.find(call=>call[0]==='input-request')[1]
  assert.deepEqual(options,{video:false,audio:{deviceId:{exact:'stereo-mix'},echoCancellation:false,noiseSuppression:false,autoGainControl:false}})
  assert.equal(session.analyser,h.analyser)
  session.stop();assert.equal(h.sound.readyState,'ended');assert.equal(h.video.readyState,'live')
  assert.equal(h.calls.filter(call=>call==='connect-analyser').length,1)
})

test('missing, removed and mismatched input devices never fall back to a default microphone',async()=>{
  for(const id of ['','default','communications']) {
    const h=inputEnvironment();await assert.rejects(captureInputAudio(id,h.env));assert.equal(h.calls.length,0)
  }
  const mismatch=inputEnvironment();mismatch.sound.getSettings=()=>({deviceId:'microphone'})
  await assert.rejects(captureInputAudio('stereo-mix',mismatch.env),/不匹配/);assert.equal(mismatch.sound.readyState,'ended')
  const missing=inputEnvironment();missing.stream.getAudioTracks=()=>[]
  await assert.rejects(captureInputAudio('stereo-mix',missing.env),/没有可用音轨/);assert.equal(missing.sound.readyState,'ended')
  const removed=inputEnvironment();let attempts=0
  removed.env.getUserMedia=async()=>{attempts++;const error=new Error();error.name='OverconstrainedError';throw error}
  await assert.rejects(captureInputAudio('stereo-mix',removed.env));assert.equal(attempts,1)
  assert.match(captureErrorMessage(Object.assign(new Error(),{name:'OverconstrainedError'}),'input'),/刷新设备/)
})

test('label authorization immediately releases the temporary input and removes device aliases',async()=>{
  const h=inputEnvironment();let lists=0
  h.env.enumerateDevices=async()=>++lists===1?[{kind:'audioinput',deviceId:'stereo-mix',label:''}]:[
    {kind:'audioinput',deviceId:'default',label:'默认'},
    {kind:'audioinput',deviceId:'communications',label:'通讯'},
    {kind:'audioinput',deviceId:'stereo-mix',label:'立体声混音'},
    {kind:'audioinput',deviceId:'stereo-mix',label:'重复'},
    {kind:'audiooutput',deviceId:'speaker',label:'扬声器'}]
  assert.deepEqual(await readAudioInputs(h.env),[{deviceId:'stereo-mix',label:'立体声混音'}])
  assert.equal(h.sound.readyState,'ended');assert.equal(h.calls.filter(call=>call[0]==='input-request').length,1)
  assert.equal(h.calls.some(call=>call==='connect-analyser'),false)
})

test('already labeled devices need no input capture; failed enumeration still stops the temporary track',async()=>{
  const labeled=inputEnvironment();labeled.env.enumerateDevices=async()=>[{kind:'audioinput',deviceId:'stereo-mix',label:'立体声混音'}]
  await readAudioInputs(labeled.env);assert.equal(labeled.calls.length,0)
  const h=inputEnvironment();let lists=0
  h.env.enumerateDevices=async()=>{if(++lists===1)return [];throw new Error('enumeration failed')}
  await assert.rejects(readAudioInputs(h.env));assert.equal(h.sound.readyState,'ended')
})

test('silence draws no synthetic spectrum',()=>{
  const silent=audioShape(new Uint8Array(1024),new Uint8Array(2048).fill(128),48000)
  assert.equal(silent.rms,0);assert.deepEqual(silent.ring,[])
  assert.deepEqual(audioShape([],[],0),{rms:0,bass:0,ring:[]})
})

test('real input samples drive the original mild ring without a phase trace or alternating spikes',()=>{
  const wave=Uint8Array.from({length:2048},(_,i)=>128+60*Math.sin(i*.071))
  const quiet=audioShape(new Uint8Array(1024),wave,48000)
  const loud=audioShape(new Uint8Array(1024).fill(230),wave,48000)
  assert.equal(loud.ring.length,256);assert.equal(Object.hasOwn(loud,'phase'),false)
  assert(loud.rms>0);assert(loud.bass>quiet.bass)
  assert(Math.hypot(loud.ring[100].x,loud.ring[100].y)>Math.hypot(quiet.ring[100].x,quiet.ring[100].y))
  for(const p of loud.ring)assert(Number.isFinite(p.x)&&Number.isFinite(p.y))
  const uniform=audioShape(new Uint8Array(1024).fill(230),new Uint8Array(2048).fill(192),48000)
  assert.deepEqual(uniform.ring,[])
  assert.deepEqual(audioShape(new Uint8Array(1024).fill(230),wave,48000),loud)
})

test('float input preserves quiet music, rejects DC offset and ignores non-finite samples',()=>{
  const quiet=Float32Array.from({length:2048},(_,i)=>.001*Math.sin(i*.071)+.02)
  const level=audioLevel(quiet,'float')
  assert(level.rms>audioSignalThreshold && level.rms<.002)
  assert(level.decibels < -60 && level.decibels > -66)
  assert.equal(audioShape(new Uint8Array(1024).fill(20),quiet,48000,'float').ring.length,256)
  for(const value of [0,.02,-.01,NaN,Infinity]) {
    const samples=new Float32Array(2048).fill(value)
    assert.equal(audioLevel(samples,'float').rms,0)
    assert.deepEqual(audioShape(new Uint8Array(1024),samples,48000,'float').ring,[])
  }
  assert.equal(audioLevel(new Uint8Array(2048).fill(127)).rms,0)
})

test('signal monitor distinguishes silence, music, track mute and suspended analysis and releases its timer',()=>{
  let now=0,frame,stopped=0,amplitude=0,muted=false,context='running'
  const updates=[]
  const session={getState:()=>({context,muted}),analyser:{fftSize:2048,getFloatTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=.02+amplitude*Math.sin(i*.071)}}}
  const stop=monitorAudioSignal(session,value=>updates.push(value),{now:()=>now,repeat(fn){frame=fn;return()=>{stopped++;frame=null}}})
  const sample=(time)=>{now=time;frame()}
  assert.equal(updates.at(-1).status,'waiting')
  sample(3000);assert.equal(updates.at(-1).status,'silent')
  amplitude=.001;sample(3120);assert.equal(updates.at(-1).status,'receiving')
  amplitude=0;sample(3500);assert.equal(updates.at(-1).status,'receiving')
  sample(4000);assert.equal(updates.at(-1).status,'silent')
  muted=true;sample(4120);assert.equal(updates.at(-1).status,'muted')
  muted=false;context='suspended';sample(4240);assert.equal(updates.at(-1).status,'suspended')
  context='running';amplitude=.05;sample(4360);assert.equal(updates.at(-1).status,'receiving')
  stop();assert.equal(stopped,1);assert.equal(frame,null)
})

const hookSource=await readFile(new URL('../src/hooks/useAudioVisualizer.ts',import.meta.url),'utf8')
const hookCode=ts.transpileModule(hookSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function hookHarness() {
  const slots=[];let cursor=0,calls=0,resolveCapture,rejectCapture,resolveInputs,inputReads=0
  const sourceCalls=[]
  const cleanups=[]
  const react={useState(value){const i=cursor++;slots[i]??={value};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next}]},
    useRef(value){const i=cursor++;return slots[i]??={current:value}},useCallback(fn){cursor++;return fn},useEffect(fn){const i=cursor++;if(!slots[i]){slots[i]={};cleanups.push(fn())}}}
  const module={exports:{}}
  function capture(source){calls++;sourceCalls.push(source);return new Promise((resolve,reject)=>{resolveCapture=resolve;rejectCapture=reject})}
  new Function('require','module','exports',hookCode)(name=>name==='react'?react:{captureErrorMessage,captureTabAudio(){return capture('tab')},captureInputAudio(id){return capture(id)},readAudioInputs(){inputReads++;return new Promise(resolve=>{resolveInputs=resolve})}},module,module.exports)
  let stopped=0,ended
  const session={stop(){stopped++},onEnded(fn){ended=fn}}
  return {render(){cursor=0;return module.exports.useAudioVisualizer()},resolve(){resolveCapture(session)},reject(reason=new Error('denied')){rejectCapture(reason)},resolveInputs(devices){resolveInputs(devices)},sourceCalls,get inputReads(){return inputReads},end(){ended()},unmount(){cleanups.forEach(fn=>fn?.())},get stopped(){return stopped},get calls(){return calls}}
}

test('rapid activation requests share one chooser and do not fabricate an active session',async()=>{
  const h=hookHarness(),hook=h.render(),first=hook.start()
  assert.equal(await hook.start(),false);assert.equal(h.calls,1)
  assert.equal(h.render().session,null)
  h.resolve();assert.equal(await first,true);assert(h.render().session)
  h.render().stop();assert.equal(h.stopped,1);assert.equal(h.render().session,null)
})

test('cancellation and unmount discard and stop a late capture result',async()=>{
  for(const action of ['cancel','unmount']) {
    const h=hookHarness(),first=h.render().start()
    if(action==='cancel')h.render().stop();else h.unmount()
    h.resolve();assert.equal(await first,false);assert.equal(h.stopped,1);assert.equal(h.render().session,null)
  }
})

test('rejection stays inactive and track-end restores the idle presentation',async()=>{
  const h=hookHarness(),first=h.render().start();h.reject()
  assert.equal(await first,false);assert.equal(h.render().session,null);assert.equal(h.render().error,'denied')
  const second=h.render().start();h.resolve();await second;h.end()
  assert.equal(h.render().session,null);assert.equal(h.render().error,null)
})

test('visualizer always requests tab audio and exposes no input device configuration',async()=>{
  const h=hookHarness(),hook=h.render()
  assert.equal('refreshInputs' in hook,false);assert.equal('inputs' in hook,false)
  const first=hook.start({kind:'input',deviceId:'old-saved-device'})
  assert.deepEqual(h.sourceCalls,['tab']);assert.equal(h.inputReads,0)
  h.resolve();assert.equal(await first,true)
  h.end();assert.equal(h.render().session,null);assert.equal(h.render().error,null)
  h.render().stop();assert.equal(h.render().error,null)
})

const viewSource=await readFile(new URL('../src/components/AudioVisualizer.tsx',import.meta.url),'utf8')
const viewCode=ts.transpileModule(viewSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
function visualizerHarness({reduced=false,silent=false}={}) {
  const restore=[]
  function install(key,value){const previous=Object.getOwnPropertyDescriptor(globalThis,key);restore.push(()=>previous?Object.defineProperty(globalThis,key,previous):delete globalThis[key]);Object.defineProperty(globalThis,key,{configurable:true,value})}
  const effects=[],cleanups=[],refs=[];let cursor=0,nextFrame=0,frame,disconnected=false,strokes=0,circles=0,resizeCallback
  const fullscreen={id:'browser-fullscreen'}
  const documentMock={documentElement:{style:{overflow:'auto'}},fullscreenElement:fullscreen}
  install('document',documentMock)
  install('window',{devicePixelRatio:1,matchMedia:()=>({matches:reduced})})
  install('ResizeObserver',class {constructor(callback){resizeCallback=callback}observe(){}disconnect(){disconnected=true}})
  install('requestAnimationFrame',fn=>{frame=fn;return ++nextFrame})
  install('cancelAnimationFrame',()=>{frame=null})
  const react={useRef(value){const i=cursor++;return refs[i]??={current:value}},useEffect(fn){effects.push(fn)}}
  const node=(type,props)=>({type,props}),module={exports:{}}
  new Function('require','module','exports',viewCode)(name=>{
    if(name==='react')return react
    if(name==='react/jsx-runtime')return {jsx:node,jsxs:node}
    if(name==='../lib/audioGeometry')return {audioShape,audioSignalThreshold}
    return {default:name}
  },module,module.exports)
  const context={setTransform(){},clearRect(){},translate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){circles++},stroke(){strokes++}}
  const image={style:{}}
  let bounds={width:1280,height:720}
  const canvas={getContext:()=>context,getBoundingClientRect:()=>bounds}
  const analyser={frequencyBinCount:1024,fftSize:2048,getByteFrequencyData(a){a.fill(silent?0:200)},getFloatTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=silent?0:.45*Math.sin(i*.071)}}
  const tree=module.exports.default({session:{analyser,sampleRate:48000,getState:()=>({context:'running',muted:false})},theme:'dark'})
  function attach(value){if(!value||typeof value!=='object')return;if(value.props?.ref)value.props.ref.current=value.type==='canvas'?canvas:image;const children=value.props?.children;for(const child of Array.isArray(children)?children:[children])attach(child)}
  attach(tree);effects.forEach(fn=>cleanups.push(fn()))
  return {step(time){const fn=frame;frame=null;fn?.(time)},get rotation(){return image.style.transform},get strokes(){return strokes},get circles(){return circles},get dimensions(){return [canvas.width,canvas.height]},
    resize(width,height){bounds={width,height};resizeCallback()},
    cleanup(){cleanups.forEach(fn=>fn?.());assert.equal(documentMock.documentElement.style.overflow,'auto');assert.equal(documentMock.fullscreenElement,fullscreen);assert(disconnected);assert.equal(frame,null);restore.reverse().forEach(fn=>fn())}}
}

test('idle visualization keeps a static ring and rotation; reduced motion stops rotation with or without signal',()=>{
  for(const [options,rotates] of [[{},true],[{reduced:true},false],[{silent:true},true],[{silent:true,reduced:true},false]]) {
    const h=visualizerHarness(options)
    try {h.step(100);h.step(200);assert.equal(h.rotation!=='rotate(0deg)',rotates);assert(h.strokes>0);assert.equal(h.circles>0,Boolean(options.silent))}
    finally {h.cleanup()}
  }
})

test('home visualization follows available size and unmount releases drawing without changing scroll or browser fullscreen',()=>{
  const h=visualizerHarness()
  try {
    h.step(100);assert(h.strokes>0);assert.deepEqual(h.dimensions,[1280,720])
    h.resize(390,844);h.step(200);assert.deepEqual(h.dimensions,[390,844])
  } finally {h.cleanup()}
})

test('declining or cancelling tab sharing silently returns to idle and permits retry',async()=>{
  for(const name of ['NotAllowedError','AbortError']){
    const h=hookHarness(),first=h.render().start()
    const error=new Error('permission declined');error.name=name;h.reject(error)
    assert.equal(await first,false)
    assert.equal(h.render().session,null);assert.equal(h.render().pending,false);assert.equal(h.render().error,null)
    const retry=h.render().start();h.resolve();assert.equal(await retry,true);assert.equal(h.calls,2)
    h.render().stop();h.unmount()
  }
})
