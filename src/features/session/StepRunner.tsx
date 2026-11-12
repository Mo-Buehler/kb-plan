import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type SetLog } from '../../db/db'
import { deleteMeta, deleteSetLog, finishSession, getMeta, saveSetLog, setMeta } from '../../db/sessions'
import { plannedText, type Step } from '../../domain/steps'
import { unlockAudio } from '../../hooks/audio'
import { Stopwatch } from './Stopwatch'
import { useWakeLock } from '../../hooks/useWakeLock'
import { seed } from '../../domain/plan'
import { FinishForm, type FinishData } from './FinishForm'
import { NumberField } from './NumberField'
import { RestTimer } from './RestTimer'

interface Props {
  sessionKey: string
  date: string
  title: string
  steps: Step[]
  onClose: () => void
}

const BLOCK_LABEL: Record<Step['block'], string> = {
  warmup: 'Warm-up',
  knee: 'Knie-Block',
  main: 'Hauptteil',
  finisher: 'Arm-Finisher',
  cooldown: 'Cool-down',
}

const stepLogKey = (s: Pick<Step, 'exerciseKey' | 'setIndex'>) => `${s.exerciseKey}#${s.setIndex}`

/** Walks through the steps of a session, one tap per set; every tap is stored immediately. */
export function StepRunner({ sessionKey, date, title, steps, onClose }: Props) {
  const logs = useLiveQuery(() => db.setLogs.where('sessionKey').equals(sessionKey).toArray(), [sessionKey])
  const rest = useLiveQuery(() => getMeta<{ sessionKey: string; endsAt: number }>('rest'), [])
  const [showHint, setShowHint] = useState(false)
  useWakeLock(true)

  if (!logs) return null
  const done = new Map(logs.filter((l) => l.done).map((l) => [`${l.exerciseId}#${l.setIndex}`, l]))
  const current = steps.find((s) => !done.has(stepLogKey(s)))
  const doneCount = steps.filter((s) => done.has(stepLogKey(s))).length
  const activeRest = rest && rest.sessionKey === sessionKey ? rest : undefined

  async function undo() {
    const last = [...steps].reverse().find((s) => done.has(stepLogKey(s)))
    if (last) await deleteSetLog(sessionKey, last.exerciseKey, last.setIndex)
    await deleteMeta('rest')
  }

  async function finish(d: FinishData) {
    const testStep = steps.find((s) => s.kind === 'test')
    const swing = testStep && logs!.find((l) => l.exerciseId === testStep.exerciseKey)
    await finishSession(
      { date, sessionKey, ...d },
      swing?.seconds ? [{ date, kind: 'swing-test', value: swing.seconds }] : [],
    )
    onClose()
  }

  if (!current)
    return (
      <main className="page">
        <FinishForm title={`${title} geschafft`} onSave={finish} />
      </main>
    )

  const next = steps[steps.indexOf(current) + 1]
  const lib = current.libraryId ? seed.library.find((l) => l.id === current.libraryId) : undefined

  return (
    <main className="page">
      <header className="runhead">
        <button onClick={onClose} aria-label="Einheit verlassen">
          ‹ Zurück
        </button>
        <span className="muted">
          {title} · {doneCount}/{steps.length}
        </span>
      </header>
      <progress max={steps.length} value={doneCount} aria-label="Fortschritt" />

      {activeRest && <RestTimer endsAt={activeRest.endsAt} onClose={() => void deleteMeta('rest')} />}

      <section className="card runcard">
        <p className="muted">
          {BLOCK_LABEL[current.block]}
          {current.kind !== 'check' && ` · Satz ${current.setIndex + 1} von ${current.setCount}`}
        </p>
        <h2>{current.title}</h2>
        {current.kind === 'check' ? (
          <>
            <p>{current.info}</p>
            <div className="actionbar">
              <button
                className="primary"
                onClick={() => {
                  unlockAudio()
                  void saveSetLog({ sessionKey, exerciseId: current.exerciseKey, setIndex: 0, weights: [], done: true })
                }}
              >
                Erledigt
              </button>
            </div>
          </>
        ) : (
          <SetInputs
            key={stepLogKey(current)}
            step={current}
            previous={logs.filter((l) => l.done && l.exerciseId === current.exerciseKey).at(-1)}
            sessionKey={sessionKey}
          />
        )}
        {current.alternative && (
          <p className="muted">Nur schmerzfrei. Sonst: {current.alternative} statt {current.title}.</p>
        )}
        {lib && (
          <>
            <button className="link" onClick={() => setShowHint(!showHint)} aria-expanded={showHint}>
              {showHint ? 'Technik ausblenden' : 'Technik anzeigen'}
            </button>
            {showHint && (
              <ul className="hints">
                <li>Start: {lib.start}</li>
                <li>Ende: {lib.end}</li>
                {lib.hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </>
        )}
        {next && <p className="muted">Danach: {next.title}</p>}
      </section>
      <button className="link" onClick={undo} disabled={doneCount === 0}>
        Letzten Satz zurücknehmen
      </button>
    </main>
  )
}

interface InputsProps {
  step: Step
  previous?: SetLog
  sessionKey: string
}

function SetInputs({ step, previous, sessionKey }: InputsProps) {
  const p = step.planned
  // Default to what was actually done in the previous set of this exercise, else the plan.
  const [reps, setReps] = useState<number | undefined>(previous?.reps ?? p.reps)
  const [seconds, setSeconds] = useState<number | undefined>(previous?.seconds ?? p.seconds)
  const [weights, setWeights] = useState<number[]>(previous?.weights ?? p.weights)
  const isTest = step.kind === 'test'

  async function complete(elapsed?: number) {
    unlockAudio()
    await saveSetLog({
      sessionKey,
      exerciseId: step.exerciseKey,
      setIndex: step.setIndex,
      reps,
      seconds: elapsed ?? seconds,
      weights,
      done: true,
    })
    if (step.restAfter) await setMeta('rest', { sessionKey, endsAt: Date.now() + step.restAfter * 1000 })
  }

  return (
    <>
      <p className="planned">Plan: {step.block === 'knee' && p.note ? p.note : plannedText(p)}</p>
      {step.kind === 'emom' && <p className="notice">Jede volle Minute neu starten.</p>}
      {isTest ? (
        <Stopwatch sessionKey={sessionKey} onStop={(s) => void complete(s)} />
      ) : (
        <>
          <div className="numgrid">
            {(p.reps !== undefined || p.repsMode) && <NumberField label="Wdh." value={reps} onChange={setReps} />}
            {p.seconds !== undefined && <NumberField label="Zeit" unit="s" value={seconds} onChange={setSeconds} step={5} />}
            {weights.map((w, i) => (
              <NumberField
                key={i}
                label={weights.length > 1 ? `Gewicht ${i + 1}` : 'Gewicht'}
                unit="kg"
                value={w}
                step={0.5}
                onChange={(v) => setWeights(weights.map((x, j) => (j === i ? (v ?? 0) : x)))}
              />
            ))}
          </div>
          <div className="actionbar">
            <button className="primary" onClick={() => void complete()}>
              {step.kind === 'check' ? 'Erledigt' : 'Satz erledigt'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
