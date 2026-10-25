export default function PlayerDock() {
  return (
    <aside className="player-dock" aria-label="音乐播放器状态">
      <div className="player-art" aria-hidden="true">♫</div>
      <div className="player-details">
        <strong>音乐播放器 · 开发中</strong>
        <span>后续接入 YouTube / Spotify 官方播放器</span>
      </div>
      <span className="player-status">尚未接入音源</span>
    </aside>
  )
}
