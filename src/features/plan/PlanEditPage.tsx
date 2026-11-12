import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PlanOverride } from '../../db/db'
import { clearOverrides, saveOverride } from '../../db/planEdit'
import { seed, todayIso } from '../../domain/plan'
import { amountSummary, kbExercises, type ExerciseView } from '../../domain/steps'
import { useSchedule } from '../../hooks/useSchedule'
import { NumberField } from '../session/NumberField'

const kbWeeks = seed.weeks.filter((w) => w.phase)

function defaultWeek(): number {
  const t = todayIso()
  const w = kbWeeks.find((x) => t >= x.start && t <= x.end) ?? kbWeeks.find((x) => x.start > t) ?? kbWeeks[0]
  return w.week
}

/** Change sets, reps or weights of a planned exercise, or swap it for the pain-free alternative. */
export function PlanEditPage() {
  const navigate = useNavigate()
  const data = useSchedule()
  const [week, setWeek] = useState(defaultWeek)
  const [workout, setWorkout] = useState<'A' | 'B'>('A')
  const [editing, setEditing] = useState<string>()
  if (!data) return null
  const list = kbExercises(week, workout, data.overrides)

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={() => navigate('/mehr')}>‹ Mehr</button>
      </header>
      <h1>Plan bearbeiten</h1>
      <p className="muted">Der Originalplan bleibt unverändert. Deine Änderungen liegen als eigene Schicht darüber.</p>
      <div className="stack">
        <label>
          Woche
          <select value={week} onChange={(e) => (setWeek(Number(e.target.value)), setEditing(undefined))}>
            {kbWeeks.map((w) => (
              <option key={w.week} value={w.week}>
                Woche {w.week} ({w.phase}){w.deload ? ' · Deload' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="scale" role="group" aria-label="Workout">
          {(['A', 'B'] as const).map((w) => (
            <button key={w} className={workout === w ? 'sel' : ''} aria-pressed={workout === w} onClick={() => (setWorkout(w), setEditing(undefined))}>
              Workout {w}
            </button>
          ))}
        </div>
        {list.map((v) => (
          <ExerciseCard key={`${week}-${workout}-${v.ex.id}`} view={v} week={week} open={editing === v.ex.id} onToggle={() => setEditing(editing === v.ex.id ? undefined : v.ex.id)} />
        ))}
      </div>
    </main>
  )
}

function ExerciseCard({ view, week, open, onToggle }: { view: ExerciseView; week: number; open: boolean; onToggle: () => void }) {
  const { amount, name, changed, ex } = view
  const [sets, setSets] = useState<number | undefined>(amount.kind === 'emom' ? amount.minutes : amount.sets)
  const [reps, setReps] = useState<number | undefined>(amount.reps)
  const [seconds, setSeconds] = useState<number | undefined>(amount.seconds)
  const [weights, setWeights] = useState<number[]>(amount.weights ?? [])
  const [scope, setScope] = useState<'week' | 'forward'>('week')
  const editable = !amount.kind || amount.kind === 'sets' || amount.kind === 'emom' || amount.kind === 'rounds'

  async function save() {
    // Only store what the user actually changed, so "all following weeks" never
    // overwrites values that differ in later weeks of the original plan.
    const orig = { sets: amount.kind === 'emom' ? amount.minutes : amount.sets, reps: amount.reps, seconds: amount.seconds }
    const patch: NonNullable<PlanOverride['patch']> = {}
    if (sets !== undefined && sets !== orig.sets) patch.sets = sets
    if (reps !== undefined && reps !== orig.reps) patch.reps = reps
    if (seconds !== undefined && seconds !== orig.seconds) patch.seconds = seconds
    if (weights.join() !== (amount.weights ?? []).join()) patch.weights = weights
    if (Object.keys(patch).length === 0) return onToggle()
    await saveOverride({ exerciseId: ex.exerciseId, fromWeek: week, scope, patch })
    onToggle()
  }

  return (
    <section className="card stack">
      <div>
        <p className="muted">
          {ex.id} · {ex.block === 'finisher' ? 'Arm-Finisher' : 'Hauptteil'}
          {changed && <span className="badge"> geändert</span>}
        </p>
        <h2>{name}</h2>
        <p>{amountSummary(amount, changed)}</p>
      </div>
      <button onClick={onToggle} aria-expanded={open}>
        {open ? 'Schließen' : 'Bearbeiten'}
      </button>
      {open && (
        <div className="stack">
          {editable ? (
            <div className="numgrid">
              <NumberField label={amount.kind === 'emom' ? 'Minuten' : 'Sätze'} value={sets} onChange={setSets} />
              {amount.reps !== undefined && <NumberField label="Wdh." value={reps} onChange={setReps} />}
              {amount.seconds !== undefined && <NumberField label="Zeit" unit="s" value={seconds} onChange={setSeconds} step={5} />}
              {weights.map((w, i) => (
                <NumberField key={i} label={weights.length > 1 ? `Gewicht ${i + 1}` : 'Gewicht'} unit="kg" value={w} step={0.5} onChange={(v) => setWeights(weights.map((x, j) => (j === i ? (v ?? 0) : x)))} />
              ))}
            </div>
          ) : (
            <p className="muted">Diese Sonderform (Leiter oder Test) lässt sich nur ersetzen, nicht in den Zahlen ändern.</p>
          )}
          <fieldset>
            <legend>Gilt für</legend>
            <label className="radio">
              <input type="radio" checked={scope === 'week'} onChange={() => setScope('week')} /> nur diese Woche
            </label>
            <label className="radio">
              <input type="radio" checked={scope === 'forward'} onChange={() => setScope('forward')} /> alle folgenden Wochen
            </label>
          </fieldset>
          {editable && (
            <button className="primary" onClick={() => void save()}>
              Änderung speichern
            </button>
          )}
          {ex.painFreeAlternative && !view.replaced && (
            <button
              onClick={async () => {
                await saveOverride({ exerciseId: ex.exerciseId, fromWeek: week, scope, replaceWith: ex.painFreeAlternative })
                onToggle()
              }}
            >
              Schmerzfrei nicht möglich: ersetzen durch {ex.painFreeAlternative}
            </button>
          )}
          {changed && (
            <button
              onClick={async () => {
                await clearOverrides(ex.exerciseId, week)
                onToggle()
              }}
            >
              Änderungen zurücksetzen
            </button>
          )}
        </div>
      )}
    </section>
  )
}
