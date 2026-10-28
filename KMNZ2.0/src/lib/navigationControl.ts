export interface NavigationRect { left: number; top: number; width: number; height: number }
interface Viewport { width: number; height: number }
export const navigationRevealDistance = 48

export function placeNavigationControl(button: NavigationRect, header: { top: number }, hidden: boolean, viewport: Viewport, previous: NavigationRect): NavigationRect {
  const measured = button.width > 0 && button.height > 0
    ? { ...button, top: hidden ? button.top - header.top : button.top } : previous
  if (!hidden) return measured
  return { ...measured,
    left: Math.max(0, Math.min(measured.left, viewport.width - measured.width)),
    top: Math.max(0, Math.min(measured.top, viewport.height - measured.height)),
  }
}

export function isNearNavigationControl(point: { x: number; y: number }, rect: NavigationRect, viewport: Viewport): boolean {
  if (point.x < 0 || point.y < 0 || point.x > viewport.width || point.y > viewport.height) return false
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.left - rect.width)
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.top - rect.height)
  return Math.hypot(dx, dy) <= navigationRevealDistance
}
