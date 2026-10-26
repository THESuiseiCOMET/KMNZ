import { musicCatalog } from '../data/music'
import type { MusicEntry } from '../data/music'

export interface PlayerPosition { x: number; y: number }

export function adjacentTrack(current: MusicEntry, direction: -1 | 1): MusicEntry {
  const queue = musicCatalog.filter((item) => item.platform === current.platform).sort((a, b) => b.year - a.year)
  const index = queue.findIndex((item) => item.id === current.id)
  if (index < 0 || queue.length === 0) return current
  return queue[(index + direction + queue.length) % queue.length]
}

export function clampPlayerPosition(position: PlayerPosition, size: { width: number; height: number }, viewport: { left: number; top: number; width: number; height: number }): PlayerPosition {
  const left = viewport.left + 12
  const top = viewport.top + 12
  return {
    x: Math.max(left, Math.min(position.x, Math.max(left, viewport.left + viewport.width - size.width - 12))),
    y: Math.max(top, Math.min(position.y, Math.max(top, viewport.top + viewport.height - size.height - 12))),
  }
}

export function playbackFinished(state: { position: number; duration: number; isPaused: boolean; isBuffering: boolean }, hasPlayed: boolean): boolean {
  return hasPlayed && !state.isBuffering && Number.isFinite(state.duration) && state.duration > 0
    && Number.isFinite(state.position)
    && (state.position >= state.duration || (state.isPaused && state.position >= state.duration - 50))
}
