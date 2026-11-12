import { useState, type FormEvent } from 'react'
import { InstallHint } from '../../components/InstallHint'
import { db } from '../../db/db'

/** One-time setup. All values stay on this device (IndexedDB). */
export function SetupDialog() {
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const num = (k: string) => Number(String(f.get(k)).replace(',', '.'))
    const name = String(f.get('name')).trim()
    const [age, heightCm, startWeightKg] = [num('age'), num('height'), num('weight')]
    if (!name || !(age > 0) || !(heightCm > 0) || !(startWeightKg > 0)) {
      setError('Bitte alle Felder mit gültigen Zahlen ausfüllen.')
      return
    }
    await db.profile.put({ id: 1, name, age, heightCm, startWeightKg, createdAt: new Date().toISOString() })
  }

  return (
    <main className="page narrow">
      <h1>Willkommen bei KB Plan</h1>
      <InstallHint />
      <p>Diese Angaben bleiben ausschließlich auf diesem Gerät gespeichert. Sie werden nirgendwohin gesendet.</p>
      <form onSubmit={submit} className="stack">
        <label>
          Name
          <input name="name" autoComplete="given-name" required />
        </label>
        <label>
          Alter (Jahre)
          <input name="age" inputMode="numeric" required />
        </label>
        <label>
          Größe (cm)
          <input name="height" inputMode="numeric" required />
        </label>
        <label>
          Startgewicht, 7-Tage-Durchschnitt (kg)
          <input name="weight" inputMode="decimal" required />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" className="primary">
          Speichern und starten
        </button>
      </form>
    </main>
  )
}
