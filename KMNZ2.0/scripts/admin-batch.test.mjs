import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, dirname, resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import ts from 'typescript'
import { detectTitleMembers, artistFromMembers, initialReview, applyBatchSettings, parseLinkRows } from '../admin/batch.mjs'
import { pairingRows, pairAvailableBindings, prepareBatch, createAdmin, collectVideos, dataPaths, loadSnapshot, sourceIdFor } from '../admin/server.mjs'

const id1='MehG9Ms8ygU',id2='AbCdEfGhI12',id3='XyZabcdef12'
const bv1='BV1GJ411x7h7',bv2='BV1xx411c7mD',bv3='BV17x411w7KC'
const url=id=>'https://www.youtube.com/watch?v='+id,bili=id=>'https://www.bilibili.com/video/'+id
const date='2026-10-12T04:08:15Z',now='2026-11-02T00:00:00Z'
const raw=id=>({videoId:id,apiTitle:'【雑談】余談【#KMNZTINA】',publishedAt:date,duration:'PT54M18S',verifiedAt:now,channelId:'UC-fixture',channelTitle:'KMNZ TINA'})
const apiVideo=id=>({id,snippet:{title:'【雑談】余談【#KMNZTINA】',publishedAt:date,channelId:'UC-fixture',channelTitle:'KMNZ TINA'},contentDetails:{duration:'PT54M18S'},status:{embeddable:true,privacyStatus:'public'}})
const base=()=>({songs:[{id:'song-existing',title:'Known song',artist:'Confirmed artist',version:{kind:'unspecified'}}],releases:[],sources:[{id:'yt-existing',platform:'youtube',kind:'mv',platformId:id1,externalUrl:url(id1),display:{subtitle:'Original · KMNZ',year:2025,era:'new'},target:{type:'song',songId:'song-existing'}}],automatic:{},manual:{}})
const html=await readFile(new URL('../admin/index.html',import.meta.url),'utf8')

test('title recognition uses explicit KMNZ/member markers, supports case and width variations, and leaves unknown titles unassigned',()=>{
  for(const title of ['【雑談】余談【#KMNZTINA】','【3D | 歌枠】なんとびっくりあれから5億年【#KMNZTINA】','KMNZ TINA live','＃ＫＭＮＺＴＩＮＡ','【tina】'])assert.deepEqual(detectTitleMembers(title),['TINA'])
  assert.deepEqual(detectTitleMembers('【歌枠】#KMNZLITA'),['LITA'])
  assert.deepEqual(detectTitleMembers('【歌枠】KMNZ NERO'),['NERO'])
  assert.deepEqual(detectTitleMembers('#KMNZLITA × #KMNZTINA'),['LITA','TINA'])
  for(const title of ['雑談','TINA Turner cover','TINAMITE','KMNZTINAX','undefined',null])assert.deepEqual(detectTitleMembers(title),[])
  assert.deepEqual(detectTitleMembers('#KMNZLIZ'),[])
  assert.deepEqual(detectTitleMembers('#KMNZLIZ','cover'),['LIZ'])
})

test('batch defaults assign Stream/new and fallback members, while disabling title matching allows a uniform manual batch',()=>{
  const settings={era:'new',contentType:'stream',members:['TINA'],autoMembers:true}
  const detected=initialReview({...raw(id2),apiTitle:'#KMNZNERO'},settings)
  assert.equal(detected.songId,'');assert.equal(detected.contentType,'stream');assert.equal(detected.era,'new')
  assert.deepEqual(detected.members,['NERO']);assert.equal(detected.memberMode,'title');assert.equal(detected.artist,'KMNZ NERO')
  const unknown=initialReview({...raw(id2),apiTitle:'雑談'},settings)
  assert.deepEqual(unknown.members,['TINA']);assert.equal(unknown.memberMode,'batch')
  assert.deepEqual(initialReview({...raw(id2),apiTitle:'#KMNZNERO'},{...settings,autoMembers:false}).members,['TINA'])
  const manual={...detected,members:['LITA'],memberMode:'manual',songId:'song-existing'}
  const applied=applyBatchSettings(manual,{...settings,autoMembers:false})
  assert.equal(applied.songId,'song-existing');assert.deepEqual(applied.members,['TINA'])
  assert.deepEqual(initialReview({...raw(id2),apiTitle:'雑談'}).members,[])
})

test('artist is derived without a text field, full KMNZ lineups use the group name, and existing linked songs keep their credit',()=>{
  assert.equal(artistFromMembers(['TINA']),'KMNZ TINA')
  assert.equal(artistFromMembers(['LITA','LIZ']),'KMNZ')
  assert.equal(artistFromMembers(['LITA','TINA','NERO']),'KMNZ')
  assert.equal(artistFromMembers(['LITA','NERO']),'KMNZ LITA, KMNZ NERO')
  const review=initialReview(raw(id2)),data=base();delete review.artist
  const result=prepareBatch(data,[raw(id2)],[review],[])
  assert.equal(result.data.songs.at(-1).artist,'KMNZ TINA')
  assert.equal(result.review.items[0].publishedAt,date);assert.equal(result.review.items[0].date,'2026.10.12')
  const linked=prepareBatch(data,[raw(id2)],[{...review,songId:'song-existing'}],[])
  assert.equal(linked.data.songs.length,1);assert.equal(linked.review.items[0].artist,'Confirmed artist')
  assert(!html.includes("['artist','艺人署名']"));assert(html.includes('关联已有歌曲（可选）'))
})

test('input pairing keeps exact original rows, including aligned blank rows; incomplete rows and conflicting duplicates are blocked',()=>{
  const rows=pairingRows(url(id1)+'\r\n\r\n'+url(id2)+'\r\n',bili(bv1)+'\r\n\r\n'+bili(bv2)+'\r\n')
  assert.deepEqual(rows.map(row=>[row.line,row.videoId,row.link.bv]),[[1,id1,bv1],[3,id2,bv2]])
  assert.throws(()=>pairingRows(url(id1)+'\n'+url(id2),bili(bv1)),/行数不同/)
  assert.throws(()=>pairingRows(url(id1)+'\n\n'+url(id2),bili(bv1)+'\n'+bili(bv2)+'\n'+bili(bv3)),/第 2 行/)
  assert.throws(()=>pairingRows(url(id1)+'\n'+url(id1),bili(bv1)+'\n'+bili(bv2)),/不同 BV/)
  assert.throws(()=>pairingRows(url(id1)+'\n'+url(id2),bili(bv1)+'\n'+bili(bv1)),/不同 YouTube/)
  assert.throws(()=>pairingRows('https://evil.example/video',bili(bv1)),/第 1 行/)
  assert.equal(parseLinkRows(url(id2),'')[0].bilibili,null)
})

test('existing and unavailable videos never shift later BV links onto another source; retrying identical pairs is idempotent',()=>{
  const data=base(),before=structuredClone(data)
  const rows=pairingRows([id1,id2,id3].map(url).join('\n'),[bv1,bv2,bv3].map(bili).join('\n'))
  const result=pairAvailableBindings(rows,data,[raw(id3)])
  assert.deepEqual(result.bindings,[{sourceId:'yt-existing',url:bili(bv1)},{sourceId:sourceIdFor(id3),url:bili(bv3)}])
  assert.equal(result.notices.length,1);assert.equal(result.notices[0].videoId,id2)
  assert.deepEqual(pairAvailableBindings(rows,data,[raw(id3)],result.bindings).bindings,result.bindings)
  assert.deepEqual(data,before)
  assert.throws(()=>pairAvailableBindings(rows,data,[raw(id3)],[{sourceId:'yt-existing',url:bili(bv2)}]),/不同 BV/)
  data.sources[0].bilibiliUrl=bili(bv3)
  assert.throws(()=>pairAvailableBindings(rows,data,[raw(id3)]),/已有不同 BV|其他来源/)
})

async function fixture(t,request){
  const temp=await mkdtemp(join(tmpdir(),'kmnz-admin-batch-test-'))
  const root=join(temp,'repo/KMNZ2.0'),storeDir=join(temp,'state'),data=base()
  const values=[data.songs,data.releases,data.sources,data.automatic,data.manual]
  for(let i=0;i<dataPaths.length;i++){await mkdir(dirname(join(root,dataPaths[i])),{recursive:true});await writeFile(join(root,dataPaths[i]),JSON.stringify(values[i],null,2)+'\n')}
  await mkdir(join(root,'admin'));await writeFile(join(root,'admin/index.html'),html)
  const runner=async(cmd,args)=>{if(cmd==='gh')throw Error('fixture unavailable');if(args.includes('user.name'))return 'Tester';if(args.includes('user.email'))return 'tester@example.invalid';return 'git fixture'}
  const collect=(input,data,prior)=>collectVideos(input,data,prior,{apiKey:'fixture-secret',request})
  const app=await createAdmin({root,storeDir,port:0,apiKey:'fixture-secret',runner,collect})
  t.after(async()=>{await app.close();assert.equal(dirname(temp),resolve(tmpdir()));assert(basename(temp).startsWith('kmnz-admin-batch-test-'));await rm(temp,{recursive:true,force:true})})
  const post=async(path,body)=>{const response=await fetch(app.origin+'/api/'+path,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json','X-KMNZ-Token':app.csrf},body:JSON.stringify(body)});return {status:response.status,body:await response.json()}}
  return {app,root,storeDir,post}
}

test('HTTP batch import preserves row pairing across deduplication and API order, persists automatic members, and previews real website dates',async t=>{
  let requested=[]
  const f=await fixture(t,async(method,params)=>{requested=params.id.split(',');return {items:requested.toReversed().map(apiVideo)}})
  const original=await loadSnapshot(f.root)
  const result=await f.post('youtube',{input:[id1,id2,id3].map(url).join('\n'),bilibiliInput:[bv1,bv2,bv3].map(bili).join('\n'),settings:{era:'new',contentType:'stream',members:['LITA'],autoMembers:true}})
  assert.equal(result.status,200);assert.deepEqual(requested,[id2,id3])
  assert.equal(result.body.batch.reviews.length,2)
  for(const review of result.body.batch.reviews){assert.deepEqual(review.members,['TINA']);assert.equal(review.artist,'KMNZ TINA');assert.equal(review.songId,'')}
  assert.deepEqual(result.body.batch.bindings,[{sourceId:'yt-existing',url:bili(bv1)},{sourceId:sourceIdFor(id2),url:bili(bv2)},{sourceId:sourceIdFor(id3),url:bili(bv3)}])
  const preview=await f.post('preview',{reviews:result.body.batch.reviews,bindings:result.body.batch.bindings,settings:result.body.batch.defaults})
  assert.equal(preview.status,200);assert.equal(preview.body.review.items.length,2)
  assert(preview.body.review.items.every(item=>item.date==='2026.10.12'&&item.publishedAt===date))
  assert.equal((await loadSnapshot(f.root)).fingerprint,original.fingerprint)
  const saved=JSON.parse(await readFile(join(f.storeDir,'active.json'),'utf8'))
  assert.deepEqual(saved.bindings,result.body.batch.bindings);assert(!JSON.stringify(saved).includes('fixture-secret'))
  const helper=await fetch(f.app.origin+'/batch.mjs');assert.equal(helper.status,200);assert((await helper.text()).includes('detectTitleMembers'))
  const page=await (await fetch(f.app.origin)).text();assert(page.includes('type="module"'))
  const code=await (await fetch(f.app.origin+'/app.js')).text();new Function(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)
})

test('invalid rows fail before API access and API errors preserve the previous draft and pairing',async t=>{
  let calls=0,fail=false
  const f=await fixture(t,async()=>{calls++;if(fail)throw Error('fixture-secret');return {items:[apiVideo(id2)]}})
  const invalid=await f.post('youtube',{input:url(id2)+'\n'+url(id3),bilibiliInput:bili(bv2)})
  assert.equal(invalid.status,400);assert.equal(calls,0);assert.equal(f.app.batch.videos.length,0)
  const ok=await f.post('youtube',{input:url(id2),bilibiliInput:bili(bv2)})
  assert.equal(ok.status,200)
  const before=structuredClone(f.app.batch);fail=true
  const failed=await f.post('youtube',{input:url(id3),bilibiliInput:bili(bv3)})
  assert.equal(failed.status,400);assert.deepEqual(f.app.batch,before);assert(!JSON.stringify(failed.body).includes('fixture-secret'))
})

test('adding another batch segment preserves existing manual choices and only applies title recognition to new rows',async t=>{
  const f=await fixture(t,async(method,params)=>({items:params.id.split(',').map(apiVideo)}))
  const first=await f.post('youtube',{input:url(id2),bilibiliInput:bili(bv2)})
  const manual={...first.body.batch.reviews[0],members:['LITA'],memberMode:'manual',artist:'KMNZ LITA',title:'Custom title'}
  const next=await f.post('youtube',{input:url(id3),bilibiliInput:bili(bv3),reviews:[manual],bindings:first.body.batch.bindings,settings:{members:['NERO'],contentType:'stream',era:'new'}})
  assert.equal(next.status,200);assert.deepEqual(next.body.batch.reviews[0],manual)
  assert.deepEqual(next.body.batch.reviews[1].members,['TINA']);assert.equal(next.body.batch.bindings.length,2)
})
