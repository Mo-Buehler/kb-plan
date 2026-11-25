import { useState } from 'react'

export interface FinishData {
  rpe?: number
  kneePain?: number
  note?: string
}

const painClass = (n: number) => (n <= 3 ? 'pain-green' : n <= 5 ? 'pain-yellow' : 'pain-red')

interface Props {
  title: string
  withRpe?: boolean
  submitLabel?: string
  onSave: (d: FinishData) => void | Promise<void>
}

/** End of a session: RPE 1-10 and knee pain 0-10 with traffic-light colours. */
export function FinishForm({ title, withRpe = true, submitLabel = 'Einheit abschließen', onSave }: Props) {
  const [rpe, setRpe] = useState<number>()
  const [pain, setPain] = useState<number>()
  const [note, setNote] = useState('')

  return (
    <div className="stack">
      <h2>{title}</h2>
      {withRpe && (
        <fieldset>
          <legend>Anstrengung (RPE 1–10)</legend>
          <div className="scale">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} aria-pressed={rpe === n} className={rpe === n ? 'sel' : ''} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>Knieschmerz (0–10): grün 0–3, gelb 4–5, rot ab 6</legend>
        <div className="scale">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              aria-pressed={pain === n}
              className={`${painClass(n)} ${pain === n ? 'sel' : ''}`}
              onClick={() => setPain(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Notiz (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="primary" onClick={() => onSave({ rpe, kneePain: pain, note: note.trim() || undefined })}>
        {submitLabel}
      </button>
    </div>
  )
}
