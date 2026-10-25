import HeroCarousel from '../components/HeroCarousel'

export default function Home() {
  return (
    <section className="hero home-hero" aria-label="KMNZ 资料站首页">
      <div className="hero-inner">
        <h2>欢迎来到 KMNZ 资料站</h2>
        <p>这里展示团体成员资料、活动与媒体资源。点击“成员”查看每位成员的详细介绍。</p>
        <HeroCarousel />
      </div>
    </section>
  )
}
