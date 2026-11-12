import type { Measurement, SessionLog, SetLog } from '../db/db'
import { makeSessionKey, parseSessionKey } from './keys'
import { locate, seed } from './plan'
import { addDays, itemsForDate, type Move, type TierMap } from './schedule'
import type { KbEx } from './steps'

export type MeasureKind = Measurement['kind']

/** Mean of all values in the 7 days ending on `date` (inclusive); null without data. */
export function average7(date: string, byDate: Map<string, number>): number | null {
  let sum = 0
  let n = 0
  for (let i = 0; i < 7; i++) {
    const v = byDate.get(addDays(date, -i))
    if (v !== undefined) {
      sum += v
      n++
    }
  }
  return n ? sum / n : null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const valuesByDate = (ms: Measurement[], kind: MeasureKind) =>
  new Map(ms.filter((m) => m.kind === kind).map((m) => [m.date, m.value]))

export function series(ms: Measurement[], kind: MeasureKind): { date: string; value: number }[] {
  return ms
    .filter((m) => m.kind === kind)
    .map((m) => ({ date: m.date, value: m.value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface WeightRow {
  t: number
  date: string
  target?: number
  band?: [number, number]
  avg?: number
  raw?: number
}

const ts = (iso: string) => Date.parse(iso + 'T12:00:00Z')

/** One row per Sunday target and per measured day: daily value, 7-day average, target and corridor. */
export function weightRows(ms: Measurement[]): WeightRow[] {
  const rows = new Map<string, WeightRow>()
  const row = (date: string) => {
    if (!rows.has(date)) rows.set(date, { t: ts(date), date })
    return rows.get(date)!
  }
  for (const w of seed.weightTargets) {
    const r = row(w.sunday)
    r.target = w.target
    r.band = [w.min, w.max]
  }
  const byDate = valuesByDate(ms, 'weight')
  for (const [date, v] of byDate) {
    const r = row(date)
    r.raw = v
    r.avg = round1(average7(date, byDate)!)
  }
  return [...rows.values()].sort((a, b) => a.t - b.t)
}

export interface CheckpointResult {
  week: number
  sunday: string
  target: number
  min: number
  max: number
  value: number | null
  status: 'above' | 'below' | 'within' | 'none'
}

/** 7-day average on each control-point Sunday against its corridor (plan section 5). */
export function checkpointResults(ms: Measurement[]): CheckpointResult[] {
  const byDate = valuesByDate(ms, 'weight')
  return seed.weightTargets
    .filter((w) => w.checkpoint)
    .map((w) => {
      const avg = average7(w.sunday, byDate)
      const value = avg === null ? null : round1(avg)
      const status = value === null ? 'none' : value > w.max ? 'above' : value < w.min ? 'below' : 'within'
      return { week: w.week, sunday: w.sunday, target: w.target, min: w.min, max: w.max, value, status }
    })
}

/** Two consecutive control points above the corridor: nutrition is the lever, not more training. */
export function twoAboveInARow(results: CheckpointResult[]): [CheckpointResult, CheckpointResult] | null {
  for (let i = 0; i < results.length - 1; i++)
    if (results[i].status === 'above' && results[i + 1].status === 'above') return [results[i], results[i + 1]]
  return null
}

export interface KbPoint {
  week: number
  maxWeight: number
  volume: number
}

/** Used weight (heaviest set, all bells added) and volume (reps x kg) per exercise and week. */
export function kbHistory(setLogs: SetLog[]): Map<string, KbPoint[]> {
  const kb = seed.kb as unknown as Record<string, { A: KbEx[]; B: KbEx[] }>
  const acc = new Map<string, Map<number, KbPoint>>()
  for (const l of setLogs) {
    if (!l.done || !l.weights?.length) continue
    const { date, kind } = parseSessionKey(l.sessionKey)
    if (kind !== 'kb-a' && kind !== 'kb-b') continue
    const pos = locate(date)
    if (pos.state !== 'running' || !pos.week.phase) continue
    const id = l.exerciseId.split(':')[1]
    const ex = kb[pos.week.phase][kind === 'kb-a' ? 'A' : 'B'].find((e) => e.id === id)
    if (!ex) continue
    const load = l.weights.reduce((a, b) => a + b, 0)
    const perWeek = acc.get(ex.name) ?? new Map<number, KbPoint>()
    const p = perWeek.get(pos.week.week) ?? { week: pos.week.week, maxWeight: 0, volume: 0 }
    p.maxWeight = Math.max(p.maxWeight, load)
    p.volume += (l.reps ?? 0) * load
    perWeek.set(pos.week.week, p)
    acc.set(ex.name, perWeek)
  }
  return new Map([...acc].map(([name, m]) => [name, [...m.values()].sort((a, b) => a.week - b.week)]))
}

export interface WeekCompliance {
  week: number
  planned: number
  done: number
}

/** Planned versus done sessions per week, for weeks that have started. Rest days and removed sessions do not count. */
export function compliance(logs: SessionLog[], moves: Move[], tiers: TierMap, today: string): WeekCompliance[] {
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.sessionKey))
  return seed.weeks
    .filter((w) => w.start <= today)
    .map((w) => {
      const items = w.days
        .flatMap((d) => itemsForDate(d.date, moves, tiers).items)
        .filter((i) => i.kind !== 'rest' && !i.hiddenReason)
      return {
        week: w.week,
        planned: items.length,
        done: items.filter((i) => done.has(makeSessionKey(i.originDate, i.kind))).length,
      }
    })
}
