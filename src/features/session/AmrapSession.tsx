import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { deleteMeta, finishSession, getMeta, setMeta } from '../../db/sessions'
import { seed, type Week } from '../../domain/plan'
import { beep, unlockAudio } from '../../hooks/audio'
import { formatClock, useNow } from '../../hooks/useNow'
import { useWakeLock } from '../../hooks/useWakeLock'
import { FinishForm, type FinishData } from './FinishForm'

interface State {
  startedAt?: number
  rounds: number
}

interface Props {
  sessionKey: string
  date: string
  week: Week
  onClose: () => void
}

const column = (phase: string | null) => (phase === 'P1' ? 'phase1' : phase === 'P2' ? 'phase2' : 'phase34')

/** Workout C: AMRAP countdown (20 min, 10 min in deload weeks) with round counter. */
export function AmrapSession({ sessionKey, date, week, onClose }: Props) {
  const key = `amrap:${sessionKey}`
  const state = useLiveQuery(async () => (await getMeta<State>(key)) ?? { rounds: 0 }, [key])
  const now = useNow()
  const minutes = week.deload ? 10 : 20
  const beeped = useRef(false)
  const total = minutes * 60
  const running = state?.startedAt !== undefined
  const remaining = running ? total - (now - state.startedAt!) / 1000 : total
  const over = running && remaining <= 0
  useWakeLock(running)

  useEffect(() => {
    if (over && !beeped.current) {
      beeped.current = true
      beep(4)
    }
  }, [over])

  if (!state) return null
  const update = (patch: Partial<State>) => setMeta(key, { ...state, ...patch })

  async function save(d: FinishData) {
    await finishSession(
      { date, sessionKey, rpe: d.rpe, kneePain: d.kneePain, note: d.note, rounds: state!.rounds },
      [{ date, kind: 'workout-c-rounds', value: state!.rounds }],
    )
    await deleteMeta(key)
    onClose()
  }

  if (over)
    return (
      <main className="page">
        <p className="notice">Zeit abgelaufen. Rundenzahl prüfen und abschließen.</p>
        <section className="card stack">
          <h2>Runden: {state.rounds}</h2>
          <div className="numrow">
            <button onClick={() => void update({ rounds: Math.max(0, state.rounds - 1) })}>−</button>
            <button onClick={() => void update({ rounds: state.rounds + 1 })}>+</button>
          </div>
        </section>
        <FinishForm title="Workout C abschließen" onSave={save} />
      </main>
    )

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={onClose}>‹ Zurück</button>
      </header>
      <section className="card stack">
        <h1>Workout C</h1>
        <p className="muted">{seed.workoutC.notes[0]}</p>
        <ul className="hints">
          {seed.workoutC.rows.map((r) => (
            <li key={r.exercise}>
              {r.reps}× {r.exercise}: {r[column(week.phase) as 'phase1']}
            </li>
          ))}
        </ul>
        <p className="rest-clock" role="timer">
          {formatClock(remaining)}
        </p>
        <p>Runden: {state.rounds}</p>
        <div className="actionbar">
          {running ? (
            <button className="primary" onClick={() => void update({ rounds: state.rounds + 1 })}>
              Runde geschafft
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => {
                unlockAudio()
                void update({ startedAt: Date.now() })
              }}
            >
              {minutes} min AMRAP starten
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
