export interface ShowcaseAudio {
  volume: number; loop: boolean; paused: boolean; currentTime: number
  play(): Promise<void>; pause(): void
}
export function createShowcaseAudio(audio: ShowcaseAudio, clock: {now():number;request(fn:(time:number)=>void):number;cancel(id:number):void}, changed:(playing:boolean,blocked:boolean)=>void) {
  let wanted=false,visible=false,blocked=false,disposed=false,frame:number|null=null,generation=0,starting:number|null=null
  audio.loop=true;audio.volume=.25
  const stopFade=()=>{if(frame!==null)clock.cancel(frame);frame=null}
  const mayPlay=()=>wanted&&visible&&!blocked&&!disposed
  async function start(){
    if(starting!==null||!mayPlay())return
    stopFade();const run=++generation;starting=run;audio.volume=.25
    if(!mayPlay())return
    try{await audio.play();if(!mayPlay()){audio.pause();return}if(run===generation)changed(true,false)}
    catch{if(run===generation&&mayPlay())changed(false,true)}
    finally{if(starting===run)starting=null}
  }
  function stop(immediate=false){
    stopFade();generation++;starting=null;changed(false,false)
    if(immediate||audio.paused){audio.pause();audio.volume=.25;return}
    const start=clock.now(),volume=audio.volume
    const tick=(time:number)=>{if(disposed||mayPlay())return;const p=Math.min(1,Math.max(0,(time-start)/500));audio.volume=volume*(1-p);if(p<1)frame=clock.request(tick);else{frame=null;audio.pause();audio.volume=.25}}
    frame=clock.request(tick)
  }
  return {
    toggle(){wanted=!wanted;if(mayPlay())void start();else stop();return wanted},
    restore(value:boolean){wanted=value},
    context(showing:boolean,otherMedia:boolean){visible=showing;blocked=otherMedia;if(mayPlay()){if(audio.paused||frame!==null)void start()}else stop(otherMedia)},
    retry(){if(mayPlay())void start()},
    dispose(){disposed=true;generation++;stopFade();audio.pause();audio.volume=.25;changed(false,false)},
  }
}
