import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTypeScript } from './load-typescript.mjs'
const { prepareVisibleMusicCards } = await loadTypeScript(new URL('../src/lib/musicCardTransition.ts', import.meta.url))

function card(rect, log = []) {
  const attributes = new Set()
  return { attributes, getBoundingClientRect() { log.push('read'); return { width: 300, height: 230, left: 0, right: 300, ...rect } },
    toggleAttribute(name, value) { log.push('write'); if (value) attributes.add(name); else attributes.delete(name) }, removeAttribute(name) { attributes.delete(name) } }
}
const marked = nodes => nodes.filter(node => node.attributes.has('data-music-transition-card'))
const root = nodes => ({ querySelectorAll: () => nodes })

test('a 281-card catalog only assigns snapshots to the visible rows without removing any card', () => {
  const nodes = Array.from({ length: 281 }, (_, i) => card({ top: 340 + Math.floor(i / 3) * 246, bottom: 570 + Math.floor(i / 3) * 246 }))
  const cleanup = prepareVisibleMusicCards(root(nodes), { width: 1280, height: 900 })
  assert.equal(nodes.length, 281)
  assert.equal(marked(nodes).length, 9)
  cleanup(); assert.equal(marked(nodes).length, 0)
})

test('partially visible cards are included, while above/below/outside/zero-size cards are excluded', () => {
  const nodes = [card({ top: -100, bottom: 100 }), card({ top: 800, bottom: 1030 }), card({ top: -240, bottom: -10 }),
    card({ top: 900, bottom: 1130 }), card({ top: 100, bottom: 330, left: 1280, right: 1580 }), card({ top: 100, bottom: 330, width: 0 })]
  const cleanup = prepareVisibleMusicCards(root(nodes), { width: 1280, height: 900 })
  assert.deepEqual(marked(nodes), nodes.slice(0, 2))
  cleanup()
})

test('snapshot measurement batches reads before writes and cleanup works for detached or replaced cards', () => {
  const log = [], nodes = [card({ top: 100, bottom: 330 }, log), card({ top: 400, bottom: 630 }, log)]
  const cleanup = prepareVisibleMusicCards(root(nodes), { width: 375, height: 812 })
  assert.deepEqual(log, ['read', 'read', 'write', 'write'])
  nodes[0].getBoundingClientRect = () => { throw Error('Detached node must not be measured during cleanup') }
  cleanup(); cleanup()
  assert.equal(marked(nodes).length, 0)
})


const {prepareVisibleMusicContent,afterContentTransition}=await loadTypeScript(new URL('../src/lib/musicCardTransition.ts',import.meta.url))
test('deep catalog snapshots include only current rows and visible bounded chrome',()=>{
 const nodes=Array.from({length:281},(_,i)=>card({top:340+Math.floor(i/3)*246-23000,bottom:570+Math.floor(i/3)*246-23000}))
 const toolbar=card({top:-23000,bottom:-22700}),pane=card({top:80,bottom:700,height:620})
 const cleanup=prepareVisibleMusicContent({querySelectorAll:selector=>selector==='.music-card'?nodes:[toolbar,pane]},{width:1280,height:720})
 assert(marked(nodes).length>0);assert(marked(nodes).length<=12)
 assert.equal(toolbar.attributes.has('data-music-transition-chrome'),false)
 assert.equal(pane.attributes.has('data-music-transition-chrome'),true)
 cleanup();assert.equal(marked(nodes).length,0);assert.equal(pane.attributes.size,0)
})

test('locator waits for all content transitions and ignores stale mutation callbacks after cleanup',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'MutationObserver')
 let observer,called=0
 class Observer{constructor(fn){this.fn=fn;observer=this}observe(){}disconnect(){this.disconnected=true}}
 Object.defineProperty(globalThis,'MutationObserver',{configurable:true,value:Observer})
 const attrs=new Set(['data-page-transition']),root={hasAttribute:name=>attrs.has(name)}
 try{
  const cancel=afterContentTransition(()=>called++,root)
  assert.equal(called,0);observer.fn();assert.equal(called,0)
  attrs.delete('data-page-transition');attrs.add('data-music-transition');observer.fn();assert.equal(called,0)
  attrs.clear();observer.fn();observer.fn();assert.equal(called,1);assert(observer.disconnected)
  cancel()
  attrs.add('data-page-transition');const cancelSecond=afterContentTransition(()=>called++,root)
  cancelSecond();attrs.clear();observer.fn();assert.equal(called,1)
  afterContentTransition(()=>called++,root);assert.equal(called,2)
 }finally{if(prior)Object.defineProperty(globalThis,'MutationObserver',prior);else delete globalThis.MutationObserver}
})
