// Display metadata only: never used to infer or rewrite a binding.
const validBV = value => typeof value === 'string' && /^BV1[1-9A-HJ-NP-Za-km-z]{9}$/.test(value)
export function createBilibiliTitleLookup({fetcher=fetch,timeout=10000,now=Date.now}={}) {
  const cache=new Map(),pending=new Map()
  async function lookup(bv,refresh) {
    if(!validBV(bv))throw Error('无效的 BV。')
    const saved=cache.get(bv)
    if(!refresh&&saved&&saved.expires>now())return saved.value
    if(pending.has(bv))return pending.get(bv)
    const request=(async()=>{
      const url='https://www.bilibili.com/video/'+bv,controller=new AbortController()
      let timer
      try {
        const data=await Promise.race([
          (async()=>{
            const response=await fetcher('https://api.bilibili.com/x/web-interface/view?bvid='+bv,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'},redirect:'error',signal:controller.signal})
            if(!response.ok)throw Error('HTTP')
            return response.json()
          })(),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'))},timeout)})
        ])
        const title=data?.data?.title
        const value=data?.code===0&&data.data?.bvid===bv&&typeof title==='string'&&title.trim()&&title.length<=1000
          ?{bv,url,title:title.trim(),status:'ok'}
          :{bv,url,title:null,status:'unavailable',message:'Bilibili 标题暂不可用，请打开链接核对或重试。'}
        cache.set(bv,{value,expires:now()+(value.status==='ok'?600000:10000)})
        return value
      } catch {
        return {bv,url,title:null,status:'error',message:'Bilibili 标题获取失败，请打开链接核对或重试。'}
      } finally {clearTimeout(timer)}
    })()
    pending.set(bv,request)
    try{return await request}finally{pending.delete(bv)}
  }
  return async (bvs,{refresh=false}={})=>{
    if(!Array.isArray(bvs)||bvs.length>200||!bvs.every(validBV))throw Error('待查询 BV 无效或过多。')
    const unique=[...new Set(bvs)],results=new Array(unique.length);let index=0
    await Promise.all(Array.from({length:Math.min(4,unique.length)},async()=>{
      while(index<unique.length){const i=index++;results[i]=await lookup(unique[i],refresh)}
    }))
    return results
  }
}
