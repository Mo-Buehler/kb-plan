import { Icon } from '../../components/Icon'
import { TONE_ICON, type Tone } from '../../domain/colors'
import { exerciseCount, overviewSections, setCount } from '../../domain/overview'
import type { Step } from '../../domain/steps'

interface Props {
  title: string
  subtitle: string
  tone: Tone
  steps: Step[]
  onStart: () => void
  onBack: () => void
}

/** Coloured overview of a session before the first set: blocks, supersets, sets and weights. */
export function Overview({ title, subtitle, tone, steps, onStart, onBack }: Props) {
  const sections = overviewSections(steps)
  return (
    <main className={`page toned tone-${tone}`}>
      <header className="runhead">
        <button onClick={onBack}>‹ Zurück</button>
      </header>
      <h1>{title}</h1>
      <p className="muted">
        {subtitle} · {sections.length} Blöcke · {exerciseCount(steps)} Übungen · {setCount(steps)} Sätze
      </p>
      {sections.map((s) => (
        <section key={s.id} className={`tone-${s.tone}`} aria-label={s.title}>
          <div className="band">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name={TONE_ICON[s.tone]} />
              {s.title}
            </span>
            <span className="bmeta">{s.meta}</span>
          </div>
          <div className="bandbody soft">
            {s.info && <p className="orow">{s.info}</p>}
            {s.rows.map((r) => (
              <div key={r.id} className="orow">
                <span>
                  {r.title}
                  {r.alternative && <span className="muted block">Schmerzfrei nicht möglich: {r.alternative}</span>}
                </span>
                <span className="sum">{r.summary}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="actionbar">
        <button className="primary" onClick={onStart}>
          Einheit starten
        </button>
      </div>
    </main>
  )
}
