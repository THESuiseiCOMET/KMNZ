import { normalizeKMNZMember } from './musicLibrary'
import type { Page } from '../types'
import type { MusicPlatform, YouTubeCategory, OriginalGroup, KMNZMember } from '../types/music'
import type { SpotifyCategory } from './musicViews'

export interface MusicRoute { platform: MusicPlatform; category: SpotifyCategory; youtubeCategory: YouTubeCategory; youtubeGroup: OriginalGroup | null; youtubeMember: KMNZMember | null; search: string; releaseSourceId: string | null }
export interface SiteRoute { page: Page; music: MusicRoute }
export const defaultMusicRoute: MusicRoute = { platform: 'youtube', category: 'all', youtubeCategory: 'all', youtubeGroup: null, youtubeMember: null, search: '', releaseSourceId: null }
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
      if (result.music.platform === 'spotify') result.music.category = category === 'albums' || category === 'ep' ? category : 'all'
      else {
        result.music.youtubeCategory = category === 'original' || category === 'cover' ? category : 'all'
        const group = params.get('group'), member = params.get('member')
        if (category === 'original' && (group === 'lita-liz' || group === 'lita-tina-nero')) result.music.youtubeGroup = group
        if (category === 'cover') result.music.youtubeMember = normalizeKMNZMember(member)
      }
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
  if (music.platform === 'spotify') {
    if (music.category === 'albums' || music.category === 'ep') params.set('category', music.category)
  } else if (music.youtubeCategory === 'original' || music.youtubeCategory === 'cover') {
    params.set('category', music.youtubeCategory)
    if (music.youtubeCategory === 'original' && (music.youtubeGroup === 'lita-liz' || music.youtubeGroup === 'lita-tina-nero')) params.set('group', music.youtubeGroup)
    if (music.youtubeCategory === 'cover' && music.youtubeMember) params.set('member', music.youtubeMember)
  }
  if (music.search) params.set('q', music.search)
  return path + (params.size ? '?' + params.toString() : '')
}

export type MusicFilterAction = { type: 'platform'; value: MusicPlatform }
  | { type: 'spotify'; value: Exclude<SpotifyCategory, 'all'> }
  | { type: 'youtube'; value: Exclude<YouTubeCategory, 'all'> }
  | { type: 'group'; value: OriginalGroup }
  | { type: 'member'; value: KMNZMember }

export function changeMusicFilter(route: MusicRoute, action: MusicFilterAction): MusicRoute {
  switch (action.type) {
    case 'platform': return action.value === route.platform ? route : { ...route, platform: action.value, category: 'all', youtubeCategory: 'all', youtubeGroup: null, youtubeMember: null, releaseSourceId: null }
    case 'spotify': return route.platform === 'spotify' ? { ...route, category: route.category === action.value ? 'all' : action.value } : route
    case 'youtube': return route.platform === 'youtube' ? { ...route, youtubeCategory: route.youtubeCategory === action.value ? 'all' : action.value, youtubeGroup: null, youtubeMember: null } : route
    case 'group': return action.value !== 'special' && route.platform === 'youtube' && route.youtubeCategory === 'original' ? { ...route, youtubeGroup: route.youtubeGroup === action.value ? null : action.value } : route
    case 'member': return route.platform === 'youtube' && route.youtubeCategory === 'cover' ? { ...route, youtubeMember: route.youtubeMember === action.value ? null : action.value } : route
  }
}
