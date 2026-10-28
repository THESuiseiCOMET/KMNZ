export interface PlayerPosition { x: number; y: number }

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const remainder = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`
}

export function clampPlayerPosition(position: PlayerPosition, size: { width: number; height: number }, viewport: { left: number; top: number; width: number; height: number }): PlayerPosition {
  const left = viewport.left + 12
  const top = viewport.top + 12
  return {
    x: Math.max(left, Math.min(position.x, Math.max(left, viewport.left + viewport.width - size.width - 12))),
    y: Math.max(top, Math.min(position.y, Math.max(top, viewport.top + viewport.height - size.height - 12))),
  }
}
