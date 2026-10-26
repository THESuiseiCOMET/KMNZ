import { getEmbedUrl } from '../data/music'
import type { MusicEntry } from '../data/music'

interface PlayerDockProps {
  entry: MusicEntry
  onClose: () => void
}

export default function PlayerDock({ entry, onClose }: PlayerDockProps) {
  const isYoutube = entry.platform === 'youtube'
  const embedUrl = getEmbedUrl(entry)

  return (
    <aside className="music-player-panel" aria-label="当前音乐播放器">
      <div className="music-player-heading">
        <div className="music-player-heading-text">
          <span className="music-player-kicker">{isYoutube ? 'YOUTUBE · OFFICIAL PLAYER' : 'SPOTIFY · OFFICIAL EMBED'}</span>
          <strong title={entry.title}>{entry.title}</strong>
        </div>
        <div className="music-player-actions">
          <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer" title="在官方平台打开">
            <span className="sr-only">在官方平台打开 {entry.title}</span>
            ↗
          </a>
          <button type="button" onClick={onClose} aria-label="关闭播放器并停止播放" title="关闭播放器">
            ×
          </button>
        </div>
      </div>
      <div className={isYoutube ? 'music-player-frame youtube-frame' : 'music-player-frame spotify-frame'}>
        <iframe
          key={entry.id}
          title={entry.title + ' · ' + entry.platform + ' 播放器'}
          src={embedUrl}
          allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="music-player-hint">
        <span>切换站内页面不会关闭此播放器</span>
        <span>若未自动开始，请点击播放器内的播放键</span>
      </div>
    </aside>
  )
}
