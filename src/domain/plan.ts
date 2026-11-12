import seedJson from '../data/plan-seed.json'

export const seed = seedJson
export type Seed = typeof seedJson
export type Week = Seed['weeks'][number]
export type Day = Week['days'][number]
export type SessionItem = Day['session']

/** Local calendar date as YYYY-MM-DD (never UTC, so the day flips at local midnight). */
export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export type PlanPosition =
  | { state: 'before'; daysUntilStart: number }
  | { state: 'running'; week: Week; day: Day; phaseStart: boolean }
  | { state: 'after' }

export function locate(iso: string, plan: Seed = seed): PlanPosition {
  const first = plan.weeks[0].start
  const last = plan.weeks[plan.weeks.length - 1].end
  if (iso < first) {
    const ms = Date.parse(first + 'T00:00:00Z') - Date.parse(iso + 'T00:00:00Z')
    return { state: 'before', daysUntilStart: Math.round(ms / 86400000) }
  }
  if (iso > last) return { state: 'after' }
  const week = plan.weeks.find((w) => iso >= w.start && iso <= w.end)!
  const day = week.days.find((d) => d.date === iso)!
  return { state: 'running', week, day, phaseStart: 'phaseStart' in day.session }
}
