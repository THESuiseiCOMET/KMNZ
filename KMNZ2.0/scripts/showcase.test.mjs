import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'
const require=createRequire(import.meta.url)
const siteRules=await loadTypeScript(new URL('../src/lib/siteRoute.ts',import.meta.url))
const locationRules=await loadTypeScript(new URL('../src/lib/musicLocation.ts',import.meta.url))
const rules=await loadTypeScript(new URL('../src/lib/showcase.ts',import.meta.url))
const hookSource=await readFile(new URL('../src/hooks/useShowcase.ts',import.meta.url),'utf8')
const compile=(source,jsx=false)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})}}).outputText

function harness({page='home',saved=null,reduced=false,unavailable=false}={}){
  let cursor=0;const slots=[],pending=[],timers=new Map(),listeners=new Set();let serial=0
  const storage={getItem(){if(unavailable)throw Error('unavailable');return saved},setItem(key,value){assert.equal(key,rules.showcaseSessionKey);if(unavailable)throw Error('unavailable');saved=value}}
  const doc={documentElement:{style:{overflow:'clip'}},body:{},activeElement:null,getElementById:()=>main,querySelector:()=>menu}
  class Element{isConnected=true;visible=true;getClientRects(){return this.visible?[{}]:[]};focus(options){assert.equal(options.preventScroll,true);doc.activeElement=this}}
  const main=new Element(),enter=new Element(),back=new Element(),menu=new Element()
  doc.activeElement=doc.body
  const media={matches:reduced,addEventListener(name,fn){assert.equal(name,'change');listeners.add(fn)},removeEventListener(name,fn){listeners.delete(fn)}}
  const win={get sessionStorage(){if(unavailable)throw Error('unavailable');return storage},matchMedia:()=>media,setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial},clearTimeout:id=>timers.delete(id)}
  const react={
    useState(initial){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return[slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next}]},
    useRef(initial){const i=cursor++;return slots[i]??={current:initial}},
    useCallback(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j])))slots[i]={fn,deps};return slots[i].fn},
    useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,effect:fn,cleanup:fn()}})}
  }
  const module={exports:{}}
  new Function('require','module','exports','window','document','HTMLElement',compile(hookSource))(name=>name==='react'?react:rules,module,module.exports,win,doc,Element)
  return {
    render(nextPage=page){cursor=0;const value=module.exports.useShowcase(nextPage);value.enterButton.current=enter;value.returnButton.current=back;pending.splice(0).forEach(fn=>fn());return value},
    expire(){const jobs=[...timers.values()];timers.clear();jobs.forEach(job=>job.fn())},
    reduce(){media.matches=true;[...listeners].forEach(fn=>fn())},
    unmount(){slots.forEach(slot=>slot?.cleanup?.())},
    replayEffects(){slots.forEach(slot=>{if(slot?.effect){slot.cleanup?.();slot.cleanup=slot.effect()}})},
    doc,main,enter,back,menu,timers,listeners,storage,stored:()=>saved
  }
}

test('ordinary first visit opens showcase; entered sessions and explicit content routes bypass it',()=>{
  assert.equal(rules.initialShowcasePhase('home'), 'showcase')
  assert.equal(rules.initialShowcasePhase('home',{getItem:()=>{throw Error()}}),'showcase')
  assert.equal(rules.initialShowcasePhase('home',{getItem:()=> '1'}),'console')
  for(const page of ['music','member-1','member-4','about','history'])assert.equal(rules.initialShowcasePhase(page),'console')
})
test('members deep link opens the showcase even in an entered session',()=>{
  assert.equal(rules.initialShowcasePhase('members'),'showcase')
  assert.equal(rules.initialShowcasePhase('members',{getItem:()=> '1'}),'showcase')
})

test('transition state ignores repeated, opposing and stale finish actions',()=>{
  let phase='showcase'
  phase=rules.showcaseStep(phase,'enter');assert.equal(phase,'entering')
  for(const action of ['enter','return'])assert.equal(rules.showcaseStep(phase,action),phase)
  phase=rules.showcaseStep(phase,'finish');assert.equal(phase,'console')
  assert.equal(rules.showcaseStep(phase,'finish'),'console')
  phase=rules.showcaseStep(phase,'return');assert.equal(phase,'returning')
  for(const action of ['enter','return'])assert.equal(rules.showcaseStep(phase,action),phase)
  assert.equal(rules.showcaseStep(phase,'finish'),'showcase')
})
test('entering is immediate, writes only a session flag and unlocks/focuses console after 2000ms',()=>{
  const h=harness();let v=h.render();assert.equal(v.blocked,true);assert.equal(h.doc.activeElement,h.enter);assert.equal(h.doc.documentElement.style.overflow,'hidden')
  v.enter();v.enter();v.show();v=h.render();assert.equal(v.phase,'entering');assert.equal(h.stored(),'1');assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,2000)
  h.expire();v=h.render();assert.equal(v.phase,'console');assert.equal(v.blocked,false);assert.equal(h.doc.documentElement.style.overflow,'clip');assert.equal(h.doc.activeElement,h.main);assert.equal(h.listeners.size,0)
  h.unmount()
})
test('manual return preserves original page and restores originating keyboard focus',()=>{
  const h=harness({page:'music'});let v=h.render();h.back.focus({preventScroll:true});v.show();v.show();v.enter();v=h.render();assert.equal(v.phase,'returning')
  h.expire();v=h.render();assert.equal(v.phase,'showcase');assert.equal(h.doc.activeElement,h.enter)
  v.enter();h.render();h.expire();v=h.render('member-1');assert.equal(v.phase,'console');assert.equal(h.doc.activeElement,h.back)
  assert.equal(h.doc.documentElement.style.overflow,'clip');h.unmount()
})
test('missing session storage never blocks ENTER and refresh skips only after an actual ENTER',()=>{
  const h=harness({unavailable:true});let v=h.render();v.enter();h.render();h.expire();assert.equal(h.render().phase,'console');h.unmount()
  const session=harness();session.render().enter();assert.equal(harness({saved:session.stored()}).render().phase,'console');session.unmount()
})
test('reduced motion uses short fade and changing preference completes a running transition',()=>{
  const h=harness({reduced:true});h.render().enter();h.render();assert.equal([...h.timers.values()][0].ms,180);h.unmount();assert.equal(h.timers.size,0)
  const changed=harness();changed.render().enter();changed.render();changed.reduce();assert.equal(changed.render().phase,'console');assert.equal(changed.timers.size,0);changed.unmount()
})
test('unmount cancels transitions, media listeners and restores original scroll style',()=>{
  const h=harness();h.render().enter();h.render();assert.equal(h.timers.size,1);h.unmount();assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0);assert.equal(h.doc.documentElement.style.overflow,'clip')
})
test('StrictMode effect replay leaves one timer/listener and restores scroll on cleanup',()=>{
  const h=harness();h.render().enter();h.render();h.replayEffects();assert.equal(h.timers.size,1);assert.equal(h.listeners.size,1);assert.equal(h.doc.documentElement.style.overflow,'hidden');h.expire();assert.equal(h.render().phase,'console');h.unmount();assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0);assert.equal(h.doc.documentElement.style.overflow,'clip')
})
test('showcase DOM uses supplied art, no extra player, native keyboard button and no inactive overlay',async()=>{
  const source=await readFile(new URL('../src/components/Showcase.tsx',import.meta.url),'utf8'),module={exports:{}}
  new Function('require','module','exports',compile(source,true))(name=>name==='react/jsx-runtime'?require(name):name.endsWith('.css')?{}:name,module,module.exports)
  const render=require('react-dom/server').renderToStaticMarkup
  assert.equal(render(module.exports.default({phase:'console',onEnter(){},enterRef:{current:null}})),'')
  const html=render(module.exports.default({phase:'showcase',onEnter(){},enterRef:{current:null}}))
  assert.match(html,/LITALIZ.jpg/);assert.match(html,/kmnz2.avif/);assert.match(html,/KMNZLOGOW.webp/)
  assert.match(html,/type="button"/);assert.doesNotMatch(html,/<iframe|<audio|<video|MEMBERS/)
  assert(html.indexOf('showcase-classic')<html.indexOf('showcase-new'))
  const busy=render(module.exports.default({phase:'entering',onEnter(){},enterRef:{current:null}}))
  assert.match(busy,/inert=""/);assert.match(busy,/disabled=""/)
})
test('App keeps the console and current player in the same reconciliation position for every phase',async()=>{
  const source=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),module={exports:{}}
  let phase='showcase',visualization=null,pending=false
  const events=[]
  const entry={id:'yt-existing',platform:'youtube'},queue={requestId:27,mode:'off'},route={page:'music',music:{}}
  const react={useMemo:fn=>fn(),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useRef:value=>({current:value}),useCallback:fn=>fn,useReducer:()=>[queue,()=>{}],useEffect(){}}
  const deps={react,'./lib/siteRoute':siteRules,'./lib/musicLocation':locationRules,
    './hooks/useShowcase':{useShowcase:()=>({phase,blocked:phase!=='console',enter(){},show(){},enterButton:{current:null},returnButton:{current:null}})},
    './hooks/usePageTransition':{usePageTransition:()=>()=>{}},'./hooks/useSiteRoute':{useSiteRoute:()=>({route,navigate(page){events.push(['navigate',page])}})},
    './hooks/useAudioVisualizer':{useAudioVisualizer:()=>({session:visualization,pending,start(){events.push(['start']);return new Promise(()=>{})},stop(){events.push(['stop'])}})},'./hooks/useNavigationControl':{useNavigationControl:()=>({})},
    './hooks/usePlaybackPersistence':{usePlaybackPersistence:()=>()=>{}},'./lib/playbackSession':{readPlaybackSession:()=>null},
    './lib/playbackPreferences':{readPlaybackPreferences:()=>({presentation:'floating'}),resolvePlayerPresentation:()=> 'floating'},
    './data/members':{members:[]},'./data/music':{musicCatalog:[entry]},'./data/musicLibrary':{musicLibrary:{schemaVersion:1,songs:[],releases:[],sources:[]}},
    './lib/playbackQueue':{currentQueueItem:()=>({sourceId:entry.id}),emptyQueue:queue,queueAvailability:()=>({previous:true,next:true})}}
  new Function('require','module','exports','document',compile(source,true))(name=>name==='react/jsx-runtime'?require(name):deps[name]??{__esModule:true,default:name},module,module.exports,{documentElement:{dataset:{theme:'dark'}}})
  let playerIndex
  for(const value of ['showcase','entering','console','returning','showcase']){
    phase=value;const result=module.exports.default(),children=result.props.children,app=children[1]
    assert.match(app.props.className,/with-music-player/);assert.equal(app.props.inert,value!=='console')
    const index=app.props.children.findIndex(child=>child?.type==='./components/PlayerDock')
    assert(index>=0,JSON.stringify(app.props.children.map(child=>child&&({type:child.type,keys:Object.keys(child.props??{})}))))
    playerIndex??=index;assert.equal(index,playerIndex);assert.equal(app.props.children[index].props.entry,entry);assert.equal(app.props.children[index].props.requestId,27)
    assert.equal(app.props.children.filter(child=>child?.type==='main').length,1)
  }
  function mainView(){const app=module.exports.default().props.children[1];return {app,main:app.props.children.find(child=>child?.type==='main')}}
  for(const page of ['home','members']){
    route.page=page;const {app,main}=mainView()
    assert(main.props.children.some(child=>child?.type==='./pages/Music'))
    assert(!main.props.children.some(child=>child?.type==='./pages/Home'||child?.type==='./pages/Members'))
    assert(!app.props.children.some(child=>child?.props?.className==='showcase-return'))
    const header=app.props.children.find(child=>child?.type==='./components/Header')
    assert.equal(header.props.page,'music');assert.equal(typeof header.props.onShowcase,'function');assert(header.props.showcaseButtonRef)
  }
  const controls=()=>mainView().app.props.children.find(child=>child?.type==='./components/Header').props.playbackControls.props
  route.page='music';controls().onStartVisualization()
  assert.deepEqual(events.splice(0),[['start'],['navigate','mv']], 'navigate immediately without waiting for capture permission')
  for(const page of ['home','music','about','history','mv']){
    route.page=page;visualization={analyser:{}}
    const {app,main}=mainView()
    assert.equal(app.props.children.some(child=>child?.props?.className==='mv-visualizer'),page==='mv')
    const header=app.props.children.find(child=>child?.type==='./components/Header')
    assert.equal(header.props.tempoVisible,page==='mv')
    if(page==='mv'){
      const visualizer=app.props.children.find(child=>child?.props?.className==='mv-visualizer').props.children
      assert.equal(visualizer.props.tempoReadoutRef,header.props.tempoReadoutRef)
    }
    assert(!main.props.children.some(child=>child?.type==='./components/AudioVisualizer'))
    if(page==='mv'){
      assert(main.props.children.some(child=>child?.type==='./pages/Music'))
      assert.equal(main.props.inert,true)
    }
  }
  route.page='about';controls().onStartVisualization()
  assert.deepEqual(events.splice(0),[['navigate','mv']], 'existing capture is reused when returning from another page')
  visualization=null;pending=true;route.page='mv'
  const view=mainView();assert(view.app.props.children.some(child=>child?.props?.className==='mv-visualizer'))
  assert.equal(view.app.props.children.find(child=>child?.type==='./components/Header').props.canOpenMV,true)
  controls().onStartVisualization();assert.deepEqual(events.splice(0),[['navigate','mv']], 'pending capture cannot start twice')
  controls().onStopVisualization();assert.deepEqual(events.splice(0),[['stop']])
})

test('reference texture is clipped to paper and ink footer; portraits and navigation logo remain original assets',async()=>{
  const source=await readFile(new URL('../src/components/Showcase.tsx',import.meta.url),'utf8'),module={exports:{}}
  new Function('require','module','exports',compile(source,true))(name=>name==='react/jsx-runtime'?require(name):name.endsWith('.css')?{}:name,module,module.exports)
  const header=await readFile(new URL('../src/components/Header.tsx',import.meta.url),'utf8')
  const logoPath=header.match(/import logoWhite from '([^']+)'/)[1]
  assert.equal(module.exports.showcaseArtwork.logo,logoPath)
  assert.equal(module.exports.showcaseArtwork.classic,'../assets/showcase/LITALIZ.jpg')
  assert.equal(module.exports.showcaseArtwork.modern,'../assets/images/kmnz2.avif')
  const html=require('react-dom/server').renderToStaticMarkup(module.exports.default({phase:'showcase',onEnter(){},enterRef:{current:null}}))
  const textures=html.match(/<image[^>]+>/g)
  assert.equal(textures.length,2)
  for(const image of textures)assert.match(image,/clip-path="url\(#showcase-(paper|bottom)-cut\)"/)
  assert.equal((html.match(/<figure/g)||[]).length,2)
  assert.match(html,/showcase-logo-sticker/);assert.match(html,/ink-sticker.svg/)
  assert.doesNotMatch(html,/assets\/showcase\/KMNZ-logo.svg/)
})

test('handlers remain stable across player polling renders; resize finish is guarded',()=>{
  const h=harness();const first=h.render();first.enter();let value=h.render()
  for(let i=0;i<20;i++){
    assert.equal(value.enter,first.enter);assert.equal(value.show,first.show);assert.equal(value.finish,first.finish)
    value=h.render()
  }
  assert.equal(h.timers.size,1);value.finish();value=h.render();assert.equal(value.phase,'console');assert.equal(h.timers.size,0)
  value.finish();assert.equal(h.render().phase,'console');h.unmount()
})


test('return from showcase restores the visible mobile menu trigger when MEMBERS is in a closed menu',()=>{
 const h=harness({page:'music'});let v=h.render();h.back.focus({preventScroll:true});v.show();h.render();h.expire();v=h.render()
 h.back.visible=false;v.enter();h.render();h.expire();h.render();assert.equal(h.doc.activeElement,h.menu);h.unmount()
})
