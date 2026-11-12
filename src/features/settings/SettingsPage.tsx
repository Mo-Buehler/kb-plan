import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAllData } from '../../db/backup'
import { db } from '../../db/db'
import { seed } from '../../domain/plan'

/** Personal data (stored only on this device) and the reset. */
export function SettingsPage() {
  const navigate = useNavigate()
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, [])
  const [saved, setSaved] = useState(false)
  if (!profile) return null

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const n = (k: string) => Number(String(f.get(k)).replace(',', '.'))
    const name = String(f.get('name')).trim()
    if (!name || !(n('age') > 0) || !(n('height') > 0) || !(n('weight') > 0)) return
    await db.profile.put({ ...profile!, name, age: n('age'), heightCm: n('height'), startWeightKg: n('weight') })
    setSaved(true)
  }

  async function reset() {
    if (window.confirm('Wirklich ALLE Daten auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen. Hast du ein Backup?')) await deleteAllData()
  }

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/mehr')}>‹ Mehr</button>
      </header>
      <h1>Einstellungen</h1>
      <div className="stack">
        <form className="card stack" onSubmit={save} onChange={() => setSaved(false)}>
          <h2>Persönliche Angaben</h2>
          <p className="muted">Nur auf diesem Gerät gespeichert.</p>
          <label>
            Name
            <input name="name" defaultValue={profile.name} required />
          </label>
          <label>
            Alter (Jahre)
            <input name="age" inputMode="numeric" defaultValue={profile.age} required />
          </label>
          <label>
            Größe (cm)
            <input name="height" inputMode="numeric" defaultValue={profile.heightCm} required />
          </label>
          <label>
            Startgewicht (kg)
            <input name="weight" inputMode="decimal" defaultValue={String(profile.startWeightKg).replace('.', ',')} required />
          </label>
          <button className="primary" type="submit">
            Speichern
          </button>
          {saved && (
            <p role="status" className="done">
              Gespeichert.
            </p>
          )}
        </form>
        <section className="card stack">
          <h2>Plan</h2>
          <p className="muted">
            Planversion {seed.sourceHash} · {seed.weeks.length} Wochen bis {seed.planEnd.split('-').reverse().join('.')}
          </p>
        </section>
        <section className="card stack">
          <h2>Alle Daten löschen</h2>
          <p>Entfernt Profil, Ergebnisse und Änderungen von diesem Gerät. Der Trainingsplan bleibt erhalten.</p>
          <button className="danger" onClick={() => void reset()}>
            Alle Daten löschen
          </button>
        </section>
      </div>
    </main>
  )
}
