export interface PlayerPosition { x: number; y: number }

export function clampPlayerPosition(position: PlayerPosition, size: { width: number; height: number }, viewport: { left: number; top: number; width: number; height: number }): PlayerPosition {
  const left = viewport.left + 12
  const top = viewport.top + 12
  return {
    x: Math.max(left, Math.min(position.x, Math.max(left, viewport.left + viewport.width - size.width - 12))),
    y: Math.max(top, Math.min(position.y, Math.max(top, viewport.top + viewport.height - size.height - 12))),
  }
}
