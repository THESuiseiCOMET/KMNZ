import PlayerProgress from './PlayerProgress'
import previousIcon from '../assets/icons/skip-back.svg'
import nextIcon from '../assets/icons/skip-forward.svg'
import loopIcon from '../assets/icons/repeat-1.svg'
import playIcon from '../assets/icons/play.svg'
import volumeIcon from '../assets/icons/volume-2.svg'

function Icon({ source }: { source: string }) {
  const mask = `url("${source}")`
  return <span className="music-player-icon" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}

export default function IdlePlayerControls({ onChooseMusic }: { onChooseMusic: () => void }) {
  return <div className="is-cinema cinema-player-chrome is-idle">
    <div className="music-player-controls" role="group" aria-label="播放控制 · 尚未选择歌曲">
      <button type="button" className="music-player-loop" aria-label="开启单曲循环" title="选择歌曲后可用" aria-pressed={false} disabled><Icon source={loopIcon} /></button>
      <div className="music-player-primary">
        <button type="button" aria-label="上一首" title="选择歌曲后可用" disabled><Icon source={previousIcon} /></button>
        <button type="button" className="music-player-toggle" onClick={onChooseMusic} aria-label="选择歌曲" title="从 PLAYLIST 选择歌曲"><Icon source={playIcon} /></button>
        <button type="button" aria-label="下一首" title="选择歌曲后可用" disabled><Icon source={nextIcon} /></button>
      </div>
      <div className="music-player-volume"><button type="button" aria-label="音量控制" title="选择歌曲后可用" disabled><Icon source={volumeIcon} /></button></div>
      <button type="button" className="music-player-locate" aria-label="定位当前播放" title="选择歌曲后可用" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
      </button>
      <button type="button" className="music-player-close" aria-label="关闭播放器并停止播放" title="尚未选择歌曲" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <PlayerProgress currentTime={0} duration={0} canSeek={false} onSeek={() => false} />
  </div>
}
