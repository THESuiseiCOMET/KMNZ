import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'
const tempoModule=await loadTypeScript(new URL('../src/lib/audioTempo.ts',import.meta.url))
const require=createRequire(import.meta.url),module={exports:{}}
const source=await readFile(new URL('../src/components/PlaybackControls.tsx',import.meta.url),'utf8')
const code=ts.transpileModule(source,{fileName:'PlaybackControls.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
new Function('require','module','exports',code)(require,module,module.exports)
const Controls=module.exports.default
const settings={videoFrosted:true,coverFrosted:true}
function toggle(props={}){
 const calls=[]
 const tree=Controls({settings,onChange(){},onStartVisualization(){calls.push('open')},onStopVisualization(){calls.push('stop')},...props})
 return {button:tree.props.children.find(child => child.props.className === 'visualizer-control').props.children[0],calls}
}
test('visualizer starts from any page independently of playback',()=>{
 for(const visualizationVisible of [false,true]){
  const {button,calls}=toggle({visualizationVisible})
  assert.equal(button.props['aria-checked'],false);assert.equal(button.props.disabled,undefined)
  button.props.onClick();assert.deepEqual(calls,['open'])
 }
})
test('an enabled visualizer returns to MV from other pages and stops only when shown on MV',()=>{
 for(const visualizationPending of [false,true]){
  const away=toggle({visualizationEnabled:!visualizationPending,visualizationPending,visualizationVisible:false})
  assert.equal(away.button.props['aria-checked'],true)
  assert.equal(away.button.props.title,'在 MV 显示音频可视化')
  away.button.props.onClick();assert.deepEqual(away.calls,['open'])
  const visible=toggle({visualizationEnabled:!visualizationPending,visualizationPending,visualizationVisible:true})
  visible.button.props.onClick();assert.deepEqual(visible.calls,['stop'])
 }
})

test('waiting for audio draws the idle ring and rotates the logo, then cleans up on leaving MV',async()=>{
 const source=await readFile(new URL('../src/components/AudioVisualizer.tsx',import.meta.url),'utf8'),mod={exports:{}}
 const code=ts.transpileModule(source,{fileName:'AudioVisualizer.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const prior=new Map(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
 let cleanup,refs=0,arcs=0,disconnected=false,id=0
 const frames=new Map(),logo={style:{}},context={rotate(){},setTransform(){},clearRect(){},translate(){},beginPath(){},arc(){arcs++},stroke(){}}
 const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:1280,height:655})}
 const react={useRef:()=>({current:refs++===0?canvas:logo}),useEffect:fn=>{cleanup=fn()}}
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:false}),devicePixelRatio:1,addEventListener(){},removeEventListener(){}}})
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class{observe(){}disconnect(){disconnected=true}}})
  Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:fn=>{frames.set(++id,fn);return id}})
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:id=>frames.delete(id)})
  new Function('require','module','exports',code)(name=>name==='react'?react:name==='../lib/audioTempo'?tempoModule:name==='../lib/audioGeometry'?{}:name.includes('assets/')?name:require(name),mod,mod.exports)
  const tree=mod.exports.default({session:null,theme:'light'})
  assert.equal(tree.props['aria-label'],'音频可视化')
  for(const time of [10,30]){const frame=frames.values().next().value;frames.clear();frame(time)}
  assert.equal(arcs,2);assert.equal(canvas.width,1280);assert.equal(canvas.height,655)
  assert.notEqual(logo.style.transform,'rotate(0deg)')
  cleanup();assert.equal(frames.size,0);assert.equal(disconnected,true)
 } finally{
  for(const [key,value] of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key]
 }
})


test('logo resumes its angle across MV remount, theme/session changes and refresh without hidden-time rotation',async()=>{
 const source=await readFile(new URL('../src/components/AudioVisualizer.tsx',import.meta.url),'utf8')
 const code=ts.transpileModule(source,{fileName:'AudioVisualizer.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const prior=new Map(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
 const frames=new Map(),events=new Map(),storage=new Map([['kmnzVisualizerRotation:v1','73.5']])
 let id=0,reduced=false,blocked=false,refs=0,cleanup,ringAngle=0
 const context={rotate(value){ringAngle=value*180/Math.PI},setTransform(){},clearRect(){},translate(){},beginPath(){},arc(){},stroke(){}}
 const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:800,height:600})},logo={style:{}}
 const react={useRef:()=>({current:refs++===0?canvas:logo}),useEffect:fn=>{cleanup=fn()}}
 const compile=()=>{
  const mod={exports:{}}
  new Function('require','module','exports',code)(name=>name==='react'?react:name==='../lib/audioTempo'?tempoModule:name==='../lib/audioGeometry'?{}:name.includes('assets/')?name:require(name),mod,mod.exports)
  return mod.exports.default
 }
 const mount=(Component,theme='light')=>{refs=0;Component({session:null,theme})}
 const tick=time=>{const frame=frames.values().next().value;assert(frame);frames.clear();frame(time)}
 const angle=()=>Number(logo.style.transform.slice(7,-4))
 const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9, `${actual} differs from ${expected}`)
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:reduced}),devicePixelRatio:1,
   sessionStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)??null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)}},
   addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:(type,fn)=>{if(events.has(type))assert.equal(events.get(type),fn);events.delete(type)}}})
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class{observe(){}disconnect(){}}})
  Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:fn=>{frames.set(++id,fn);return id}})
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:id=>frames.delete(id)})
  const Component=compile()
  mount(Component);near(angle(),73.5)
  tick(0);tick(40);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.04));near(ringAngle,angle())
  assert.equal(storage.get('kmnzVisualizerRotation:v1'),'73.5')
  events.get('pagehide')();near(Number(storage.get('kmnzVisualizerRotation:v1')),(73.5+tempoModule.defaultRotationSpeed*.04))
  cleanup();assert.equal(events.size,0);assert.equal(frames.size,0)
  mount(Component,'dark');near(angle(),(73.5+tempoModule.defaultRotationSpeed*.04))
  tick(100000);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.04))
  tick(100040);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.08));cleanup()
  mount(compile());near(angle(),(73.5+tempoModule.defaultRotationSpeed*.08));cleanup()
  reduced=true;mount(Component);tick(0);tick(40);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.08));near(ringAngle,angle());cleanup()
  blocked=true;mount(Component);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.08));cleanup()
  blocked=false;storage.set('kmnzVisualizerRotation:v1','invalid');mount(Component);near(angle(),(73.5+tempoModule.defaultRotationSpeed*.08));cleanup()
  storage.set('kmnzVisualizerRotation:v1','-15');mount(compile());near(angle(),345);cleanup()
 }finally{
  cleanup?.()
  for(const [key,value] of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key]
 }
})
