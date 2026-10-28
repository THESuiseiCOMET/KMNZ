import type { Page } from '../types'
import type { MusicPlatform } from '../types/music'
import type { SpotifyCategory } from './musicViews'

export interface MusicRoute { platform: MusicPlatform; category: SpotifyCategory; search: string; releaseSourceId: string | null }
export interface SiteRoute { page: Page; music: MusicRoute }
export const defaultMusicRoute: MusicRoute = { platform: 'youtube', category: 'all', search: '', releaseSourceId: null }
export function parseSiteRoute(hash: string, releaseIds: ReadonlySet<string>): SiteRoute {
  const result: SiteRoute = { page: 'home', music: { ...defaultMusicRoute } }
  try {
    const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
    if (['music', 'members', 'history', 'about'].includes(parts[0]) && parts.length === 1) result.page = parts[0] as Page
    if (parts[0] === 'members' && parts.length === 2 && /^[1-4]$/.test(parts[1])) result.page = ('member-' + parts[1]) as Page
    if (parts[0] === 'music' && (parts.length === 1 || parts[1] === 'youtube' || parts[1] === 'spotify')) {
      result.page = 'music'
      const params = new URLSearchParams(query)
      result.music.platform = parts[1] === 'spotify' ? 'spotify' : 'youtube'
      const category = params.get('category')
      result.music.category = category === 'albums' || category === 'ep' ? category : 'all'
      result.music.search = (params.get('q') ?? '').slice(0, 512)
      if (parts[1] === 'spotify' && parts[2] === 'release' && parts.length === 4 && releaseIds.has(parts[3])) result.music.releaseSourceId = parts[3]
    }
  } catch { return { page: 'home', music: { ...defaultMusicRoute } } }
  return result
}

export function siteRouteHash(route: SiteRoute): string {
  if (route.page.startsWith('member-')) return '#/members/' + route.page.slice(7)
  if (route.page !== 'music') return route.page === 'home' ? '#/' : '#/' + route.page
  const music = route.music
  let path = '#/music/' + music.platform
  if (music.platform === 'spotify' && music.releaseSourceId) path += '/release/' + encodeURIComponent(music.releaseSourceId)
  const params = new URLSearchParams()
  if (music.category !== 'all') params.set('category', music.category)
  if (music.search) params.set('q', music.search)
  return path + (params.size ? '?' + params.toString() : '')
}
