import { showcaseDuration } from './showcase'

export interface SprayPoint { x: number; y: number }
export interface SprayRect { x: number; y: number; width: number; height: number }
export interface SprayPath { points: SprayPoint[]; distances: number[]; length: number; d: string }
export interface SprayPass { path: SprayPath; regions: SprayRect[]; width: number; start: number; end: number }
export interface SprayPlan { width: number; height: number; reach: number; entry: SprayPath; navigation: SprayPass; content: SprayPass; player: SprayPass | null; exit: SprayPath; travel: SprayPath; playerTravel: SprayPath | null }
export const sprayTiming = { entry: 540, navigation: 680, navigationEnd: 1170, content: 1240, contentEnd: 1660, player: 1710, playerEnd: 1870, fade: 1870, end: 2000 } as const
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
function verticalPass(rect: SprayRect): SprayPath {
  const x = rect.x + rect.width / 2, y = rect.y, h = rect.height
  const middle = { x: x + rect.width * .025, y: y + h / 2 }
  const upper = curve({ x, y: y - 8 }, { x, y: y + h * .2 }, { x: middle.x, y: middle.y - h * .2 }, middle)
  const lower = curve(middle, { x: middle.x, y: middle.y + h * .2 }, { x, y: y + h * .8 }, { x, y: y + h + 8 })
  return sprayPath([...upper.points, ...lower.points.slice(1)])
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
function bounds(rects: SprayRect[], fallback: SprayRect): SprayRect {
  if (!rects.length) return fallback
  const left = Math.min(...rects.map(r => r.x)), top = Math.min(...rects.map(r => r.y))
  return { x: left, y: top, width: Math.max(...rects.map(r => r.x + r.width)) - left, height: Math.max(...rects.map(r => r.y + r.height)) - top }
}
export function createSprayPlan(width: number, height: number, navigation: SprayRect[], content: SprayRect, players: SprayRect[]): SprayPlan {
  width = Math.max(1, width); height = Math.max(1, height)
  const visible = (rects: SprayRect[]) => rects.map(r => visibleSprayRect(r, width, height)).filter((r): r is SprayRect => r !== null)
  const nav = visible(navigation), media = visible(players)
  const main = visibleSprayRect(content, width, height) ?? { x: 0, y: 70, width, height: Math.max(1, height - 70) }
  const header = bounds(nav, { x: 24, y: 0, width: Math.max(1, width - 48), height: 64 })
  const navY = header.y + header.height / 2
  const navPath = sprayPath([{ x: Math.max(1, header.x - 8), y: navY }, { x: Math.min(width - 1, header.x + header.width + 8), y: navY }])
  const contentPath = verticalPass(main)
  const player = media.length ? bounds(media, main) : null
  const playerPath = player ? verticalPass(player) : null
  const first = sampleSprayPath(navPath, 0), navEnd = sampleSprayPath(navPath, 1), mainStart = sampleSprayPath(contentPath, 0), mainEnd = sampleSprayPath(contentPath, 1)
  const last = playerPath ? sampleSprayPath(playerPath, 1) : mainEnd
  return {
    width, height, reach: width < 761 ? 22 : 30,
    entry: curve({ x: Math.max(-50, first.x - 160), y: Math.min(height - 80, 240) }, { x: first.x - 80, y: 160 }, { x: first.x + 18, y: Math.max(5, first.y - 38) }, first),
    navigation: { path: navPath, regions: nav, width: header.height + 16, start: sprayTiming.navigation, end: sprayTiming.navigationEnd },
    content: { path: contentPath, regions: [main], width: main.width * 1.16 + 16, start: sprayTiming.content, end: sprayTiming.contentEnd },
    player: playerPath && player ? { path: playerPath, regions: media, width: player.width * 1.14 + 16, start: sprayTiming.player, end: sprayTiming.playerEnd } : null,
    travel: curve(navEnd, { x: width * .85, y: height * .15 }, { x: mainStart.x - 100, y: mainStart.y + 50 }, mainStart),
    playerTravel: playerPath ? curve(mainEnd, { x: mainEnd.x + 100, y: mainEnd.y - 70 }, { x: player!.x + player!.width / 2 - 60, y: player!.y }, sampleSprayPath(playerPath, 0)) : null,
    exit: curve(last, { x: Math.min(width - 12, last.x + 70), y: Math.min(height - 20, last.y - 80) }, { x: width + 30, y: height * .65 }, { x: width + 100, y: height * .75 }),
  }
}
export function sampleSpray(plan: SprayPlan, elapsed: number, reverse = false) {
  const time = clamp(reverse ? showcaseDuration - elapsed : elapsed, 0, showcaseDuration)
  const nav = fraction(time, plan.navigation.start, plan.navigation.end)
  const content = fraction(time, plan.content.start, plan.content.end)
  const player = plan.player ? fraction(time, plan.player.start, plan.player.end) : 0
  let stage: 'peel' | 'entry' | 'navigation' | 'travel' | 'content' | 'player' | 'exit' = 'peel'
  let path = plan.entry, progress = fraction(time, sprayTiming.entry, sprayTiming.navigation), brush = 0
  if (time >= sprayTiming.navigation && time < sprayTiming.navigationEnd) { stage = 'navigation'; path = plan.navigation.path; progress = nav; brush = plan.navigation.width }
  else if (time >= sprayTiming.navigationEnd && time < sprayTiming.content) { stage = 'travel'; path = plan.travel; progress = fraction(time, sprayTiming.navigationEnd, sprayTiming.content) }
  else if (time >= sprayTiming.content && time < sprayTiming.contentEnd) { stage = 'content'; path = plan.content.path; progress = content; brush = plan.content.width }
  else if (plan.player && time >= sprayTiming.contentEnd && time < sprayTiming.player) { stage = 'travel'; path = plan.playerTravel!; progress = fraction(time, sprayTiming.contentEnd, sprayTiming.player) }
  else if (plan.player && time >= sprayTiming.player && time < sprayTiming.playerEnd) { stage = 'player'; path = plan.player.path; progress = player; brush = plan.player.width }
  else if (time >= (plan.player ? sprayTiming.playerEnd : sprayTiming.contentEnd)) { stage = 'exit'; path = plan.exit; progress = fraction(time, plan.player ? sprayTiming.playerEnd : sprayTiming.contentEnd, showcaseDuration) }
  else if (time >= sprayTiming.entry) stage = 'entry'
  const impact = sampleSprayPath(path, brush ? progress : ease(progress))
  const angle = impact.angle * Math.PI / 180
  return {
    time, stage, progress, impact,
    nozzle: { x: impact.x - Math.cos(angle) * plan.reach, y: impact.y - Math.sin(angle) * plan.reach, angle: impact.angle },
    nav, content, player, brush,
    opacity: fraction(time, sprayTiming.entry, sprayTiming.entry + 70) * (1 - fraction(time, 1930, 1990)),
    veil: 1 - fraction(time, sprayTiming.fade, showcaseDuration),
    activeMark: fraction(time, sprayTiming.navigationEnd, sprayTiming.navigationEnd + 100),
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
