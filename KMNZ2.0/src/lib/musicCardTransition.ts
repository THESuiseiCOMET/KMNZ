interface TransitionViewport { width: number; height: number }

export function prepareVisibleMusicCards(root: ParentNode = document, viewport: TransitionViewport = { width: window.innerWidth, height: window.innerHeight }): () => void {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.music-card'))
  const visible = new Set(cards.filter(card => {
    const rect = card.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width
  }))
  for (const card of cards) card.toggleAttribute('data-music-transition-card', visible.has(card))
  return () => { for (const card of cards) card.removeAttribute('data-music-transition-card') }
}
