export const peekEnterMs = 420
export const peekHoldMs = 1000
export const peekLeaveMs = 300
export const peekScrollMs = 650

export function peekScrollTop(start: number, elapsed: number): number {
  if (!Number.isFinite(start) || start <= 0) return 0
  const progress = Math.max(0, Math.min(1, elapsed / peekScrollMs))
  return start * (1 - progress) ** 3
}

export interface PeekState {
  phase: 'hidden' | 'entering' | 'visible' | 'leaving'
  hovered: boolean
  focused: boolean
  autoId: number | null
}
export const initialPeek: PeekState = { phase: 'hidden', hovered: false, focused: false, autoId: null }
type PeekAction = { type: 'auto'; id: number } | { type: 'cancel-auto' }
  | { type: 'hover' | 'focus'; value: boolean } | { type: 'entered' | 'left' | 'reset' }
  | { type: 'expire'; id: number }

export function peekReducer(state: PeekState, action: PeekAction): PeekState {
  if (action.type === 'reset') return initialPeek
  if (action.type === 'auto') return { ...state, autoId: action.id, phase: state.phase === 'visible' ? 'visible' : 'entering' }
  if (action.type === 'cancel-auto') return state.autoId === null ? state
    : { ...state, autoId: null, phase: state.hovered || state.focused ? state.phase : 'hidden' }
  if (action.type === 'hover' || action.type === 'focus') {
    const key = action.type === 'hover' ? 'hovered' : 'focused'
    if (state[key] === action.value) return state
    const next = { ...state, [key]: action.value }
    if (next.hovered || next.focused) return { ...next, phase: state.phase === 'hidden' || state.phase === 'leaving' ? 'entering' : state.phase }
    return { ...next, autoId: null, phase: state.phase === 'hidden' ? 'hidden' : 'leaving' }
  }
  if (action.type === 'entered') return state.phase === 'entering' ? { ...state, phase: 'visible' } : state
  if (action.type === 'left') return state.phase === 'leaving' ? { ...state, phase: 'hidden', autoId: null } : state
  if (action.type === 'expire' && state.autoId === action.id && !state.hovered && !state.focused) return { ...state, phase: 'leaving', autoId: null }
  return state
}

interface Viewport { width: number; height: number }
interface PlayerRect { left: number; right: number; top: number; bottom: number }

export function isThemePeekPoint(point: { x: number; y: number }, viewport: Viewport, image?: PlayerRect, animatedImage?: PlayerRect): boolean {
  if (point.x < 0 || point.y < 0 || point.x > viewport.width || point.y > viewport.height) return false
  return [image, animatedImage].some(rect => rect && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom)
}

export function placeThemePeek(viewport: Viewport, player?: PlayerRect) {
  const size = Math.min(240, Math.max(160, viewport.width * .22), viewport.width * .48)
  const base = { right: 8, bottom: 0, size, layer: 120 }
  if (!player || player.right <= viewport.width - size - 8 || player.bottom <= viewport.height - size) return base
  const leftSpace = player.left - 20
  const topSpace = player.top - 16
  if (leftSpace >= size) return { ...base, right: viewport.width - player.left + 12 }
  if (topSpace >= size) return { ...base, bottom: viewport.height - player.top + 8 }
  if (leftSpace >= 96 && leftSpace > topSpace) return { ...base, size: Math.min(size, leftSpace), right: viewport.width - player.left + 12 }
  if (topSpace >= 96) return { ...base, size: Math.min(size, topSpace), bottom: viewport.height - player.top + 8 }
  return { ...base, layer: 90 }
}
