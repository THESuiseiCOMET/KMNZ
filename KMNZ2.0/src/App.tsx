import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Header from './components/Header'
import Showcase from './components/Showcase'
import SprayReveal from './components/SprayReveal'
import { useShowcase } from './hooks/useShowcase'
import PageScrollbar from './components/PageScrollbar'
import PlayerDock from './components/PlayerDock'
import ThemePeek from './components/ThemePeek'
import PlaybackBackdrop from './components/PlaybackBackdrop'
import PlaybackControls from './components/PlaybackControls'
import AudioVisualizer from './components/AudioVisualizer'
import GrooveStandby from './components/GrooveStandby'
import { useGrooveStandby } from './hooks/useGrooveStandby'
import { useAudioVisualizer } from './hooks/useAudioVisualizer'
import { useNavigationControl } from './hooks/useNavigationControl'
import { useNavigationMotion } from './hooks/useNavigationMotion'
import { useSiteRoute } from './hooks/useSiteRoute'
import { usePageTransition } from './hooks/usePageTransition'
import { usePlaybackPersistence } from './hooks/usePlaybackPersistence'
import { readPlaybackSession } from './lib/playbackSession'
import { playbackPreferencesKey, readPlaybackPreferences } from './lib/playbackPreferences'
import { members } from './data/members'
import { musicCatalog } from './data/music'
import { musicLibrary } from './data/musicLibrary'
import { currentQueueItem, emptyQueue, queueAvailability, queueReducer } from './lib/playbackQueue'
import type { PlaybackSelection, PlayerObservation } from './types/playback'
import About from './pages/About'
import History from './pages/History'
import MemberDetail from './pages/MemberDetail'
import Music from './pages/Music'
import type { MusicRoute } from './lib/siteRoute'
import { saveMusicMemory, readMusicMemory, playbackBrowseKey, historyPageEnabled } from './lib/siteRoute'
import { findMusicLocation } from './lib/musicLocation'
import type { MusicLocateRequest } from './lib/musicLocation'
import type { Page, Section } from './types'

// Temporarily hide theme/navigation character popups; set true to restore all artwork and interactions.
const themePeekEnabled = false

const routedReleases = new Set(musicLibrary.sources.filter(source => source.platform === 'spotify').map(source => source.id))

function getInitialTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
export default function App() {
  const transitionPage = usePageTransition()
  const { route, navigate, changeMusic, backFromRelease } = useSiteRoute(routedReleases, transitionPage)
  const page: Page = route.page === 'home' || route.page === 'members' || (!historyPageEnabled && route.page === 'history') ? 'music' : route.page
  const showcase = useShowcase(route.page)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [playbackPreferences, setPlaybackPreferences] = useState(readPlaybackPreferences)
  const visualizer = useAudioVisualizer()
  const tempoReadout = useRef<HTMLOutputElement>(null)
  const [navigationHidden, setNavigationHidden] = useState(false)
  useNavigationMotion(navigationHidden)
  const navigationControl = useNavigationControl(navigationHidden)
  const restoreNavigation = useRef<HTMLButtonElement>(null)
  const navigationWasHidden = useRef(false)
  const [themePeek, setThemePeek] = useState<{ theme: 'light' | 'dark'; id: number; artwork?: 'close' | 'open' } | null>(null)
  const themePeekId = useRef(0)
  const showThemePeek = useCallback((nextTheme: 'light' | 'dark') => {
    if (!themePeekEnabled || document.documentElement.dataset.theme !== nextTheme) return
    setThemePeek({ theme: nextTheme, id: ++themePeekId.current })
  }, [])
  const finishThemePeek = useCallback((id: number) => {
    setThemePeek(current => current?.id === id ? null : current)
  }, [])
  const [restoredPlayback] = useState(() => readPlaybackSession(musicLibrary, musicCatalog))
  const [playbackBrowse, setPlaybackBrowse] = useState(() => readMusicMemory(routedReleases, playbackBrowseKey))
  const [locateRequest, setLocateRequest] = useState<MusicLocateRequest | null>(null)
  const locateId = useRef(0)
  const [queue, dispatch] = useReducer(queueReducer, restoredPlayback?.queue ?? emptyQueue)
  const rememberPlayback = usePlaybackPersistence(queue, restoredPlayback?.checkpoint ?? null)
  const current = currentQueueItem(queue)
  const currentMusic = musicCatalog.find(entry => entry.id === current?.sourceId) ?? null
  const available = queueAvailability(queue)
  const visualizationActive = Boolean(visualizer.session) || visualizer.pending
  const grooveStandby = useGrooveStandby(Boolean(currentMusic), queue.status, visualizationActive, visualizer.signal?.status === 'receiving')
  const mvVisualization = page === 'mv' && visualizationActive && !grooveStandby
  const canOpenMV = true
  const cinemaActive = Boolean(currentMusic)
  const selectMusic = useCallback((selection: PlaybackSelection) => {
    setLocateRequest(null)
    setPlaybackBrowse(saveMusicMemory(route.music, playbackBrowseKey, selection.items.map(item => item.sourceId)))
    dispatch({ type: 'select', selection })
  }, [route.music])
  const observeMusic = useCallback((observation: PlayerObservation) => dispatch({ type: 'observe', observation }), [])
  const finishMusic = useCallback((requestId: number, sourceId: string) => dispatch({ type: 'ended', requestId, sourceId }), [])

  useEffect(() => {
    try { localStorage.setItem(playbackPreferencesKey, JSON.stringify(playbackPreferences)) } catch { /* unavailable */ }
  }, [playbackPreferences])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('kmnzTheme', theme) } catch { /* unavailable */ }
  }, [theme])

  useEffect(() => {
    if (navigationHidden) restoreNavigation.current?.focus({ preventScroll: true })
    else if (navigationWasHidden.current) document.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus({ preventScroll: true })
    navigationWasHidden.current = navigationHidden
    if (!navigationHidden) return
    function restore(event: KeyboardEvent) {
      if (event.key !== 'Escape' || document.fullscreenElement || document.querySelector('dialog[open]')) return
      setNavigationHidden(false)
    }
    document.addEventListener('keydown', restore)
    return () => document.removeEventListener('keydown', restore)
  }, [navigationHidden])

  useEffect(() => {
    if (route.page === 'home' || (!historyPageEnabled && route.page === 'history')) changeMusic(route.music, true)
  }, [route.page, route.music, canOpenMV, changeMusic, navigate])

  useEffect(() => { if (route.page !== 'music') setLocateRequest(null) }, [route.page])
  const changePlaylistRoute = useCallback((next: MusicRoute, replace = false) => {
    setLocateRequest(null)
    changeMusic(next, replace)
  }, [changeMusic])
  function navigateSection(next: Section) {
    navigate(next)
  }
  const locateContext = current && playbackBrowse?.sourceIds.includes(current.sourceId) ? playbackBrowse.route : route.music
  const playingLocation = useMemo(() => current ? findMusicLocation(musicLibrary, musicCatalog, current, locateContext, queue.observedUri) : null, [current, locateContext, queue.observedUri])
  function locatePlaying() {
    if (!playingLocation) return
    setLocateRequest({ id: ++locateId.current, location: playingLocation })
    changeMusic(playingLocation.route)
  }

  function skipMusic(direction: -1 | 1) {
    dispatch({ type: 'move', direction })
  }
  function toggleNavigation(hidden: boolean) {
    setNavigationHidden(hidden)
    if (themePeekEnabled) setThemePeek({ theme, id: ++themePeekId.current, artwork: hidden ? 'close' : 'open' })
  }
  const showMVVisualization = useCallback(() => {
    if (!visualizer.session && !visualizer.pending) void visualizer.start()
    navigate('mv')
  }, [navigate, visualizer.session, visualizer.pending, visualizer.start])
  useEffect(() => { if (route.page === 'members') showcase.show() }, [route.page, showcase.show])
  const member = members.find((item) => page === 'member-' + item.id)
  const section: Section = member ? 'members' : page as Section

  const playbackControls = <PlaybackControls background={currentMusic?.platform === 'spotify' ? 'cover' : 'video'} settings={playbackPreferences} onChange={setPlaybackPreferences}
    visualizationVisible={page === 'mv'} visualizationEnabled={Boolean(visualizer.session)} visualizationPending={visualizer.pending} visualizationError={visualizer.error}
    onStopVisualization={visualizer.stop}
    onStartVisualization={showMVVisualization} />

  return (
    <>
    <Showcase phase={showcase.phase} onEnter={showcase.enter} enterRef={showcase.enterButton} mediaActive={Boolean(currentMusic)} />
    <div className={'app has-player-controls' + (currentMusic ? ' with-music-player' : '') + (currentMusic ? ' has-playback-backdrop' : '') + (cinemaActive ? ' is-cinema-session' : '') + (navigationHidden ? ' is-navigation-hidden' : '') + (page === 'mv' ? ' is-mv-view' : '')} data-player-platform={currentMusic?.platform} data-showcase-phase={showcase.phase} style={showcase.phase === 'showcase' ? { opacity: 0 } : undefined} inert={showcase.blocked} aria-hidden={showcase.blocked || undefined}>
      <PageScrollbar />
      <PlaybackBackdrop entry={currentMusic} frosted={playbackPreferences.coverFrosted} />
      <a hidden={page === 'mv'} className="skip-link sr-only" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>跳过到主要内容</a>
      <Header playerActive={Boolean(currentMusic)} tempoVisible={mvVisualization} tempoReadoutRef={tempoReadout} onShowcase={showcase.show} showcaseButtonRef={showcase.returnButton} page={section} theme={theme} concealed={navigationHidden} onHideNavigation={() => toggleNavigation(true)} onNavigate={navigateSection} canOpenMV={canOpenMV} onToggleTheme={() => { setThemePeek(null); setTheme(theme === 'dark' ? 'light' : 'dark') }} onThemeSettled={showThemePeek} playbackControls={playbackControls} />
      {navigationHidden && <button ref={restoreNavigation} type="button" className={'navigation-toggle show-navigation' + (navigationControl.near ? ' is-near' : '')} style={navigationControl.position} aria-label="显示顶部导航栏" title="显示顶部导航栏" onClick={() => toggleNavigation(false)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>}
      {currentMusic && <PlayerDock onLocate={playingLocation ? locatePlaying : undefined} entry={currentMusic} onClose={() => dispatch({ type: 'close' })} onSkip={skipMusic} requestId={queue.requestId} mode={queue.mode} onModeChange={mode => dispatch({ type: 'mode', mode })} canPrevious={available.previous} canNext={available.next} onEnded={finishMusic} onObservation={observeMusic} onCheckpoint={rememberPlayback} resume={restoredPlayback?.resume} videoFrosted={playbackPreferences.videoFrosted} />}
      <main id="main-content" className="container" tabIndex={-1} inert={page === 'mv'} aria-hidden={page === 'mv' || undefined}  style={page === 'mv' ? { display: 'none' } : undefined}>
        {historyPageEnabled && page === 'history' && <History />}
        {page === 'about' && <About />}
        {(page === 'music' || page === 'mv') && <Music locateRequest={page === 'music' ? locateRequest : null} selectedId={currentMusic?.id ?? null} onSelect={selectMusic} route={route.music} onRouteChange={changePlaylistRoute} onReleaseBack={backFromRelease} />}
        {member && <MemberDetail member={member} onBack={() => navigate('members')} />}
      </main>
      {page === 'mv' && grooveStandby && <GrooveStandby />}
      {mvVisualization && <div className="mv-visualizer"><AudioVisualizer session={visualizer.session} theme={theme} tempoReadoutRef={tempoReadout} /></div>}
      {themePeekEnabled && <ThemePeek key={themePeek?.artwork ?? 'theme'} id={themePeek?.id} theme={theme} artwork={themePeek?.artwork} playerActive={Boolean(currentMusic) && !cinemaActive} onFinished={finishThemePeek} />}
    </div>
    <SprayReveal phase={showcase.phase} onComplete={showcase.finish} />
    </>
  )
}
