import type { Measurement } from '../db/db'
import { average7, compliance, valuesByDate, type WeekCompliance } from './progress'
import { locate, seed, type SessionItem } from './plan'
import { addDays, itemsForDate, type Move, type ScheduledItem, type TierMap } from './schedule'
import type { SessionLog } from '../db/db'

export interface WeightTile {
  value: number | null
  target: number
  min: number
  max: number
  status: 'above' | 'within' | 'below' | 'none'
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Latest 7-day average against the target corridor of the current (or first) plan week. */
export function weightTile(ms: Measurement[], today: string): WeightTile {
  const pos = locate(today)
  const week = pos.state === 'running' ? pos.week.week : pos.state === 'after' ? 16 : 0
  const t = seed.weightTargets.find((w) => w.week === week) ?? seed.weightTargets[0]
  const byDate = valuesByDate(ms, 'weight')
  const latest = [...byDate.keys()].filter((d) => d <= today).sort().at(-1)
  const avg = latest ? average7(latest, byDate) : null
  const value = avg === null ? null : round1(avg)
  const status = value === null ? 'none' : value > t.max ? 'above' : value < t.min ? 'below' : 'within'
  return { value, target: t.target, min: t.min, max: t.max, status }
}

export interface WeekQuota {
  current?: WeekCompliance
  previousPct?: number
}

export function weekQuota(logs: SessionLog[], moves: Move[], tiers: TierMap, today: string, week: number): WeekQuota {
  const all = compliance(logs, moves, tiers, today)
  const prev = all.find((c) => c.week === week - 1)
  return {
    current: all.find((c) => c.week === week),
    previousPct: prev && prev.planned ? Math.round((prev.done / prev.planned) * 100) : undefined,
  }
}

/** The next session after `date` that is not a rest day and not removed by the week tier. */
export function nextSession(date: string, moves: Move[], tiers: TierMap): { date: string; item: ScheduledItem } | null {
  for (let i = 1; i <= 120; i++) {
    const d = addDays(date, i)
    const item = itemsForDate(d, moves, tiers).items.find((x) => x.kind !== 'rest' && !x.hiddenReason)
    if (item) return { date: d, item }
  }
  return null
}

/** One coloured chip per day of a week, in calendar order. */
export function weekStrip(week: { days: { date: string; dow: string; session: SessionItem }[] }, moves: Move[], tiers: TierMap) {
  return week.days.map((d) => {
    const items = itemsForDate(d.date, moves, tiers).items.filter((i) => !i.hiddenReason)
    const main = items.find((i) => i.kind !== 'rest') ?? items[0]
    return { date: d.date, dow: d.dow, item: main }
  })
}

/** Content and duration of one MyWhoosh workout; picks the matching variant (V1, V2, ...) out of the family text. */
export function bikeDetails(workout: string): { content: string; duration: string } | null {
  const m = workout.match(/^(.*?)(?: V(\d))?$/)
  const base = m?.[1] ?? workout
  const plan = seed.bike.workouts.find((w) => w.base === base || w.name === workout)
  if (!plan) return null
  let content = plan.content
  const version = m?.[2] ? Number(m[2]) : 0
  if (version) {
    const special = content.match(new RegExp(`V${version}: (.+)$`))
    if (special) content = special[1]
    else {
      content = content.split(';')[0]
      const parts = content.split(' / ')
      if (parts.length > 1 && parts[version - 1]) {
        const suffix = parts[parts.length - 1].replace(/^.*?(?= min )/, '')
        content = version === parts.length ? parts[version - 1] : `${parts[version - 1]}${suffix}`
      }
    }
  }
  return { content, duration: plan.duration }
}
