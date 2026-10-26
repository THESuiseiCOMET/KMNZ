import { musicCatalog } from '../data/music'
import type { MusicEntry, MusicPlatform } from '../data/music'

interface MusicProps {
  selectedId: string | null
  onSelect: (entry: MusicEntry) => void
}

const platforms: { id: MusicPlatform; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'spotify', label: 'Spotify' },
]

function MusicRow({
  entry,
  active,
  onSelect,
}: {
  entry: MusicEntry
  active: boolean
  onSelect: (entry: MusicEntry) => void
}) {
  return (
    <article className={active ? 'music-row active' : 'music-row'}>
      <button
        type="button"
        className="music-row-main"
        aria-label={`播放 ${entry.title}（${entry.platform === 'youtube' ? 'YouTube' : 'Spotify'}）`}
        aria-pressed={active}
        onClick={() => onSelect(entry)}
      >
        <span className={'music-row-cover ' + (entry.platform === 'spotify' ? 'spotify' : 'youtube')}>
          {entry.platform === 'youtube' ? (
            <img
              src={`https://i.ytimg.com/vi/${entry.platformId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden="true">♫</span>
          )}
        </span>
        <span className="music-row-title">{entry.title}</span>
        <span className="music-row-play" aria-hidden="true">{active ? '♫' : '▶'}</span>
      </button>
      <a
        className="music-row-external"
        href={entry.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`在 ${entry.platform === 'youtube' ? 'YouTube' : 'Spotify'} 打开 ${entry.title}`}
        title="打开官方页面"
      >↗</a>
    </article>
  )
}

export default function Music({ selectedId, onSelect }: MusicProps) {
  return (
    <div className="music-page">
      {platforms.map((platform) => {
        const items = musicCatalog.filter((entry) => entry.platform === platform.id)
        return (
          <section key={platform.id} className="music-platform-section" aria-labelledby={`music-${platform.id}`}>
            <h2 id={`music-${platform.id}`} className="music-platform-heading">{platform.label}</h2>
            <div className="music-rows">
              {items.map((entry) => (
                <MusicRow
                  key={entry.id}
                  entry={entry}
                  active={selectedId === entry.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
