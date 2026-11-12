import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { TONE_ICON, toneOfKind } from '../../domain/colors'
import { setTier } from '../../db/planEdit'
import { formatDate } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { seed, todayIso, type Week } from '../../domain/plan'
import { itemsForDate, TIER_LABEL, TIER_ORDER, type Tier } from '../../domain/schedule'
import { STATUS_LABEL, statusOf, useSchedule, type ScheduleData } from '../../hooks/useSchedule'

const DOW_SHORT: Record<string, string> = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' }
const short = (iso: string) => formatDate(iso).slice(0, 6)

export function CalendarPage() {
  const data = useSchedule()
  if (!data) return null
  const today = todayIso()
  const current = seed.weeks.find((w) => today >= w.start && today <= w.end)?.week ?? (today < seed.weeks[0].start ? 0 : 16)

  return (
    <main className="page">
      <h1>Kalender</h1>
      <p className="muted">Woche 0 bis 16 · tippe auf einen Tag, um die Einheit zu öffnen, zu verschieben oder auszulassen.</p>
      <div className="stack">
        {seed.weeks.map((w) => (
          <WeekBlock key={w.week} week={w} data={data} today={today} open={w.week === current} />
        ))}
      </div>
    </main>
  )
}

function WeekBlock({ week, data, today, open }: { week: Week; data: ScheduleData; today: string; open: boolean }) {
  const tier = data.tiers[week.week] ?? 'full'
  const days = week.days.map((d) => ({ d, ...itemsForDate(d.date, data.moves, data.tiers) }))
  const all = days.flatMap((x) => x.items).filter((i) => i.kind !== 'rest' && !i.hiddenReason)
  const done = all.filter((i) => statusOf(i, data.logs) === 'done').length

  return (
    <details className="card weekblock" open={open}>
      <summary>
        <strong>Woche {week.week}</strong> · {short(week.start)}–{short(week.end)}
        {week.phase && ` · ${week.phase}`}
        {week.deload && ' · Deload'}
        {tier !== 'full' && <span className="badge"> {TIER_LABEL[tier]}</span>}
        <span className="muted"> · {done}/{all.length} erledigt</span>
        <span className="minis" aria-hidden="true">
          {days.map(({ d, items }) => {
            const it = items.find((i) => i.kind !== 'rest')
            return <i key={d.date} className={`tone-${toneOfKind(it?.kind ?? 'rest')} ${it && !it.hiddenReason ? '' : 'off'}`} />
          })}
        </span>
      </summary>
      <ul className="daylist">
        {days.map(({ d, items, movedAway }) => (
          <li key={d.date} className={d.date === today ? 'today' : ''}>
            <Link to={`/tag/${d.date}`}>
              <span className="dow">
                {DOW_SHORT[d.dow]} {short(d.date)}
              </span>
              <span className="daytitles">
                {items.map((it) => (
                  <span key={it.originDate + it.kind} className={it.hiddenReason ? 'struck' : ''}>
                    <span className={`pill tone-${toneOfKind(it.kind)} ${it.kind === 'rest' ? 'restpill' : ''}`}>
                      <Icon name={TONE_ICON[toneOfKind(it.kind)]} />
                      {it.hiddenReason ? 'entfällt: ' : ''}
                      {sessionTitle(it.session)}
                    </span>
                    {it.moved && ` (von ${short(it.originDate)})`}{' '}
                    {it.kind !== 'rest' && (
                      <span className={`status st-${statusOf(it, data.logs)}`}>{STATUS_LABEL[statusOf(it, data.logs)]}</span>
                    )}
                  </span>
                ))}
                {movedAway.map((it) => (
                  <span key={it.kind} className="muted">
                    {sessionTitle(it.session)} → {short(it.toDate)} <span className="status st-moved">verschoben</span>
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <label className="tierpick">
        Wochenstufe
        <select value={tier} onChange={(e) => void setTier(week.week, e.target.value as Tier)}>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      {tier !== 'full' && <TierInfo tier={tier} />}
    </details>
  )
}

function TierInfo({ tier }: { tier: Tier }) {
  const row = seed.rules.tiers.find((r) => r.name === TIER_LABEL[tier])
  const order = seed.rules.notes.find((n) => n.startsWith('**Streichreihenfolge'))?.replace(/\*\*/g, '')
  return (
    <div className="notice">
      {row && (
        <p>
          <strong>{row.name}:</strong> {row.when}. {row.content} (ca. {row.hoursPerWeek})
        </p>
      )}
      {order && <p>{order}</p>}
    </div>
  )
}
