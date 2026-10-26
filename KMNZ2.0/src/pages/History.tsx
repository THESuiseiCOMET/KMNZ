import { timeline } from '../data/timeline'

export default function History() {
  return (
    <>
      <section className="hero history-hero">
        <div className="hero-inner">
          <h2>KMNZ 的历程</h2>
          <p>下面是 KMNZ 从成立到现在的一些重要节点与回顾。</p>
        </div>
      </section>
      <section className="timeline" aria-labelledby="timeline-title">
        <h3 id="timeline-title">时间线</h3>
        <ul className="timeline-list">
          {timeline.map((group) => (
            <li key={group.year}>
              <h4>{group.year}</h4>
              <ul>{group.events.map((event, i) => <li key={i}>{event}</li>)}</ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
