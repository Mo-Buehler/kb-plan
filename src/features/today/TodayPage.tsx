import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { makeSessionKey } from '../../db/sessions'
import { formatDate, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { locate, seed, todayIso } from '../../domain/plan'

const RUNNABLE = new Set(['kb-a', 'kb-b', 'knee', 'bike', 'ftp-test', 'outdoor-ride', 'measurement', 'swing-test', 'hinge-drill', 'task', 'football'])

export function TodayPage({ name }: { name: string }) {
  const iso = todayIso()
  const pos = locate(iso)
  const kind = pos.state === 'running' ? pos.day.session.kind : ''
  const log = useLiveQuery(() => db.sessionLogs.where('sessionKey').equals(makeSessionKey(iso, kind)).first(), [iso, kind])
  const started = useLiveQuery(() => db.setLogs.where('sessionKey').equals(makeSessionKey(iso, kind)).count(), [iso, kind])

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
        <section className="card stack">
          <p className="muted">
            Woche {pos.week.week}
            {pos.week.deload ? ' · Deload-Woche' : ''}
            {pos.week.phase ? ` · Phase ${pos.week.phase}` : ''}
          </p>
          {pos.week.deload && <p className="notice">Entlastungswoche: nur die angegebenen Sätze, kein Zusatztraining.</p>}
          {pos.phaseStart && <p className="notice">Erster Tag einer neuen Phase.</p>}
          <h2>{sessionTitle(pos.day.session)}</h2>
          {pos.day.session.kind === 'rest' ? (
            <p>Heute ist Ruhetag.</p>
          ) : log ? (
            <p className="done">✓ Heute erledigt</p>
          ) : (
            RUNNABLE.has(pos.day.session.kind) && (
              <Link className="btn primary" to={`/einheit/${iso}`}>
                {started ? 'Einheit fortsetzen' : 'Einheit starten'}
              </Link>
            )
          )}
          {'alternative' in pos.day.session && !log && (
            <Link className="btn" to={`/einheit/${iso}/workout-c`}>
              Fußball fällt aus: Workout C
            </Link>
          )}
        </section>
      )}
    </main>
  )
}
