import test from 'node:test'
import {runInNewContext} from 'node:vm'
import assert from 'node:assert/strict'
import { readFile,writeFile,mkdir,mkdtemp,readdir,rm } from 'node:fs/promises'
import { join,dirname,resolve,basename } from 'node:path'
import { tmpdir } from 'node:os'
import { prepareBatch,prepareSourceEdits,createAdmin,startAdmin,collectVideos,loadSnapshot,dataPaths,sourceIdFor,AdminError } from '../admin/server.mjs'
import { replaceLibraryFiles } from '../admin/local-data.mjs'
const ids=['rUYYkFnR_hA','uzofaOfqabA'],freshId='AbCdEfGhI12',bv1='BV15JWA68EmF',bv2='BV1khpe6bEYd',bv3='BV1GJ411x7h7'
const yt=id=>'https://www.youtube.com/watch?v='+id,bv=id=>'https://www.bilibili.com/video/'+id
const stamp='2026-10-12T04:08:15Z',verified='2026-11-02T00:00:00Z'
const base=()=>({songs:ids.map((id,i)=>({id:'song-'+i,title:'Title '+i,artist:'KMNZ TINA',version:{kind:'unspecified'}})),releases:[],sources:ids.map((id,i)=>({id:'source-'+i,platform:'youtube',kind:'mv',platformId:id,externalUrl:yt(id),display:{subtitle:'Stream · KMNZ TINA',era:'new',year:2026},target:{type:'song',songId:'song-'+i},classification:{contentType:'stream',performers:['tina'],evidenceUrls:[yt(id)]},bilibiliUrl:bv(i?bv2:bv1)})),automatic:Object.fromEntries(ids.map((id,i)=>['source-'+i,{platformId:id,publishedAt:{value:stamp,source:'youtube-data-api',status:'verified',verifiedAt:verified,sourceUrl:yt(id)}}])),manual:{}})
const edit=(i,patch={})=>({sourceId:'source-'+i,videoId:ids[i],selected:true,title:'Title '+i,contentType:'stream',era:'new',members:['TINA'],bilibiliUrl:bv(i?bv2:bv1),originalGroup:'',...patch})
const apiVideo=id=>({id,snippet:{title:'【雑談】#KMNZTINA',publishedAt:stamp,channelId:'UC-fixture',channelTitle:'KMNZ TINA'},contentDetails:{duration:'PT54M18S'},status:{privacyStatus:'public',embeddable:true}})
const html=await readFile(new URL('../admin/index.html',import.meta.url),'utf8')
async function writeProject(root,data){for(const [i,value]of[data.songs,data.releases,data.sources,data.automatic,data.manual].entries()){await mkdir(dirname(join(root,dataPaths[i])),{recursive:true});await writeFile(join(root,dataPaths[i]),JSON.stringify(value,null,2)+'\n')}}
async function fixture(t,{bilibiliFetcher}={}){
 const temp=await mkdtemp(join(tmpdir(),'kmnz-admin-local-test-')),root=join(temp,'repo/KMNZ2.0'),storeDir=join(temp,'state'),controls={builds:0,failBuild:false,reachedRemote:false}
 await writeProject(root,base());await mkdir(join(root,'admin'));await writeFile(join(root,'admin/index.html'),html)
 const runner=async(cmd,args,options={})=>{
  if(args.includes('user.name'))return 'Fixture';if(args.includes('user.email'))return 'fixture@example.invalid'
  if(cmd==='gh'&&args.includes('view'))return JSON.stringify({defaultBranchRef:{name:'分支'}})
  if(cmd==='git'&&args[0]==='clone'){await writeProject(join(args.at(-1),'KMNZ2.0'),base());return ''}
  if(cmd==='git'&&args[0]==='rev-parse')return 'c'.repeat(40)
  if(args.includes('ci')){controls.reachedRemote=true;throw new AdminError('fixture reached remote validation; no commit or push')}
  if(args.includes('build')){controls.builds++;if(controls.failBuild)throw new AdminError('fixture build failed');return 'fixture build passed'}
  return 'fixture'
 }
 const collect=(input,data,prior)=>collectVideos(input,data,prior,{apiKey:'fixture',request:async(method,params)=>({items:params.id.split(',').map(apiVideo)})})
 const app=await createAdmin({root,storeDir,runner,collect,apiKey:'fixture',port:0,bilibiliFetcher})
 t.after(async()=>{await app.close();assert.equal(dirname(temp),resolve(tmpdir()));assert(basename(temp).startsWith('kmnz-admin-local-test-'));await rm(temp,{recursive:true,force:true})})
 const post=async(path,body={})=>{const response=await fetch(app.origin+'/api/'+path,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json','X-KMNZ-Token':app.csrf},body:JSON.stringify(body)});return{status:response.status,body:await response.json()}}
 return {app,post,root,storeDir,controls}
}

test('existing item edits preserve IDs, original dates and versions, support atomic BV swaps and guard shared titles',()=>{
 const before=base(),copy=structuredClone(before)
 const plan=prepareBatch(before,[],[],[],[edit(0,{bilibiliUrl:bv(bv2),title:'New title'}),edit(1,{bilibiliUrl:bv(bv1)})])
 assert.deepEqual(before,copy);assert.equal(plan.data.sources[0].bilibiliUrl,bv(bv2));assert.equal(plan.data.sources[1].bilibiliUrl,bv(bv1))
 assert.deepEqual(plan.data.sources.map(source=>source.id),copy.sources.map(source=>source.id));assert.deepEqual(plan.data.automatic,copy.automatic)
 assert.equal(plan.data.songs[0].title,'New title');assert.deepEqual(plan.data.songs[0].version,copy.songs[0].version)
 assert.deepEqual(plan.files.map(file=>file.path),[dataPaths[0],dataPaths[2]])
 assert.throws(()=>prepareSourceEdits(before,[edit(0,{bilibiliUrl:bv(bv2)})]),/其他来源/)
 const shared=base();shared.sources[1].target.songId=shared.sources[0].target.songId
 assert.throws(()=>prepareSourceEdits(shared,[edit(0,{title:'Changed'})]),/同步标题/)
 assert.equal(prepareSourceEdits(shared,[edit(0,{title:'Changed',confirmSharedTitle:true})]).data.songs[0].title,'Changed')
})

test('removing a pending video clears only its review/BV/input row, saves a recovery copy, and leaves the library untouched',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId),bilibiliInput:bv(bv3)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:f.app.batch.bindings})
 assert.equal(preview.status,200)
 const id=f.app.batch.id,result=await f.post('remove',{videoId:freshId,reviews:f.app.batch.reviews,bindings:f.app.batch.bindings,inputRows:f.app.batch.inputRows})
 assert.equal(result.status,200);assert.equal(result.body.batch.videos.length,0);assert.equal(result.body.batch.reviews.length,0);assert.equal(result.body.batch.bindings.length,0)
 assert.equal(result.body.batch.inputRows.youtube,'');assert.equal(result.body.batch.inputRows.bilibili,'');assert.equal(result.body.batch.reviewToken,null)
 assert((await readdir(join(f.storeDir,'batches',id))).some(file=>file.startsWith('before-remove-')))
 assert.equal((await loadSnapshot(f.root)).fingerprint,before.fingerprint)
 const cleared=await f.post('new',{settings:{era:'new',contentType:'stream',members:['TINA']}})
 assert.equal(cleared.status,200);assert.deepEqual(cleared.body.batch.defaults.members,['TINA']);assert.equal(cleared.body.batch.videos.length,0)
 assert(JSON.parse(await readFile(join(f.storeDir,'batches',id,'draft.json'),'utf8')).id===id)
})

test('local apply builds a validated preview, PR uses the pre-apply baseline, and undo restores exact originals while retaining pending rows',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId),bilibiliInput:bv(bv3)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:f.app.batch.bindings})
 assert.equal((await f.post('publish',{confirmed:true,reviewToken:preview.body.reviewToken})).status,400)
 const applied=await f.post('apply',{reviewToken:preview.body.reviewToken})
 assert.equal(applied.status,200);assert.equal(applied.body.batch.local.status,'applied');assert.equal(applied.body.batch.local.previewBuilt,true);assert.equal(f.controls.builds,1)
 const after=await loadSnapshot(f.root);assert(after.data.sources.some(source=>source.platformId===freshId));assert.notEqual(after.fingerprint,before.fingerprint)
 const backup=JSON.parse(await readFile(join(f.storeDir,'batches',f.app.batch.id,'local-change.json'),'utf8'))
 assert.deepEqual(backup.before.raw,before.raw);assert.deepEqual(backup.after.raw,after.raw)
 assert.equal((await f.post('new',{})).status,400)
 const unconfirmed=await f.post('publish',{confirmed:true,reviewToken:preview.body.reviewToken})
 assert.equal(unconfirmed.status,400);assert.equal(f.controls.reachedRemote,false)
 const remote=await f.post('publish',{confirmed:true,localConfirmed:true,reviewToken:preview.body.reviewToken})
 assert.equal(remote.status,400);assert(remote.body.error.includes('fixture reached remote validation'));assert.equal(f.controls.reachedRemote,true)
 const undo=await f.post('undo-local',{})
 assert.equal(undo.status,200);assert.equal(undo.body.batch.local.status,'reverted');assert.equal(undo.body.batch.videos.length,1)
 assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw);assert.equal(undo.body.batch.reviewToken,null)
})

test('existing-source editing needs no YouTube request, can be removed without changing data, and applies only after preview',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 const added=await f.post('edit-source',{sourceId:'source-0'})
 assert.equal(added.status,200);assert.equal(added.body.batch.edits.length,1)
 assert.equal((await loadSnapshot(f.root)).fingerprint,before.fingerprint)
 const row={...added.body.batch.edits[0],title:'Edited local title',bilibiliUrl:''}
 const preview=await f.post('preview',{reviews:[],bindings:[],edits:[row]})
 assert.equal(preview.status,200);assert.equal(preview.body.review.edits[0].title,'Edited local title')
 assert.equal((await f.post('apply',{reviewToken:preview.body.reviewToken})).status,200)
 const after=await loadSnapshot(f.root);assert.equal(after.data.songs[0].title,'Edited local title');assert.equal(after.data.sources[0].bilibiliUrl,undefined)
 assert.deepEqual(after.data.automatic,before.data.automatic)
 assert.equal((await f.post('undo-local',{})).status,200)
 const removed=await f.post('remove',{sourceId:'source-0',edits:[row],reviews:[],bindings:[]})
 assert.equal(removed.status,200);assert.equal(removed.body.batch.edits.length,0);assert.equal((await loadSnapshot(f.root)).fingerprint,before.fingerprint)
})

test('failed local build keeps backups and applied changes for retry; undo refuses unrelated later edits',async t=>{
 const f=await fixture(t)
 await f.post('youtube',{input:yt(freshId)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 f.controls.failBuild=true
 const failed=await f.post('apply',{reviewToken:preview.body.reviewToken})
 assert.equal(failed.status,400);assert.equal(f.app.batch.local.status,'applied');assert.equal(f.app.batch.local.previewBuilt,false)
 assert((await loadSnapshot(f.root)).data.sources.some(source=>source.platformId===freshId))
 f.controls.failBuild=false;assert.equal((await f.post('local-build',{})).status,200);assert.equal(f.app.batch.local.previewBuilt,true)
 const data=(await loadSnapshot(f.root)).data;data.songs[0].title='Other local edit';await writeProject(f.root,data)
 const declined=await f.post('undo-local',{});assert.notEqual(declined.status,200)
 assert.equal((await loadSnapshot(f.root)).data.songs[0].title,'Other local edit')
})

test('a partial write failure rolls back already written files and never overwrites an unrelated file',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root),target=[...before.raw]
 target[0]=target[0].replace('Title 0','Changed title');target[2]=target[2].replace('Stream · KMNZ TINA','Stream · KMNZ LITA')
 let writes=0
 await assert.rejects(replaceLibraryFiles(f.root,dataPaths,before.raw,target,{write:async(file,content)=>{writes++;if(writes===2)throw Error('fixture disk failure');await writeFile(file,content)}}),/fixture disk failure/)
 assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw)
})

test('applied local changes survive restarting Admin and can still be safely restored from the saved baseline',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 assert.equal((await f.post('apply',{reviewToken:preview.body.reviewToken})).status,200)
 const batchId=f.app.batch.id
 await f.app.close()
 const resumed=await createAdmin({root:f.root,storeDir:f.storeDir,port:0,runner:async(cmd,args)=>args.includes('user.name')?'Fixture':args.includes('user.email')?'fixture@example.invalid':'fixture'})
 t.after(()=>resumed.close())
 const current=await(await fetch(resumed.origin+'/api/state')).json()
 assert.equal(current.batch.id,batchId);assert.equal(current.batch.local.status,'applied');assert.equal(current.stale,false)
 const response=await fetch(resumed.origin+'/api/undo-local',{method:'POST',headers:{Origin:resumed.origin,'Content-Type':'application/json','X-KMNZ-Token':resumed.csrf},body:'{}'})
 assert.equal(response.status,200);assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw)
})

test('purge requires current-batch confirmation, removes only that directory and persists an empty active batch',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId)})
 const old=f.app.batch.id,dir=join(f.storeDir,'batches',old)
 await mkdir(join(f.storeDir,'batches','unrelated'));await writeFile(join(f.storeDir,'batches','unrelated','keep.txt'),'keep')
 assert.equal((await f.post('purge',{confirmed:false,batchId:old})).status,400)
 assert.equal((await f.post('purge',{confirmed:true,batchId:'other'})).status,400)
 const result=await f.post('purge',{confirmed:true,batchId:old,settings:{era:'new',contentType:'stream',members:['TINA']}})
 assert.equal(result.status,200);assert.equal(result.body.capabilities.purge,true);assert.notEqual(result.body.batch.id,old);assert.equal(result.body.batch.videos.length,0)
 assert.deepEqual(result.body.batch.defaults.members,['TINA']);await assert.rejects(readFile(join(dir,'draft.json')),/ENOENT/)
 assert.equal(await readFile(join(f.storeDir,'batches','unrelated','keep.txt'),'utf8'),'keep')
 assert.equal(JSON.parse(await readFile(join(f.storeDir,'active.json'),'utf8')).id,result.body.batch.id)
 assert.equal((await loadSnapshot(f.root)).fingerprint,before.fingerprint)
 assert.equal((await f.post('purge',{confirmed:true,batchId:old})).status,400)
 const next=await f.post('youtube',{input:yt(freshId)})
 assert.equal(next.status,200);assert.equal(next.body.batch.videos.length,1)
 assert.equal((await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})).status,200)
})

test('purge rolls back applied records and rebuilds before deleting recovery data',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId)})
 const p=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 await f.post('apply',{reviewToken:p.body.reviewToken})
 const old=f.app.batch.id
 const result=await f.post('purge',{confirmed:true,batchId:old})
 assert.equal(result.status,200);assert.equal(f.controls.builds,2)
 assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw)
 await assert.rejects(readFile(join(f.storeDir,'batches',old,'local-change.json')),/ENOENT/)
})

test('purge retains recovery after failed rebuild and refuses to overwrite unrelated local edits',async t=>{
 const f=await fixture(t)
 await f.post('youtube',{input:yt(freshId)})
 const p=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 await f.post('apply',{reviewToken:p.body.reviewToken});const old=f.app.batch.id
 const data=(await loadSnapshot(f.root)).data;data.songs[0].title='User edit';await writeProject(f.root,data)
 assert.notEqual((await f.post('purge',{confirmed:true,batchId:old})).status,200)
 assert.equal((await loadSnapshot(f.root)).data.songs[0].title,'User edit')
 assert(JSON.parse(await readFile(join(f.storeDir,'batches',old,'draft.json'),'utf8')))
})

test('purge build failure retains draft for retry, and a retry completes without a restart',async t=>{
 const f=await fixture(t)
 await f.post('youtube',{input:yt(freshId)})
 const p=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 await f.post('apply',{reviewToken:p.body.reviewToken});const old=f.app.batch.id
 f.controls.failBuild=true
 assert.equal((await f.post('purge',{confirmed:true,batchId:old})).status,400)
 assert.equal(f.app.batch.id,old);assert.equal(f.app.batch.local.status,'reverted')
 assert(JSON.parse(await readFile(join(f.storeDir,'batches',old,'local-change.json'),'utf8')))
 f.controls.failBuild=false
 assert.equal((await f.post('purge',{confirmed:true,batchId:old})).status,200)
 assert.notEqual(f.app.batch.id,old)
})

test('purge protects uncertain remote publication; confirmed PR keeps local music and makes no remote calls',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root),old=f.app.batch.id
 f.app.batch.publication={pushAttempted:true,phase:'pushing'}
 assert.equal((await f.post('purge',{confirmed:true,batchId:old})).status,400)
 f.app.batch.publication.phase='complete';f.app.batch.local={status:'applied',previewBuilt:true}
 assert.equal((await f.post('purge',{confirmed:true,batchId:old})).status,200)
 assert.equal((await loadSnapshot(f.root)).fingerprint,before.fingerprint);assert.equal(f.controls.builds,0)
})


test('new page blocks purge against a legacy server before sending a request and enables it on a capable server',async()=>{
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{checked:false});return elements.get(id)}
 let requests=0
 const legacy={batch:{},environment:{canPublish:false}}
 const runtime=runInNewContext(
  "let state=initialState,locked=false,reviewToken=null;let token='fixture';const $=element;"+
  html.match(/const restartNotice=[\s\S]*?(?=function message\()/)[0]+
  html.match(/function updatePublish\(\)[\s\S]*?(?=function readSettings\()/)[0]+
  ";({api,updatePublish,setState:value=>{state=value}})",
  {initialState:legacy,element,document:{querySelectorAll:()=>[]},fetch:async()=>{requests++;return{ok:true,json:async()=>({ok:true})}}}
 )
 runtime.updatePublish();assert.equal(element('purge-batch').disabled,true)
 await assert.rejects(runtime.api('purge',{confirmed:true}),/旧版 Admin 服务.*重新运行 admin\/start.bat/)
 assert.equal(requests,0)
 runtime.setState({...legacy,capabilities:{purge:true}});runtime.updatePublish()
 assert.equal(element('purge-batch').disabled,false)
 assert.equal((await runtime.api('purge',{confirmed:true})).ok,true);assert.equal(requests,1)
 runtime.setState({...legacy,capabilities:{purge:true},batch:{publication:{pushAttempted:true,phase:'pushing'}}})
 runtime.updatePublish();assert.equal(element('purge-batch').disabled,true)
})

test('old page renews its session after service restart and undoes the same batch exactly once',async t=>{
 const f=await fixture(t),before=await loadSnapshot(f.root)
 await f.post('youtube',{input:yt(freshId)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:[]})
 assert.equal((await f.post('apply',{reviewToken:preview.body.reviewToken})).status,200)
 const batchId=f.app.batch.id,oldToken=f.app.csrf
 await f.app.close()
 let builds=0
 const resumed=await createAdmin({root:f.root,storeDir:f.storeDir,port:0,runner:async(cmd,args)=>{
  if(args.includes('build'))builds++
  return args.includes('user.name')?'Fixture':args.includes('user.email')?'fixture@example.invalid':'fixture'
 }})
 t.after(()=>resumed.close())
 assert.notEqual(resumed.csrf,oldToken)
 const send=(path,body,csrf=oldToken)=>fetch(resumed.origin+'/api/'+path,{method:'POST',headers:{Origin:resumed.origin,'Content-Type':'application/json','X-KMNZ-Token':csrf},body:JSON.stringify(body)})
 const expired=await send('undo-local',{})
 assert.equal(expired.status,400);assert.equal((await expired.json()).code,'SESSION_EXPIRED')
 assert.equal(resumed.batch.local.status,'applied');assert.equal(builds,0)
 assert.equal((await fetch(resumed.origin+'/api/session')).status,400)
 assert.equal((await fetch(resumed.origin+'/api/session',{headers:{Origin:'https://evil.example','X-KMNZ-Session':'refresh'}})).status,400)
 const paths=[]
 const api=runInNewContext("let token=oldToken;const state={batch:{id:batchId}};"+html.match(/const restartNotice=[\s\S]*?(?=function message\()/)[0]+";api",{
  oldToken,batchId,fetch:async(path,options={})=>{paths.push(path);return fetch(resumed.origin+path,{...options,headers:{...options.headers,Origin:resumed.origin}})}
 })
 const result=await api('undo-local',{})
 assert.equal(result.batch.id,batchId);assert.equal(result.batch.local.status,'reverted');assert.equal(result.batch.videos.length,1)
 assert.equal(builds,1);assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw)
 assert.deepEqual(paths,['/api/undo-local','/api/session','/api/undo-local'])
})

test('session renewal refuses another batch, retries once at most and never retries ordinary operation failures',async()=>{
 for(const scenario of ['batch-changed','expired-again','operation-failed']){
  const calls=[]
  const api=runInNewContext("let token='old';const state={batch:{id:'expected'}};"+html.match(/const restartNotice=[\s\S]*?(?=function message\()/)[0]+";api",{
   fetch:async(path)=>{calls.push(path);return{ok:path==='/api/session',json:async()=>path==='/api/session'?{csrf:'a'.repeat(64),batchId:scenario==='batch-changed'?'other':'expected'}:{error:'blocked',code:scenario==='operation-failed'?'OTHER':'SESSION_EXPIRED'}}}
  })
  await assert.rejects(api('undo-local',{}),scenario==='batch-changed'?/批次已变化/:/blocked/)
  assert.deepEqual(calls,scenario==='operation-failed'?['/api/undo-local']:scenario==='batch-changed'?['/api/undo-local','/api/session']:['/api/undo-local','/api/session','/api/undo-local'])
 }
})

test('Bilibili titles are keyed by BV and remain display-only before and after local apply',async t=>{
 let requests=0
 const f=await fixture(t,{bilibiliFetcher:async url=>{requests++;const bv=new URL(url).searchParams.get('bvid');return new Response(JSON.stringify({code:0,data:{bvid:bv,title:'B站标题 '+bv}}))}})
 await f.post('youtube',{input:yt(freshId),bilibiliInput:bv(bv3)})
 const preview=await f.post('preview',{reviews:f.app.batch.reviews,bindings:f.app.batch.bindings})
 const batch=structuredClone(f.app.batch),before=await loadSnapshot(f.root),stored=await readFile(join(f.storeDir,'active.json'),'utf8')
 const result=await f.post('bilibili-titles',{urls:[bv(bv3),bv(bv1),bv(bv3)]})
 assert.equal(result.status,200);assert.deepEqual(result.body.titles.map(item=>item.bv),[bv3,bv1]);assert.equal(result.body.titles[0].title,'B站标题 '+bv3)
 assert.equal(requests,2);assert.deepEqual(f.app.batch,batch);assert.deepEqual((await loadSnapshot(f.root)).raw,before.raw)
 assert.equal(await readFile(join(f.storeDir,'active.json'),'utf8'),stored)
 assert.equal((await f.post('bilibili-titles',{urls:['https://evil.example/video/'+bv3]})).status,400);assert.equal(requests,2)
 assert.equal((await f.post('apply',{reviewToken:preview.body.reviewToken})).status,200)
 const applied=structuredClone(f.app.batch),appliedRaw=(await loadSnapshot(f.root)).raw
 assert.equal((await f.post('bilibili-titles',{urls:[bv(bv3)]})).status,200)
 assert.deepEqual(f.app.batch,applied);assert.deepEqual((await loadSnapshot(f.root)).raw,appliedRaw);assert.equal(requests,2)
 assert.equal((await fetch(f.app.origin+'/api/bilibili-titles',{method:'POST',headers:{Origin:f.app.origin,'Content-Type':'application/json','X-KMNZ-Token':'wrong'},body:JSON.stringify({urls:[bv(bv3)]})})).status,400)
})

test('repeated startup reuses only this project and leaves its running draft unchanged',async t=>{
 const f=await fixture(t),before=structuredClone(f.app.batch)
 const response=await fetch(f.app.origin+'/api/health'),health=await response.json()
 assert.equal(health.app,'kmnz-admin-mini');assert.equal(health.protocolVersion,1);assert(!('csrf' in health))
 const reused=await startAdmin({root:f.root,port:Number(new URL(f.app.origin).port),runner:async()=>assert.fail('Must not start another server')})
 assert.equal(reused.reused,true);assert.equal(reused.origin,f.app.origin);assert.deepEqual(f.app.batch,before)
 const other=await fixture(t)
 await assert.rejects(startAdmin({root:other.root,port:Number(new URL(f.app.origin).port),runner:async()=>assert.fail('Must not initialize over another project')}),/端口已被其他程序或旧版 Admin 占用/)
 assert.deepEqual(f.app.batch,before)
})

test('startup distinguishes an occupied unrelated port without stopping its owner',async t=>{
 const {createServer}=await import('node:http')
 const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Other app</h1>')})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 t.after(()=>new Promise(resolve=>server.close(resolve)))
 const port=server.address().port
 await assert.rejects(startAdmin({port,runner:async()=>assert.fail('Unrelated listener must be detected first')}),/端口已被其他程序或旧版 Admin 占用/)
 assert.equal(await(await fetch('http://127.0.0.1:'+port)).text(),'<h1>Other app</h1>')
})

test('startup creates a working service when no fixed port was requested',async t=>{
 const f=await fixture(t)
 const app=await startAdmin({root:f.root,storeDir:f.storeDir,port:0,runner:async(cmd,args)=>args.includes('user.name')?'Fixture':args.includes('user.email')?'fixture@example.invalid':'fixture'})
 t.after(()=>app.close());assert.equal(app.reused,false)
 assert.equal((await fetch(app.origin+'/api/health')).status,200)
})
