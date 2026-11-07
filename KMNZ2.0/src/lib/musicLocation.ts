import { createMusicViews } from './musicViews'
import { defaultMusicRoute } from './siteRoute'
import type { MusicRoute } from './siteRoute'
import type { MusicEntry, MusicLibrary } from '../types/music'
import type { QueueItem } from '../types/playback'

export interface MusicLocation { route: MusicRoute; cardId: string; sourceId?: string; discNumber?: number; trackNumber?: number }
export interface MusicLocateRequest { id: number; location: MusicLocation }

export function findMusicLocation(library: MusicLibrary, catalog: MusicEntry[], current: QueueItem, preferred: MusicRoute, observedUri?: string): MusicLocation | null {
  const source = library.sources.find(item => item.id === current.sourceId)
  if (!source) return null
  const views = createMusicViews(library, catalog)
  const selectedAlbum = current.releaseId && preferred.platform === 'spotify' ? library.releases.find(item => item.id === current.releaseId && item.tracks.some(track => track.sourceIds.includes(source.id))) : undefined
  if (source.platform === 'youtube' && !selectedAlbum) {
    const route = preferred.platform === 'youtube' ? { ...preferred, releaseSourceId: null } : { ...defaultMusicRoute }
    if (views.youtubeCards(route.search, route.youtubeCategory, route.youtubeGroup, route.youtubeMember).some(item => item.id === source.id)) return { route, cardId: source.id }
    if (!views.youtubeCards('').some(item => item.id === source.id)) return null
    return { route: { ...defaultMusicRoute }, cardId: source.id }
  }
  const allCards = views.spotifyCards('')
  let sourceId = source.id
  const uriId = observedUri?.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1]
  const observed = uriId ? library.sources.find(item => item.platform === 'spotify' && item.kind === 'track' && item.platformId === uriId) : undefined
  const activeRelease = current.releaseId ?? source.target.releaseId
  if (observed && source.kind === 'album' && library.releases.find(r => r.id === activeRelease)?.tracks.some(track => track.sourceIds.includes(observed.id))) sourceId = observed.id
  let card = allCards.find(item => item.id === sourceId)
  let release = activeRelease ? library.releases.find(item => item.id === activeRelease) : undefined
  if (!release && source.kind === 'track') release = library.releases.find(item => item.tracks.some(track => track.sourceIds.includes(sourceId)))
  if (!card && release) card = allCards.find(item => library.sources.find(s => s.id === item.id)?.target.releaseId === release.id)
  if (!card) card = allCards.find(item => item.id === source.id)
  if (!card) return null
  const track = release?.tracks.find(item => item.sourceIds.includes(sourceId) && (current.discNumber === undefined || current.discNumber === item.discNumber) && (current.trackNumber === undefined || current.trackNumber === item.trackNumber))
  const keepsFilters = preferred.platform === 'spotify' && (preferred.releaseSourceId === card.id || views.spotifyCards(preferred.search, preferred.category).some(item => item.id === card.id))
  const expandable = Boolean(views.releaseDetail(card.id))
  const route: MusicRoute = { ...(keepsFilters ? preferred : defaultMusicRoute), platform: 'spotify', releaseSourceId: expandable && (track || preferred.releaseSourceId === card.id) ? card.id : null }
  return { route, cardId: card.id, ...(track && expandable ? { sourceId, discNumber: track.discNumber, trackNumber: track.trackNumber } : {}) }
}
