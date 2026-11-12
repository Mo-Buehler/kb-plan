import { describe, expect, it } from 'vitest'
import type { Measurement, SessionLog, SetLog } from '../db/db'
import { badges, dailyMotivation, planShare, streakWeeks, weeklyVolumes, weightSpark } from '../domain/home'
import type { WeekCompliance } from '../domain/progress'

const comp = (rows: [number, number, number][]): WeekCompliance[] => rows.map(([week, done, planned]) => ({ week, done, planned }))

describe('motivation', () => {
  it('is stable for a day and varies across days', () => {
    const a = dailyMotivation({ date: '2027-01-20', state: 'running' })
    expect(dailyMotivation({ date: '2027-01-20', state: 'running' })).toBe(a)
    const set = new Set(Array.from({ length: 14 }, (_, i) => dailyMotivation({ date: `2027-01-${10 + i}`, state: 'running' })))
    expect(set.size).toBeGreaterThan(5)
  })

  it('has fitting lines for special days', () => {
    expect(dailyMotivation({ date: 'x', state: 'before', daysUntilStart: 18 })).toMatch(/18 Tage/)
    expect(dailyMotivation({ date: 'x', state: 'running', done: true })).toMatch(/erledigt/)
    expect(dailyMotivation({ date: 'x', state: 'running', deload: true })).toMatch(/Entlastung/)
    expect(dailyMotivation({ date: 'x', state: 'running', rest: true })).toMatch(/Ruhetag/)
    expect(dailyMotivation({ date: 'x', state: 'running', test: true })).toMatch(/Test/)
    expect(dailyMotivation({ date: 'x', state: 'running', phaseStart: true })).toMatch(/Phase/)
    expect(dailyMotivation({ date: 'x', state: 'after' })).toMatch(/geschafft/)
  })
})

describe('streak and badges', () => {
  it('counts consecutive finished weeks with at least 80 percent', () => {
    // weeks 1-3 ended before 2027-01-01? week 3 ends 27.12.
    const c = comp([[1, 5, 6], [2, 6, 6], [3, 5, 6]])
    expect(streakWeeks(c, '2026-12-28')).toBe(3)
    expect(streakWeeks(comp([[1, 6, 6], [2, 2, 6], [3, 5, 6]]), '2026-12-28')).toBe(1)
    expect(streakWeeks(c, '2026-12-14')).toBe(1) // only week 1 has finished
  })

  it('earns badges from logs, rides, FTP and weeks', () => {
    const logs: SessionLog[] = Array.from({ length: 10 }, (_, i) => ({ date: 'd', sessionKey: `2026-12-${10 + i}:${i % 2 ? 'bike' : 'kb-a'}`, status: 'done' as const }))
    const ms: Measurement[] = [{ date: '2026-12-10', kind: 'ftp', value: 200 }]
    const list = badges(logs, comp([[1, 6, 6]]), ms, '2026-12-20')
    const earned = (id: string) => list.find((b) => b.id === id)!.earned
    expect(earned('first')).toBe(true)
    expect(earned('ten')).toBe(true)
    expect(earned('week')).toBe(true)
    expect(earned('ftp')).toBe(true)
    expect(earned('streak')).toBe(false)
    expect(earned('ride')).toBe(false)
    expect(badges([], [], [], '2026-11-12').every((b) => !b.earned)).toBe(true)
  })
})

describe('chart data', () => {
  it('builds a weight curve with targets, needs two points', () => {
    const ms: Measurement[] = [
      { date: '2026-12-07', kind: 'weight', value: 98 },
      { date: '2026-12-10', kind: 'weight', value: 97.6 },
    ]
    const s = weightSpark(ms, '2026-12-12')!
    expect(s.points).toHaveLength(2)
    expect(s.targets.length).toBeGreaterThan(0)
    expect(s.min).toBeLessThanOrEqual(s.max)
    expect(weightSpark([ms[0]], '2026-12-12')).toBeNull()
  })

  it('sums kettlebell volume per week and pads empty weeks', () => {
    const logs: SetLog[] = [{ sessionKey: '2026-12-09:kb-a', exerciseId: 'main:A1', setIndex: 0, reps: 10, weights: [16], done: true }]
    expect(weeklyVolumes(logs, 3, 3)).toEqual([
      { week: 1, volume: 160 },
      { week: 2, volume: 0 },
      { week: 3, volume: 0 },
    ])
  })

  it('shows plan progress from 0 to 1', () => {
    expect(planShare('2026-11-01')).toBe(0)
    expect(planShare('2027-03-28')).toBe(1)
    const mid = planShare('2027-01-20')
    expect(mid).toBeGreaterThan(0.3)
    expect(mid).toBeLessThan(0.6)
  })
})
