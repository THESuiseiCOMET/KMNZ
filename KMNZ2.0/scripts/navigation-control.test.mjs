import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const geometry=await loadTypeScript(new URL('../src/lib/navigationControl.ts',import.meta.url))
const {placeNavigationControl:place,isNearNavigationControl:near}=geometry
const button={left:1000,top:14,width:36,height:36},viewport={width:1280,height:900}

test('restore control matches the original button even while the header moves offscreen',()=>{
  assert.deepEqual(place(button,{top:0},false,viewport,button),button)
  assert.deepEqual(place({...button,top:-116},{top:-130},true,viewport,button),button)
  assert.deepEqual(place({...button,left:300,top:-51},{top:-65},true,{width:390,height:844},button),{...button,left:300})
  assert.deepEqual(place({left:0,top:0,width:0,height:0},{top:-130},true,{width:390,height:844},button),{...button,left:354})
})

test('proximity follows both axes, rejects distant pointers and pointers outside the window',()=>{
  assert(near({x:1018,y:32},button,viewport))
  assert(near({x:960,y:32},button,viewport))
  assert.equal(near({x:940,y:32},button,viewport),false)
  assert.equal(near({x:950,y:100},button,viewport),false)
  assert.equal(near({x:-1,y:20},{...button,left:0},viewport),false)
  assert.equal(near({x:1281,y:20},button,viewport),false)
})

const hookSource=await readFile(new URL('../src/hooks/useNavigationControl.ts',import.meta.url),'utf8')
const hookCode=ts.transpileModule(hookSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
test('proximity monitoring updates on resize and pointer departure and cleans all listeners',()=>{
  for(const hidden of [false,true]) {
    const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),priorResize=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver')
    const listeners=new Map(),slots=[],cleanups=[];let cursor=0,resize,disconnected=false
    let rect={...button,top:hidden?-116:14}
    const group={},anchor={getBoundingClientRect:()=>({...rect,bottom:rect.top+rect.height}),closest:()=>group},header={getBoundingClientRect:()=>({top:hidden?-130:0})}
    const documentMock={documentElement:{clientWidth:1280},querySelector:selector=>selector.includes('navigation-toggle')?anchor:header}
    Object.defineProperty(globalThis,'document',{configurable:true,value:documentMock})
    Object.defineProperty(globalThis,'window',{configurable:true,value:{innerHeight:900,addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)}}})
    Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class{constructor(callback){resize=callback}observe(){}disconnect(){disconnected=true}}})
    const react={useState(value){const i=cursor++;slots[i]??={value};return [slots[i].value,next=>{slots[i].value=next}]},useRef(value){const i=cursor++;return slots[i]??={current:value}},useEffect(fn){const i=cursor++;if(!slots[i]){slots[i]={};cleanups.push(fn())}}}
    const module={exports:{}}
    new Function('require','module','exports',hookCode)(name=>name==='react'?react:geometry,module,module.exports)
    const render=()=>{cursor=0;return module.exports.useNavigationControl(hidden)}
    try {
      assert.equal(render().near,false)
      listeners.get('pointermove')({pointerType:'mouse',clientX:1018,clientY:32});assert(render().near)
      listeners.get('pointermove')({pointerType:'mouse',clientX:200,clientY:300});assert.equal(render().near,false)
      listeners.get('pointermove')({pointerType:'touch',clientX:1018,clientY:32});assert.equal(render().near,false)
      documentMock.documentElement.clientWidth=390;rect={...rect,left:300};resize();assert.equal(render().position.left,300)
      listeners.get('pointermove')({pointerType:'mouse',clientX:318,clientY:32});assert(render().near)
      listeners.get('pointerout')({relatedTarget:null});assert.equal(render().near,false)
    } finally {
      cleanups.forEach(fn=>fn?.());assert(disconnected);assert.equal(listeners.size,0)
      for(const [name,prior] of [['window',priorWindow],['document',priorDocument],['ResizeObserver',priorResize]])if(prior)Object.defineProperty(globalThis,name,prior);else delete globalThis[name]
    }
  }
})
