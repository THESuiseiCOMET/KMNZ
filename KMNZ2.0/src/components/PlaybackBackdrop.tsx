import type { MusicEntry } from '../data/music'
import { getMusicMetadata } from '../data/musicMetadata'
import MusicCover from './MusicCover'
import type { PlayerPresentation } from '../lib/playbackPreferences'

export default function PlaybackBackdrop({ entry, presentation = 'cinema', frosted = false }: { entry: MusicEntry | null; presentation?: PlayerPresentation; frosted?: boolean }) {
  if (!entry || (presentation === 'cinema' && entry.platform === 'youtube')) return null
  return <div className={'playback-backdrop playback-backdrop-' + entry.platform + (frosted ? ' is-frosted' : '')} aria-hidden="true">
    <div className="playback-backdrop-art" key={entry.id}>
      <MusicCover entry={entry} metadata={getMusicMetadata(entry)} />
    </div>
  </div>
}
