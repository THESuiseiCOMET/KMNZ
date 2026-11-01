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


export function prepareVisibleMusicContent(root: ParentNode = document, viewport: TransitionViewport = { width: window.innerWidth, height: window.innerHeight }): () => void {
  const clearCards = prepareVisibleMusicCards(root, viewport)
  const elements = Array.from(root.querySelectorAll<HTMLElement>('.music-toolbar, .music-release-pane, .music-empty'))
  const visible = elements.filter(element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width
  })
  for (const element of elements) element.toggleAttribute('data-music-transition-chrome', visible.includes(element))
  return () => { clearCards(); for (const element of elements) element.removeAttribute('data-music-transition-chrome') }
}


export function afterContentTransition(callback: () => void, root: Element = document.documentElement): () => void {
  const transitioning = () => root.hasAttribute('data-page-transition') || root.hasAttribute('data-music-transition')
  if (!transitioning()) { callback(); return () => {} }
  let finished = false
  const observer = new MutationObserver(() => {
    if (finished || transitioning()) return
    finished = true
    observer.disconnect()
    callback()
  })
  observer.observe(root, { attributes: true, attributeFilter: ['data-page-transition', 'data-music-transition'] })
  return () => { finished = true; observer.disconnect() }
}
