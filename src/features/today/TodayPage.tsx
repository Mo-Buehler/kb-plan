import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { makeSessionKey } from '../../db/sessions'
import { formatDate, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { locate, seed, todayIso } from '../../domain/plan'
import { itemsForDate, type ScheduledItem } from '../../domain/schedule'
import { STATUS_LABEL, statusOf, useSchedule, type ScheduleData } from '../../hooks/useSchedule'

const RUNNABLE = new Set(['kb-a', 'kb-b', 'knee', 'bike', 'ftp-test', 'outdoor-ride', 'measurement', 'swing-test', 'hinge-drill', 'task', 'football'])

export function TodayPage({ name }: { name: string }) {
  const iso = todayIso()
  const pos = locate(iso)
  const data = useSchedule()
  if (!data) return null
  const { items, movedAway } = itemsForDate(iso, data.moves, data.tiers)
  const visible = items.filter((i) => !i.hiddenReason)
  const hidden = items.filter((i) => i.hiddenReason)

  return (
    <main className="page">
      <h1>Hallo {name}</h1>
      <p className="muted">
        {weekdayName(iso)}, {formatDate(iso)}
      </p>
      {pos.state === 'before' && (
        <section className="card">
          <h2>Der Plan startet bald</h2>
          <p>
            Noch {pos.daysUntilStart} Tage bis zur Vorbereitungswoche am {formatDate(seed.weeks[0].start)}.
          </p>
        </section>
      )}
      {pos.state === 'after' && (
        <section className="card">
          <h2>Plan abgeschlossen</h2>
          <p>Das Planende war am {formatDate(seed.planEnd)}.</p>
        </section>
      )}
      {pos.state === 'running' && (
        <div className="stack">
          <p className="muted">
            Woche {pos.week.week}
            {pos.week.deload ? ' · Deload-Woche' : ''}
            {pos.week.phase ? ` · Phase ${pos.week.phase}` : ''}
            {data.tiers[pos.week.week] ? ` · Stufe ${data.tiers[pos.week.week] === 'compact' ? 'Kompakt' : 'Minimum'}` : ''}
          </p>
          {pos.week.deload && <p className="notice">Entlastungswoche: nur die angegebenen Sätze, kein Zusatztraining.</p>}
          {pos.phaseStart && <p className="notice">Erster Tag einer neuen Phase.</p>}
          {visible.map((it) => (
            <SessionCard key={it.originDate + it.kind} item={it} data={data} />
          ))}
          {visible.length === 0 && <p className="card">Heute steht nichts an.</p>}
          {movedAway.map((m) => (
            <p key={m.kind} className="muted">
              {sessionTitle(m.session)} wurde auf {formatDate(m.toDate)} verschoben.
            </p>
          ))}
          {hidden.map((h) => (
            <p key={h.kind} className="muted">
              {sessionTitle(h.session)}: {h.hiddenReason}
            </p>
          ))}
        </div>
      )}
    </main>
  )
}

function SessionCard({ item, data }: { item: ScheduledItem; data: ScheduleData }) {
  const key = makeSessionKey(item.originDate, item.kind)
  const started = useLiveQuery(() => db.setLogs.where('sessionKey').equals(key).count(), [key])
  const status = statusOf(item, data.logs)
  const url = `/einheit/${item.originDate}/${item.kind}`
  return (
    <section className="card stack">
      <h2>{sessionTitle(item.session)}</h2>
      {item.moved && <p className="muted">Verschoben von {formatDate(item.originDate)}</p>}
      {item.hint && <p className="notice">{item.hint}</p>}
      {item.kind === 'rest' ? (
        <p>Heute ist Ruhetag.</p>
      ) : status === 'done' ? (
        <p className="done">✓ Erledigt</p>
      ) : status === 'skipped' ? (
        <p className="muted">Ausgelassen</p>
      ) : (
        RUNNABLE.has(item.kind) && (
          <Link className="btn primary" to={url}>
            {started ? 'Einheit fortsetzen' : 'Einheit starten'}
          </Link>
        )
      )}
      {'alternative' in item.session && status === 'planned' && (
        <Link className="btn" to={`/einheit/${item.originDate}/workout-c`}>
          Fußball fällt aus: Workout C
        </Link>
      )}
      {status === 'skipped' && <span className={`status st-${status}`}>{STATUS_LABEL[status]}</span>}
    </section>
  )
}
