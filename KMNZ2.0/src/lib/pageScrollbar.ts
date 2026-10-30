export function scrollbarGeometry(scrollTop: number, viewportHeight: number, contentHeight: number, trackHeight: number) {
  const track = Math.max(0, trackHeight)
  const maximum = Math.max(0, contentHeight - viewportHeight)
  const position = Math.max(0, Math.min(scrollTop, maximum))
  const thumbHeight = Math.min(track, Math.max(32, contentHeight > 0 ? track * viewportHeight / contentHeight : track))
  const travel = track - thumbHeight
  return { maximum, position, thumbHeight, travel, thumbTop: maximum > 0 ? travel * position / maximum : 0 }
}

export function scrollFromThumb(top: number, maximum: number, travel: number): number {
  return travel > 0 ? Math.max(0, Math.min(top / travel, 1)) * maximum : 0
}

export function scrollForKey(key: string, current: number, viewport: number, maximum: number): number | null {
  const next = key === 'ArrowDown' ? current + 40 : key === 'ArrowUp' ? current - 40
    : key === 'PageDown' ? current + viewport * .9 : key === 'PageUp' ? current - viewport * .9
      : key === 'Home' ? 0 : key === 'End' ? maximum : null
  return next === null ? null : Math.max(0, Math.min(next, maximum))
}
