// Calibrated from the supplied MP3; these are editable without changing choreography.
export const showcaseGrooveTiming = { bpm: 94, beatOffset: .06, beats: 8 } as const
export type GrooveMode = 'audio' | 'silent' | 'still'
export interface GrooveAudio { paused: boolean; currentTime: number; ended?: boolean; muted?: boolean; volume: number }
export interface GrooveClock { now(): number; request(callback: (time: number) => void): number; cancel(id: number): void }
type Pose = { x?: number; y?: number; angle?: number; scale?: number }
const transform = (pose: Pose, strength: number) => `translate(${(pose.x ?? 0) * strength}px,${(pose.y ?? 0) * strength}px) rotate(${(pose.angle ?? 0) * strength}deg) scale(${1 + ((pose.scale ?? 1) - 1) * strength})`
const beatMs = 60000 / showcaseGrooveTiming.bpm
export const showcaseGrooveDuration = beatMs * showcaseGrooveTiming.beats

export function grooveFrames(channel: string, index = 0, strength = 1, silent = false): Keyframe[] {
  let beats: number[], duration: number, punch: Pose, rebound: Pose
  switch (channel) {
    case 'logo': beats = silent ? [0] : [0, 2, 4, 6]; duration = 190; punch = { scale: 1.028, angle: .65 }; rebound = { scale: .995, angle: -.25 }; break
    case 'yellow': beats = silent ? [3.6] : [1.1, 3.6, 5.1]; duration = 240; punch = { y: -3, x: 1, angle: 6 }; rebound = { y: .8, angle: -2.8 }; break
    case 'black': beats = [2.8, 6.8]; duration = 180; punch = { y: -1.5, angle: -4 }; rebound = { angle: 2 }; break
    case 'white': beats = [3.5, 7.4]; duration = 280; punch = { y: -1.8, angle: 2.5 }; rebound = { angle: -1.1 }; break
    case 'label': beats = silent ? [] : [4.3 + index * .5]; duration = 180; punch = { y: -.65, scale: 1.012, angle: .5 }; rebound = { y: .2, angle: -.2 }; break
    default: beats = silent ? [] : [3.75, 7.75]; duration = 90; punch = { x: 1.5, y: -.7, angle: .08 }; rebound = { x: -.6, y: .3 }; break
  }
  if (silent && (channel === 'black' || channel === 'white')) beats = beats.slice(-1)
  const frames: Keyframe[] = [{ offset: 0, transform: transform({}, strength) }]
  for (const beat of beats) {
    const at = beat * beatMs
    frames.push(
      { offset: at / showcaseGrooveDuration, transform: transform({}, strength), easing: 'cubic-bezier(.12,.8,.2,1)' },
      { offset: (at + duration * .18) / showcaseGrooveDuration, transform: transform(punch, strength), easing: 'cubic-bezier(.2,0,.2,1)' },
      { offset: (at + duration * .58) / showcaseGrooveDuration, transform: transform(rebound, strength), easing: 'ease-out' },
      { offset: (at + duration) / showcaseGrooveDuration, transform: transform({}, strength) },
    )
  }
  frames.push({ offset: 1, transform: transform({}, strength) })
  return frames
}

export function createShowcaseGroove(root: HTMLElement, audio: GrooveAudio, clock: GrooveClock) {
  let showing = false, reduced = false, mobile = false, disposed = false, generation = 0
  let mode: GrooveMode = 'still', frame: number | null = null, silentStart = clock.now()
  let animations: Animation[] = []
  const clear = () => { generation++; if (frame !== null) clock.cancel(frame); frame = null; animations.forEach(animation => animation.cancel()); animations = [] }
  function selectMode(): GrooveMode {
    if (!showing || reduced || disposed) return 'still'
    return !audio.paused && !audio.ended && !audio.muted && audio.volume > 0 && Number.isFinite(audio.currentTime) ? 'audio' : 'silent'
  }
  function paint() {
    if (disposed) return
    const next = selectMode()
    if (mode !== next) {
      clear(); mode = next; root.dataset.grooveMode = mode; silentStart = clock.now()
    }
    if (mode === 'still') return
    if (!animations.length) {
      const strength = (mode === 'audio' ? 1 : .24) * (mobile ? .6 : 1)
      animations = Array.from(root.querySelectorAll<HTMLElement>('[data-groove]'), element => {
        const animation = element.animate(grooveFrames(element.dataset.groove!, Number(element.dataset.grooveIndex ?? 0), strength, mode === 'silent'), { duration: showcaseGrooveDuration, iterations: Infinity, fill: 'both' })
        return animation
      })
    }
    // Seeking, buffering, resumed tabs and audio loops all use the actual media clock.
    const time = mode === 'audio' ? Math.max(0, (audio.currentTime - showcaseGrooveTiming.beatOffset) * 1000) : Math.max(0, clock.now() - silentStart)
    // Let the compositor interpolate; correct against media time instead of accumulating ticks.
    animations.forEach(animation => {
      if (animation.currentTime === null || Math.abs(Number(animation.currentTime) - time) > 32) animation.currentTime = time
    })
    const run = generation
    frame = clock.request(() => { if (run !== generation || disposed) return; frame = null; paint() })
  }
  return {
    context(visible: boolean, lessMotion: boolean, smallScreen: boolean) {
      if (disposed) return
      const changed = showing !== visible || reduced !== lessMotion || mobile !== smallScreen
      showing = visible; reduced = lessMotion; mobile = smallScreen
      if (changed) { clear(); mode = 'still'; root.dataset.grooveMode = mode }
      if (frame === null) paint()
    },
    dispose() { disposed = true; clear(); root.dataset.grooveMode = 'still' },
  }
}
