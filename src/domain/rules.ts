import type { PlanOverride, SessionLog, SetLog } from '../db/db'
import { makeSessionKey } from './keys'
import { seed } from './plan'
import { kbExercises, buildKbSteps } from './steps'

/** A rule hint. It is only a proposal: nothing changes until the user confirms. */
export interface Suggestion {
  id: string
  kind: 'keep-weight' | 'knee-legs' | 'workout-c'
  week: number
  workout?: 'A' | 'B'
  title: string
  detail: string
  /** exerciseId -> weights to use instead of the plan (only for weight suggestions). */
  keepWeights?: Record<string, number[]>
}

const sum = (w: number[] | undefined) => (w ?? []).reduce((a, b) => a + b, 0)
const LEG = /Kreuzheben|Squat|Lunge|Swing/

function sessionDate(week: number, workout: 'A' | 'B'): string | undefined {
  return seed.weeks.find((w) => w.week === week)?.days.find((d) => d.session.kind === (workout === 'A' ? 'kb-a' : 'kb-b'))?.date
}

/** All planned sets done, with at least the planned reps / seconds at no lighter weight. */
function metTarget(week: number, workout: 'A' | 'B', exerciseKey: string, logs: SetLog[], overrides: PlanOverride[]): boolean | null {
  const date = sessionDate(week, workout)
  if (!date) return null
  const sessionKey = makeSessionKey(date, workout === 'A' ? 'kb-a' : 'kb-b')
  const mine = logs.filter((l) => l.sessionKey === sessionKey)
  if (mine.length === 0) return null // not trained: nothing to judge
  const steps = buildKbSteps(week, workout, overrides).filter((s) => s.exerciseKey === exerciseKey)
  return steps.every((s) => {
    const l = mine.find((x) => x.exerciseId === s.exerciseKey && x.setIndex === s.setIndex && x.done)
    if (!l) return false
    if (s.planned.reps !== undefined && (l.reps ?? 0) < s.planned.reps) return false
    if (s.planned.seconds !== undefined && (l.seconds ?? 0) < s.planned.seconds) return false
    return sum(l.weights) >= sum(s.planned.weights)
  })
}

/** Plan section 7: a heavier weight is only used once last week's target was met in every set. */
export function keepWeightSuggestions(
  week: number,
  workout: 'A' | 'B',
  logs: SetLog[],
  overrides: PlanOverride[],
): Suggestion[] {
  if (week < 2) return []
  const now = kbExercises(week, workout, overrides)
  const prev = kbExercises(week - 1, workout, overrides)
  const keep: Record<string, number[]> = {}
  const names: string[] = []
  for (const cur of now) {
    const old = prev.find((p) => p.ex.exerciseId === cur.ex.exerciseId)
    if (!old || sum(cur.amount.weights) <= sum(old.amount.weights)) continue
    if (metTarget(week - 1, workout, `${old.ex.block}:${old.ex.id}`, logs, overrides) === false) {
      keep[cur.ex.exerciseId] = old.amount.weights!
      names.push(cur.name)
    }
  }
  if (!names.length) return []
  return [
    {
      id: `keep-weight:${week}:${workout}`,
      kind: 'keep-weight',
      week,
      workout,
      title: `Gewicht der Vorwoche behalten? (Workout ${workout})`,
      detail: `Die Vorgabe der Vorwoche wurde nicht in allen Sätzen geschafft: ${names.join(', ')}.`,
      keepWeights: keep,
    },
  ]
}

/** Plan section 8: knee pain of 4 or more on Tuesday -> leg exercises with last week's weight on Wednesday. */
export function kneeSuggestions(week: number, sessionLogs: SessionLog[], overrides: PlanOverride[]): Suggestion[] {
  if (week < 2) return []
  const tue = seed.weeks.find((w) => w.week === week)?.days.find((d) => d.dow === 'di')
  if (!tue) return []
  const log = sessionLogs.find((l) => l.sessionKey === makeSessionKey(tue.date, 'knee-check') && l.status === 'done')
  if (!log || (log.kneePain ?? 0) < 4) return []
  const now = kbExercises(week, 'A', overrides)
  const prev = kbExercises(week - 1, 'A', overrides)
  const keep: Record<string, number[]> = {}
  const names: string[] = []
  for (const cur of now.filter((c) => LEG.test(c.name))) {
    const old = prev.find((p) => p.ex.exerciseId === cur.ex.exerciseId)
    if (old && sum(cur.amount.weights) > sum(old.amount.weights)) {
      keep[cur.ex.exerciseId] = old.amount.weights!
      names.push(cur.name)
    }
  }
  return [
    {
      id: `knee-legs:${week}`,
      kind: 'knee-legs',
      week,
      workout: 'A',
      title: 'Beinübungen mit dem Gewicht der Vorwoche?',
      detail:
        `Knieschmerz am Dienstag: ${log.kneePain} von 10. ` +
        (names.length
          ? `Betroffen: ${names.join(', ')}.`
          : 'Die Gewichte der Beinübungen entsprechen im Plan schon der Vorwoche. Belastung gut beobachten.'),
      keepWeights: keep,
    },
  ]
}

/** Plan section 4: three weeks without football -> suggest Workout C on Monday. */
export function footballSuggestion(sessionLogs: SessionLog[], today: string, accepted: boolean): Suggestion[] {
  if (accepted) return []
  const ended = seed.weeks.filter((w) => w.week >= 1 && w.end < today).slice(-3)
  if (ended.length < 3) return []
  const played = (start: string) => sessionLogs.some((l) => l.sessionKey === makeSessionKey(start, 'football') && l.status === 'done')
  if (ended.some((w) => played(w.days[0].date))) return []
  const week = seed.weeks.find((w) => w.start <= today && today <= w.end)?.week ?? ended[2].week + 1
  return [
    {
      id: 'workout-c-monday',
      kind: 'workout-c',
      week,
      title: 'Montags Workout C statt Fußball?',
      detail: 'Seit drei Wochen wurde kein Fußball erfasst. Der Plan schlägt dann montags Workout C vor.',
    },
  ]
}
