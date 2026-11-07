import type { CSSProperties } from 'react'
import logo from '../assets/showcase/KMNZ-logo.svg'

export default function GrooveStandby() {
  const mask = `url("${logo}")`
  return <section className="groove-standby" aria-label="LET’S GROOVE 待机">
    <div className="groove-standby-frame">
      <div className="groove-standby-logo" role="img" aria-label="KMNZ"
        style={{ maskImage: mask, WebkitMaskImage: mask } as CSSProperties}>
        <span className="groove-logo-white" aria-hidden="true" />
        <span className="groove-logo-sheen" aria-hidden="true" />
      </div>
    </div>
  </section>
}
