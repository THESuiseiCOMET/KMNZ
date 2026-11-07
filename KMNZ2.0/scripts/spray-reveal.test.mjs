import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {loadTypeScript} from './load-typescript.mjs'
const {sprayPath,sampleSprayPath,visibleSprayRect,createSprayPlan,sampleSpray,runSprayTimeline,sprayTiming,sprayGesture}=await loadTypeScript(new URL('../src/lib/sprayReveal.ts',import.meta.url))
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`)
const desktop=()=>createSprayPlan(1648,928,[{x:0,y:0,width:1648,height:64}])
const mobile=()=>createSprayPlan(390,844,[{x:0,y:0,width:390,height:64}])
function covered(pass,progress,point){
 if(progress<=0)return false
 const length=pass.path.length*progress
 for(let i=1;i<pass.path.points.length;i++){
  const start=pass.path.distances[i-1];if(length<=start)break
  const a=pass.path.points[i-1],b=pass.path.points[i],dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy)
  const u=Math.max(0,Math.min(1,(length-start)/span,((point.x-a.x)*dx+(point.y-a.y)*dy)/(span*span)))
  if(Math.hypot(point.x-a.x-u*dx,point.y-a.y-u*dy)<pass.width/2-10)return true
 }
 return false
}
const revealed=(plan,time,point)=>{const f=sampleSpray(plan,time);return plan.passes.some((p,i)=>f.reveals[i].solid===1&&covered(p,f.reveals[i].settled,point))}

test('spray samples distance and clamps path overshoot',()=>{
 const path=sprayPath([{x:0,y:0},{x:10,y:0},{x:10,y:90}])
 assert.deepEqual(sampleSprayPath(path,.5),{x:10,y:40,angle:90})
 assert.equal(sampleSprayPath(path,-2).x,0);assert.equal(sampleSprayPath(path,2).y,90)
})
test('gesture accelerates, holds briefly and flicks; progress never runs backwards',()=>{
 for(const type of ['navigation','arc','flick','row']){
  let previous=0
  for(let i=0;i<=1000;i++){const next=sprayGesture(i/1000,type);assert(next>=previous);previous=next}
  assert.equal(previous,1)
 }
 near(sprayGesture(.58,'arc'),sprayGesture(.65,'arc'))
 assert(sprayGesture(.42,'arc')-sprayGesture(.32,'arc')>sprayGesture(.1,'arc')-sprayGesture(0,'arc'))
})
test('all gestures keep nozzle, mist and the grain frontier on one clock',()=>{
 for(const p of [desktop(),mobile()])for(const pass of p.passes)for(const u of [.01,.1,.4,.62,.9,.99]){
  const f=sampleSpray(p,pass.start+(pass.end-pass.start)*u),v=sampleSprayPath(pass.path,sprayGesture(u,pass.gesture))
  near(f.impact.x,v.x);near(f.impact.y,v.y)
  const angle=f.nozzle.angle*Math.PI/180
  near(f.nozzle.x+Math.cos(angle)*p.reach,v.x);near(f.nozzle.y+Math.sin(angle)*p.reach,v.y)
  assert.equal(f.brush,pass.width)
 }
})
test('solid UI follows the grain on the same path and all reveal values accumulate monotonically',()=>{
 const p=desktop();let previous=sampleSpray(p,0).reveals
 for(let time=1;time<=3000;time++){
  const f=sampleSpray(p,time)
  f.reveals.forEach((r,i)=>{
   assert(r.settled<=r.progress)
   for(const key of ['progress','settled','strength','solid'])assert(r[key]>=previous[i][key])
  });previous=f.reveals
 }
 assert(previous.every(r=>r.progress===1&&r.settled===1&&r.solid===1))
})
test('diagonal rows alternate direction, overlap and progress from top to bottom without becoming a downward wipe',()=>{
 const p=desktop();p.passes=p.passes.filter(pass=>pass.gesture==='row');assert(p.passes.length>4)
 for(let i=0;i<p.passes.length;i++){
  const pass=p.passes[i],a=pass.path.points[0],b=pass.path.points.at(-1)
  assert.equal(pass.gesture,'row');assert.equal(pass.path.points.length,2)
  assert(Math.abs(b.x-a.x)>p.width*.9);assert(Math.abs(b.y-a.y)>p.height*.2)
  assert((b.y-a.y)/(b.x-a.x)<0);assert.equal(b.x>a.x,i%2===0)
  assert(pass.width<p.height*.35);assert(pass.start<pass.end)
  if(i){
   const previous=p.passes[i-1],rise=sampleSprayPath(pass.path,.5).y-sampleSprayPath(previous.path,.5).y
   assert(rise>0&&rise<pass.width);assert(pass.start>previous.end)
  }
 }
 assert.equal(p.passes[0].start,1200);assert.equal(p.passes.at(-1).end,2800)
})

test('left, center and right each reveal over the moving rows before the veil fade',()=>{
 const p=desktop()
 const times=[{x:50,y:750},{x:824,y:500},{x:1598,y:750}].map(point=>{
  assert(!revealed(p,1000,point));let t=1100
  while(t<=2850&&!revealed(p,t,point))t+=10
  assert(t<2850);assert(revealed(p,2880,point));return t
 })
 assert(new Set(times).size>1)
})
test('all viewport edges and side panels settle completely before final fade',()=>{
 for(const [width,height,nav] of [[1648,928,[{x:0,y:0,width:1648,height:64}]],[390,844,[{x:0,y:0,width:390,height:64}]],[320,640,[]],[2560,1080,[{x:0,y:0,width:2560,height:64}]],[1024,1366,[]]]){
  const p=createSprayPlan(width,height,nav)
  assert.equal(sampleSpray(p,2850).veil,1)
  for(let y=0;y<=height;y+=13)for(let x=0;x<=width;x+=19)assert(revealed(p,2850,{x,y}),`unpainted ${width}x${height} at ${x},${y}`)
  for(const x of [0,width])for(const y of [0,height])assert(revealed(p,2850,{x,y}),`unpainted corner ${x},${y}`)
 }
})
test('no independent media pass: header media and floating players use the same spatial rows as nearby UI',()=>{
 const p=desktop();assert.equal(p.passes[0].gesture,'navigation');assert(p.passes.slice(1).every(pass=>pass.gesture==='row'))
 for(const point of [{x:1200,y:30},{x:1450,y:800}]){
  assert(!revealed(p,400,point));assert(revealed(p,2850,point))
 }
 assert.equal('player' in p,false)
})

test('mobile rows span the narrow viewport and each stroke intersects the visible screen',()=>{
 const p=mobile()
 for(const pass of p.passes.filter(pass=>pass.gesture==='row')){
  const ys=pass.path.points.map(point=>point.y)
  assert(Math.min(...ys)-pass.width/2<p.height);assert(Math.max(...ys)+pass.width/2>0)
  assert(pass.path.points.every(point=>point.x>=0&&point.x<=p.width&&Number.isFinite(point.y)))
  const frame=sampleSpray(p,(pass.start+pass.end)/2)
  assert.equal(frame.stage,'content');assert(frame.impact.x>=0&&frame.impact.x<=p.width)
 }
})

test('final diagonal row and speed-based trail disappear by the end',()=>{
 const p=desktop(),last=p.passes.at(-1),f=sampleSpray(p,(last.start+last.end)/2)
 assert.equal(f.stage,'content');assert(f.brush>0);assert.equal(f.tag,0);assert.equal(sampleSpray(p,840).stencil,1)
 const end=sampleSpray(p,3000)
 assert.equal(end.tag,0);assert.equal(end.stencil,0);assert.equal(end.opacity,0);assert.equal(end.brush,0);assert.equal(end.veil,0)
 const row=p.passes.find(pass=>pass.gesture==='row'),fast=sampleSpray(p,(row.start+row.end)/2);assert(fast.speed>0);assert.notDeepEqual(fast.impact,fast.trail)
})
test('visible measurement handles hidden navigation without consulting player readiness',()=>{
 assert.deepEqual(visibleSprayRect({x:-10,y:-30,width:100,height:90},390,844),{x:0,y:0,width:90,height:60})
 assert.equal(visibleSprayRect({x:400,y:200,width:20,height:20},390,844),null)
 assert.deepEqual(createSprayPlan(390,844,[{x:0,y:-100,width:390,height:64}]).passes,mobile().passes)
})
test('reverse retraces the accumulated grain and solid masks on the same timeline',()=>{
 const p=desktop()
 for(const t of [0,180,700,1250,1780,3000]){
  const a=sampleSpray(p,t,true),b=sampleSpray(p,3000-t)
  assert.deepEqual(a.reveals,b.reveals);near(a.veil,b.veil);near(a.activeMark,b.activeMark)
 }
 assert(sampleSpray(p,3000,true).reveals.every(r=>r.settled===0));assert.equal(sprayTiming.end,3000)
})
function clock(){let time=0,id=0;const pending=new Map(),cancelled=[];return {now:()=>time,request:fn=>{pending.set(++id,fn);return id},cancel:id=>{cancelled.push(id);pending.delete(id)},advance(next){time=next;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(time))},pending,cancelled}}
test('bounded RAF stops after 3000ms, including throttled tabs and reverse',()=>{
 for(const reverse of [false,true]){
  const c=clock(),frames=[];runSprayTimeline(desktop(),reverse,f=>frames.push(f),c)
  assert.equal(c.pending.size,1);c.advance(4000);assert.equal(c.pending.size,0)
  const count=frames.length;c.advance(5000);assert.equal(frames.length,count)
 }
})
test('cleanup cancels one frame and ignores queued stale callbacks',()=>{
 const c=clock(),frames=[];const stop=runSprayTimeline(desktop(),false,f=>frames.push(f),c)
 const stale=[...c.pending.values()][0];stop();stop();const count=frames.length;stale(1000)
 assert.equal(frames.length,count);assert.equal(c.pending.size,0);assert.equal(c.cancelled.length,1)
})
test('single shared veil uses bounded stroke layers, no component clips or media readiness gate',async()=>{
 const source=await readFile(new URL('../src/components/SprayReveal.tsx',import.meta.url),'utf8')
 assert.doesNotMatch(source,/<clipPath|<Regions|playerClip|plan\.player|ready|onLoad|iframe|Math\.random/)
 assert.match(source,/\.site-header,\.show-navigation/)
 assert.match(source,/now: \(\) => startedAt\.current/)
 assert.match(source,/if \(!moving\) \{ setPlan\(null\); return \}/)
})

test('posters finish before the stencil; spray starts exactly when the stencil finishes fading',()=>{
 const p=desktop()
 for(const time of [0,100,240,400,599,600]){assert.equal(sampleSpray(p,time).stencil,0);assert.equal(sampleSpray(p,time).stencilProgress,0)}
 const middle=sampleSpray(p,700);assert(middle.stencil>0&&middle.stencil<1);assert(middle.stencilProgress>0&&middle.stencilProgress<1)
 assert.equal(sampleSpray(p,840).stencil,1);assert.equal(sampleSpray(p,840).stencilProgress,1)
 assert.equal(sampleSpray(p,1050).stencil,0)
 assert.equal(sprayTiming.posterExit,600);assert.equal(p.passes[0].start,sprayTiming.stencilEnd)
 for(const t of [0,599,600,840,900,1049])assert(sampleSpray(p,t).reveals.every(r=>r.progress===0))
 assert(sampleSpray(p,1051).reveals[0].progress>0)
})