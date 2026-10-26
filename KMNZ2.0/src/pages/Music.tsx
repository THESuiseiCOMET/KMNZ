import { useMemo, useState } from 'react'
import { musicCatalog } from '../data/music'
import type { MusicEntry, MusicPlatform } from '../data/music'

interface MusicProps {
  selectedId: string | null
  onSelect: (entry: MusicEntry) => void
}

const sourceLabel: Record<MusicPlatform, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
}

export default function Music({ selectedId, onSelect }: MusicProps) {
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState<MusicPlatform>('youtube')

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return musicCatalog
      .filter((item) => item.platform === platform)
      .filter((item) => {
        if (!query) return true
        return [item.title, item.subtitle, item.artist, String(item.year), sourceLabel[item.platform]]
          .some((value) => value.toLocaleLowerCase().includes(query))
      })
      .sort((a, b) => b.year - a.year)
  }, [search, platform])

  return (
    <section className="page-section music-library" aria-label="音乐">
      <div className="music-toolbar">
        <label className="music-search">
          <span className="sr-only">搜索</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索"
          />
        </label>

        <div className="music-tabs" role="group" aria-label="音乐平台">
          {(['youtube', 'spotify'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={platform === value}
              className={platform === value ? 'music-tab active' : 'music-tab'}
              onClick={() => setPlatform(value)}
            >
              {sourceLabel[value]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="music-grid">
          {filtered.map((item) => (
            <article className={selectedId === item.id ? 'music-card selected' : 'music-card'} key={item.id}>
              <button
                type="button"
                className={'music-art music-art-' + item.platform}
                aria-label={'播放 ' + item.title}
                onClick={() => onSelect(item)}
              >
                {item.platform === 'youtube' ? (
                  <img
                    src={'https://i.ytimg.com/vi/' + item.platformId + '/mqdefault.jpg'}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span aria-hidden="true">♫</span>
                )}
              </button>
              <div className="music-card-body">
                <h3>{item.title}</h3>
                <div className="music-card-actions">
                  <button type="button" className="music-play" onClick={() => onSelect(item)} aria-label={'播放 ' + item.title}>
                    ▶ 播放
                  </button>
                  <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external" aria-label={'在 ' + sourceLabel[item.platform] + ' 打开 ' + item.title}>
                    官方链接 <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="music-empty" role="status">
          <p>未找到歌曲</p>
          <button type="button" onClick={() => setSearch('')}>清除搜索</button>
        </div>
      )}
    </section>
  )
}
