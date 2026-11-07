import {useLayoutEffect,useRef} from 'react'
import type {CSSProperties} from 'react'
const anchors={classic:[{name:'LITA',x:.37,y:.43},{name:'LIZ',x:.69,y:.49}],new:[{name:'LITA',x:.32,y:.29},{name:'NERO',x:.60,y:.31},{name:'TINA',x:.65,y:.68}]}
export default function PosterLabels({era,phase}:{era:'classic'|'new';phase:string}){
 const root=useRef<HTMLDivElement>(null)
 useLayoutEffect(()=>{
  const host=root.current,image=host?.parentElement?.querySelector('img');if(!host||!image)return
  const place=()=>{
   if(!host.isConnected||!image.naturalWidth)return
   const box=image.getBoundingClientRect(),parent=host.parentElement!.getBoundingClientRect(),scale=Math.max(box.width/image.naturalWidth,box.height/image.naturalHeight)
   const [px,py]=getComputedStyle(image).objectPosition.split(' ').map(parseFloat)
   const left=box.left-parent.left+(box.width-image.naturalWidth*scale)*(px/100),top=box.top-parent.top+(box.height-image.naturalHeight*scale)*(py/100)
   host.querySelectorAll<HTMLElement>('[data-label]').forEach((label,i)=>{label.style.left=left+anchors[era][i].x*image.naturalWidth*scale+'px';label.style.top=top+anchors[era][i].y*image.naturalHeight*scale+'px';if(era==='classic'&&i===1&&matchMedia('(min-width: 761px) and (min-aspect-ratio: 1/1)').matches){
    const logo=host.closest('.showcase')?.querySelector('.showcase-logo-sticker')?.getBoundingClientRect(),tag=label.getBoundingClientRect()
    if(logo&&tag.right>logo.left&&tag.left<logo.right&&tag.bottom>logo.top&&tag.top<logo.bottom)label.style.left=parseFloat(label.style.left)-(tag.right-logo.left+12)+'px'
   }
   label.style.visibility='visible';label.dataset.ready='true'})
  }
  document.fonts?.ready.then(place);image.addEventListener('load',place);const observer=new ResizeObserver(place);observer.observe(image);place()
  return()=>{image.removeEventListener('load',place);observer.disconnect()}
 },[era,phase])
 return <div ref={root} className="showcase-person-labels" aria-label={era==='classic'?'CLASSIC ERA':'NEW ERA'}>{anchors[era].map((person,i)=><span data-label key={person.name} className="showcase-person-label" style={{rotate:(i%2?4:-4)+'deg','--label-delay':((era==='classic'?i:i+2)*70)+'ms'} as CSSProperties}><span className="showcase-label-arrival"><span className="showcase-person-tag" data-groove="label" data-groove-index={era==='classic'?i:i+2}>{person.name}</span></span></span>)}</div>
}
