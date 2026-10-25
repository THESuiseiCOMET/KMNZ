import qq from '../assets/images/qq.jpg'
import preview from '../assets/images/link.png'

const links = [
  { text: 'KMNZ OFFICIAL', icon: '▶️', href: 'https://www.youtube.com/@KMNZOFFICIAL' },
  { text: 'KMNZ Membership', icon: '▶️', href: 'https://www.youtube.com/@KMNZ' },
  { text: 'KMNZ OFFICIAL', icon: 'X', href: 'https://x.com/KMNSTREET' },
  { text: 'LITA', icon: 'X', href: 'https://twitter.com/kmnzlita' },
  { text: 'TINA', icon: 'X', href: 'https://twitter.com/kmnztina_' },
  { text: 'NERO', icon: 'X', href: 'https://twitter.com/kmnznero_' },
  { text: 'Spotify', icon: '🎧', href: 'https://open.spotify.com/artist/4uWpa0r7BZUXJ1ip2LJysz' },
  { text: 'Apple Music', icon: '🍎', href: 'https://itunes.apple.com/jp/artist/kmnz/1416494540' },
  { text: 'OFFICIAL GOODS', icon: '🛒', href: 'https://rkmusic.booth.pm/item_lists/rooT4603' },
]
export default function About() {
  return (
    <section className="page-section">
      <h2>联系我们 &amp; 相关链接</h2>
      <div className="about-grid">
        <div className="qr-box">
          <div className="about-brand">KMNHZ-China</div>
          <img src={qq} alt="KMNHZ-China 社群二维码" loading="lazy" />
          <a className="link-btn" href="https://space.bilibili.com/2149710" target="_blank" rel="noopener noreferrer">
            <span className="link-icon" aria-hidden="true">B</span>KMNHZ-China
          </a>
          <div className="about-note">群号：389295995</div>
        </div>
        <div>
          <div className="about-intro">也可以直接访问 KMNZ 的官方页面或社交帐号：</div>
          <div className="links-grid">
            {links.map((link) => (
              <a className="link-btn" href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                <span className="link-icon" aria-hidden="true">{link.icon}</span>{link.text}
              </a>
            ))}
          </div>
          <div className="link-preview">
            <div className="link-preview-title">全部链接预览</div>
            <img className="link-preview-image" src={preview} alt="相关链接一览" loading="lazy" />
          </div>
        </div>
      </div>
      <p className="help about-disclaimer">本项目为非官方粉丝资料站，与 KMNZ 官方无隶属关系。</p>
    </section>
  )
}
