import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { moveSession, setSkipped } from '../../db/planEdit'
import { formatDate, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { addDays, isInPlan, itemsForDate, moveWarnings, type ScheduledItem } from '../../domain/schedule'
import { STATUS_LABEL, statusOf, useSchedule, type ScheduleData } from '../../hooks/useSchedule'

const RUNNABLE = new Set(['kb-a', 'kb-b', 'knee', 'bike', 'ftp-test', 'outdoor-ride', 'measurement', 'swing-test', 'hinge-drill', 'task', 'football'])

export function DayPage() {
  const { date = '' } = useParams()
  const navigate = useNavigate()
  const data = useSchedule()
  if (!data) return null
  if (!isInPlan(date)) return <main className="page"><p>Dieses Datum liegt außerhalb des Plans.</p></main>
  const { items, movedAway } = itemsForDate(date, data.moves, data.tiers)

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/kalender')}>‹ Kalender</button>
      </header>
      <h1>
        {weekdayName(date)}, {formatDate(date)}
      </h1>
      <div className="stack">
        {items.length === 0 && movedAway.length === 0 && <p className="muted">Für diesen Tag ist nichts geplant.</p>}
        {items.map((it) => (
          <ItemCard key={it.originDate + it.kind} item={it} data={data} date={date} />
        ))}
        {movedAway.map((it) => (
          <section className="card stack" key={it.kind}>
            <h2>{sessionTitle(it.session)}</h2>
            <p>
              Verschoben auf {formatDate(it.toDate)}.
            </p>
            <button onClick={() => void moveSession(it.originDate, it.kind, it.originDate)}>Verschiebung aufheben</button>
          </section>
        ))}
      </div>
    </main>
  )
}

function ItemCard({ item, data, date }: { item: ScheduledItem; data: ScheduleData; date: string }) {
  const status = statusOf(item, data.logs)
  const [target, setTarget] = useState('')
  const warnings = target ? moveWarnings(item.kind, item.originDate, target, data.moves, data.tiers) : []
  const weekDates = Array.from({ length: 14 }, (_, i) => addDays(date, i - 6)).filter((d) => isInPlan(d) && d !== date)
  const open = RUNNABLE.has(item.kind) && !item.hiddenReason

  return (
    <section className="card stack">
      <p className="muted">
        {STATUS_LABEL[status]}
        {item.moved && ` · verschoben von ${formatDate(item.originDate)}`}
      </p>
      <h2>{sessionTitle(item.session)}</h2>
      {item.session.label !== sessionTitle(item.session) && <p>{item.session.label}</p>}
      {item.hiddenReason && <p className="notice">{item.hiddenReason}</p>}
      {item.hint && <p className="notice">{item.hint}</p>}
      {open && (
        <Link className="btn primary" to={`/einheit/${item.originDate}/${item.kind}`}>
          {status === 'done' ? 'Ergebnis ansehen' : 'Einheit öffnen'}
        </Link>
      )}
      {item.kind !== 'rest' && status !== 'done' && (
        <button onClick={() => void setSkipped(item.originDate, item.kind, status !== 'skipped')}>
          {status === 'skipped' ? 'Auslassen rückgängig' : 'Als ausgelassen markieren'}
        </button>
      )}
      {item.kind !== 'rest' && status !== 'done' && (
        <details>
          <summary>Auf einen anderen Tag verschieben</summary>
          <label>
            Neuer Tag
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Tag wählen…</option>
              {weekDates.map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}, {formatDate(d)}
                </option>
              ))}
            </select>
          </label>
          {warnings.map((w) => (
            <p key={w} className="notice">
              {w}
            </p>
          ))}
          <button
            disabled={!target}
            onClick={async () => {
              await moveSession(item.originDate, item.kind, target)
              setTarget('')
            }}
          >
            Verschieben
          </button>
          {item.moved && (
            <button onClick={() => void moveSession(item.originDate, item.kind, item.originDate)}>Zurück auf {formatDate(item.originDate)}</button>
          )}
        </details>
      )}
    </section>
  )
}
