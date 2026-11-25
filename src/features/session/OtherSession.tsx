import { useState } from 'react'
import { finishSession } from '../../db/sessions'
import type { SessionItem } from '../../domain/plan'
import { sessionTitle } from '../../domain/labels'
import { FinishForm, type FinishData } from './FinishForm'
import { NumberField } from './NumberField'
import { Stopwatch } from './Stopwatch'

interface Props {
  sessionKey: string
  date: string
  session: SessionItem
  onClose: () => void
}

/** Measurements, Hinge-Drill, football and other one-tap sessions. */
export function OtherSession({ sessionKey, date, session, onClose }: Props) {
  const [waist, setWaist] = useState<number>()
  const [weight, setWeight] = useState<number>()
  const [swingSeconds, setSwingSeconds] = useState<number>()
  const isMeasure = session.kind === 'measurement' || session.kind === 'swing-test'
  const isSwing = session.kind === 'swing-test'
  const isCheck = session.kind === 'knee-check'
  const note = (session as { note?: string }).note

  async function save(d: FinishData) {
    const m = []
    if (waist) m.push({ date, kind: 'waist' as const, value: waist })
    if (weight) m.push({ date, kind: 'weight' as const, value: weight })
    if (swingSeconds) m.push({ date, kind: 'swing-test' as const, value: swingSeconds })
    await finishSession({ date, sessionKey, kneePain: d.kneePain, note: d.note, rpe: d.rpe }, m)
    onClose()
  }

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={onClose}>‹ Zurück</button>
      </header>
      <section className="card stack">
        <h1>{sessionTitle(session)}</h1>
        {isCheck ? <p>Wie fühlt sich dein Knie heute Morgen an? Trage den Schmerz von 0 bis 10 ein. Ab 4 gibt es einen Hinweis für Mittwoch.</p> : <p>{session.label}</p>}
        {note && <p className="muted">{note}</p>}
        {isSwing && (
          <>
            <p>100 Swings mit 24 kg auf Zeit.</p>
            {swingSeconds ? <p className="notice">Zeit: {swingSeconds} s</p> : <Stopwatch sessionKey={sessionKey} onStop={setSwingSeconds} />}
          </>
        )}
        {isMeasure && (
          <div className="numgrid">
            <NumberField label="Taillenumfang" unit="cm" value={waist} onChange={setWaist} step={0.5} />
            <NumberField label="Gewicht (7-Tage-Schnitt)" unit="kg" value={weight} onChange={setWeight} step={0.1} />
          </div>
        )}
        <FinishForm title={isCheck ? 'Knieschmerz' : 'Abschluss'} withRpe={session.kind === 'football' || isSwing} submitLabel={isCheck ? 'Speichern' : undefined} onSave={save} />
      </section>
    </main>
  )
}
