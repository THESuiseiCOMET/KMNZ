import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import ts from 'typescript'
const require=createRequire(import.meta.url),source=await readFile(new URL('../src/components/PlayerDock.tsx',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
class Element{constructor(name){this.name=name;this.children=[];this.parent=null}appendChild(node){node.remove();this.children.push(node);node.parent=this}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null}}
function harness(){
 const slots=[],layout=[],effects=[],controls=new Element('controls'),media=new Element('media');let cursor=0,provider
 const use=(initial)=>{const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}]}
 const effect=(fn,deps,queue)=>{const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))queue.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}
 const react={useState:use,useRef:value=>{const i=cursor++;return slots[i]??={current:value}},useId:()=>{cursor++;return 'volume'},useEffect:(fn,deps)=>effect(fn,deps,effects),useLayoutEffect:(fn,deps)=>effect(fn,deps,layout)}
 const document={createElement:name=>new Element(name),querySelector:selector=>selector==='.header-player-slot'?controls:media}
 const module={exports:{}}
 const official={useOfficialPlayer(){const hostRef=react.useRef(null);provider={hostRef,ready:true,paused:true,volume:25,canChangeSource:true,canRepeat:true,togglePlayback(){},setVolume(){},adjustVolume(){},toggleMute(){},error:null,currentTime:0,duration:100,canSeek:true,seekTo(){}};return provider}}
 new Function('require','module','exports','document',code)(name=>name==='react'?react:name==='react-dom'?{createPortal:(child,target)=>({type:'portal',props:{children:child,target}})}:name.includes('useOfficialPlayer')?official:name==='react/jsx-runtime'?require(name):{__esModule:true,default:name},module,module.exports,document)
 const props={entry:{id:'a',title:'Track A',platform:'spotify'},onClose(){},onSkip(){}}
 return{controls,media,get provider(){return provider},render(patch={}){Object.assign(props,patch);cursor=0;const tree=module.exports.default(props);layout.splice(0).forEach(fn=>fn());effects.splice(0).forEach(fn=>fn());return tree},dispose(){slots.forEach(s=>s?.cleanup?.())}}
}
test('Spotify provider host stays attached to the navigation across rerenders and track changes',()=>{
 const h=harness();h.render();const host=h.provider.hostRef.current,iframe=new Element('iframe');host.appendChild(iframe);assert.equal(host.parent,h.media)
 h.render();h.render({entry:{id:'b',title:'Track B',platform:'spotify'}})
 assert.equal(h.provider.hostRef.current,host);assert.equal(host.children[0],iframe);assert.equal(h.media.children.length,1)
 const tree=h.render();const portal=tree.props.children.find(x=>x?.type==='portal');assert.equal(portal.props.target,h.controls)
 assert(!JSON.stringify(tree,(_key,value)=>value instanceof Element?value.name:value).includes('移动播放器'))
 h.dispose();assert.equal(h.media.children.length,0)
})
