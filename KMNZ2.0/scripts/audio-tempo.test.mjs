import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {createTempoDetector,tempoRotationSpeed,smoothRotationSpeed,defaultRotationSpeed,rotationDegreesPerBeat}=await loadTypeScript(new URL('../src/lib/audioTempo.ts',import.meta.url))

function pulse(time,bpm,gain=1){
 const phase=(time%(60000/bpm))/(60000/bpm)
 return gain*(.02+.35*Math.exp(-phase*10))
}
function feed(detector,bpm,{start=0,duration=14000,frame=1000/60,gain=1}={}){
 let result=null
 for(let t=start;t<start+duration;t+=frame){const rms=pulse(t-start,bpm,gain);result=detector.update(t,rms,Math.min(1,rms*2),true)}
 return result
}

test('estimates multiple tempos across normal and irregular rendering rates',()=>{
 for(const bpm of [75,90,100,120,140,150,170]){
  for(const frame of [1000/60,1000/30]){
   const actual=feed(createTempoDetector(),bpm,{frame})
   assert(actual!==null,`no estimate for ${bpm} at ${frame}`)
   assert(Math.abs(actual-bpm)/bpm<.035,`${actual} differs from ${bpm}`)
  }
 }
 const detector=createTempoDetector();let actual
 for(let t=0,i=0;t<14000;t+=[12,25,18,32][i++%4]){const level=pulse(t,110);actual=detector.update(t,level,level*2,true)}
 assert(Math.abs(actual-110)/110<.035)
})

test('volume does not determine BPM and stable tones or irregular noise are not a tempo',()=>{
 for(const gain of [.1,.5,1])assert(Math.abs(feed(createTempoDetector(),120,{gain})-120)<3)
 for(const rms of [0,.03,.6]){
  const detector=createTempoDetector();let result
  for(let t=0;t<15000;t+=20)result=detector.update(t,rms,.4,true)
  assert.equal(result,null)
 }
 const detector=createTempoDetector();let result,seed=17
 for(let t=0;t<15000;t+=20){seed=(seed*1664525+1013904223)>>>0;result=detector.update(t,.03+seed/2**32*.4,.2,true)}
 assert.equal(result,null)
})

test('requires a stable window, adapts to changed tempo and discards stale estimates after pause or sampling gaps',()=>{
 const detector=createTempoDetector()
 assert.equal(feed(detector,120,{duration:1500}),null)
 assert(Math.abs(feed(detector,90,{start:3000})-90)<3)
 assert(Math.abs(feed(detector,150,{start:17000})-150)<4)
 assert.equal(detector.update(31000,0,0,false),null)
 assert.equal(detector.update(31020,.3,.4,true),null)
 assert(Math.abs(feed(detector,120,{start:31040})-120)<3)
 assert.equal(detector.update(60000,.4,.4,true),null)
 assert.equal(detector.update(60020,NaN,.4,true),null)
 assert.equal(detector.update(60040,.4,Infinity,true),null)
 assert.equal(detector.update(100,.4,.4,true),null)
})

test('silence or a sustained tone after a beat releases the old estimate',()=>{
 for(const rms of [0,.3]){
  const detector=createTempoDetector();assert(feed(detector,120)!==null)
  let result
  for(let t=14000;t<18000;t+=20)result=detector.update(t,rms,.2,true)
  assert.equal(result,null)
 }
})

test('rotation follows BPM with bounded easing and falls back to the existing default',()=>{
 assert.equal(tempoRotationSpeed(90),1.5*rotationDegreesPerBeat)
 assert.equal(tempoRotationSpeed(120),2*rotationDegreesPerBeat)
 assert.equal(tempoRotationSpeed(150),2.5*rotationDegreesPerBeat)
 for(const bpm of [null,NaN,Infinity,0,20,240])assert.equal(tempoRotationSpeed(bpm),defaultRotationSpeed)
 const target=tempoRotationSpeed(180)
 let speed=defaultRotationSpeed
 for(let i=0;i<120;i++){const next=smoothRotationSpeed(speed,target,1000/60);assert(next>=speed&&next<target);speed=next}
 assert(speed>target*.95)
 assert.equal(smoothRotationSpeed(speed,target,-1),speed)
 assert.equal(smoothRotationSpeed(speed,target,5000),smoothRotationSpeed(speed,target,50))
 const normal=smoothRotationSpeed(speed,defaultRotationSpeed,50)
 assert(normal<speed&&normal>defaultRotationSpeed)
})

test('reports the first stable beat within 3.5 seconds and tolerates quiet gaps between beats',()=>{
 for(const bpm of [90,120,150]){
  const detector=createTempoDetector();let first=null,result=null
  for(let t=0;t<10000;t+=1000/60){
   const phase=t%(60000/bpm),rms=phase<100?.2*Math.exp(-phase/30):0
   result=detector.update(t,rms,0,true)
   if(result!==null&&first===null)first=t
  }
  assert(first!==null&&first<3500, `late acquisition for ${bpm}: ${first}`)
  assert(Math.abs(result-bpm)<4)
 }
})

test('spectral onsets reveal beats underneath constant overall loudness',()=>{
 const detector=createTempoDetector(),spectrum=new Uint8Array(1024)
 let result=null
 for(let t=0;t<12000;t+=1000/60){
  const phase=t%500
  spectrum.fill(130)
  for(let bin=2;bin<9;bin++)spectrum[bin]=100+Math.round(100*Math.exp(-phase/55))
  result=detector.update(t,.3,.5,true,spectrum,48000)
 }
 assert(result!==null);assert(Math.abs(result-120)<3)
})
