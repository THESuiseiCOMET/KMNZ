import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/hooks/useNavigationMotion.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function harness({height=65,reduced=false,mv=false}={}) {
  const slots=[],effects=[],cleanups=[],motions=[];let cursor=0,transform='none'
  const element={animate(frames,options){const animation={cancelled:false,cancel(){this.cancelled=true},finished:new Promise(()=>{})};motions.push({frames,options,animation});return animation}}
  const react={useRef(value){const i=cursor++;return slots[i]??={current:value}},useLayoutEffect(fn,deps){const i=cursor++,last=slots[i];if(!last||deps.some((value,j)=>value!==last.deps[j])){slots[i]={deps};effects.push(fn)}},useEffect(fn){const i=cursor++;if(!slots[i]){slots[i]={};effects.push(()=>cleanups.push(fn()))}}}
  const doc={querySelector(selector){return selector==='.site-header'?{getBoundingClientRect:()=>({height})}:selector==='.mv-visualizer'?(mv?element:null):element}}
  const win={getComputedStyle:()=>({transform,display:'block'}),matchMedia:()=>({matches:reduced})}
  const module={exports:{}}
  new Function('require','module','exports','document','window','DOMMatrixReadOnly',code)(()=>react,module,module.exports,doc,win,class{constructor(value){this.m42=Number(value)}})
  return {motions,render(hidden){cursor=0;module.exports.useNavigationMotion(hidden);effects.splice(0).forEach(fn=>fn())},setTransform(value){transform=String(value)},dispose(){cleanups.forEach(fn=>fn?.())}}
}

test('navigation moves content for the measured header height without interpolating document layout',()=>{
  for(const height of [65,89,105,129]){
    const h=harness({height});h.render(false);assert.equal(h.motions.length,0)
    h.render(true);assert.equal(h.motions[0].frames[0].transform,`translateY(${height}px)`)
    h.render(false);assert.equal(h.motions[1].frames[0].transform,`translateY(${-height}px)`)
    assert(h.motions[0].animation.cancelled)
    assert(h.motions.every(m=>m.frames.every(frame=>Object.keys(frame).every(key=>key==='transform'))))
    h.dispose();assert(h.motions[1].animation.cancelled)
  }
})
test('rapid reversal carries the visible content position instead of restarting from a full header offset',()=>{
  const h=harness();h.render(false);h.render(true);h.setTransform(25);h.render(false)
  assert.equal(h.motions[1].frames[0].transform,'translateY(-40px)');h.dispose()
})
test('MV uses the same motion and reduced motion skips it',()=>{
  const mv=harness({mv:true});mv.render(false);mv.render(true);assert.equal(mv.motions.length,1);mv.dispose()
  const reduced=harness({reduced:true});reduced.render(false);reduced.render(true);assert.equal(reduced.motions.length,0);reduced.dispose()
})
