import type { SparkData } from '../domain/home'
import type { Tone } from '../domain/colors'
import { seed } from '../domain/plan'
import { Icon } from './Icon'

/** Donut that fills with the share done. Text sits in the middle; colour comes from the tone. */
export function Ring({ share, size = 92, label, sub }: { share: number; size?: number; label: string; sub?: string }) {
  const r = 38
  const c = 2 * Math.PI * r
  const pct = Math.round(Math.min(1, Math.max(0, share)) * 100)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}, ${pct} Prozent`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="11" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, Math.max(0.001, share))} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y={sub ? 49 : 56} textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">
        {label}
      </text>
      {sub && (
        <text x="50" y="66" textAnchor="middle" fontSize="11" fill="currentColor">
          {sub}
        </text>
      )}
    </svg>
  )
}

/** Small weight curve with the target line; area under the curve is tinted. */
export function Sparkline({ data, width = 300, height = 84 }: { data: SparkData; width?: number; height?: number }) {
  const t0 = data.points[0].t
  const t1 = Math.max(data.points.at(-1)!.t, data.targets.at(-1)?.t ?? 0)
  const pad = 6
  const span = Math.max(0.4, data.max - data.min)
  const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (width - 2 * pad)
  const y = (v: number) => height - pad - ((v - data.min) / span) * (height - 2 * pad)
  const line = data.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.points.at(-1)!.t).toFixed(1)} ${height} L${x(t0).toFixed(1)} ${height} Z`
  const target = data.targets.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const last = data.points.at(-1)!
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Gewichtsverlauf der letzten Wochen" preserveAspectRatio="none">
      <path d={area} fill="currentColor" fillOpacity=".18" />
      {target && <path d={target} fill="none" stroke="currentColor" strokeOpacity=".7" strokeDasharray="4 4" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.t)} cy={y(last.v)} r="4.5" fill="currentColor" />
    </svg>
  )
}

const PHASE_TONE: Tone[] = ['cool', 'kb', 'fin', 'knee']

/** The 16 plan weeks as segments: phase colour, deload marked, passed weeks solid, current week highlighted. */
export function PhaseTimeline({ currentWeek }: { currentWeek: number }) {
  const weeks = seed.weeks.filter((w) => w.week >= 1)
  return (
    <div>
      <div className="timeline" role="img" aria-label={`Plan: Woche ${currentWeek} von 16`}>
        {weeks.map((w) => {
          const pi = Math.max(0, seed.phases.findIndex((p) => p.id === w.phase))
          const state = w.week < currentWeek ? 'past' : w.week === currentWeek ? 'now' : 'future'
          return (
            <span key={w.week} className={`seg tone-${PHASE_TONE[pi]} ${state} ${w.deload ? 'deload' : ''}`}>
              {state === 'now' && <i aria-hidden="true" />}
            </span>
          )
        })}
      </div>
      <div className="phaselegend">
        {seed.phases.map((p, i) => (
          <span key={p.id} className={`tone-${PHASE_TONE[i]}`}>
            <i aria-hidden="true" /> {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Weekly kettlebell volume as small bars; the latest week is full colour. */
export function MiniBars({ data }: { data: { week: number; volume: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.volume))
  return (
    <div className="minibars" role="img" aria-label="Kettlebell-Volumen der letzten Wochen">
      {data.map((d, i) => (
        <div key={d.week} className="mb">
          <span className="bar" style={{ height: `${Math.max(6, (d.volume / max) * 100)}%`, opacity: i === data.length - 1 ? 1 : 0.55 }} />
          <span className="lbl">W{d.week}</span>
        </div>
      ))}
    </div>
  )
}

export function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span className={`badgecircle ${earned ? 'earned' : ''}`}>
      <Icon name={icon} />
    </span>
  )
}

/** Large faint artwork behind the hero text. */
export function HeroArt({ icon }: { icon: string }) {
  return (
    <span className="heroart" aria-hidden="true">
      <Icon name={icon} large />
    </span>
  )
}
