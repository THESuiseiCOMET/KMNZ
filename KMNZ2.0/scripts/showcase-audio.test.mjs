import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {createShowcaseAudio}=await loadTypeScript(new URL('../src/lib/showcaseAudio.ts',import.meta.url))
function fixture(){let time=0,id=0;const jobs=new Map(),states=[];const audio={paused:true,volume:1,loop:false,currentTime:0,plays:0,fail:false,async play(){this.plays++;if(this.fail)throw Error('autoplay');this.paused=false},pause(){this.paused=true}};const clock={now:()=>time,request:fn=>{jobs.set(++id,fn);return id},cancel:id=>jobs.delete(id)};const player=createShowcaseAudio(audio,clock,(...v)=>states.push(v));return{audio,player,jobs,states,tick(t){time=t;const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn(t))}}}
test('showcase audio waits for opt-in, loops quietly, and fades over 500ms when entering console',async()=>{const f=fixture();f.player.context(true,false);assert.equal(f.audio.plays,0);assert.equal(f.player.toggle(),true);await Promise.resolve();assert.equal(f.audio.volume,.25);assert.equal(f.audio.loop,true);f.player.context(false,false);f.tick(250);assert.equal(f.audio.volume,.125);assert.equal(f.audio.paused,false);f.tick(500);assert.equal(f.audio.paused,true);assert.equal(f.jobs.size,0)})
test('rapid returns cancel an obsolete fade; other media blocks resume and disposal cleans callbacks',async()=>{const f=fixture();f.player.context(true,false);f.player.toggle();await Promise.resolve();f.player.context(false,false);f.tick(200);f.player.context(true,false);await Promise.resolve();assert.equal(f.jobs.size,0);assert.equal(f.audio.volume,.25);assert.equal(f.audio.paused,false);f.player.context(true,true);assert.equal(f.audio.paused,true);const plays=f.audio.plays;f.player.retry();assert.equal(f.audio.plays,plays);f.player.context(false,false);f.player.dispose();assert.equal(f.jobs.size,0);assert.equal(f.audio.paused,true)})
test('blocked autoplay preserves preference and requires a successful later click',async()=>{const f=fixture();f.player.restore(true);f.audio.fail=true;f.player.context(true,false);await Promise.resolve();await Promise.resolve();assert.deepEqual(f.states.at(-1),[false,true]);f.audio.fail=false;f.player.retry();await Promise.resolve();assert.equal(f.audio.paused,false);f.player.dispose()})


test('pending play requests are shared instead of creating duplicate starts in effect replay',async()=>{
 const f=fixture();let finish;f.audio.play=function(){this.plays++;return new Promise(resolve=>{finish=()=>{this.paused=false;resolve()}})}
 f.player.restore(true);f.player.context(true,false);f.player.context(true,false);f.player.retry();assert.equal(f.audio.plays,1)
 f.player.dispose();finish();await Promise.resolve();await Promise.resolve();assert.equal(f.audio.paused,true);assert.equal(f.jobs.size,0)
})
