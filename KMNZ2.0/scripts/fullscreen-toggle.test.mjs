import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source=await readFile(new URL('../src/components/FullscreenToggle.tsx',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText

function harness({reject=false,available=true,pending=false}={}) {
  const slots=[],listeners=new Map(),cleanups=[]
  let cursor=0,requests=0,exits=0,options,resolveRequest
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document')
  const root={requestFullscreen(value){requests++;options=value;if(reject)return Promise.reject(new Error('denied'));if(pending)return new Promise(resolve=>{resolveRequest=()=>{doc.fullscreenElement=root;listeners.get('fullscreenchange')?.();resolve()}});doc.fullscreenElement=root;listeners.get('fullscreenchange')?.();return Promise.resolve()}}
  const doc={documentElement:root,fullscreenEnabled:available,fullscreenElement:null,
    exitFullscreen(){exits++;doc.fullscreenElement=null;listeners.get('fullscreenchange')?.();return Promise.resolve()},
    addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)}}
  Object.defineProperty(globalThis,'document',{configurable:true,value:doc})
  const react={useState(value){const i=cursor++;slots[i]??={value:typeof value==='function'?value():value};return [slots[i].value,next=>{slots[i].value=next}]},useRef(value){const i=cursor++;return slots[i]??={current:value}},useId(){cursor++;return 'fullscreen-error'},useEffect(fn){const i=cursor++;if(!slots[i]){slots[i]={};cleanups.push(fn())}}}
  const jsx=(type,props)=>({type,props}),module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='react'?react:{jsx,jsxs:jsx},module,module.exports)
  function render(){cursor=0;return module.exports.default()}
  function button(){return render().props.children[0]}
  render()
  return {button,click(){return button().props.onClick()},get requests(){return requests},get exits(){return exits},get options(){return options},get fullscreen(){return Boolean(doc.fullscreenElement)},get error(){return render().props.children[1]},
    escape(){doc.fullscreenElement=null;listeners.get('fullscreenchange')?.()},resolve(){resolveRequest()},
    cleanup(){cleanups.forEach(fn=>fn?.());assert.equal(listeners.size,0);if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document}}
}

test('navigation button toggles only document fullscreen and follows browser Escape',async()=>{
  const h=harness()
  try {
    assert.equal(h.button().props['aria-label'],'进入网页全屏')
    await h.click();assert(h.fullscreen);assert.equal(h.requests,1);assert.deepEqual(h.options,{navigationUI:'hide'})
    assert.equal(h.button().props['aria-pressed'],true);assert.equal(h.button().props['aria-label'],'退出网页全屏')
    await h.click();assert.equal(h.fullscreen,false);assert.equal(h.exits,1)
    await h.click();h.escape();assert.equal(h.button().props['aria-pressed'],false)
  } finally {h.cleanup()}
})

test('pending fullscreen requests reject duplicate clicks and unmount never exits fullscreen',async()=>{
  const h=harness({pending:true})
  try {
    const first=h.click();await h.click();assert.equal(h.requests,1)
    h.resolve();await first;assert(h.fullscreen)
  } finally {h.cleanup()}
  assert(h.fullscreen);assert.equal(h.exits,0)
})

test('denied or unsupported fullscreen remains off and reports an accessible failure',async()=>{
  for(const config of [{reject:true},{available:false}]) {
    const h=harness(config)
    try {await h.click();assert.equal(h.fullscreen,false);assert.equal(h.button().props['aria-pressed'],false);assert.equal(h.error.props.role,'alert');assert.match(h.error.props.children,/未能切换网页全屏/)}
    finally {h.cleanup()}
  }
})
