import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import Header from './components/Header'
import PlayerDock from './components/PlayerDock'
import ThemePeek from './components/ThemePeek'
import PlaybackBackdrop from './components/PlaybackBackdrop'
import PlaybackSettings from './components/PlaybackSettings'
import AudioVisualizer from './components/AudioVisualizer'
import { useAudioVisualizer } from './hooks/useAudioVisualizer'
import { useNavigationControl } from './hooks/useNavigationControl'
import type { VisualizationAudioSource } from './lib/audioCapture'
import { playbackPreferencesKey, readPlaybackPreferences } from './lib/playbackPreferences'
import { members } from './data/members'
import { musicCatalog } from './data/music'
import { currentQueueItem, emptyQueue, queueAvailability, queueReducer } from './lib/playbackQueue'
import type { PlaybackSelection, PlayerObservation } from './types/playback'
import About from './pages/About'
import History from './pages/History'
import Home from './pages/Home'
import MemberDetail from './pages/MemberDetail'
import Members from './pages/Members'
import Music from './pages/Music'
import type { Page, Section } from './types'

function getInitialTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [playbackPreferences, setPlaybackPreferences] = useState(readPlaybackPreferences)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const visualizer = useAudioVisualizer()
  const [visualizationSource, setVisualizationSource] = useState<VisualizationAudioSource>({ kind: 'tab' })
  const [navigationHidden, setNavigationHidden] = useState(false)
  const navigationControl = useNavigationControl(navigationHidden)
  const restoreNavigation = useRef<HTMLButtonElement>(null)
  const navigationWasHidden = useRef(false)
  const [themePeek, setThemePeek] = useState<{ theme: 'light' | 'dark'; id: number; artwork?: 'close' | 'open' } | null>(null)
  const themePeekId = useRef(0)
  const showThemePeek = useCallback((nextTheme: 'light' | 'dark') => {
    if (document.documentElement.dataset.theme !== nextTheme) return
    setThemePeek({ theme: nextTheme, id: ++themePeekId.current })
  }, [])
  const finishThemePeek = useCallback((id: number) => {
    setThemePeek(current => current?.id === id ? null : current)
  }, [])
  const [queue, dispatch] = useReducer(queueReducer, emptyQueue)
  const current = currentQueueItem(queue)
  const currentMusic = musicCatalog.find(entry => entry.id === current?.sourceId) ?? null
  const available = queueAvailability(queue)
  const homeVisualization = Boolean(visualizer.session)
  const presentation = playbackPreferences.presentation
  const cinemaActive = Boolean(currentMusic) && presentation === 'cinema'
  const selectMusic = useCallback((selection: PlaybackSelection) => {
    dispatch({ type: 'select', selection })
  }, [])
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

  function navigate(next: Page) {
    setPage(next)
    window.scrollTo(0, 0)
  }
  function skipMusic(direction: -1 | 1) {
    dispatch({ type: 'move', direction })
  }
  function toggleNavigation(hidden: boolean) {
    setNavigationHidden(hidden)
    setThemePeek({ theme, id: ++themePeekId.current, artwork: hidden ? 'close' : 'open' })
  }
  const showHomeVisualization = useCallback(() => {
    setPage('home')
    window.scrollTo(0, 0)
  }, [])
  const member = members.find((item) => page === 'member-' + item.id)
  const section: Section = member ? 'members' : page as Section

  return (
    <div className={(page === 'home' ? 'app is-home' : 'app') + (currentMusic ? ' with-music-player has-playback-backdrop' : '') + (cinemaActive ? ' is-cinema-session' : '') + (navigationHidden ? ' is-navigation-hidden' : '')} data-player-platform={currentMusic?.platform}>
      <PlaybackBackdrop entry={currentMusic} frosted={playbackPreferences.frosted[presentation]} />
      <a className="skip-link sr-only" href="#main-content">跳过到主要内容</a>
      <Header page={section} theme={theme} concealed={navigationHidden} navigationNear={navigationControl.near} onHideNavigation={() => toggleNavigation(true)} onNavigate={navigate} onToggleTheme={() => { setThemePeek(null); setTheme(theme === 'dark' ? 'light' : 'dark') }} onThemeSettled={showThemePeek} onOpenSettings={() => setSettingsOpen(true)} />
      {navigationHidden && <button ref={restoreNavigation} type="button" className={'navigation-toggle show-navigation' + (navigationControl.near ? ' is-near' : '')} style={navigationControl.position} aria-label="显示顶部导航栏" title="显示顶部导航栏" onClick={() => toggleNavigation(false)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>}
      {currentMusic && <PlayerDock entry={currentMusic} onClose={() => dispatch({ type: 'close' })} onSkip={skipMusic} requestId={queue.requestId} mode={queue.mode} onModeChange={mode => dispatch({ type: 'mode', mode })} canPrevious={available.previous} canNext={available.next} onEnded={finishMusic} onObservation={observeMusic} presentation={presentation} videoFrosted={playbackPreferences.cinemaVideoFrosted} />}
      <main id="main-content" className="container">
        {page === 'home' && (!cinemaActive || homeVisualization) && <Home visualizer={homeVisualization && visualizer.session ? <AudioVisualizer session={visualizer.session} theme={theme} /> : undefined} />}
        {page === 'members' && <Members onOpenMember={(id) => navigate(('member-' + id) as Page)} />}
        {page === 'history' && <History />}
        {page === 'about' && <About />}
        {page === 'music' && <Music selectedId={currentMusic?.id ?? null} onSelect={selectMusic} />}
        {member && <MemberDetail member={member} onBack={() => navigate('members')} />}
      </main>
      <ThemePeek key={themePeek?.artwork ?? 'theme'} id={themePeek?.id} theme={theme} artwork={themePeek?.artwork} playerActive={Boolean(currentMusic) && !cinemaActive} onFinished={finishThemePeek} />
      <PlaybackSettings open={settingsOpen} settings={playbackPreferences} onChange={setPlaybackPreferences} onClose={() => { setSettingsOpen(false); if ((visualizer.pending || visualizer.loadingInputs) && !visualizer.session) visualizer.stop() }}
        visualizationEnabled={Boolean(visualizer.session)} visualizationPending={visualizer.pending} visualizationError={visualizer.error} onStopVisualization={visualizer.stop}
        audioSource={visualizationSource} onAudioSourceChange={setVisualizationSource} audioInputs={visualizer.inputs} loadingInputs={visualizer.loadingInputs} inputError={visualizer.inputError} onReadInputs={visualizer.refreshInputs}
        audioSignal={visualizer.signal} onResumeAudio={visualizer.resume}
        onStartVisualization={async () => { if (await visualizer.start(visualizationSource)) { setSettingsOpen(false); showHomeVisualization() } }} />
    </div>
  )
}
