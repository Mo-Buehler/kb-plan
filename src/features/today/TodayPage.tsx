import { formatDate, weekdayName } from '../../domain/format'
import { sessionTitle } from '../../domain/labels'
import { locate, seed, todayIso } from '../../domain/plan'

export function TodayPage({ name }: { name: string }) {
  const iso = todayIso()
  const pos = locate(iso)

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
        <section className="card">
          <p className="muted">
            Woche {pos.week.week}
            {pos.week.deload ? ' · Deload-Woche' : ''}
            {pos.week.phase ? ` · Phase ${pos.week.phase}` : ''}
          </p>
          {pos.phaseStart && <p className="notice">Erster Tag einer neuen Phase.</p>}
          <h2>{sessionTitle(pos.day.session)}</h2>
          <button className="primary" disabled>
            Einheit starten (folgt in Schritt 3)
          </button>
        </section>
      )}
    </main>
  )
}
