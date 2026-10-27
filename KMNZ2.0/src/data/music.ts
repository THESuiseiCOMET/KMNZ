import { musicLibrary } from './musicLibrary'
import { toMusicCatalog } from '../lib/musicLibrary'
import type { MusicEntry } from '../types/music'

export type { MusicPlatform, MediaKind, MusicEra, MusicEntry } from '../types/music'

export const musicCatalog: MusicEntry[] = toMusicCatalog(musicLibrary)

export function getEmbedUrl(entry: MusicEntry): string {
  if (entry.platform === 'youtube') {
    return 'https://www.youtube.com/embed/' + entry.platformId + '?playsinline=1&rel=0&autoplay=1'
  }
  return 'https://open.spotify.com/embed/' + entry.kind + '/' + entry.platformId
}
