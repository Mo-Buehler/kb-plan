import type { Tone } from './colors'
import { stepTone } from './colors'
import type { Step } from './steps'

export interface OverviewRow {
  id: string
  title: string
  summary: string
  alternative?: string
}

export interface OverviewSection {
  id: string
  tone: Tone
  title: string
  meta: string
  info?: string
  rows: OverviewRow[]
}

const de = (n: number) => String(n).replace('.', ',')
const kg = (w: number[]) => (w.length ? ` · ${w.map(de).join('+')} kg` : '')

/** "4 × 10 · 12+16 kg" for one exercise, from all its set steps. */
export function rowSummary(steps: Step[]): string {
  const first = steps[0]
  const p = first.planned
  const n = steps.length
  if (first.kind === 'emom') return `${n} min × ${p.reps}${kg(p.weights)}`
  if (first.kind === 'test') return `${p.reps} Swings auf Zeit${kg(p.weights)}`
  if (steps.some((s) => s.planned.reps !== p.reps)) return `Leiter ${steps.map((s) => s.planned.reps).join('-')}${kg(p.weights)}`
  if (p.reps === undefined && p.seconds === undefined && !p.repsMode) return `${n} Runden${kg(p.weights)}`
  const amount = p.seconds !== undefined ? `${p.seconds} s` : p.repsMode ? 'max−2' : String(p.reps)
  return `${n} × ${amount}${p.perSide ? '/S' : ''}${kg(p.weights)}`
}

function restText(steps: Step[]): string {
  const rests = [...new Set(steps.map((s) => s.restAfter).filter((r): r is number => r !== null))]
  if (steps.some((s) => s.kind === 'emom')) return 'jede volle Minute'
  return rests.length ? `${rests.join(' s / ')} s Pause` : ''
}

/** Groups a session into coloured blocks for the overview before the start. */
export function overviewSections(steps: Step[]): OverviewSection[] {
  const sections: OverviewSection[] = []
  const bucket = (id: string, make: () => Omit<OverviewSection, 'rows' | 'id'>) => {
    let s = sections.find((x) => x.id === id)
    if (!s) {
      s = { id, rows: [], ...make() }
      sections.push(s)
    }
    return s
  }
  const stepsOf = (key: string) => steps.filter((s) => s.exerciseKey === key)

  for (const step of steps) {
    const tone = stepTone(step)
    if (step.kind === 'check') {
      const dur = step.info?.match(/\(([^)]+)\)$/)?.[1] ?? ''
      bucket(step.block, () => ({ tone, title: step.title, meta: dur, info: step.info?.replace(/\s*\([^)]*\)$/, '') }))
      continue
    }
    const id = step.block === 'main' ? ((step.group ?? 1) <= 2 ? `main-${step.group}` : 'main-solo') : step.block
    const title =
      step.block === 'knee' ? 'Knie-Block' : step.block === 'finisher' ? 'Arm-Finisher' : id === 'main-solo' ? 'Einzelübungen' : `Supersatz ${step.group}`
    const sec = bucket(id, () => ({ tone, title, meta: '' }))
    if (!sec.rows.some((r) => r.id === step.exerciseKey)) {
      const own = stepsOf(step.exerciseKey)
      sec.rows.push({
        id: step.exerciseKey,
        title: step.title,
        summary: step.block === 'knee' && step.planned.note ? step.planned.note : rowSummary(own),
        alternative: step.alternative,
      })
    }
  }

  for (const s of sections) {
    if (s.id === 'warmup' || s.id === 'cooldown') continue
    const keys = new Set(s.rows.map((r) => r.id))
    const own = steps.filter((st) => keys.has(st.exerciseKey))
    s.meta = s.id === 'knee' ? `${s.rows.length} Übungen` : restText(own)
  }
  return sections
}

export const setCount = (steps: Step[]) => steps.filter((s) => s.kind !== 'check' && s.block !== 'knee').length
export const exerciseCount = (steps: Step[]) => new Set(steps.filter((s) => s.block === 'main' || s.block === 'finisher').map((s) => s.exerciseKey)).size
