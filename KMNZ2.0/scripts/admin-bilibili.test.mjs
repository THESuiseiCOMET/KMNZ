import test from 'node:test'
import assert from 'node:assert/strict'
import {createBilibiliTitleLookup} from '../admin/bilibili.mjs'
const bvs=['BV15JWA68EmF','BV1khpe6bEYd','BV1GJ411x7h7','BV1ThHF6BES4','BV1xx411c7mD','BV17x411w7KC']
const response=(bv,title='Bilibili '+bv)=>new Response(JSON.stringify({code:0,data:{bvid:bv,title}}))
test('Bilibili lookup uses only fixed official endpoint, preserves BV identity, deduplicates and limits parallel requests',async()=>{
 let active=0,max=0,requests=0
 const lookup=createBilibiliTitleLookup({fetcher:async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.origin,'https://api.bilibili.com');assert.equal(parsed.pathname,'/x/web-interface/view');assert.equal(options.redirect,'error')
  requests++;active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--
  return response(parsed.searchParams.get('bvid'))
 }})
 const results=await lookup([...bvs,bvs[0]])
 assert.deepEqual(results.map(item=>item.bv),bvs);assert.equal(requests,6);assert(max<=4&&max>1)
 for(const item of results){assert.equal(item.status,'ok');assert.equal(item.title,'Bilibili '+item.bv)}
 await lookup(bvs);assert.equal(requests,6)
 await lookup([bvs[0]],{refresh:true});assert.equal(requests,7)
 await assert.rejects(lookup(['https://evil.example/']),/无效/);assert.equal(requests,7)
})
test('unavailable, wrong-BV, malformed and failed responses never get mistaken for a title',async()=>{
 for(const fetcher of [async()=>new Response('{}',{status:403}),async()=>new Response('not json'),async()=>new Response(JSON.stringify({code:-404})),async()=>response(bvs[1]),async()=>response(bvs[0],' '),async()=>{throw Error('private diagnostic')}]){
  const [item]=await createBilibiliTitleLookup({fetcher})([bvs[0]])
  assert.equal(item.bv,bvs[0]);assert.equal(item.title,null);assert.notEqual(item.status,'ok');assert(!JSON.stringify(item).includes('private diagnostic'))
 }
})
test('title requests time out without blocking the draft and can be retried',async()=>{
 let fail=true
 const lookup=createBilibiliTitleLookup({timeout:10,fetcher:async()=>fail?new Promise(()=>{}):response(bvs[0])})
 assert.equal((await lookup([bvs[0]]))[0].status,'error');fail=false
 assert.equal((await lookup([bvs[0]],{refresh:true}))[0].status,'ok')
})
test('concurrent requests for the same BV share one fetch and cached titles expire',async()=>{
 let requests=0,clock=0
 const lookup=createBilibiliTitleLookup({now:()=>clock,fetcher:async()=>{requests++;await new Promise(resolve=>setTimeout(resolve,2));return response(bvs[0],'<b>literal title</b>')}})
 const [first,second]=await Promise.all([lookup([bvs[0]]),lookup([bvs[0]])])
 assert.equal(requests,1);assert.deepEqual(first,second);assert.equal(first[0].title,'<b>literal title</b>')
 clock=600001;await lookup([bvs[0]]);assert.equal(requests,2)
})
