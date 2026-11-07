import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/PlaybackControls.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText


function harness(props={}) {
  const changes=[];let starts=0,stops=0
  const module={exports:{}}
  new Function('require','module','exports',code)(require,module,module.exports)
  const settings={videoFrosted:false,coverFrosted:true}
  const tree=module.exports.default({settings,onChange:value=>changes.push(value),onStartVisualization:()=>starts++,onStopVisualization:()=>stops++,...props})
  function find(label){
    function visit(node){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props['aria-label']===label)return node;for(const child of [node.props?.children].flat(Infinity)){const found=visit(child);if(found)return found}return null}
    const result=visit(tree);assert(result,label);return result
  }
  return {settings,changes,tree,find,counts:()=>({starts,stops})}
}
test('navigation has no player mode switch and keeps video/cover background settings independent',()=>{
 const video=harness();video.find('视频磨砂').props.onClick();assert.deepEqual(video.changes.pop(),{videoFrosted:true,coverFrosted:true})
 const cover=harness({background:'cover'});cover.find('背景磨砂').props.onClick();assert.deepEqual(cover.changes.pop(),{videoFrosted:false,coverFrosted:false})
 assert(!JSON.stringify(video.tree).includes('浮窗'));assert(!JSON.stringify(video.tree).includes('悬窗'))
})

test('visualizer starts from an idle click and stops active or pending sharing without a settings menu',()=>{
  const idle=harness();assert.equal(idle.counts().starts,0)
  const button=idle.find('音频可视化')
  assert.equal(button.props.disabled,undefined)
  button.props.onClick();assert.equal(idle.counts().starts,1)
  for(const props of [{visualizationEnabled:true},{visualizationPending:true}]){
    const h=harness(props),toggle=h.find('音频可视化')
    assert.equal(toggle.props['aria-checked'],true)
    toggle.props.onClick();assert.deepEqual(h.counts(),{starts:0,stops:1})
  }
  assert.equal(harness({visualizationPending:true}).find('音频可视化').props['aria-busy'],true)
})
