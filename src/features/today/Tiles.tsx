import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { HeroArt } from '../../components/Visuals'
import { SHORT_LABEL, TONE_ICON, toneOfKind } from '../../domain/colors'
import { formatNumber, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { exerciseCount, setCount } from '../../domain/overview'
import { seed, type Week } from '../../domain/plan'
import { statusOf, type ScheduleData } from '../../hooks/useSchedule'
import type { ScheduledItem } from '../../domain/schedule'
import { buildKbSteps, buildKneeSteps } from '../../domain/steps'
import { bikeDetails, nextSession, weekStrip, weightTile, weekQuota } from '../../domain/dashboard'
import { makeSessionKey } from '../../domain/keys'

const RUNNABLE = new Set(['kb-a', 'kb-b', 'knee', 'bike', 'ftp-test', 'outdoor-ride', 'measurement', 'swing-test', 'hinge-drill', 'task', 'football'])

/** One-line description of a session for the tiles. */
export function sessionMeta(item: ScheduledItem, week: Week, data: ScheduleData): string {
  if (item.kind === 'kb-a' || item.kind === 'kb-b') {
    const steps = buildKbSteps(week.week, item.kind === 'kb-a' ? 'A' : 'B', data.overrides)
    return `${exerciseCount(steps)} Übungen · ${setCount(steps)} Sätze · 55–60 min`
  }
  if (item.kind === 'knee' && week.phase) return `${new Set(buildKneeSteps(week.phase, 'tue').map((s) => s.exerciseKey)).size} Übungen · 15 min`
  if (item.kind === 'bike') {
    const plan = bikeDetails(String((item.session as { workout?: string }).workout ?? ''))
    return plan ? `${plan.content} · ${plan.duration}` : item.session.label
  }
  if (item.kind === 'football') return 'Hobby-Kick · 90 min'
  return item.session.label
}

interface HeroProps {
  item: ScheduledItem
  week: Week
  data: ScheduleData
  started: boolean
  workoutCLink: boolean
  label: string
}

export function HeroTile({ item, week, data, started, workoutCLink, label }: HeroProps) {
  const tone = toneOfKind(item.kind)
  const status = statusOf(item, data.logs)
  return (
    <section className={`tile hero tone-${tone}`}>
      <div className="kicker">
        <span>{label}</span>
        <Icon name={TONE_ICON[tone]} large />
      </div>
      <HeroArt icon={TONE_ICON[tone]} />
      <p className="big">{sessionTitle(item.session)}</p>
      {item.kind === 'rest' ? (
        <p>Heute ist Ruhetag.</p>
      ) : (
        <div className="chips">
          {sessionMeta(item, week, data)
            .split(' · ')
            .map((c) => (
              <span key={c}>{c}</span>
            ))}
        </div>
      )}
      {item.moved && <p>Verschoben von {item.originDate.split('-').reverse().slice(0, 2).join('.')}.</p>}
      {item.hint && <p>{item.hint}</p>}
      {status === 'done' && <p className="big">✓ Erledigt</p>}
      {status === 'skipped' && <p className="big">Ausgelassen</p>}
      {status === 'planned' && item.kind !== 'rest' && RUNNABLE.has(item.kind) && (
        <Link className="tilebtn" to={`/einheit/${item.originDate}/${item.kind}`}>
          {started ? 'Einheit fortsetzen' : 'Einheit starten'}
        </Link>
      )}
      {status === 'planned' && workoutCLink && (
        <Link className="tilebtn" to={`/einheit/${item.originDate}/workout-c`}>
          Fußball fällt aus: Workout C
        </Link>
      )}
    </section>
  )
}

export function StatTiles({ data, today, week }: { data: ScheduleData; today: string; week: number }) {
  const w = weightTile(data.measurements, today)
  const q = weekQuota(data.logs, data.moves, data.tiers, today, week)
  const state = { above: 'über dem Korridor', below: 'unter dem Korridor', within: 'im Korridor', none: '' }[w.status]
  return (
    <div className="tiles2">
      <Link to="/fortschritt" className="tile tone-weight">
        <div className="kicker">
          <span>Gewicht</span>
          <Icon name="scale" />
        </div>
        <p className="num">{w.value === null ? '–' : formatNumber(w.value, 'kg')}</p>
        <p>{w.value === null ? 'Noch kein Wert' : `Ziel ${formatNumber(w.target)} · ${state}`}</p>
      </Link>
      <Link to="/kalender" className="tile tone-ball">
        <div className="kicker">
          <span>Diese Woche</span>
          <Icon name="target" />
        </div>
        <p className="num">{q.current ? `${q.current.done} von ${q.current.planned}` : '–'}</p>
        <p>{q.previousPct !== undefined ? `Letzte Woche ${q.previousPct} %` : 'Einheiten erledigt'}</p>
      </Link>
    </div>
  )
}

export function WeekStrip({ week, data, today }: { week: Week; data: ScheduleData; today: string }) {
  const days = weekStrip(week, data.moves, data.tiers)
  return (
    <nav aria-label="Deine Woche" className="stack" style={{ gap: '.4rem' }}>
      <p className="muted" style={{ margin: 0 }}>
        Deine Woche
      </p>
      <div className="strip">
        {days.map((d) => {
          const kind = d.item?.kind ?? 'rest'
          const done = d.item ? statusOf(d.item, data.logs) === 'done' : false
          return (
            <Link
              key={d.date}
              to={`/tag/${d.date}`}
              className={`chipday tone-${toneOfKind(kind)} ${d.date === today ? 'today' : ''} ${done ? 'donechip' : ''} ${kind === 'rest' ? 'restchip' : ''}`}
              aria-label={`${weekdayName(d.date)}: ${d.item ? sessionTitle(d.item.session) : 'nichts geplant'}${done ? ', erledigt' : ''}`}
            >
              <span>{weekdayName(d.date).slice(0, 2)}</span>
              <span>{SHORT_LABEL[kind] ?? ''}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function NextTile({ data, today }: { data: ScheduleData; today: string }) {
  const next = nextSession(today, data.moves, data.tiers)
  if (!next) return null
  const tone = toneOfKind(next.item.kind)
  const pos = seed.weeks.find((w) => next.date >= w.start && next.date <= w.end)
  const when = next.date === nextDay(today) ? 'Morgen' : weekdayName(next.date)
  return (
    <Link to={`/tag/${next.date}`} className={`tile next tone-${tone}`}>
      <Icon name={TONE_ICON[tone]} large />
      <div>
        <p>{when}</p>
        <p className="big" style={{ fontSize: '1.05rem' }}>
          {sessionTitle(next.item.session)}
        </p>
        {pos && <p>{sessionMeta(next.item, pos, data)}</p>}
      </div>
    </Link>
  )
}

const nextDay = (iso: string) => {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export const sessionKeyOf = (item: ScheduledItem) => makeSessionKey(item.originDate, item.kind)
