import { describe, expect, it } from 'vitest'
import { locate, seed } from '../domain/plan'

// Spot checks against trainingsplan.md (the single source of truth).
type Amount = Record<string, unknown>
const kbEx = (phase: 'P1' | 'P2' | 'P3' | 'P4', workout: 'A' | 'B', id: string) => {
  const ex = seed.kb[phase][workout].find((e) => e.id === id)!
  return { ...ex, weeks: ex.weeks as Record<string, Amount> }
}

describe('plan-seed.json', () => {
  it('W1 A1 = 2 x 10 @ 16 kg', () => {
    const a = kbEx('P1', 'A', 'A1').weeks['1']
    expect(a).toMatchObject({ kind: 'sets', sets: 2, reps: 10, weights: [16] })
  })

  it('W7 B1 = EMOM 10 x 8 @ 24 kg', () => {
    const a = kbEx('P2', 'B', 'B1').weeks['7']
    expect(a).toMatchObject({ kind: 'emom', minutes: 10, reps: 8, weights: [24] })
  })

  it('W11 A3 = 4 x 12 @ 2 x 16 kg', () => {
    const a = kbEx('P3', 'A', 'A3').weeks['11']
    expect(a).toMatchObject({ kind: 'sets', sets: 4, reps: 12, weights: [16, 16] })
  })

  it('W16 B2 = test 100 swings @ 24 kg', () => {
    const a = kbEx('P4', 'B', 'B2').weeks['16']
    expect(a).toMatchObject({ kind: 'test', reps: 100, timed: true, weights: [24] })
  })

  it('weight target W12 = 91.9 kg with corridor 91.3-92.5', () => {
    const t = seed.weightTargets.find((w) => w.week === 12)!
    expect(t).toMatchObject({ target: 91.9, min: 91.3, max: 92.5, checkpoint: true })
  })

  it('calendar W3 Tuesday = MB-Z2-Kadenz-50', () => {
    const day = seed.weeks[3].days[1]
    expect(day.dow).toBe('di')
    expect(day.session).toMatchObject({ kind: 'bike', workout: 'MB-Z2-Kadenz-50' })
  })

  it('has weeks 0-16 with consecutive dates and 7 days each', () => {
    expect(seed.weeks.map((w) => w.week)).toEqual([...Array(17).keys()])
    seed.weeks.forEach((w, i) => {
      expect(w.days).toHaveLength(7)
      if (i > 0) expect(w.start).toBe(new Date(Date.parse(seed.weeks[i - 1].start) + 7 * 86400000).toISOString().slice(0, 10))
    })
    expect(seed.planStart).toBe('2026-12-21')
    expect(seed.planEnd).toBe('2027-04-11')
  })

  it('marks deload weeks 4, 8, 12, 16', () => {
    expect(seed.weeks.filter((w) => w.deload).map((w) => w.week)).toEqual([4, 8, 12, 16])
  })

  it('resolves "wie W14" references (W15 B2)', () => {
    const a = kbEx('P4', 'B', 'B2').weeks['15']
    expect(a).toMatchObject({ kind: 'ladder', ladder: [5, 10, 15, 20, 15, 10, 5], weights: [24] })
  })

  it('groups supersets 1+2, 3+4, 5, 6 and marks arm finishers', () => {
    const a = seed.kb.P1.A
    expect(a.slice(0, 6).map((e) => e.group)).toEqual([1, 1, 2, 2, 3, 4])
    expect(a.filter((e) => e.block === 'finisher').map((e) => e.id)).toEqual(['A7', 'A8'])
  })

  it('contains no personal master data', () => {
    const json = JSON.stringify(seed)
    // Name, age and height are checked by scripts/build-seed.mjs against the source plan.
    for (const bad of [/MRT/, /Startgewicht/, /Stammdaten/, /Jahre \/ /]) expect(json).not.toMatch(bad)
  })
})

describe('locate()', () => {
  it('finds the plan day for a date', () => {
    const pos = locate('2026-12-23')
    expect(pos.state).toBe('running')
    if (pos.state === 'running') {
      expect(pos.week.week).toBe(1)
      expect(pos.day.session.kind).toBe('kb-a')
      expect(pos.phaseStart).toBe(true)
    }
  })
  it('handles dates before and after the plan', () => {
    expect(locate('2026-11-15').state).toBe('before')
    expect(locate('2027-04-15').state).toBe('after')
  })
})
