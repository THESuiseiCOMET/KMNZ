import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const controls=await loadTypeScript(new URL('../src/lib/playerControls.ts',import.meta.url))
const source=await readFile(new URL('../src/components/PlayerProgress.tsx',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText

function harness() {
  const slots=[];let cursor=0;const seeks=[]
  const props={currentTime:10,duration:200,canSeek:true,onSeek:value=>{seeks.push(value);return true}}
  const react={useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,value=>{slots[i].value=value}]},
    useRef(initial){const i=cursor++;return slots[i]??={current:initial}}}
  const element=(type,props)=>({type,props})
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return react
    if(name==='react/jsx-runtime')return {jsx:element,jsxs:element}
    if(name==='../lib/playerControls')return controls
    throw new Error('Unexpected dependency: '+name)
  },module,module.exports)
  const captured=new Set()
  const target={value:'10',setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)}
  const event={pointerId:1,currentTarget:target}
  return {seeks,event,render(extra={}){Object.assign(props,extra);cursor=0;const view=module.exports.default(props);return view.props.children.find(child=>child.type==='input').props},
    change(value){target.value=String(value);return {target}},get captured(){return captured.size}}
}

test('time labels preserve seconds, hours and unknown duration without invalid values',()=>{
  for(const [value,label] of [[0,'0:00'],[65.9,'1:05'],[3605,'1:00:05'],[-1,'--:--'],[NaN,'--:--'],[Infinity,'--:--']]) assert.equal(controls.formatPlaybackTime(value),label)
})

test('pointer scrubbing previews during polling and commits exactly once on release',()=>{
  const h=harness();h.render().onPointerDown(h.event)
  h.render().onChange(h.change(80))
  assert.equal(h.render({currentTime:15}).value,80);assert.deepEqual(h.seeks,[])
  assert.equal(h.render()['aria-valuetext'],'1:20 / 3:20')
  h.render().onPointerUp(h.event);h.render().onPointerUp(h.event)
  assert.deepEqual(h.seeks,[80]);assert.equal(h.captured,0)
})

test('pointer cancellation, capture loss, blur and Escape discard a drag without seeking',()=>{
  for(const event of ['onPointerCancel','onLostPointerCapture','onBlur','onKeyDown']) {
    const h=harness();h.render().onPointerDown(h.event);h.render().onChange(h.change(80))
    h.render()[event]({key:'Escape'})
    h.render().onPointerUp(h.event)
    assert.deepEqual(h.seeks,[]);assert.equal(h.render().value,10)
  }
})

test('keyboard changes seek directly; unknown durations and disabled controls never seek',()=>{
  const h=harness();h.render().onChange(h.change(60));assert.deepEqual(h.seeks,[60])
  assert.equal(h.render({canSeek:false}).disabled,true)
  h.render().onPointerDown(h.event);h.render().onChange(h.change(80));h.render().onPointerUp(h.event)
  assert.deepEqual(h.seeks,[60]);assert.equal(h.render().value,0)
  assert.equal(h.render({canSeek:true,duration:0})['aria-valuetext'],'0:00 / --:--')
})

test('a duration change disables an in-flight drag instead of sending a stale seek',()=>{
  const h=harness();h.render().onPointerDown(h.event);h.render().onChange(h.change(80))
  h.render({canSeek:false,duration:0}).onPointerUp(h.event)
  assert.deepEqual(h.seeks,[]);assert.equal(h.render().value,0)
})
