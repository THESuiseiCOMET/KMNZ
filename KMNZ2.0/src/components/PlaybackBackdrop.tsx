import type { MusicEntry } from '../data/music'
import { getMusicMetadata } from '../data/musicMetadata'
import MusicCover from './MusicCover'

export default function PlaybackBackdrop({ entry, frosted = true }: { entry: MusicEntry | null; frosted?: boolean }) {
  if (!entry) return null
  return <div className={'playback-backdrop playback-backdrop-' + entry.platform + (frosted ? ' is-frosted' : ' is-clear')} aria-hidden="true">
    <div className="playback-backdrop-art" key={entry.id}>
      <MusicCover entry={entry} metadata={getMusicMetadata(entry)} />
    </div>
  </div>
}
