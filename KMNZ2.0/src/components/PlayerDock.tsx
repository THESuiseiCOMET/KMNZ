import { getEmbedUrl } from '../data/music'
import type { MusicEntry } from '../data/music'

interface PlayerDockProps {
  entry: MusicEntry
  onClose: () => void
}

export default function PlayerDock({ entry, onClose }: PlayerDockProps) {
  const isYoutube = entry.platform === 'youtube'
  const compactSpotify = entry.platform === 'spotify' && entry.kind === 'track'

  return (
    <aside className="music-player-panel" aria-label="当前音乐播放器">
      <div className="music-player-heading">
        <strong title={entry.title}>{entry.title}</strong>
        <div className="music-player-actions">
          <a
            href={entry.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="打开官方页面"
            aria-label={`在官方平台打开 ${entry.title}`}
          >↗</a>
          <button type="button" onClick={onClose} aria-label="关闭播放器并停止播放" title="关闭播放器">×</button>
        </div>
      </div>
      <div className={
        isYoutube
          ? 'music-player-frame youtube-frame'
          : 'music-player-frame spotify-frame' + (compactSpotify ? ' compact' : '')
      }>
        <iframe
          key={entry.id}
          title={`${entry.title} · ${entry.platform} 播放器`}
          src={getEmbedUrl(entry)}
          allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </aside>
  )
}
