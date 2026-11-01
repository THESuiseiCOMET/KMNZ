import { timeline } from '../data/timeline'

export default function History() {
  return (
    <>
      <section className="hero history-hero">
        <div className="hero-inner">
        </div>
      </section>
      <section className="timeline" aria-labelledby="timeline-title">
        <h3 id="timeline-title">Timeline</h3>
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
