import { memo, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ShowcasePhase } from '../lib/showcase'
import { createSprayPlan, runSprayTimeline, sampleSprayPath } from '../lib/sprayReveal'
import type { SprayPlan, SprayRect } from '../lib/sprayReveal'
import can from '../assets/showcase/spray-can.svg'
import '../spray-reveal.css'

function rect(element: Element | null): SprayRect | null {
  if (!element) return null
  const box = element.getBoundingClientRect(), style = getComputedStyle(element)
  return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    ? { x: box.x, y: box.y, width: box.width, height: box.height } : null
}
function measure() {
  const width = window.innerWidth, height = window.innerHeight
  const navigation = Array.from(document.querySelectorAll('.site-logo-button,.navigation-links,.header-preferences,.nav-toggle,.show-navigation')).map(rect).filter((r): r is SprayRect => r !== null)
  const players = Array.from(document.querySelectorAll('.music-player-panel:not(.is-cinema),.header-player-slot .cinema-player-chrome')).map(rect).filter((r): r is SprayRect => r !== null)
  const content = rect(document.getElementById('main-content')) ?? { x: 0, y: 65, width, height: height - 65 }
  return createSprayPlan(width, height, navigation, content, players)
}
const Regions = ({ rects }: { rects: SprayRect[] }) => <>{rects.map((r, i) => <rect key={i} x={r.x - 2} y={r.y - 2} width={r.width + 4} height={r.height + 4} />)}</>

function SprayReveal({ phase, onComplete }: { phase: ShowcasePhase; onComplete: () => void }) {
  const [plan, setPlan] = useState<SprayPlan | null>(null)
  const scene = useRef<HTMLDivElement>(null), veil = useRef<SVGSVGElement>(null), actor = useRef<HTMLDivElement>(null), jet = useRef<SVGSVGElement>(null), ghost = useRef<SVGSVGElement>(null)
  const nav = useRef<SVGPathElement>(null), content = useRef<SVGPathElement>(null), player = useRef<SVGPathElement>(null)
  const prefix = 'kmnz-spray-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const moving = phase === 'entering' || phase === 'returning'
  useLayoutEffect(() => {
    if (!moving || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    try { setPlan(measure()) } catch { onComplete() }
  }, [moving, phase, onComplete])

  useLayoutEffect(() => {
    if (!moving || !plan || !scene.current || !actor.current || !veil.current || !jet.current || !ghost.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = scene.current, canActor = actor.current, cover = veil.current, mist = jet.current, afterglow = ghost.current
    const activeMarks = Array.from(document.querySelectorAll<HTMLElement>('.navigation-links .nav-chalk-ring')).map(element => ({ element, opacity: element.style.opacity }))
    const lastPass = plan.player ?? plan.content, end = lastPass.end
    const last = sampleSprayPath(lastPass.path, 1)
    afterglow.style.transform = `translate(${last.x}px,${last.y}px) rotate(${last.angle}deg) translate(${-plan.reach}px,-42px)`
    let lastBrush = -1
    const stop = runSprayTimeline(plan, phase === 'returning', frame => {
      root.dataset.sprayStage = frame.stage
      root.dataset.sprayProgress = frame.progress < .3 ? 'start' : frame.progress > .7 ? 'end' : 'middle'
      canActor.style.transform = `translate(${frame.nozzle.x}px,${frame.nozzle.y}px) rotate(${frame.nozzle.angle}deg)`
      canActor.style.opacity = phase === 'returning' ? '0' : String(frame.opacity)
      cover.style.opacity = String(frame.veil)
      nav.current?.setAttribute('stroke-dashoffset', String(1 - frame.nav))
      content.current?.setAttribute('stroke-dashoffset', String(1 - frame.content))
      player.current?.setAttribute('stroke-dashoffset', String(1 - frame.player))
      nav.current?.setAttribute('opacity', frame.nav > 0 ? '1' : '0')
      content.current?.setAttribute('opacity', frame.content > 0 ? '1' : '0')
      player.current?.setAttribute('opacity', frame.player > 0 ? '1' : '0')
      mist.style.opacity = phase !== 'returning' && frame.brush ? '.74' : '0'
      if (lastBrush !== frame.brush) {
        lastBrush = frame.brush
        mist.style.height = Math.max(50, frame.brush) + 'px'
        mist.style.top = -Math.max(50, frame.brush) / 2 + 'px'
        const spread = Math.max(50, frame.brush)
        mist.setAttribute('viewBox', `0 ${-spread / 2} 80 ${spread}`)
        mist.querySelector('path')?.setAttribute('d', `M0 0Q18 ${-spread * .09} 32 ${-spread * .44}Q50 ${-spread * .54} 68 ${-spread * .375}L78 0 65 ${spread * .44}Q34 ${spread * .505} 15 ${spread * .06}Z`)
      }
      afterglow.style.opacity = phase !== 'returning' && frame.time >= end ? String(.25 * Math.max(0, 1 - (frame.time - end) / 160)) : '0'
      for (const { element } of activeMarks) element.style.opacity = String(frame.activeMark)
    }, { now: () => performance.now(), request: callback => window.requestAnimationFrame(callback), cancel: id => window.cancelAnimationFrame(id) })
    window.addEventListener('resize', onComplete)
    return () => {
      stop()
      window.removeEventListener('resize', onComplete)
      for (const { element, opacity } of activeMarks) element.style.opacity = opacity
    }
  }, [plan, moving, phase, onComplete])

  if (!moving || !plan) return null
  const mask = prefix + '-veil', navClip = prefix + '-nav', mainClip = prefix + '-main', playerClip = prefix + '-player', dots = prefix + '-dots', fan = prefix + '-fan'
  return <div ref={scene} className="spray-scene" aria-hidden="true" inert data-spray-stage="peel">
    <svg ref={veil} className="spray-veil" viewBox={`0 0 ${plan.width} ${plan.height}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <pattern id={prefix + '-paper'} width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" className="spray-paper-veil" /><path d="M26 0H0V26" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".055" /><circle cx="17" cy="9" r=".6" fill="currentColor" opacity=".04" /></pattern>
        <clipPath id={navClip}><Regions rects={plan.navigation.regions} /></clipPath>
        <clipPath id={mainClip}><Regions rects={plan.content.regions} /></clipPath>
        <clipPath id={playerClip}><Regions rects={plan.player?.regions ?? []} /></clipPath>
        <filter id={prefix + '-edge'} filterUnits="userSpaceOnUse" x="0" y="0" width={plan.width} height={plan.height}><feTurbulence type="fractalNoise" baseFrequency=".15" numOctaves="2" seed="5" result="grain" /><feDisplacementMap in="SourceGraphic" in2="grain" scale="7" xChannelSelector="R" yChannelSelector="G" /></filter>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={plan.width} height={plan.height} style={{ maskType: 'luminance' }}>
          <rect width={plan.width} height={plan.height} fill="white" />
          <g clipPath={`url(#${navClip})`}><path ref={nav} d={plan.navigation.path.d} fill="none" stroke="black" strokeWidth={plan.navigation.width} strokeLinecap="butt" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" filter={`url(#${prefix}-edge)`} /></g>
          <g clipPath={`url(#${mainClip})`}><path ref={content} d={plan.content.path.d} fill="none" stroke="black" strokeWidth={plan.content.width} strokeLinecap="butt" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" filter={`url(#${prefix}-edge)`} /></g>
          <g fill="white"><Regions rects={plan.player?.regions ?? []} /></g>
          {plan.player && <g clipPath={`url(#${playerClip})`}><path ref={player} d={plan.player.path.d} fill="none" stroke="black" strokeWidth={plan.player.width} strokeLinecap="butt" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" filter={`url(#${prefix}-edge)`} /></g>}
        </mask>
      </defs>
      <rect width={plan.width} height={plan.height} fill={`url(#${prefix}-paper)`} mask={`url(#${mask})`} />
    </svg>
    <svg className="spray-definitions" width="0" height="0" focusable="false"><defs>
      <pattern id={dots} width="19" height="23" patternUnits="userSpaceOnUse" patternTransform="rotate(13)"><g fill="currentColor"><circle cx="2" cy="3" r="1.1" /><circle cx="12" cy="8" r=".65" /><circle cx="5" cy="18" r=".45" /><circle cx="17" cy="1" r=".7" /><circle cx="15" cy="20" r="1.4" /><circle cx="8" cy="11" r=".6" /></g></pattern>
      <g id={fan}><path d="M0 0Q18-9 32-88Q50-108 68-75L78 0 65 88Q34 101 15 12Z" fill={`url(#${dots})`} opacity=".5" /><path d="M0 0 31-34 59-41 66 0 52 43 28 29Z" fill={`url(#${dots})`} opacity=".8" /></g>
    </defs></svg>
    <div ref={actor} className="spray-actor">
      <img src={can} className="spray-can" alt="" draggable={false} />
      <svg ref={jet} className="spray-jet" viewBox="0 -100 80 200" preserveAspectRatio="none" focusable="false"><path fill={`url(#${dots})`} /></svg>
    </div>
    <svg ref={ghost} className="spray-afterglow" viewBox="0 -100 80 200" preserveAspectRatio="none" focusable="false"><use href={`#${fan}`} /></svg>
  </div>
}

export default memo(SprayReveal)
