import { memo, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ShowcasePhase } from '../lib/showcase'
import { createSprayPlan, runSprayTimeline } from '../lib/sprayReveal'
import type { SprayPlan, SprayRect } from '../lib/sprayReveal'
import stencilLogo from '../assets/showcase/KMNZ-logo.svg'
import can from '../assets/showcase/spray-can.svg'
import '../spray-reveal.css'

function attribute(node: SVGPathElement | null | undefined, name: string, value: number) {
  const text = String(value)
  if (node && node.getAttribute(name) !== text) node.setAttribute(name, text)
}
function rect(element: Element | null): SprayRect | null {
  if (!element) return null
  const box = element.getBoundingClientRect(), style = getComputedStyle(element)
  return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    ? { x: box.x, y: box.y, width: box.width, height: box.height } : null
}
function measure() {
  const navigation = Array.from(document.querySelectorAll('.site-header,.show-navigation')).map(rect).filter((r): r is SprayRect => r !== null)
  return createSprayPlan(window.innerWidth, window.innerHeight, navigation)
}

function SprayReveal({ phase, onComplete }: { phase: ShowcasePhase; onComplete: () => void }) {
  const [plan, setPlan] = useState<SprayPlan | null>(null)
  const scene = useRef<HTMLDivElement>(null), veil = useRef<SVGSVGElement>(null), actor = useRef<HTMLDivElement>(null), jet = useRef<SVGSVGElement>(null), ghost = useRef<SVGSVGElement>(null), tag = useRef<SVGPathElement>(null)
  const edges = useRef<(SVGPathElement | null)[]>([]), solids = useRef<(SVGPathElement | null)[]>([])
  const stencil = useRef<SVGSVGElement>(null), stencilStroke = useRef<SVGPathElement>(null)
  const startedAt = useRef(0)
  const prefix = 'kmnz-spray-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const moving = phase === 'entering' || phase === 'returning'
  useLayoutEffect(() => {
    if (!moving) { setPlan(null); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    startedAt.current = performance.now()
    try { setPlan(measure()) } catch { onComplete() }
  }, [moving, phase, onComplete])

  useLayoutEffect(() => {
    if (!moving || !plan || !scene.current || !actor.current || !veil.current || !jet.current || !ghost.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = scene.current, canActor = actor.current, cover = veil.current, mist = jet.current, afterglow = ghost.current
    const activeMarks = Array.from(document.querySelectorAll<HTMLElement>('.navigation-links .nav-chalk-ring')).map(element => ({ element, opacity: element.style.opacity }))
    let lastBrush = -1
    const stop = runSprayTimeline(plan, phase === 'returning', frame => {
      root.dataset.sprayStage = frame.stage
      root.dataset.sprayProgress = frame.progress < .3 ? 'start' : frame.progress > .7 ? 'end' : 'middle'
      canActor.style.transform = `translate(${frame.nozzle.x}px,${frame.nozzle.y}px) rotate(${frame.nozzle.angle}deg)`
      canActor.style.opacity = phase === 'returning' ? '0' : String(frame.opacity)
      cover.style.opacity = String(frame.veil)
      if (stencil.current) stencil.current.style.opacity = phase === 'returning' ? '0' : String(frame.stencil)
      attribute(stencilStroke.current, 'stroke-dashoffset', 1 - frame.stencilProgress)
      frame.reveals.forEach((reveal, i) => {
        attribute(edges.current[i], 'stroke-dashoffset', 1 - reveal.progress)
        attribute(edges.current[i], 'opacity', reveal.progress > 0 ? reveal.strength : 0)
        attribute(solids.current[i], 'stroke-dashoffset', 1 - reveal.settled)
        attribute(solids.current[i], 'opacity', reveal.settled > 0 ? reveal.solid : 0)
      })
      mist.style.opacity = phase !== 'returning' && frame.brush ? String(.48 + .25 * frame.speed) : '0'
      if (lastBrush !== frame.brush) {
        lastBrush = frame.brush
        const spread = Math.max(50, frame.brush + 38)
        mist.style.height = spread + 'px'; mist.style.top = -spread / 2 + 'px'
        mist.setAttribute('viewBox', `0 ${-spread / 2} 80 ${spread}`)
        mist.querySelector('[data-fan]')?.setAttribute('d', `M0 0Q18 ${-spread * .08} 32 ${-spread * .42}Q50 ${-spread * .54} 68 ${-spread * .35}L78 0 65 ${spread * .44}Q34 ${spread * .5} 15 ${spread * .06}Z`)
      }
      afterglow.style.transform = `translate(${frame.trail.x}px,${frame.trail.y}px) rotate(${frame.trail.angle}deg) translate(${-plan.reach}px,-42px)`
      afterglow.style.opacity = phase !== 'returning' && frame.brush ? String(.25 * frame.speed) : '0'
      attribute(tag.current, 'stroke-dashoffset', 1 - frame.reveals.at(-1)!.progress)
      attribute(tag.current, 'opacity', phase === 'returning' ? 0 : frame.tag * .64)
      for (const { element } of activeMarks) element.style.opacity = String(frame.activeMark)
    }, { now: () => startedAt.current, request: callback => window.requestAnimationFrame(callback), cancel: id => window.cancelAnimationFrame(id) })
    window.addEventListener('resize', onComplete)
    return () => {
      stop(); window.removeEventListener('resize', onComplete)
      for (const { element, opacity } of activeMarks) element.style.opacity = opacity
    }
  }, [plan, moving, phase, onComplete])

  if (!moving || !plan) return null
  const mask = prefix + '-veil', grit = prefix + '-grit', dots = prefix + '-dots', fan = prefix + '-fan', edge = prefix + '-edge'
  return <div ref={scene} className="spray-scene" aria-hidden="true" inert data-spray-stage="peel">
    <svg ref={veil} className="spray-veil" viewBox={`0 0 ${plan.width} ${plan.height}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <pattern id={prefix + '-paper'} width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" className="spray-paper-veil" /><path d="M26 0H0V26" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".055" /><circle cx="17" cy="9" r=".6" fill="currentColor" opacity=".04" /></pattern>
        <pattern id={grit} width="21" height="19" patternUnits="userSpaceOnUse" patternTransform="rotate(17)"><rect width="21" height="19" fill="black" opacity=".2" /><g fill="black"><circle cx="3" cy="6" r="1.1" /><circle cx="16" cy="4" r=".45" /><circle cx="9" cy="17" r=".7" /><circle cx="19" cy="14" r="1.5" /><circle cx="12" cy="10" r=".8" /><circle cx="20" cy="2" r=".3" /></g></pattern>
        <filter id={edge} filterUnits="userSpaceOnUse" x="0" y="0" width={plan.width} height={plan.height}><feTurbulence type="fractalNoise" baseFrequency=".11 .2" numOctaves="2" seed="5" result="grain" /><feDisplacementMap in="SourceGraphic" in2="grain" scale="15" xChannelSelector="R" yChannelSelector="G" /></filter>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={plan.width} height={plan.height} style={{ maskType: 'luminance' }}>
          <rect width={plan.width} height={plan.height} fill="white" />
          {plan.passes.map((pass, i) => <g key={i}>
            <path ref={node => { edges.current[i] = node }} d={pass.path.d} fill="none" stroke={`url(#${grit})`} strokeWidth={pass.width + 38} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" />
            <path ref={node => { solids.current[i] = node }} d={pass.path.d} fill="none" stroke="black" strokeWidth={pass.width} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" filter={`url(#${edge})`} />
          </g>)}
        </mask>
      </defs>
      <rect width={plan.width} height={plan.height} fill={`url(#${prefix}-paper)`} mask={`url(#${mask})`} />
    </svg>
    <svg className="spray-definitions" width="0" height="0" focusable="false"><defs>
      <pattern id={dots} width="23" height="29" patternUnits="userSpaceOnUse" patternTransform="rotate(13)"><g fill="currentColor"><circle cx="2" cy="3" r="1.4" /><circle cx="12" cy="8" r=".5" /><circle cx="5" cy="18" r=".35" /><circle cx="20" cy="1" r=".7" /><circle cx="17" cy="23" r="1.8" /><circle cx="8" cy="11" r=".65" /></g></pattern>
      <g id={fan}><path d="M0 0Q18-9 32-88Q50-108 68-75L78 0 65 88Q34 101 15 12Z" fill={`url(#${dots})`} opacity=".4" /><path d="M0 0 31-34 59-41 66 0 52 43 28 29Z" fill={`url(#${dots})`} opacity=".9" /></g>
    </defs></svg>
    <svg ref={stencil} className="spray-stencil" viewBox="0 0 699 337" aria-hidden="true">
      <defs><mask id={prefix + '-stencil'}><path ref={stencilStroke} d="M0 168L699 168" stroke="white" strokeWidth="337" pathLength="1" strokeDasharray="1" strokeDashoffset="1" /></mask></defs>
      <image href={stencilLogo} width="699" height="337" mask={'url(#' + prefix + '-stencil)'} />
    </svg>
    <div ref={actor} className="spray-actor">
      <img src={can} className="spray-can" alt="" draggable={false} />
      <svg ref={jet} className="spray-jet" viewBox="0 -100 80 200" preserveAspectRatio="none" focusable="false"><path data-fan fill={`url(#${dots})`} opacity=".45" /><path d="M0 0Q16-16 39-25L65-13 73 0 55 23 24 17Z" fill={`url(#${dots})`} /><path d="M0 0 24-9 50-5 58 3 31 13Z" fill="currentColor" opacity=".09" /></svg>
    </div>
    <svg ref={ghost} className="spray-afterglow" viewBox="0 -100 80 200" preserveAspectRatio="none" focusable="false"><use href={`#${fan}`} /></svg>
    <svg className="spray-tag" viewBox={`0 0 ${plan.width} ${plan.height}`} preserveAspectRatio="none" focusable="false"><path ref={tag} d={plan.passes.at(-1)!.path.d} fill="none" stroke="currentColor" strokeWidth={plan.width < 761 ? 4 : 7} strokeLinecap="round" strokeLinejoin="bevel" pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0" /></svg>
  </div>
}

export default memo(SprayReveal)
