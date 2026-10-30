import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const routes=await loadTypeScript(new URL('../src/lib/siteRoute.ts',import.meta.url))
const {parseSiteRoute:parse,siteRouteHash:hash}=routes
const releases=new Set(['sp-album-1'])

test('hash routes round-trip pages, member details, Spotify release, Unicode search and categories',()=>{
  for(const value of ['#/','#/music/youtube','#/members','#/members/3','#/history','#/about','#/music/spotify/release/sp-album-1?category=ep&q=%E7%8C%AB+%26+KMNZ']) {
    const route=parse(value,releases)
    assert.deepEqual(parse(hash(route),releases),route)
  }
  const detail=parse('#/music/spotify/release/sp-album-1?category=ep&q=%E7%8C%AB+%26+KMNZ',releases)
  assert.equal(detail.music.search,'猫 & KMNZ');assert.equal(detail.music.category,'ep')
  assert.equal(parse('#/members/4',releases).page,'member-4')
})

test('unknown and malformed routes safely normalize without inventing members or releases',()=>{
  for(const value of ['','#/missing','#/members/5','#/members/%E0%A4%A','#/music/invalid']) assert.equal(parse(value,releases).page,'home')
  const unknown=parse('#/music/spotify/release/missing?category=invalid',releases)
  assert.equal(unknown.page,'music');assert.equal(unknown.music.releaseSourceId,null);assert.equal(unknown.music.category,'all')
  assert.equal(parse('#/music/youtube?q='+'a'.repeat(1000),releases).music.search.length,512)
})

const source=await readFile(new URL('../src/hooks/useSiteRoute.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function harness(initial='#/music/spotify?q=KMNZ',transition) {
  const prior=new Map(['window','sessionStorage'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]))
  const slots=[],effects=[],listeners=new Map(),frames=new Map(),store=new Map();let cursor=0,frameId=0,index=0
  const location={pathname:'/KMNZ/',search:'',hash:initial}
  const entries=[{hash:initial,state:null}]
  const history={scrollRestoration:'auto',get state(){return entries[index].state},
    pushState(state,_unused,url){location.hash=new URL(url,'https://example.com').hash;entries.splice(++index);entries.push({hash:location.hash,state})},
    replaceState(state,_unused,url){location.hash=new URL(url,'https://example.com').hash;entries[index]={hash:location.hash,state}},
    back(){if(index===0)return;location.hash=entries[--index].hash;listeners.get('popstate')?.();listeners.get('hashchange')?.()}}
  const win={location,history,scrollY:0,scrollTo(_x,y){this.scrollY=y},requestAnimationFrame(fn){frames.set(++frameId,fn);return frameId},cancelAnimationFrame(id){frames.delete(id)},addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)}}
  Object.defineProperty(globalThis,'window',{configurable:true,value:win})
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}})
  const react={useState(value){const i=cursor++;slots[i]??={value:typeof value==='function'?value():value};return [slots[i].value,next=>{slots[i].value=next}]},useRef(value){const i=cursor++;return slots[i]??={current:value}},useCallback(fn,deps){const i=cursor++;if(!slots[i]||deps.some((value,j)=>!Object.is(value,slots[i].deps[j])))slots[i]={deps,value:fn};return slots[i].value},useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j])))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})}}
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='react'?react:routes,module,module.exports)
  return {render(){cursor=0;const result=module.exports.useSiteRoute(releases,transition);effects.splice(0).forEach(fn=>fn());return result},win,entries,store,
    flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn())},
    cleanup(){slots.forEach(slot=>slot?.cleanup?.());assert.equal(listeners.size,0);assert.equal(frames.size,0);assert.equal(history.scrollRestoration,'auto');for(const [name,value] of prior)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name]}}
}

test('route navigation preserves /KMNZ/, history restores pages and scroll, and typing replaces rather than floods history',()=>{
  const h=harness()
  try {
    let view=h.render();h.flush();h.win.scrollY=240
    view.navigate('about');view=h.render();h.flush();assert.equal(view.route.page,'about');assert.equal(h.win.scrollY,0)
    h.win.history.back();view=h.render();h.flush();assert.equal(view.route.page,'music');assert.equal(h.win.scrollY,240)
    const count=h.entries.length
    view.changeMusic({...view.route.music,search:'MIRROR'},true);view=h.render();h.flush()
    assert.equal(h.entries.length,count);assert.equal(view.route.music.search,'MIRROR');assert(h.win.location.hash.includes('MIRROR'));assert.equal(h.win.location.pathname,'/KMNZ/')
  } finally {h.cleanup()}
})

test('release back uses browser history when available and supports directly opened detail URLs',()=>{
  const h=harness('#/music/spotify?category=ep')
  try {
    let view=h.render();view.changeMusic({...view.route.music,releaseSourceId:'sp-album-1'});view=h.render();assert.equal(view.route.music.releaseSourceId,'sp-album-1')
    view.backFromRelease();view=h.render();assert.equal(view.route.music.releaseSourceId,null);assert.equal(view.route.music.category,'ep')
  } finally {h.cleanup()}
  const direct=harness('#/music/spotify/release/sp-album-1')
  try {let view=direct.render();view.backFromRelease();view=direct.render();assert.equal(view.route.music.releaseSourceId,null);assert.equal(direct.entries.length,1)}finally{direct.cleanup()}
})

test('animated route commits preserve history and restored scroll while same-page actions remain immediate',()=>{
  const pending=[],calls=[]
  const h=harness('#/music/spotify?q=KMNZ',(from,to,update)=>{
    calls.push([from,to]);if(from===to)update();else pending.splice(0,pending.length,update)
  })
  try {
    let view=h.render();h.flush();h.win.scrollY=240
    view.navigate('about');assert.equal(h.entries.length,1);assert.equal(h.render().route.page,'music')
    pending.shift()();view=h.render();h.flush();assert.equal(view.route.page,'about');assert.equal(h.win.scrollY,0)
    h.win.history.back();assert.equal(h.render().route.page,'about')
    pending.shift()();view=h.render();h.flush();assert.equal(view.route.page,'music');assert.equal(h.win.scrollY,240)
    view.changeMusic({...view.route.music,search:'MIRROR'},true);view=h.render();assert.equal(view.route.music.search,'MIRROR')
    view.navigate('music');assert.equal(h.win.scrollY,0);assert.equal(pending.length,0)
    assert.deepEqual(calls,[['music','about'],['about','music'],['about','music'],['music','music'],['music','music']])
    while(pending.length)pending.shift()()
  } finally {h.cleanup()}
})

test('music route motion receives platform/category changes and repeated active choices cancel pending navigation',()=>{
  const calls=[],pending=[]
  const h=harness('#/music/youtube',(from,to,update,music)=>{
    calls.push({from,to,music})
    pending.splice(0,pending.length)
    if(music && (music.from.platform!==music.to.platform || music.from.category!==music.to.category))pending.push(update)
    else update()
  })
  try {
    let view=h.render();h.flush()
    view.changeMusic({...view.route.music,platform:'spotify'})
    assert.equal(pending.length,1);assert.equal(h.entries.length,1)
    view.changeMusic({...view.route.music,platform:'youtube'})
    assert.equal(pending.length,0);assert.equal(h.render().route.music.platform,'youtube')
    view.changeMusic({...view.route.music,platform:'spotify'});pending.shift()();view=h.render();h.flush()
    assert.equal(view.route.music.platform,'spotify')
    view.changeMusic({...view.route.music,category:'ep'});pending.shift()();view=h.render();h.flush()
    assert.equal(view.route.music.category,'ep')
    assert.equal(calls.at(-1).music.from.category,'all');assert.equal(calls.at(-1).music.to.category,'ep')
    assert(calls.every(call=>call.from==='music' && call.to==='music'))
    const count=h.entries.length
    view.changeMusic({...view.route.music,search:'MIRROR'},true);view=h.render()
    assert.equal(view.route.music.search,'MIRROR');assert.equal(h.entries.length,count)
  } finally {h.cleanup()}
})

test('YouTube filters restore both levels after history navigation and refresh, preserving /KMNZ/ and search',()=>{
  const h=harness('#/music/youtube')
  try {
    let view=h.render();h.flush()
    view.changeMusic(routes.changeMusicFilter(view.route.music,{type:'youtube',value:'original'}));view=h.render();h.flush()
    view.changeMusic(routes.changeMusicFilter(view.route.music,{type:'group',value:'lita-liz'}));view=h.render();h.flush()
    assert.equal(h.win.location.hash,'#/music/youtube?category=original&group=lita-liz')
    const refreshed=parse(h.win.location.hash,releases)
    assert.equal(refreshed.music.youtubeGroup,'lita-liz')
    view.changeMusic({...view.route.music,search:'Boarding'},true);view=h.render();h.flush()
    view.changeMusic(routes.changeMusicFilter(view.route.music,{type:'youtube',value:'cover'}));view=h.render();h.flush()
    assert.equal(view.route.music.youtubeGroup,null)
    view.changeMusic(routes.changeMusicFilter(view.route.music,{type:'member',value:'LIZ'}));view=h.render();h.flush()
    assert.equal(view.route.music.youtubeMember,'LIZ')
    h.win.history.back();view=h.render();h.flush()
    assert.equal(view.route.music.youtubeCategory,'cover');assert.equal(view.route.music.youtubeMember,null)
    h.win.history.back();view=h.render();h.flush()
    assert.equal(view.route.music.youtubeCategory,'original');assert.equal(view.route.music.youtubeGroup,'lita-liz')
    assert.equal(view.route.music.search,'Boarding');assert.equal(h.win.location.pathname,'/KMNZ/')
    view.navigate('about');view=h.render();view.navigate('music');view=h.render()
    assert.equal(view.route.music.youtubeGroup,'lita-liz')
  } finally {h.cleanup()}
})

test('opening, switching and closing Spotify track panels preserve list scroll and browser history',()=>{
  const h=harness('#/music/spotify?category=ep&q=DROPS')
  try {
    let view=h.render();h.flush();h.win.scrollY=480
    view.changeMusic({...view.route.music,releaseSourceId:'sp-album-1'});view=h.render();h.flush()
    assert.equal(h.win.scrollY,480);assert.equal(view.route.music.releaseSourceId,'sp-album-1')
    assert.equal(view.route.music.search,'DROPS');assert.equal(view.route.music.category,'ep')
    h.win.scrollY=640;view.backFromRelease();view=h.render();h.flush()
    assert.equal(h.win.scrollY,640);assert.equal(view.route.music.releaseSourceId,null)
    view.changeMusic({...view.route.music,releaseSourceId:'sp-album-1'});view=h.render();h.flush()
    view.changeMusic({...view.route.music,releaseSourceId:'sp-second-album'});view=h.render();h.flush()
    assert.equal(view.route.music.releaseSourceId,'sp-second-album');assert.equal(h.win.scrollY,640)
    view.backFromRelease();view=h.render();h.flush()
    assert.equal(view.route.music.releaseSourceId,null);assert.equal(h.win.scrollY,640)
    view.changeMusic({...view.route.music,platform:'youtube'});view=h.render();h.flush()
    assert.equal(h.win.scrollY,0)
  } finally {h.cleanup()}
})
