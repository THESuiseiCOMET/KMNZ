import { useEffect, useRef } from 'react'
import type { MusicEntry } from '../data/music'
import type { ReleaseView } from '../lib/musicViews'
import { getMusicMetadata } from '../data/musicMetadata'
import { musicDate } from '../lib/musicMetadata'
import MusicCover from './MusicCover'
import playIcon from '../assets/icons/play.svg'
import externalIcon from '../assets/icons/external-link.svg'
import spotifyIcon from '../assets/icons/brand-spotify.svg'

const releaseLabels = { album: '专辑', ep: 'EP', single: '单曲', compilation: '精选集', unknown: '发行' }

export default function MusicReleaseDetail({ detail, selectedId, onSelect, onBack }: {
  detail: ReleaseView
  selectedId: string | null
  onSelect: (entry: MusicEntry, position?: { discNumber: number; trackNumber: number }) => void
  onBack: () => void
}) {
  const { entry, release, tracks } = detail
  const metadata = getMusicMetadata(entry)
  const date = musicDate(entry, metadata)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [entry.id])
  const multipleDiscs = new Set(tracks.map(track => track.discNumber)).size > 1 || tracks.some(track => track.discNumber > 1)

  return (
    <section className="music-release-detail" aria-labelledby="music-release-title">
      <button type="button" className="music-release-back" onClick={onBack}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        返回 Spotify
      </button>
      <div className="music-release-header">
        <div className="music-art music-art-spotify music-release-cover">
          <MusicCover entry={entry} metadata={metadata} />
        </div>
        <div className="music-release-info">
          <p className="music-release-meta">{releaseLabels[release.kind]} · {release.artist}</p>
          <h2 id="music-release-title" tabIndex={-1} ref={heading}>{release.title}</h2>
          {date && <time className="music-release-date" dateTime={date.dateTime}>{date.label}</time>}
          <div className="music-card-actions">
            <button type="button" className="music-play" onClick={() => onSelect(entry)} aria-label={'播放 ' + entry.title}>
              <span className="music-card-icon" style={{ maskImage: `url("${playIcon}")`, WebkitMaskImage: `url("${playIcon}")` }} aria-hidden="true" />
              播放
            </button>
            <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer" className="music-release-official" aria-label={'在 Spotify 打开 ' + entry.title}>
              <span className="music-source-mark" role="img" aria-label="Spotify" style={{ maskImage: `url("${spotifyIcon}")`, WebkitMaskImage: `url("${spotifyIcon}")` }} />
              Spotify
            </a>
          </div>
        </div>
      </div>
      <div className="music-release-tracks">
        <h3>{release.tracklistStatus === 'partial' ? '已确认曲目' : '曲目'}</h3>
        {tracks.length ? (
          <ol className="music-track-list">
            {tracks.map(track => (
              <li className={track.playback?.id === selectedId ? 'music-track selected' : 'music-track'} key={track.discNumber + ':' + track.trackNumber}>
                <span className="music-track-number">{multipleDiscs ? track.discNumber + '·' : ''}{track.trackNumber}</span>
                <span className="music-track-title">{track.song.title}</span>
                {track.playback && <div className="music-track-actions">
                  <button type="button" className="music-play" onClick={() => onSelect(track.playback!, { discNumber: track.discNumber, trackNumber: track.trackNumber })} aria-label={'播放 ' + track.song.title}>
                    <span className="music-card-icon" style={{ maskImage: `url("${playIcon}")`, WebkitMaskImage: `url("${playIcon}")` }} aria-hidden="true" />
                    播放
                  </button>
                  <a href={track.playback.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external" aria-label={'在 ' + (track.playback.platform === 'spotify' ? 'Spotify' : 'YouTube') + ' 打开 ' + track.song.title}>
                    <span className="music-card-icon" style={{ maskImage: `url("${externalIcon}")`, WebkitMaskImage: `url("${externalIcon}")` }} aria-hidden="true" />
                  </a>
                </div>}
              </li>
            ))}
          </ol>
        ) : <p className="music-release-empty" role="status">曲目待确认</p>}
      </div>
    </section>
  )
}
