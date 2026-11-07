export type ShowcasePhase = 'showcase' | 'entering' | 'console' | 'returning'
export const showcaseSessionKey = 'kmnzShowcaseEntered:v1'
export const showcaseDuration = 3000
export const showcasePosterExitDuration = 600
export const showcaseReducedDuration = 180

export function initialShowcasePhase(page: string, storage?: Pick<Storage, 'getItem'>): ShowcasePhase {
  if (page === 'members') return 'showcase'
  if (page !== 'home') return 'console'
  try { if (storage?.getItem(showcaseSessionKey) === '1') return 'console' } catch { /* unavailable */ }
  return 'showcase'
}

export function showcaseStep(phase: ShowcasePhase, action: 'enter' | 'return' | 'finish'): ShowcasePhase {
  if (action === 'enter' && phase === 'showcase') return 'entering'
  if (action === 'return' && phase === 'console') return 'returning'
  if (action === 'finish' && phase === 'entering') return 'console'
  if (action === 'finish' && phase === 'returning') return 'showcase'
  return phase
}
