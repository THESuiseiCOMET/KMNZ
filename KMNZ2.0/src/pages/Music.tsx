import { useState } from 'react'
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
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase()
  const matches = musicCatalog.filter((entry) =>
    entry.title.toLocaleLowerCase().includes(query) ||
    entry.artist.toLocaleLowerCase().includes(query)
  )

  return (
    <div className="music-page">
      <label className="music-search-wrap">
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          type="search"
          aria-label="搜索音乐"
          placeholder="搜索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {platforms.map((platform) => {
        const items = matches.filter((entry) => entry.platform === platform.id)
        if (items.length === 0) return null
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
      {matches.length === 0 && <p className="music-no-results" role="status">没有找到相关音乐</p>}
    </div>
  )
}
