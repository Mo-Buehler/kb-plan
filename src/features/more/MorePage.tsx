import { Link } from 'react-router-dom'

const ITEMS = [
  { to: '/mehr/plan', label: 'Plan bearbeiten', note: 'Sätze, Wiederholungen, Gewichte, Ersatzübungen' },
  { to: '/kalender', label: 'Wochenstufe und Verschieben', note: 'Im Kalender: Woche öffnen oder Tag antippen' },
]
const LATER = ['Checklisten und Einkaufsliste', 'Backup und Import', 'Einstellungen']

export function MorePage() {
  return (
    <main className="page">
      <h1>Mehr</h1>
      <div className="stack">
        {ITEMS.map((i) => (
          <Link key={i.to} className="card menuitem" to={i.to}>
            <strong>{i.label}</strong>
            <span className="muted">{i.note}</span>
          </Link>
        ))}
        {LATER.map((l) => (
          <div key={l} className="card menuitem disabled">
            <strong>{l}</strong>
            <span className="muted">folgt in einem späteren Schritt</span>
          </div>
        ))}
      </div>
    </main>
  )
}
