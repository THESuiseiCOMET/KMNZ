import { showcaseDuration, showcasePosterExitDuration } from './showcase'

// Choreographed 3-second performance; no proportional scaling of the old timeline.

export interface SprayPoint { x: number; y: number }
export interface SprayRect { x: number; y: number; width: number; height: number }
export interface SprayPath { points: SprayPoint[]; distances: number[]; length: number; d: string }
export interface SprayPass { path: SprayPath; width: number; start: number; end: number; gesture: 'navigation' | 'arc' | 'flick' | 'row' }
export interface SprayPlan { width: number; height: number; reach: number; entry: SprayPath; passes: SprayPass[]; links: SprayPath[]; exit: SprayPath }
export const sprayTiming = { posterExit: showcasePosterExitDuration, stencilFade: 900, stencilEnd: 1050, entry: 1050, navigation: 1050, navigationEnd: 1200, content: 1200, turn: 1700, contentEnd: 2800, flick: 2800, flickEnd: 2860, settle: 48, fade: 2930, end: showcaseDuration } as const
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mix = (a: SprayPoint, b: SprayPoint, t: number): SprayPoint => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
const fraction = (time: number, start: number, end: number) => clamp((time - start) / (end - start))
const ease = (value: number) => value * value * (3 - 2 * value)

export function sprayPath(points: SprayPoint[]): SprayPath {
  const distances = [0]
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  return { points, distances, length: distances.at(-1) ?? 0, d: points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ') }
}
function curve(a: SprayPoint, b: SprayPoint, c: SprayPoint, d: SprayPoint): SprayPath {
  return sprayPath(Array.from({ length: 49 }, (_, i) => {
    const t = i / 48
    return mix(mix(mix(a, b, t), mix(b, c, t), t), mix(mix(b, c, t), mix(c, d, t), t), t)
  }))
}
export function sampleSprayPath(path: SprayPath, progress: number): SprayPoint & { angle: number } {
  const distance = path.length * clamp(progress)
  let i = path.distances.findIndex((value, index) => index > 0 && value >= distance)
  if (i < 1) i = Math.max(1, path.points.length - 1)
  const a = path.points[i - 1], b = path.points[i] ?? a
  const span = path.distances[i] - path.distances[i - 1]
  return { ...mix(a, b, span ? (distance - path.distances[i - 1]) / span : 0), angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI }
}
export function visibleSprayRect(rect: SprayRect, width: number, height: number): SprayRect | null {
  const left = clamp(rect.x, 0, width), top = clamp(rect.y, 0, height)
  const right = clamp(rect.x + rect.width, 0, width), bottom = clamp(rect.y + rect.height, 0, height)
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null
}

export function sprayGesture(progress: number, gesture: SprayPass['gesture']): number {
  const t = clamp(progress)
  if (gesture === 'row') return ease(t)
  if (gesture === 'flick') return 1 - (1 - t) ** 3
  const knots = gesture === 'navigation'
    ? [[0, 0], [.18, .08], [.58, .79], [.64, .79], [1, 1]]
    : [[0, 0], [.2, .1], [.56, .77], [.68, .77], [1, 1]]
  for (let i = 1; i < knots.length; i++) {
    const [end, to] = knots[i], [start, from] = knots[i - 1]
    if (t <= end) return lerp(from, to, ease(fraction(t, start, end)))
  }
  return 1
}
const passProgress = (pass: SprayPass, time: number) => sprayGesture(fraction(time, pass.start, pass.end), pass.gesture)

export function createSprayPlan(width: number, height: number, _navigation: SprayRect[]): SprayPlan {
  width = Math.max(1, width); height = Math.max(1, height)
  const portrait = width < 761 || height > width
  const slope = -.30, step = portrait ? 160 : 190
  const rowCount = Math.ceil((height + Math.abs(slope) * (width - 32) + 30 - (step * 1.18 + 24) / 2) / step) + 1
  const start = sprayTiming.content, finish = sprayTiming.contentEnd, gap = 26
  const duration = (finish - start - gap * (rowCount - 1)) / rowCount
  const passes: SprayPass[] = Array.from({ length: rowCount }, (_, i) => {
    const y = i * step - 30
    const left = { x: 16, y }, right = { x: width - 16, y: y + slope * (width - 32) }
    return { path: sprayPath(i % 2 ? [right, left] : [left, right]), width: step * 1.18 + 24,
      start: start + i * (duration + gap), end: start + i * (duration + gap) + duration, gesture: 'row' }
  })
  const navHeight = Math.min(height,64)
  passes.unshift({path:sprayPath([{x:16,y:navHeight/2+5},{x:width-16,y:navHeight/2-5}]),width:navHeight+48,start:sprayTiming.navigation,end:sprayTiming.navigationEnd,gesture:'navigation'})
  const flick = passes.at(-1)!.path
  const first = sampleSprayPath(passes[0].path, 0), last = sampleSprayPath(flick, 1)
  const links = passes.slice(1).map((pass, i) => {
    const from = sampleSprayPath(passes[i].path, 1), to = sampleSprayPath(pass.path, 0)
    return curve(from, { x: clamp(from.x + (i === 1 ? -30 : 30), 20, width - 20), y: lerp(from.y, to.y, .25) }, { x: clamp(to.x + (i === 1 ? 45 : -45), 20, width - 20), y: lerp(from.y, to.y, .7) }, to)
  })
  return {
    width, height, reach: portrait ? 22 : 30, passes, links,
    entry: curve({ x: -50, y: Math.min(height - 80, 240) }, { x: first.x - 80, y: 160 }, { x: first.x + 18, y: Math.max(5, first.y - 38) }, first),
    exit: curve(last, { x: Math.min(width - 12, last.x + 70), y: last.y - 65 }, { x: width + 30, y: height * .65 }, { x: width + 100, y: height * .75 }),
  }
}

export function sampleSpray(plan: SprayPlan, elapsed: number, reverse = false) {
  const time = clamp(reverse ? showcaseDuration - elapsed : elapsed, 0, showcaseDuration)
  const reveals = plan.passes.map(pass => ({
    progress: passProgress(pass, time), settled: passProgress(pass, time - sprayTiming.settle),
    strength: fraction(time, pass.start, pass.start + 42), solid: fraction(time, pass.start + sprayTiming.settle, pass.start + sprayTiming.settle + 42),
  }))
  let stage: 'peel' | 'entry' | 'navigation' | 'travel' | 'content' | 'flick' | 'exit' = time >= sprayTiming.entry ? 'entry' : 'peel'
  let path = plan.entry, progress = ease(fraction(time, sprayTiming.entry, plan.passes[0].start)), brush = 0, speed = 0
  for (let i = 0; i < plan.passes.length; i++) {
    const pass = plan.passes[i], next = plan.passes[i + 1]
    if (time >= pass.start && time < pass.end) {
      stage = pass.gesture === 'navigation' ? 'navigation' : 'content'
      path = pass.path; progress = reveals[i].progress; brush = pass.width
      speed = clamp((passProgress(pass, time + 1) - passProgress(pass, time - 1)) * pass.path.length / 32)
      break
    }
    if (next && time >= pass.end && time < next.start) {
      stage = 'travel'; path = plan.links[i]; progress = ease(fraction(time, pass.end, next.start)); break
    }
    if (!next && time >= pass.end) { stage = 'exit'; path = plan.exit; progress = ease(fraction(time, pass.end, showcaseDuration)) }
  }
  const impact = sampleSprayPath(path, progress), trail = sampleSprayPath(path, Math.max(0, progress - .035 * speed))
  const angle = impact.angle * Math.PI / 180
  return {
    time, stage, progress, impact, trail, reveals, brush, speed,
    nozzle: { x: impact.x - Math.cos(angle) * plan.reach, y: impact.y - Math.sin(angle) * plan.reach, angle: impact.angle },
    opacity: fraction(time, sprayTiming.entry, sprayTiming.entry + 65) * (1 - fraction(time, 2820, 2980)),
    veil: 1 - fraction(time, sprayTiming.fade, showcaseDuration),
    activeMark: fraction(time, sprayTiming.navigationEnd + sprayTiming.settle, sprayTiming.navigationEnd + sprayTiming.settle + 70),
    tag: 0,
    stencil: fraction(time, sprayTiming.posterExit, 840) * (1 - fraction(time, sprayTiming.stencilFade, sprayTiming.stencilEnd)),
    stencilProgress: fraction(time, sprayTiming.posterExit, 840),
  }
}
export interface SprayClock { now: () => number; request: (callback: (time: number) => void) => number; cancel: (id: number) => void }
export function runSprayTimeline(plan: SprayPlan, reverse: boolean, paint: (frame: ReturnType<typeof sampleSpray>) => void, clock: SprayClock) {
  let active = true, id: number | null = null
  const start = clock.now()
  function tick(time: number) {
    if (!active) return
    const elapsed = Math.max(0, time - start)
    paint(sampleSpray(plan, elapsed, reverse))
    id = elapsed < showcaseDuration ? clock.request(tick) : null
  }
  tick(start)
  return () => { active = false; if (id !== null) clock.cancel(id); id = null }
}
