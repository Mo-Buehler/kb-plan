import { useState } from 'react'
import { finishSession } from '../../db/sessions'
import { bikeDetails } from '../../domain/dashboard'
import { seed, type SessionItem } from '../../domain/plan'
import { FinishForm, type FinishData } from './FinishForm'
import { NumberField } from './NumberField'

interface Props {
  sessionKey: string
  date: string
  session: SessionItem
  onClose: () => void
}

const clean = (s: string) => s.replace(/\*\*/g, '')

/** Bike session: shows the MyWhoosh workout and records duration, heart rate, FTP and knee pain. */
export function BikeSession({ sessionKey, date, session, onClose }: Props) {
  const item = session as Record<string, unknown>
  const isFtp = session.kind === 'ftp-test'
  const workoutName = isFtp ? 'FTP-Test' : String(item.workout ?? '')
  const base = workoutName.replace(/ V\d$/, '')
  const family = seed.bike.workouts.find((w) => w.base === base || w.name === workoutName)
  const plan = family && { ...family, ...bikeDetails(workoutName) }
  const plannedMin = Number(plan?.duration.match(/\d+/)?.[0]) || undefined

  const [duration, setDuration] = useState<number | undefined>(plannedMin)
  const [hr, setHr] = useState<number>()
  const [ftp, setFtp] = useState<number>()

  async function save(d: FinishData) {
    await finishSession(
      { date, sessionKey, kneePain: d.kneePain, note: d.note, durationMin: duration, avgHr: hr },
      ftp ? [{ date, kind: 'ftp', value: ftp }] : [],
    )
    onClose()
  }

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={onClose}>‹ Zurück</button>
      </header>
      <section className="card stack">
        <h1>{workoutName || 'Rad'}</h1>
        {plan ? (
          <>
            <p>
              <strong>Inhalt:</strong> {plan.content}
            </p>
            <p>
              <strong>Dauer:</strong> {plan.duration}
            </p>
            {plan.versions.length > 0 && <p className="muted">Variante {workoutName.match(/V\d$/)?.[0]} von {plan.name}</p>}
          </>
        ) : (
          <p>{session.label}</p>
        )}
        {typeof item.alternativeText === 'string' && <p className="notice">Alternative: {item.alternativeText}</p>}
        {typeof item.note === 'string' && <p className="muted">{item.note}</p>}
        <details>
          <summary>Hinweise zu Zonen und Trittfrequenz</summary>
          {seed.bike.notes.map((n) => (
            <p key={n}>{clean(n)}</p>
          ))}
        </details>
      </section>
      <section className="card stack" style={{ marginTop: '1rem' }}>
        <h2>Ergebnis</h2>
        <div className="numgrid">
          <NumberField label="Dauer" unit="min" value={duration} onChange={setDuration} step={5} />
          <NumberField label="Ø Puls (optional)" unit="bpm" value={hr} onChange={setHr} />
          {isFtp && <NumberField label="FTP" unit="W" value={ftp} onChange={setFtp} />}
        </div>
        <FinishForm title="Abschluss" withRpe={false} onSave={save} />
      </section>
    </main>
  )
}
