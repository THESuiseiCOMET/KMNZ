import { useEffect, useMemo, useRef, useState } from 'react'
import { musicCatalog } from '../data/music'
import type { CSSProperties } from 'react'
import type { MusicEntry, MusicPlatform } from '../data/music'
import { musicLibrary } from '../data/musicLibrary'
import { createMusicViews } from '../lib/musicViews'
import { createQueueSelections } from '../lib/playbackQueue'
import type { PlaybackSelection } from '../types/playback'
import { defaultMusicRoute, changeMusicFilter } from '../lib/siteRoute'
import type { MusicRoute, MusicFilterAction } from '../lib/siteRoute'
import playIcon from '../assets/icons/play.svg'
import youtubeIcon from '../assets/icons/brand-youtube.svg'
import bilibiliIcon from '../assets/icons/brand-bilibili.svg'
import { validBilibiliVideoUrl } from '../lib/musicLibrary'
import spotifyIcon from '../assets/icons/brand-spotify.svg'
import youtubeLogoLight from '../assets/icons/youtube-logo-light.svg'
import youtubeLogoDark from '../assets/icons/youtube-logo-dark.svg'
import spotifyLogoLight from '../assets/icons/spotify-logo-light.svg'
import spotifyLogoDark from '../assets/icons/spotify-logo-dark.svg'
import { useNavigationIndicator } from '../hooks/useNavigationIndicator'
import MusicFilterGroup from '../components/MusicFilterGroup'
import MusicCover from '../components/MusicCover'
import MusicReleaseDetail from '../components/MusicReleaseDetail'
import { getMusicMetadata, getMusicDate, sortMusicByDate } from '../data/musicMetadata'

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
const platformLogos = {
  youtube: { light: youtubeLogoLight, dark: youtubeLogoDark },
  spotify: { light: spotifyLogoLight, dark: spotifyLogoDark },
}
const views = createMusicViews(musicLibrary, musicCatalog)
const queueSelections = createQueueSelections(musicLibrary)

export default function Music({ selectedId, onSelect, route, onRouteChange, onReleaseBack }: MusicProps) {
  const [localRoute, setLocalRoute] = useState<MusicRoute>(defaultMusicRoute)
  const currentRoute = route ?? localRoute
  const { search, platform, category: spotifyCategory, youtubeCategory = 'all', youtubeGroup = null, youtubeMember = null, releaseSourceId } = currentRoute
  const platformIndicator = useNavigationIndicator(platform, false, '.music-tab[aria-pressed="true"]', '.music-tab')
  function updateRoute(patch: Partial<MusicRoute>, replace = false) {
    const next = { ...currentRoute, ...patch }
    if (onRouteChange) onRouteChange(next, replace)
    else setLocalRoute(next)
  }
  const setReleaseSourceId = (id: string | null) => updateRoute({ releaseSourceId: id })
  const setSearch = (search: string) => updateRoute({ search }, true)
  const filter = (action: MusicFilterAction) => updateRoute(changeMusicFilter(currentRoute, action))
  const albumButtons = useRef(new Map<string, HTMLButtonElement>())
  const returnSourceId = useRef<string | null>(null)
  useEffect(() => {
    if (!releaseSourceId && returnSourceId.current) {
      albumButtons.current.get(returnSourceId.current)?.focus({ preventScroll: window.matchMedia('(min-width: 900px)').matches })
      returnSourceId.current = null
    }
  }, [releaseSourceId])

  const filtered = useMemo(() => platform === 'youtube' ? sortMusicByDate(views.youtubeCards(search, youtubeCategory, youtubeGroup, youtubeMember)) : [], [platform, search, youtubeCategory, youtubeGroup, youtubeMember])
  const spotify = useMemo(() => platform === 'spotify' ? sortMusicByDate(views.spotifyCards(search, spotifyCategory)) : [], [platform, search, spotifyCategory])
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

  function renderCard(item: MusicEntry, position: number) {
    const metadata = getMusicMetadata(item)
    const date = getMusicDate(item)
    const isRelease = item.platform === 'spotify' && item.kind === 'album'

    const selected = selectedId === item.id || isRelease && selectedId !== null
      && views.sourceRelease(selectedId)?.id === views.sourceRelease(item.id)?.id
    return (
      <article className={'music-card music-card-' + item.platform + (selected ? ' selected' : '') + (isRelease && releaseSourceId === item.id ? ' is-expanded' : '')} key={item.id}
        style={{ '--music-card-transition': 'music-card-' + item.id, '--music-card-transition-class': 'music-filter-card music-filter-step-' + Math.min(position, 5) } as CSSProperties}>
        <div className="music-art-frame">
          <button
          type="button"
          className={'music-art music-art-' + item.platform}
          aria-label={isRelease ? '展开 ' + item.title + ' 曲目' : '播放 ' + item.title}
          aria-expanded={isRelease ? releaseSourceId === item.id : undefined}
          aria-controls={isRelease && releaseSourceId === item.id ? 'music-release-pane' : undefined}
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
            <h3>{item.title}</h3>
            {item.platform === 'spotify' && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
              className="music-spotify-link" aria-label={'在 Spotify 打开 ' + item.title}>
              <span className="music-source-mark" style={{ maskImage: `url("${spotifyIcon}")`, WebkitMaskImage: `url("${spotifyIcon}")` }} aria-hidden="true" />
            </a>}
          </div>

          {date && <time className="music-card-date" dateTime={date.dateTime}>{date.label}</time>}
          {item.platform === 'youtube' && <div className="music-source-links">
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="music-external music-youtube-link" aria-label={'在 YouTube 打开 ' + item.title}>
              <span className="music-source-mark" style={{ maskImage: `url("${youtubeIcon}")`, WebkitMaskImage: `url("${youtubeIcon}")` }} aria-hidden="true" />
            </a>
            {validBilibiliVideoUrl(item.bilibiliUrl) && <a href={item.bilibiliUrl} target="_blank" rel="noopener noreferrer" className="music-external music-bilibili-link" aria-label={'在 Bilibili 查看转载视频：' + item.title}>
              <span className="music-source-mark" style={{ maskImage: `url("${bilibiliIcon}")`, WebkitMaskImage: `url("${bilibiliIcon}")` }} aria-hidden="true" />
            </a>}
          </div>}
        </div>
      </article>
    )
  }

  const cards = useMemo(() => (platform === 'youtube' ? filtered : spotify).map(renderCard), [filtered, spotify, selectedId, currentRoute, onSelect, onRouteChange])
  const hasResults = platform === 'youtube' ? filtered.length > 0 : spotify.length > 0

  return (
    <section className="page-section music-library" aria-label="音乐">
      <div className="music-toolbar">
        <label className="music-search">
          <span className="sr-only">搜索</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div ref={platformIndicator.linksRef} className={'music-tabs' + (platformIndicator.indicator ? ' has-indicator' : '')} role="group" aria-label="音乐平台">
          {platformIndicator.indicator && <span className="music-switch-indicator music-platform-indicator" aria-hidden="true" style={{ width: platformIndicator.indicator.width, height: platformIndicator.indicator.height, transform: `translate(${platformIndicator.indicator.left}px, ${platformIndicator.indicator.top}px)` }} />}
          <div className="music-platform-labels">
          {(['youtube', 'spotify'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-label={sourceLabel[value]}
              data-segment-value={value}
              aria-pressed={platform === value}
              className={platform === value ? 'music-tab active' : 'music-tab'}
              onClick={() => filter({ type: 'platform', value })}
            >
              <img className={'music-platform-logo music-platform-logo-light music-platform-logo-' + value} src={platformLogos[value].light} alt="" aria-hidden="true" draggable={false} />
              <img className={'music-platform-logo music-platform-logo-dark music-platform-logo-' + value} src={platformLogos[value].dark} alt="" aria-hidden="true" draggable={false} />
            </button>
          ))}
          </div>
        </div>
        <div className="music-filter-bar">
          {platform === 'spotify' ? <MusicFilterGroup key="spotify" label="Spotify 分类"
            options={[['albums', 'LP'], ['ep', 'EP']] as const} active={spotifyCategory === 'all' ? null : spotifyCategory}
            onChange={value => filter({ type: 'spotify', value })} />
            : <MusicFilterGroup key="youtube" label="YouTube 分类"
              options={[ ['original', 'Original'], ['cover', 'Cover']] as const} active={youtubeCategory === 'all' ? null : youtubeCategory}
              onChange={value => filter({ type: 'youtube', value })} />}
          {platform === 'youtube' && youtubeCategory === 'original' && <MusicFilterGroup secondary key="original" label="原创分类"
            options={[ ['lita-liz', 'LITA & LIZ'], ['lita-tina-nero', 'LITA & TINA & NERO']] as const}
            active={youtubeGroup === 'special' ? null : youtubeGroup} onChange={value => filter({ type: 'group', value })} />}
          {platform === 'youtube' && youtubeCategory === 'cover' && <MusicFilterGroup secondary key="cover" label="翻唱成员"
            options={[ ['LITA', 'LITA'], ['LIZ', 'LIZ'], ['TINA', 'TINA'], ['NERO', 'NERO']] as const}
            active={youtubeMember} onChange={value => filter({ type: 'member', value })} />}
        </div>
      </div>

      <div className={'music-results music-browse' + (detail ? ' has-release-panel' : '')}>
        <div className="music-browse-list">
          {hasResults ? <div className="music-grid">{cards}</div> : (
            <div className="music-empty" role="status">
              <p>未找到歌曲</p>
              <button type="button" onClick={() => search ? setSearch('') : updateRoute({ category: 'all', youtubeCategory: 'all', youtubeGroup: null, youtubeMember: null })}>{search ? '清除搜索' : '清除筛选'}</button>
            </div>
          )}
        </div>
        {detail && <aside className="music-release-pane" id="music-release-pane" aria-label="专辑曲目">
          <MusicReleaseDetail key={detail.entry.id} panel detail={detail} selectedId={selectedId} onSelect={selectFromAlbum} onBack={() => {
            returnSourceId.current = releaseSourceId
            if (onReleaseBack) onReleaseBack()
            else setReleaseSourceId(null)
          }} />
        </aside>}
      </div>
    </section>
  )
}
