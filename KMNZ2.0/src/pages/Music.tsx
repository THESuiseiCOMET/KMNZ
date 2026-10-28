import { useEffect, useMemo, useRef, useState } from 'react'
import { musicCatalog } from '../data/music'
import type { MusicEntry, MusicPlatform } from '../data/music'
import { musicLibrary } from '../data/musicLibrary'
import { createMusicViews } from '../lib/musicViews'
import type { SpotifyCategory } from '../lib/musicViews'
import { createQueueSelections } from '../lib/playbackQueue'
import type { PlaybackSelection } from '../types/playback'
import { defaultMusicRoute } from '../lib/siteRoute'
import type { MusicRoute } from '../lib/siteRoute'
import playIcon from '../assets/icons/play.svg'
import youtubeIcon from '../assets/icons/brand-youtube.svg'
import spotifyIcon from '../assets/icons/brand-spotify.svg'
import MusicCover from '../components/MusicCover'
import MusicReleaseDetail from '../components/MusicReleaseDetail'
import { getMusicMetadata, sortMusicByDate } from '../data/musicMetadata'
import { musicDate } from '../lib/musicMetadata'

interface MusicProps {
  selectedId: string | null
  onSelect: (selection: PlaybackSelection) => void
  route?: MusicRoute
  onRouteChange?: (route: MusicRoute, replace?: boolean) => void
  onReleaseBack?: () => void
}

const sourceLabel: Record<MusicPlatform, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
}
const views = createMusicViews(musicLibrary, musicCatalog)
const queueSelections = createQueueSelections(musicLibrary)

export default function Music({ selectedId, onSelect, route, onRouteChange, onReleaseBack }: MusicProps) {
  const [localRoute, setLocalRoute] = useState<MusicRoute>(defaultMusicRoute)
  const currentRoute = route ?? localRoute
  const { search, platform, category: spotifyCategory, releaseSourceId } = currentRoute
  function updateRoute(patch: Partial<MusicRoute>, replace = false) {
    const next = { ...currentRoute, ...patch }
    if (onRouteChange) onRouteChange(next, replace)
    else setLocalRoute(next)
  }
  const setReleaseSourceId = (id: string | null) => updateRoute({ releaseSourceId: id })
  const setSearch = (search: string) => updateRoute({ search }, true)
  const setSpotifyCategory = (category: SpotifyCategory) => updateRoute({ category })
  const albumButtons = useRef(new Map<string, HTMLButtonElement>())
  const returnSourceId = useRef<string | null>(null)
  useEffect(() => {
    if (!releaseSourceId && returnSourceId.current) {
      albumButtons.current.get(returnSourceId.current)?.focus({ preventScroll: Boolean(onRouteChange) })
      returnSourceId.current = null
    }
  }, [releaseSourceId])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return sortMusicByDate(musicCatalog
      .filter((item) => item.platform === platform)
      .filter((item) => {
        if (!query) return true
        return [item.title, item.subtitle, item.artist, String(item.year), sourceLabel[item.platform]]
          .some((value) => value.toLocaleLowerCase().includes(query))
      })
    )
  }, [search, platform])
  const spotify = useMemo(() => sortMusicByDate(views.spotifyCards(search, spotifyCategory)), [search, spotifyCategory])
  const detail = platform === 'spotify' && releaseSourceId ? views.releaseDetail(releaseSourceId) : null

  function selectFromList(entry: MusicEntry) {
    const list = entry.platform === 'youtube' ? filtered : spotify
    const selection = queueSelections.list(list, entry.id, search)
    if (selection) onSelect(selection)
  }

  function selectFromAlbum(entry: MusicEntry, position?: { discNumber: number; trackNumber: number }) {
    const selection = entry.kind === 'album' ? queueSelections.list([entry], entry.id)
      : detail ? queueSelections.album(detail.release.id, entry.id, position) : null
    if (selection) onSelect(selection)
  }

  function renderCard(item: MusicEntry) {
    const metadata = getMusicMetadata(item)
    const date = musicDate(item, metadata)
    const isRelease = item.platform === 'spotify' && item.kind === 'album'

    const selected = selectedId === item.id || isRelease && selectedId !== null
      && views.sourceRelease(selectedId)?.id === views.sourceRelease(item.id)?.id
    return (
      <article className={'music-card music-card-' + item.platform + (selected ? ' selected' : '')} key={item.id}>
        <div className="music-art-frame">
          <button
          type="button"
          className={'music-art music-art-' + item.platform}
          aria-label={isRelease ? '查看 ' + item.title + ' 详情' : '播放 ' + item.title}
          onClick={() => isRelease ? setReleaseSourceId(item.id) : selectFromList(item)}
          ref={isRelease ? node => { if (node) albumButtons.current.set(item.id, node); else albumButtons.current.delete(item.id) } : undefined}
        >
          <MusicCover entry={item} metadata={metadata} />
          </button>
          <button type="button" className={'music-cover-play' + (item.platform === 'youtube' ? ' music-card-play-youtube' : '')}
            onClick={() => selectFromList(item)} aria-label={'播放 ' + item.title}>
            <span className="music-card-icon" style={{ maskImage: `url("${playIcon}")`, WebkitMaskImage: `url("${playIcon}")` }} aria-hidden="true" />
          </button>
        </div>
        <div className={'music-card-body music-card-body-' + item.platform}>
          <div className="music-card-title">
            <h3>{isRelease ? <button type="button" className="music-release-title-button" onClick={() => setReleaseSourceId(item.id)}>{item.title}</button> : item.title}</h3>
            {item.platform === 'spotify' && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
              className="music-spotify-link" aria-label={'在 Spotify 打开 ' + item.title}>
              <span className="music-source-mark" style={{ maskImage: `url("${spotifyIcon}")`, WebkitMaskImage: `url("${spotifyIcon}")` }} aria-hidden="true" />
            </a>}
          </div>

          {date && <time className="music-card-date" dateTime={date.dateTime}>{date.label}</time>}
          {item.platform === 'youtube' && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external music-youtube-link" aria-label={'在 YouTube 打开 ' + item.title}>
            <span className="music-source-mark" style={{ maskImage: `url("${youtubeIcon}")`, WebkitMaskImage: `url("${youtubeIcon}")` }} aria-hidden="true" />
          </a>}
        </div>
      </article>
    )
  }

  const hasResults = platform === 'youtube' ? filtered.length > 0 : spotify.length > 0

  return (
    <section className="page-section music-library" aria-label="音乐">
      <div className="music-toolbar">
        {!detail && <label className="music-search">
          <span className="sr-only">搜索</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索" />
        </label>}

        <div className="music-tabs" role="group" aria-label="音乐平台">
          {(['youtube', 'spotify'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={platform === value}
              className={platform === value ? 'music-tab active' : 'music-tab'}
              onClick={() => updateRoute({ platform: value, releaseSourceId: null })}
            >
              {sourceLabel[value]}
            </button>
          ))}
        </div>
        {platform === 'spotify' && !detail && <div className="music-categories" role="group" aria-label="Spotify 分类">
          {([['all', '全部'], ['albums', '专辑'], ['ep', 'EP']] as const).map(([value, label]) => (
            <button type="button" key={value} className="music-category" aria-pressed={spotifyCategory === value}
              onClick={() => setSpotifyCategory(value)}>{label}</button>
          ))}
        </div>}
      </div>

      {detail ? <MusicReleaseDetail detail={detail} selectedId={selectedId} onSelect={selectFromAlbum} onBack={() => {
        returnSourceId.current ??= releaseSourceId
        if (onReleaseBack) onReleaseBack()
        else setReleaseSourceId(null)
      }} /> : hasResults ? (
        <div className="music-grid">{(platform === 'youtube' ? filtered : spotify).map(renderCard)}</div>
      ) : (
        <div className="music-empty" role="status">
          <p>未找到歌曲</p>
          <button type="button" onClick={() => setSearch('')}>清除搜索</button>
        </div>
      )}
    </section>
  )
}
