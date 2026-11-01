import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTypeScript } from './load-typescript.mjs'
const {sprayPath,sampleSprayPath,visibleSprayRect,createSprayPlan,sampleSpray,runSprayTimeline,sprayTiming}=await loadTypeScript(new URL('../src/lib/sprayReveal.ts',import.meta.url))
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`)
const desktop=()=>createSprayPlan(1648,928,[{x:330,y:9,width:80,height:42},{x:690,y:8,width:620,height:44}],{x:330,y:72,width:980,height:1500},[{x:1260,y:580,width:340,height:300}])

test('spray samples distance, not point index, and clamps overshoot',()=>{
 const path=sprayPath([{x:0,y:0},{x:10,y:0},{x:10,y:90}])
 assert.deepEqual(sampleSprayPath(path,.5),{x:10,y:40,angle:90})
 assert.equal(sampleSprayPath(path,-2).x,0);assert.equal(sampleSprayPath(path,2).y,90)
})
test('nozzle, spray impact and reveal frontier share the exact progress for every pass',()=>{
 for(const plan of [desktop(),createSprayPlan(390,844,[{x:8,y:0,width:374,height:98}],{x:16,y:118,width:358,height:1100},[{x:36,y:500,width:340,height:300}])]){
  for(const pass of [plan.navigation,plan.content,plan.player])for(const progress of [.001,.1,.4,.65,.9,.999]){
   const frame=sampleSpray(plan,pass.start+(pass.end-pass.start)*progress),frontier=sampleSprayPath(pass.path,progress)
   near(frame.impact.x,frontier.x);near(frame.impact.y,frontier.y)
   const angle=frame.nozzle.angle*Math.PI/180
   near(frame.nozzle.x+Math.cos(angle)*plan.reach,frontier.x);near(frame.nozzle.y+Math.sin(angle)*plan.reach,frontier.y)
  }
 }
})
test('logo/nav are revealed before main content and the actual active player',()=>{
 const p=desktop()
 for(const t of [0,540,680,900,1169]){const f=sampleSpray(p,t);assert.equal(f.content,0);assert.equal(f.player,0);assert.equal(f.activeMark,0)}
 const main=sampleSpray(p,1450);assert.equal(main.nav,1);assert(main.content>0);assert.equal(main.player,0);assert.equal(main.activeMark,1)
 const player=sampleSpray(p,1800);assert.equal(player.nav,1);assert.equal(player.content,1);assert(player.player>0&&player.player<1)
 const end=sampleSpray(p,2000);assert.equal(end.player,1);assert.equal(end.veil,0);assert.equal(end.opacity,0);assert.equal(sprayTiming.end,2000)
})
test('regions clip to viewport; scrolled content and offscreen player do not invent a player pass',()=>{
 assert.deepEqual(visibleSprayRect({x:-10,y:-30,width:100,height:90},390,844),{x:0,y:0,width:90,height:60})
 assert.equal(visibleSprayRect({x:400,y:200,width:20,height:20},390,844),null)
 const p=createSprayPlan(390,844,[{x:0,y:-100,width:390,height:64}],{x:16,y:-300,width:358,height:2100},[{x:500,y:200,width:340,height:300}])
 assert.equal(p.navigation.regions.length,0);assert.equal(p.player,null);assert.equal(p.playerTravel,null)
 assert.deepEqual(p.content.regions,[{x:16,y:0,width:358,height:844}]);assert.equal(sampleSpray(p,1800).stage,'exit')
})
test('partial player retains its real region and uses an independent late reveal',()=>{
 const p=createSprayPlan(390,844,[],{x:0,y:0,width:390,height:900},[{x:36,y:700,width:340,height:300}])
 assert.deepEqual(p.player.regions,[{x:36,y:700,width:340,height:144}]);assert.equal(p.player.start,1710)
 assert(p.player.width>=340);assert.equal(sampleSpray(p,1660).player,0)
})
test('reverse retraces masks and restores the unmodified showcase end state',()=>{
 const p=desktop()
 for(const t of [0,180,700,1250,1780,2000]){
  const reverse=sampleSpray(p,t,true),forward=sampleSpray(p,2000-t)
  for(const key of ['nav','content','player','veil','activeMark'])near(reverse[key],forward[key])
 }
 assert.equal(sampleSpray(p,2000,true).nav,0);assert.equal(sampleSpray(p,2000,true).veil,1)
})
function clock(){
 let time=0,id=0;const pending=new Map(),cancelled=[]
 return {now:()=>time,request:fn=>{pending.set(++id,fn);return id},cancel:id=>{cancelled.push(id);pending.delete(id)},advance(next){time=next;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(time))},pending,cancelled}
}
test('bounded animation stops scheduling frames at 2000ms, even after a throttled tab',()=>{
 const c=clock(),frames=[];runSprayTimeline(desktop(),false,f=>frames.push(f),c)
 assert.equal(c.pending.size,1);c.advance(700);assert.equal(frames.at(-1).stage,'navigation')
 c.advance(4000);assert.equal(frames.at(-1).veil,0);assert.equal(c.pending.size,0)
 const count=frames.length;c.advance(5000);assert.equal(frames.length,count)
})
test('phase cleanup cancels the outstanding frame and ignores a queued stale callback',()=>{
 const c=clock(),frames=[];const stop=runSprayTimeline(desktop(),false,f=>frames.push(f),c)
 const stale=[...c.pending.values()][0];stop();stop();const count=frames.length;stale(1000)
 assert.equal(frames.length,count);assert.equal(c.pending.size,0);assert.equal(c.cancelled.length,1)
})
test('reverse clock is equally bounded and finishes with a closed reveal',()=>{
 const c=clock(),frames=[];runSprayTimeline(desktop(),true,f=>frames.push(f),c)
 assert.equal(frames[0].veil,0);c.advance(2000);assert.equal(frames.at(-1).veil,1);assert.equal(frames.at(-1).content,0);assert.equal(c.pending.size,0)
})

test('content and player strokes have vertical start/end caps and span all their visible corners',()=>{
 const p=desktop()
 for(const pass of [p.content,p.player]){
  for(const progress of [0,1]){const angle=sampleSprayPath(pass.path,progress).angle;assert(Math.abs(angle-90)<.5);assert(Math.abs(Math.cos(angle*Math.PI/180))*pass.width/2<4)}
  const first=pass.path.points[0],last=pass.path.points.at(-1)
  for(const region of pass.regions){assert(first.y<=region.y);assert(last.y>=region.y+region.height);assert(pass.width/2>Math.max(Math.abs(first.x-region.x),Math.abs(first.x-region.x-region.width)))}
 }
})
