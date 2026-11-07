import { normalizeKMNZMember, streamMembers } from './musicLibrary'
import type { Page } from '../types'
import type { MusicPlatform, YouTubeCategory, OriginalGroup, KMNZMember } from '../types/music'
import type { SpotifyCategory } from './musicViews'

// Temporarily hide HISTORY; set true to restore the page and navigation entry.
export const historyPageEnabled = false

export interface MusicRoute { platform: MusicPlatform; category: SpotifyCategory; youtubeCategory: YouTubeCategory; youtubeGroup: OriginalGroup | null; youtubeMember: KMNZMember | null; search: string; releaseSourceId: string | null }
export interface SiteRoute { page: Page; music: MusicRoute }
export const defaultMusicRoute: MusicRoute = { platform: 'youtube', category: 'all', youtubeCategory: 'all', youtubeGroup: null, youtubeMember: null, search: '', releaseSourceId: null }
export function parseSiteRoute(hash: string, releaseIds: ReadonlySet<string>): SiteRoute {
  const result: SiteRoute = { page: 'home', music: { ...defaultMusicRoute } }
  try {
    const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
    if (['mv', 'music', 'members', 'history', 'about'].includes(parts[0]) && parts.length === 1) result.page = parts[0] as Page
    if (parts[0] === 'members' && parts.length === 2 && /^[1-4]$/.test(parts[1])) result.page = ('member-' + parts[1]) as Page
    if (parts[0] === 'music' && (parts.length === 1 || parts[1] === 'youtube' || parts[1] === 'spotify')) {
      result.page = 'music'
      const params = new URLSearchParams(query)
      result.music.platform = parts[1] === 'spotify' ? 'spotify' : 'youtube'
      const category = params.get('category')
      if (result.music.platform === 'spotify') result.music.category = 'all'
      else {
        result.music.youtubeCategory = category === 'original' || category === 'cover' || category === 'stream' ? category : 'all'
        const group = params.get('group'), member = params.get('member')
        if (category === 'original' && (group === 'lita-liz' || group === 'lita-tina-nero')) result.music.youtubeGroup = group
        if (category === 'cover') result.music.youtubeMember = normalizeKMNZMember(member)
        if (category === 'stream') {
          const normalized = normalizeKMNZMember(member)
          result.music.youtubeMember = normalized && streamMembers.includes(normalized) ? normalized : null
        }
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
    // Old Spotify category links now resolve to the full library.
  } else if (music.youtubeCategory === 'original' || music.youtubeCategory === 'cover' || music.youtubeCategory === 'stream') {
    params.set('category', music.youtubeCategory)
    if (music.youtubeCategory === 'original' && (music.youtubeGroup === 'lita-liz' || music.youtubeGroup === 'lita-tina-nero')) params.set('group', music.youtubeGroup)
    if ((music.youtubeCategory === 'cover' || (music.youtubeCategory === 'stream' && streamMembers.includes(music.youtubeMember!))) && music.youtubeMember) params.set('member', music.youtubeMember)
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
    case 'spotify': return route.platform === 'spotify' ? { ...route, category: 'all' } : route
    case 'youtube': return route.platform === 'youtube' ? { ...route, youtubeCategory: route.youtubeCategory === action.value ? 'all' : action.value, youtubeGroup: null, youtubeMember: null } : route
    case 'group': return action.value !== 'special' && route.platform === 'youtube' && route.youtubeCategory === 'original' ? { ...route, youtubeGroup: route.youtubeGroup === action.value ? null : action.value } : route
    case 'member': return route.platform === 'youtube' && (route.youtubeCategory === 'cover' || (route.youtubeCategory === 'stream' && streamMembers.includes(action.value))) ? { ...route, youtubeMember: route.youtubeMember === action.value ? null : action.value } : route
  }
}


export const playlistMemoryKey = 'kmnzPlaylist:v1'
export const playbackBrowseKey = 'kmnzPlaybackBrowse:v1'
export interface MusicMemory { route: MusicRoute; scroll: number; panelScroll: number; sourceIds: string[] }
export function parseMusicMemory(raw: string | null, releases: ReadonlySet<string>): MusicMemory | null {
  try {
    const value = JSON.parse(raw ?? 'null')
    if (!value || typeof value.hash !== 'string' || !value.hash.startsWith('#/music/')) return null
    const parsed = parseSiteRoute(value.hash, releases)
    if (parsed.page !== 'music') return null
    const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, 10000000) : 0
    return { route: parsed.music, scroll: number(value.scroll), panelScroll: number(value.panelScroll), sourceIds: Array.isArray(value.sourceIds) ? value.sourceIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 2000) : [] }
  } catch { return null }
}
export function readMusicMemory(releases: ReadonlySet<string>, key = playlistMemoryKey): MusicMemory | null {
  try { return parseMusicMemory(sessionStorage.getItem(key), releases) } catch { return null }
}
export function saveMusicMemory(route: MusicRoute, key = playlistMemoryKey, sourceIds: string[] = []): MusicMemory {
  const memory = { route: { ...route }, scroll: typeof window === 'undefined' ? 0 : window.scrollY, panelScroll: typeof document === 'undefined' ? 0 : document.querySelector('.music-release-pane')?.scrollTop ?? 0, sourceIds }
  try { sessionStorage.setItem(key, JSON.stringify({ hash: siteRouteHash({ page: 'music', music: route }), scroll: memory.scroll, panelScroll: memory.panelScroll, sourceIds })) } catch { /* unavailable */ }
  return memory
}
