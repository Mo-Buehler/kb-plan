import { Link } from 'react-router-dom'

const ITEMS = [
  { to: '/mehr/plan', label: 'Plan bearbeiten', note: 'Sätze, Wiederholungen, Gewichte, Ersatzübungen' },
  { to: '/kalender', label: 'Wochenstufe und Verschieben', note: 'Im Kalender: Woche öffnen oder Tag antippen' },
  { to: '/mehr/checklisten', label: 'Checklisten', note: 'Vor dem Start, während des Plans, Saisonstart' },
  { to: '/mehr/einkauf', label: 'Einkaufsliste', note: 'Mit Bestellterminen' },
  { to: '/mehr/bilder', label: 'Übungsbilder', note: 'Eigene Fotos zu den Übungen, nur auf diesem Gerät' },
  { to: '/mehr/backup', label: 'Backup und Import', note: 'Daten sichern und auf ein anderes Gerät übertragen' },
  { to: '/mehr/einstellungen', label: 'Einstellungen', note: 'Persönliche Angaben, Daten löschen' },
]

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
      </div>
    </main>
  )
}
