import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {initialPeek,peekReducer:r,peekHoldMs,placeThemePeek,isThemePeekPoint,peekScrollMs,peekScrollTop}=await loadTypeScript(new URL('../src/lib/themePeek.ts',import.meta.url))

test('theme-triggered peek holds for one second then exits when not hovered',()=>{
  assert.equal(peekHoldMs,1000)
  let state=r(initialPeek,{type:'auto',id:1})
  assert.equal(state.phase,'entering')
  state=r(state,{type:'entered'});assert.equal(state.phase,'visible')
  state=r(state,{type:'expire',id:1});assert.equal(state.phase,'leaving')
  state=r(state,{type:'left'});assert.equal(state.phase,'hidden')
})

test('hover reveals the character and prevents automatic expiry until the pointer leaves',()=>{
  let state=r(initialPeek,{type:'hover',value:true})
  state=r(state,{type:'entered'});assert.equal(state.phase,'visible')
  state=r(state,{type:'auto',id:2})
  state=r(state,{type:'expire',id:2});assert.equal(state.phase,'visible')
  state=r(state,{type:'hover',value:false});assert.equal(state.phase,'leaving')
  state=r(state,{type:'left'});assert.equal(state.phase,'hidden')
})

test('keyboard focus holds the character independently of hover until focus leaves',()=>{
  let state=r(initialPeek,{type:'focus',value:true})
  state=r(state,{type:'entered'})
  state=r(state,{type:'hover',value:true});state=r(state,{type:'hover',value:false})
  assert.equal(state.phase,'visible')
  state=r(state,{type:'focus',value:false});assert.equal(state.phase,'leaving')
})

test('stale automatic expiry and stale exit events cannot hide a new or re-entered peek',()=>{
  let state=r(initialPeek,{type:'auto',id:1})
  state=r(state,{type:'auto',id:2});state=r(state,{type:'entered'})
  state=r(state,{type:'expire',id:1});assert.equal(state.phase,'visible')
  state=r(state,{type:'expire',id:2});assert.equal(state.phase,'leaving')
  state=r(state,{type:'hover',value:true});assert.equal(state.phase,'entering')
  state=r(state,{type:'left'});assert.equal(state.phase,'entering')
  state=r(state,{type:'cancel-auto'});assert.equal(state.phase,'entering')
  assert.deepEqual(r(state,{type:'reset'}),initialPeek)
})

test('a new theme cancels its old automatic peek but preserves active hover',()=>{
  let state=r(initialPeek,{type:'auto',id:1});state=r(state,{type:'entered'})
  assert.equal(r(state,{type:'cancel-auto'}).phase,'hidden')
  state=r(state,{type:'hover',value:true})
  assert.equal(r(state,{type:'cancel-auto'}).phase,'visible')
})

test('placement stays in the corner without a player and avoids desktop and mobile players',()=>{
  assert.deepEqual(placeThemePeek({width:1280,height:900}),{right:8,bottom:0,size:240,layer:120})
  const desktop={left:806,right:1246,top:463,bottom:882}
  const placed=placeThemePeek({width:1280,height:900},desktop)
  assert(1280-placed.right<=desktop.left)
  const mobile={left:12,right:378,top:150,bottom:832}
  const small=placeThemePeek({width:390,height:844},mobile)
  assert(844-small.bottom<=mobile.top)
  assert(844-small.bottom-small.size>=0)
  assert.equal(placeThemePeek({width:390,height:844},{left:12,right:378,top:12,bottom:832}).layer,90)
  assert.equal(placeThemePeek({width:1280,height:900},{left:20,right:460,top:20,bottom:440}).right,8)
})

test('hover activation follows the final image bounds and horizontal offsets instead of a fixed corner',()=>{
  const viewport={width:1280,height:900}
  const image={left:1032,right:1272,top:660,bottom:900}
  assert.equal(isThemePeekPoint({x:1050,y:680},viewport,image),true)
  assert.equal(isThemePeekPoint({x:1010,y:800},viewport,image),false)
  const shifted={left:1012,right:1252,top:660,bottom:900}
  assert.equal(isThemePeekPoint({x:1015,y:680},viewport,shifted),true)
  assert.equal(isThemePeekPoint({x:1260,y:800},viewport,shifted),false)
  assert.equal(isThemePeekPoint({x:1281,y:850},viewport,image),false)
  assert.equal(isThemePeekPoint({x:1200,y:901},viewport,image),false)
  assert.equal(isThemePeekPoint({x:1200,y:820},viewport),false)
})

test('a character moved away from the corner still holds hover inside its visible bounds',()=>{
  const viewport={width:1280,height:900}
  const image={left:560,right:800,top:660,bottom:900}
  assert.equal(isThemePeekPoint({x:680,y:750},viewport,image),true)
  assert.equal(isThemePeekPoint({x:500,y:750},viewport,image),false)
  assert.equal(isThemePeekPoint({x:1200,y:820},viewport,image),false)
  const animated={...image,top:652,bottom:892}
  assert.equal(isThemePeekPoint({x:680,y:655},viewport,image,animated),true)
})

test('hover and theme changes use the same enter and leave animation phases',()=>{
  let hover=r(initialPeek,{type:'hover',value:true})
  let automatic=r(initialPeek,{type:'auto',id:1})
  assert.equal(hover.phase,automatic.phase)
  hover=r(hover,{type:'entered'});automatic=r(automatic,{type:'entered'})
  assert.equal(hover.phase,automatic.phase)
  hover=r(hover,{type:'hover',value:false});automatic=r(automatic,{type:'expire',id:1})
  assert.equal(hover.phase,automatic.phase)
})

test('return-to-top easing moves through intermediate positions and reaches zero after its duration',()=>{
  assert.equal(peekScrollMs,650)
  assert.equal(peekScrollTop(800,0),800)
  const samples=[0,100,200,400,650,900].map(time=>peekScrollTop(800,time))
  assert(samples[1]>0&&samples[1]<800)
  assert(samples[2]>samples[3])
  assert.equal(samples[4],0);assert.equal(samples[5],0)
  for(let index=1;index<samples.length;index++) assert(samples[index]<=samples[index-1])
  assert.equal(peekScrollTop(0,100),0)
  assert.equal(peekScrollTop(-10,100),0)
})
