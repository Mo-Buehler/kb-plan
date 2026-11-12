import { useState } from 'react'
import { db, type Measurement } from '../../db/db'
import { todayIso } from '../../domain/plan'
import { NumberField } from '../session/NumberField'

const KINDS: { kind: Measurement['kind']; label: string; unit: string; step: number }[] = [
  { kind: 'weight', label: 'Körpergewicht', unit: 'kg', step: 0.1 },
  { kind: 'waist', label: 'Taillenumfang', unit: 'cm', step: 0.5 },
  { kind: 'resting-hr', label: 'Ruhepuls', unit: 'bpm', step: 1 },
]

/** Quick entry for daily weight, waist and resting heart rate. One value per day and kind. */
export function MeasureEntry({ last }: { last: Partial<Record<Measurement['kind'], number>> }) {
  const [kind, setKind] = useState<Measurement['kind']>('weight')
  const [date, setDate] = useState(todayIso())
  const [value, setValue] = useState<number>()
  const [saved, setSaved] = useState('')
  const k = KINDS.find((x) => x.kind === kind)!
  const eff = value ?? last[kind]

  async function save() {
    if (!eff) return
    await db.transaction('rw', db.measurements, async () => {
      await db.measurements.where({ date, kind }).delete()
      await db.measurements.add({ date, kind, value: eff })
    })
    setSaved(`${k.label} gespeichert.`)
    setValue(undefined)
  }

  return (
    <div className="stack">
      <div className="scale" role="group" aria-label="Messwert">
        {KINDS.map((x) => (
          <button key={x.kind} className={kind === x.kind ? 'sel' : ''} aria-pressed={kind === x.kind} onClick={() => (setKind(x.kind), setSaved(''))}>
            {x.label}
          </button>
        ))}
      </div>
      <label>
        Datum
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <NumberField label={k.label} unit={k.unit} value={eff} onChange={setValue} step={k.step} />
      <button className="primary" disabled={!eff} onClick={() => void save()}>
        Speichern
      </button>
      {saved && (
        <p role="status" className="done">
          {saved}
        </p>
      )}
    </div>
  )
}
