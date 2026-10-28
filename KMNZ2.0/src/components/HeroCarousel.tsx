import { useEffect, useState } from 'react'
import poster1 from '../assets/images/kmnz1.avif'
import poster2 from '../assets/images/kmnz2.avif'
import poster3 from '../assets/images/kmnz3.avif'
import poster4 from '../assets/images/kmnz4.avif'

const posters = [
  { source: poster1, alt: 'KMNZ 海报 1', label: 'K' },
  { source: poster2, alt: 'KMNZ 海报 2', label: 'M' },
  { source: poster3, alt: 'KMNZ 海报 3', label: 'N' },
  { source: poster4, alt: 'KMNZ 海报 4', label: 'Z' },
]

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((old) => (old + 1) % posters.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [paused])

  function move(delta: number) {
    setIndex((old) => (old + delta + posters.length) % posters.length)
  }

  return (
    <div
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="KMNZ 海报轮播"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      }}
    >
      <ul className="slides">
        {posters.map((poster, i) => (
          <li key={poster.alt} className={i === index ? 'slide active' : 'slide'} aria-hidden={i !== index}>
            <img src={poster.source} alt={poster.alt} loading={i === 0 ? 'eager' : 'lazy'} />
          </li>
        ))}
      </ul>
      <button type="button" className="carousel-control prev" aria-label="上一张" onClick={() => move(-1)}>‹</button>
      <button type="button" className="carousel-control next" aria-label="下一张" onClick={() => move(1)}>›</button>
      <div className="carousel-indicators" aria-label="轮播指示器">
        {posters.map((poster, i) => (
          <button
            key={poster.label}
            className={index === i ? 'indicator active' : 'indicator'}
            type="button"
            aria-label={'第 ' + (i + 1) + ' 张'}
            aria-current={index === i ? 'true' : undefined}
            onClick={() => setIndex(i)}
          >{poster.label}</button>
        ))}
      </div>
    </div>
  )
}
