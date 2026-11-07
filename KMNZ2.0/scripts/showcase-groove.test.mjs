import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {createShowcaseGroove,grooveFrames,showcaseGrooveTiming,showcaseGrooveDuration}=await loadTypeScript(new URL('../src/lib/showcaseGroove.ts',import.meta.url))
function fixture(){let time=0,id=0;const jobs=new Map(),created=[];const elements=['logo','yellow','black','white','label','paper'].map((channel,index)=>({dataset:{groove:channel,grooveIndex:String(index)},animate(frames,options){const animation={currentTime:null,paused:false,cancelled:false,pause(){this.paused=true},cancel(){this.cancelled=true}};created.push({channel,frames,options,animation});return animation}}));const root={dataset:{},querySelectorAll(){return elements}},audio={paused:true,volume:.25,currentTime:0,ended:false},clock={now:()=>time,request:fn=>{jobs.set(++id,fn);return id},cancel:id=>jobs.delete(id)};return{root,audio,jobs,created,groove:createShowcaseGroove(root,audio,clock),tick(next){time=next;const work=[...jobs.values()];jobs.clear();work.forEach(fn=>fn(next))}}}
test('audio clock is authoritative across seek, loop, delayed frames and resume; silent motion is weak',()=>{
 const f=fixture();f.groove.context(true,false,false);assert.equal(f.root.dataset.grooveMode,'silent');assert.equal(f.jobs.size,1)
 f.audio.paused=false;f.audio.currentTime=12.06;f.tick(8000);assert.equal(f.root.dataset.grooveMode,'audio');assert.equal(f.created.at(-1).animation.currentTime,12000)
 f.audio.currentTime=.08;f.tick(60000);assert(Math.abs(f.created.at(-1).animation.currentTime-20)<1e-9)
 f.audio.paused=true;f.tick(60100);assert.equal(f.root.dataset.grooveMode,'silent');assert(f.created.filter(x=>x.animation.cancelled).length>0)
 f.groove.dispose();assert.equal(f.jobs.size,0)
})
test('hidden, reduced-motion and unmounted scenes stop all callbacks; stale frames cannot restart them',()=>{
 const f=fixture();f.groove.context(true,false,false);const stale=[...f.jobs.values()][0];f.groove.context(false,false,false);assert.equal(f.jobs.size,0);assert.equal(f.root.dataset.grooveMode,'still');stale(1000);assert.equal(f.jobs.size,0)
 f.groove.context(true,true,false);assert.equal(f.jobs.size,0);f.groove.context(true,false,true);assert.equal(f.jobs.size,1);f.groove.dispose();f.groove.context(true,false,false);assert.equal(f.jobs.size,0)
})
test('94 BPM choreography leaves rests, separates channel accents and bounds each short attack',()=>{
 assert.equal(showcaseGrooveTiming.bpm,94);assert.equal(showcaseGrooveTiming.beatOffset,.06);assert.equal(showcaseGrooveDuration,8*60000/94)
 const channels=['logo','yellow','black','white','label','paper'];const scores=channels.map((channel,index)=>grooveFrames(channel,index))
 for(const frames of scores){let prior=-1;for(const frame of frames){assert(frame.offset>=prior&&frame.offset<=1);assert(!String(frame.transform).includes('NaN'));prior=frame.offset}assert.equal(frames[0].transform,frames.at(-1).transform)}
 assert.notDeepEqual(scores[1],scores[2]);assert.notDeepEqual(scores[2],scores[3]);assert.equal(grooveFrames('paper',0,.24,true).length,2)
 assert(scores[0].filter(frame=>String(frame.transform).includes('scale(1.028)')).length===4)
})
