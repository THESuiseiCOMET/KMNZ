import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import ts from 'typescript'
const require=createRequire(import.meta.url)
async function compile(path){return ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}

function standby(code){
 const slots=[],effects=[];let cursor=0
 const react={useState(initial){const i=cursor++;slots[i]??={value:initial};return[slots[i].value,next=>{slots[i].value=next}]},useEffect(fn,deps){const i=cursor++,last=slots[i];if(!last||deps.some((v,j)=>!Object.is(v,last.deps[j]))){slots[i]={deps};effects.push(fn)}}}
 const module={exports:{}};new Function('require','module','exports',code)(()=>react,module,module.exports)
 return(...args)=>{cursor=0;const result=module.exports.useGrooveStandby(...args);effects.splice(0).forEach(fn=>fn());return result}
}
const hook=await compile('../src/hooks/useGrooveStandby.ts')
test('GROOVE keeps standby through loading and initial pause, hides on confirmed playback, and never flashes on pause or track change',()=>{
 const visible=standby(hook)
 assert(visible(false,'idle',false,false))
 assert(visible(true,'loading',false,false));assert(visible(true,'paused',false,false))
 assert.equal(visible(true,'playing',false,false),false)
 for(const status of ['paused','loading','error','ended'])assert.equal(visible(true,status,false,false),false)
 assert(visible(false,'idle',false,false))
})
test('capture permission alone does not hide standby; receiving sound does, until the source is closed',()=>{
 const visible=standby(hook)
 assert(visible(false,'idle',true,false))
 assert.equal(visible(false,'idle',true,true),false)
 assert.equal(visible(false,'idle',true,false),false)
 assert(visible(false,'idle',false,false))
})

test('standby uses the existing SVG as its mask and has no audio or iframe instances',async()=>{
 const module={exports:{}}
 new Function('require','module','exports',await compile('../src/components/GrooveStandby.tsx'))(name=>name==='react/jsx-runtime'?require(name):{__esModule:true,default:name},module,module.exports)
 const tree=module.exports.default(),logo=tree.props.children.props.children
 assert.equal(logo.props.role,'img');assert.equal(logo.props['aria-label'],'KMNZ')
 assert(logo.props.style.maskImage.includes('showcase/KMNZ-logo.svg'))
 assert.equal(logo.props.style.maskImage,logo.props.style.WebkitMaskImage)
 assert(!JSON.stringify(tree).match(/iframe|<audio|<video/))
})
test('idle play controls remain available without creating a provider and lead to song selection',async()=>{
 const module={exports:{}};let choices=0
 new Function('require','module','exports',await compile('../src/components/IdlePlayerControls.tsx'))(name=>name==='react/jsx-runtime'?require(name):{__esModule:true,default:name},module,module.exports)
 const tree=module.exports.default({onChooseMusic(){choices++}})
 function visit(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(visit)]}
 const nodes=visit(tree),buttons=nodes.filter(n=>n.type==='button')
 const play=buttons.find(n=>n.props['aria-label']==='选择歌曲')
 assert(play);assert(!play.props.disabled);play.props.onClick();assert.equal(choices,1)
 assert.equal(buttons.length,7);assert(buttons.filter(n=>n!==play).every(n=>n.props.disabled))
 assert(!nodes.some(n=>n.type==='iframe'||n.type==='audio'||n.type==='video'))
})
