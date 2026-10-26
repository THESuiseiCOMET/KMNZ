import { useEffect, useRef, useState } from 'react'
import qqLight from '../assets/images/qq-light.jpg'
import qqDark from '../assets/images/qq-dark.jpg'
import youtube from '../assets/icons/brand-youtube.svg'
import x from '../assets/icons/brand-x.svg'
import bilibili from '../assets/icons/brand-bilibili.svg'
import spotify from '../assets/icons/brand-spotify.svg'
import appleMusic from '../assets/icons/brand-applemusic.svg'
import shoppingBag from '../assets/icons/shopping-bag.svg'
import arrowUpRight from '../assets/icons/arrow-up-right.svg'

const icons = { youtube, x, bilibili, spotify, appleMusic, shoppingBag, arrowUpRight }

interface AboutLink {
  label: string
  icon: keyof typeof icons
  href: string
}

const groups: { title: string; className?: string; links: AboutLink[] }[] = [
  {
    title: 'KMNZ 官方',
    links: [
      { label: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@KMNZOFFICIAL' },
      { label: 'YouTube Membership', icon: 'youtube', href: 'https://www.youtube.com/@KMNZ' },
      { label: 'X', icon: 'x', href: 'https://x.com/KMNSTREET' },
      { label: 'OFFICIAL GOODS', icon: 'shoppingBag', href: 'https://shop.reality-studios.inc/collections/kmnz' },
    ],
  },
  {
    title: '音乐平台',
    links: [
      { label: 'Spotify', icon: 'spotify', href: 'https://open.spotify.com/artist/4uWpa0r7BZUXJ1ip2LJysz' },
      { label: 'Apple Music', icon: 'appleMusic', href: 'https://itunes.apple.com/jp/artist/kmnz/1416494540' },
    ],
  },
  {
    title: '成员账号',
    className: 'about-member-links',
    links: [
      { label: 'LITA', icon: 'x', href: 'https://twitter.com/kmnzlita' },
      { label: 'TINA', icon: 'x', href: 'https://twitter.com/kmnztina_' },
      { label: 'NERO', icon: 'x', href: 'https://twitter.com/kmnznero_' },
    ],
  },
]

function Icon({ name }: { name: keyof typeof icons }) {
  const mask = `url("${icons[name]}")`
  return <span className={'about-icon about-icon-' + name} style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}

function LinkCard({ link }: { link: AboutLink }) {
  return (
    <a className="about-link" href={link.href} target="_blank" rel="noopener noreferrer">
      <span className="about-link-icon"><Icon name={link.icon} /></span>
      <span className="about-link-label">{link.label}</span>
      <span className="about-link-arrow"><Icon name="arrowUpRight" /></span>
    </a>
  )
}

function QrCode() {
  return (
    <span className="about-qr-code">
      <img className="about-qr-image about-qr-light" src={qqLight} alt="QQ 群 389295995 二维码" width="1284" height="2283" />
      <img className="about-qr-image about-qr-dark" src={qqDark} alt="QQ 群 389295995 二维码" width="1284" height="2283" />
    </span>
  )
}

export default function About() {
  const [qrOpen, setQrOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (qrOpen && !dialog.open) dialog.showModal()
    if (!qrOpen && dialog.open) dialog.close()
  }, [qrOpen])

  return (
    <section className="page-section about-page" aria-labelledby="about-title">
      <div className="about-grid">
        <div className="about-link-groups">
          {groups.map((group) => (
            <section className="about-link-group" key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              <div className={'about-links' + (group.className ? ' ' + group.className : '')}>
                {group.links.map((link) => <LinkCard key={link.href} link={link} />)}
              </div>
            </section>
          ))}
        </div>
        <aside className="about-community" aria-labelledby="community-title">
          <h3 id="community-title">KMNHZ-China</h3>
          <LinkCard link={{ label: 'Bilibili', icon: 'bilibili', href: 'https://space.bilibili.com/2149710' }} />
          <div className="about-qq">
            <div className="about-qq-heading">
              <h4>QQ 群</h4>
              <span>389295995</span>
            </div>
            <button type="button" className="about-qr-button" aria-label="放大 QQ 群二维码" onClick={() => setQrOpen(true)}>
              <QrCode />
            </button>
          </div>
        </aside>
      </div>
      <dialog
        ref={dialogRef}
        className="about-qr-dialog"
        aria-labelledby="qr-dialog-title"
        onClose={() => setQrOpen(false)}
        onCancel={() => setQrOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setQrOpen(false) }}
      >
        <div className="about-qr-dialog-content">
          <div className="about-qr-dialog-heading">
            <h2 id="qr-dialog-title">QQ 群</h2>
            <button type="button" className="about-qr-close" onClick={() => setQrOpen(false)}>关闭</button>
          </div>
          <p>群号：389295995</p>
          <QrCode />
        </div>
      </dialog>
    </section>
  )
}
