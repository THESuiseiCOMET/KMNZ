import type { ReactNode } from 'react'
import HeroCarousel from '../components/HeroCarousel'

export default function Home({ visualizer }: { visualizer?: ReactNode }) {
  return (
    <section className={'hero home-hero' + (visualizer ? ' home-visualizer-hero' : '')} aria-label={visualizer ? '首页音频可视化' : 'KMNZ 资料站首页'}>
      {visualizer || <div className="hero-inner">
        <h2>欢迎来到 KMNZ 资料站</h2>
        <p>这里展示团体成员资料与媒体资源,点击“音乐”查看YouTubeMV和Spotify专辑的索引。</p>
        <HeroCarousel />
      </div>}
    </section>
  )
}
