import { useMemo, useState } from 'react'
import { musicCatalog } from '../data/music'
import type { MusicEntry, MusicPlatform } from '../data/music'

type PlatformFilter = 'all' | MusicPlatform
type EraFilter = 'all' | 'new' | 'classic'

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
  const [platform, setPlatform] = useState<PlatformFilter>('all')
  const [era, setEra] = useState<EraFilter>('all')

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return musicCatalog
      .filter((item) => platform === 'all' || item.platform === platform)
      .filter((item) => era === 'all' || item.era === era)
      .filter((item) => {
        if (!query) return true
        return [item.title, item.subtitle, item.artist, String(item.year), sourceLabel[item.platform]]
          .some((value) => value.toLocaleLowerCase().includes(query))
      })
      .sort((a, b) => b.year - a.year)
  }, [search, platform, era])

  return (
    <section className="page-section music-library" aria-labelledby="music-title">
      <div className="music-heading">
        <div>
          <p className="music-eyebrow">KMNZ MUSIC ARCHIVE</p>
          <h2 id="music-title">音乐资料库</h2>
          <p className="music-intro">通过官方 YouTube 和 Spotify 播放器探索 KMNZ 的作品。当前收录精选条目，后续继续扩充。</p>
        </div>
        <div className="music-total" aria-label={'当前收录 ' + musicCatalog.length + ' 条音乐索引'}>
          <strong>{musicCatalog.length.toString().padStart(2, '0')}</strong>
          <span>INDEXED</span>
        </div>
      </div>

      <div className="music-toolbar">
        <label className="music-search">
          <span className="sr-only">搜索歌曲</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索歌曲、年份、制作人…"
          />
        </label>

        <div className="music-filters" aria-label="平台筛选">
          {([
            ['all', '全部平台'],
            ['youtube', 'YouTube'],
            ['spotify', 'Spotify'],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={platform === value}
              className={platform === value ? 'music-filter active' : 'music-filter'}
              onClick={() => setPlatform(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="music-filters" aria-label="时期筛选">
          {([
            ['all', '全部时期'],
            ['new', '新生 KMNZ'],
            ['classic', '经典 KMNZ'],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={era === value}
              className={era === value ? 'music-filter active' : 'music-filter'}
              onClick={() => setEra(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="music-list-heading">
        <h3>精选作品</h3>
        <span>找到 {filtered.length} 条结果</span>
      </div>
      {filtered.length > 0 ? (
        <div className="music-grid">
          {filtered.map((item) => (
            <article className={selectedId === item.id ? 'music-card selected' : 'music-card'} key={item.id}>
              <div className={'music-art music-art-' + item.platform}>
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
                <span className="music-source">{sourceLabel[item.platform]}</span>
              </div>
              <div className="music-card-body">
                <div className="music-card-meta">{item.year} · {item.kind === 'album' ? 'ALBUM' : item.kind === 'mv' ? 'MV' : 'TRACK'}</div>
                <h4>{item.title}</h4>
                <p>{item.subtitle}</p>
                <div className="music-card-actions">
                  <button type="button" className="music-play" onClick={() => onSelect(item)}>
                    {selectedId === item.id ? '正在浏览' : '▶ 播放'}
                  </button>
                  <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external">
                    官方页面 <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="music-empty" role="status">
          <strong>没有找到匹配的音乐</strong>
          <p>试试更短的关键词，或重置筛选条件。</p>
          <button type="button" onClick={() => { setSearch(''); setPlatform('all'); setEra('all') }}>清除筛选</button>
        </div>
      )}
      <p className="music-notice">本站只提供官方平台播放入口；能否完整播放取决于版权、地区、登录状态及平台限制。点击播放后请使用平台播放器内的控制按钮。</p>
    </section>
  )
}
