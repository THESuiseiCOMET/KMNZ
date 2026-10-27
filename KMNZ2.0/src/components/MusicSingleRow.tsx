import type { MusicEntry } from '../data/music'
import type { MusicRelease } from '../types/music'
import { getMusicMetadata } from '../data/musicMetadata'
import { musicDate } from '../lib/musicMetadata'
import MusicCover from './MusicCover'
import playIcon from '../assets/icons/play.svg'
import externalIcon from '../assets/icons/external-link.svg'
import spotifyIcon from '../assets/icons/brand-spotify.svg'

export default function MusicSingleRow({ entry, release, selectedId, onSelect, onOpen, coverRef, onOpenAlbum, albumRef }: {
  entry: MusicEntry
  release?: MusicRelease
  selectedId: string | null
  onSelect: (entry: MusicEntry) => void
  onOpen?: () => void
  onOpenAlbum?: () => void
  albumRef?: (node: HTMLButtonElement | null) => void
  coverRef?: (node: HTMLButtonElement | null) => void
}) {
  const metadata = getMusicMetadata(entry)
  const date = musicDate(entry, metadata)
  const album = entry.kind === 'track' ? release?.title : undefined
  return (
    <article className={selectedId === entry.id ? 'music-single-row selected' : 'music-single-row'}>
      <button type="button" className="music-art music-art-spotify music-single-cover" onClick={onOpen ?? (() => onSelect(entry))}
        aria-label={onOpen ? '查看 ' + entry.title + ' 详情' : '播放 ' + entry.title} ref={coverRef}>
        <MusicCover entry={entry} metadata={metadata} />
      </button>
      <div className="music-single-info">
        <h3 title={entry.title}>{onOpen ? <button type="button" className="music-release-title-button" onClick={onOpen}>{entry.title}</button> : entry.title}</h3>
        <div className="music-single-meta">
          <span className="music-source-mark" role="img" aria-label="Spotify" style={{ maskImage: `url("${spotifyIcon}")`, WebkitMaskImage: `url("${spotifyIcon}")` }} />
          {album && (onOpenAlbum ? <button type="button" className="music-single-album music-single-album-button" title={album} aria-label={'查看 ' + album + ' 详情'} onClick={onOpenAlbum} ref={albumRef}>{album}</button> : <span className="music-single-album" title={album}>{album}</span>)}
          {album && date && <span className="music-single-separator" aria-hidden="true">·</span>}
          {date && <time dateTime={date.dateTime}>{date.label}</time>}
        </div>
      </div>
      <div className="music-single-actions">
        <button type="button" className="music-play music-single-play" onClick={() => onSelect(entry)} aria-label={'播放 ' + entry.title} title={'播放 ' + entry.title}>
          <span className="music-card-icon" style={{ maskImage: `url("${playIcon}")`, WebkitMaskImage: `url("${playIcon}")` }} aria-hidden="true" />
        </button>
        <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external" aria-label={'在 Spotify 打开 ' + entry.title} title="在 Spotify 打开">
          <span className="music-card-icon" style={{ maskImage: `url("${externalIcon}")`, WebkitMaskImage: `url("${externalIcon}")` }} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}
