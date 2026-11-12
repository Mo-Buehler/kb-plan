import { seed } from './plan'

/** Plan amount as produced by scripts/build-seed.mjs. */
export interface Amount {
  raw: string
  kind?: 'sets' | 'emom' | 'ladder' | 'rounds' | 'test'
  sets?: number
  reps?: number
  seconds?: number
  repsMode?: string
  perSide?: boolean
  label?: string
  weights?: number[]
  minutes?: number
  ladder?: number[]
  note?: string
}

interface KbEx {
  id: string
  exerciseId: string
  name: string
  block: 'main' | 'finisher'
  libraryId: string | null
  group: number
  weeks: Record<string, Amount>
  painFreeAlternative?: string
}

export interface Planned {
  reps?: number
  seconds?: number
  weights: number[]
  perSide?: boolean
  repsMode?: string
  note?: string
}

export interface Step {
  id: string
  exerciseKey: string
  setIndex: number
  setCount: number
  block: 'warmup' | 'knee' | 'main' | 'finisher' | 'cooldown'
  kind: 'check' | 'set' | 'emom' | 'test'
  title: string
  libraryId?: string | null
  alternative?: string
  planned: Planned
  /** Pause after this step in seconds; null = no timer. */
  restAfter: number | null
  /** Free text for check steps. */
  info?: string
}

// Rest times in seconds (plan section 7: 30 s in a superset, 60-90 s after it, finisher 30/45 s).
export const REST = { inSuperset: 30, afterSuperset: 75, finisherFirst: 30, finisherSecond: 45, ladder: 60, rounds: 90 }

const KB = seed.kb as unknown as Record<string, { A: KbEx[]; B: KbEx[] }>
const KNEE = seed.knee.exercises as unknown as KneeEx[]

interface KneeEx {
  id: string
  day: 'wed' | 'sat'
  name: string
  phases: Record<string, { raw: string; sets: number; reps?: number; seconds?: number; perSide: boolean; weights?: number[] } | null>
}

function expand(a: Amount): { planned: Planned; kind: Step['kind']; rest?: number }[] {
  const weights = a.weights ?? []
  const base: Planned = { weights, perSide: a.perSide, repsMode: a.repsMode, note: a.label ?? a.note }
  switch (a.kind) {
    case 'emom':
      return Array.from({ length: a.minutes! }, () => ({ planned: { ...base, reps: a.reps }, kind: 'emom' as const }))
    case 'ladder':
      return a.ladder!.map((reps) => ({ planned: { ...base, reps }, kind: 'set' as const, rest: REST.ladder }))
    case 'rounds':
      return Array.from({ length: a.sets! }, () => ({ planned: base, kind: 'set' as const, rest: REST.rounds }))
    case 'test':
      return [{ planned: { ...base, reps: a.reps }, kind: 'test' as const }]
    default:
      return Array.from({ length: a.sets! }, () => ({
        planned: { ...base, reps: a.reps, seconds: a.seconds },
        kind: 'set' as const,
      }))
  }
}

function exerciseSteps(ex: KbEx, week: number, block: 'main' | 'finisher'): Step[] {
  const amount = ex.weeks[String(week)]
  if (!amount) throw new Error(`No plan amount for ${ex.name} in week ${week}`)
  const sets = expand(amount)
  const key = `${block}:${ex.id}`
  return sets.map((s, i) => ({
    id: `${key}#${i}`,
    exerciseKey: key,
    setIndex: i,
    setCount: sets.length,
    block,
    kind: s.kind,
    title: amount.label && block === 'main' && /Hike/.test(amount.label) ? amount.label : ex.name,
    libraryId: ex.libraryId,
    alternative: ex.painFreeAlternative,
    planned: s.planned,
    restAfter: s.kind === 'emom' || s.kind === 'test' ? null : (s.rest ?? null),
  }))
}

/** Interleaves exercises of one superset: A1, B1, A2, B2, ... with the given rests. */
function interleave(lists: Step[][], inRest: number, afterRest: number): Step[] {
  const out: Step[] = []
  const rounds = Math.max(...lists.map((l) => l.length))
  for (let i = 0; i < rounds; i++) {
    const present = lists.filter((l) => i < l.length)
    present.forEach((l, idx) => {
      const step = l[i]
      if (step.restAfter === null && step.kind === 'set') step.restAfter = idx === present.length - 1 ? afterRest : inRest
      out.push(step)
    })
  }
  return out
}

function checkStep(block: 'warmup' | 'cooldown', title: string, partName: string): Step {
  const part = seed.sessionFlow.parts.find((p) => p.part === partName)
  return {
    id: `${block}#0`,
    exerciseKey: block,
    setIndex: 0,
    setCount: 1,
    block,
    kind: 'check',
    title,
    planned: { weights: [] },
    restAfter: null,
    info: part ? `${part.content} (${part.duration})` : undefined,
  }
}

export function buildKneeSteps(phase: string, part: 'wed' | 'sat' | 'tue'): Step[] {
  const out: Step[] = []
  for (const ex of KNEE) {
    if (part !== 'tue' && ex.day !== part) continue
    const p = ex.phases[phase]
    if (!p) continue
    // Tuesday: one set fewer per exercise (plan section 8)
    const count = part === 'tue' ? Math.max(1, p.sets - 1) : p.sets
    for (let i = 0; i < count; i++)
      out.push({
        id: `knee:${ex.id}#${i}`,
        exerciseKey: `knee:${ex.id}`,
        setIndex: i,
        setCount: count,
        block: 'knee',
        kind: 'set',
        title: ex.name,
        planned: { reps: p.reps, seconds: p.seconds, perSide: p.perSide, weights: p.weights ?? [], note: p.raw },
        restAfter: null,
      })
  }
  return out
}

export function buildKbSteps(week: number, workout: 'A' | 'B'): Step[] {
  const w = seed.weeks.find((x) => x.week === week)
  if (!w?.phase) throw new Error(`Week ${week} has no kettlebell phase`)
  const exercises = KB[w.phase][workout]
  const steps: Step[] = [checkStep('warmup', 'Warm-up', 'Warm-up')]
  steps.push(...buildKneeSteps(w.phase, workout === 'A' ? 'wed' : 'sat'))

  const groups = new Map<number, KbEx[]>()
  for (const ex of exercises.filter((e) => e.block === 'main')) groups.set(ex.group, [...(groups.get(ex.group) ?? []), ex])
  for (const g of [...groups.keys()].sort((a, b) => a - b))
    steps.push(...interleave(groups.get(g)!.map((ex) => exerciseSteps(ex, week, 'main')), REST.inSuperset, REST.afterSuperset))

  const fin = exercises.filter((e) => e.block === 'finisher')
  if (fin.length) steps.push(...interleave(fin.map((ex) => exerciseSteps(ex, week, 'finisher')), REST.finisherFirst, REST.finisherSecond))

  steps.push(checkStep('cooldown', 'Cool-down', 'Cool-down'))
  return steps
}

export function plannedText(p: Planned): string {
  const parts: string[] = []
  if (p.reps !== undefined) parts.push(`${p.reps} Wdh.`)
  else if (p.repsMode === 'max-2') parts.push('max − 2 Wdh.')
  if (p.seconds !== undefined) parts.push(`${p.seconds} s`)
  if (p.perSide) parts.push('pro Seite')
  if (p.weights.length) parts.push(p.weights.length === 1 ? `${p.weights[0]} kg` : `${p.weights.join(' + ')} kg`)
  return parts.join(' · ')
}
