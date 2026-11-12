import { describe, expect, it } from 'vitest'
import { seed } from '../domain/plan'
import { buildKbSteps, buildKneeSteps, REST } from '../domain/steps'

const main = (week: number, w: 'A' | 'B') => buildKbSteps(week, w).filter((s) => s.block === 'main')

describe('buildKbSteps', () => {
  it('W1 workout A: warm-up, knee block, main, finisher, cool-down in order', () => {
    const blocks = buildKbSteps(1, 'A').map((s) => s.block)
    const order = ['warmup', 'knee', 'main', 'finisher', 'cooldown']
    expect([...new Set(blocks)]).toEqual(order)
  })

  it('interleaves the first superset A1, A2, A1, A2 with 30 s then 75 s rest', () => {
    const m = main(1, 'A').slice(0, 4)
    expect(m.map((s) => s.exerciseKey)).toEqual(['main:A1', 'main:A2', 'main:A1', 'main:A2'])
    expect(m.map((s) => s.restAfter)).toEqual([REST.inSuperset, REST.afterSuperset, REST.inSuperset, REST.afterSuperset])
    expect(m[0].planned).toMatchObject({ reps: 10, weights: [16] })
    expect(m[0].setCount).toBe(2)
  })

  it('singles (5th and 6th exercise) get the longer rest', () => {
    const m = main(1, 'A')
    const a5 = m.filter((s) => s.exerciseKey === 'main:A5')
    expect(a5.every((s) => s.restAfter === REST.afterSuperset)).toBe(true)
  })

  it('arm finisher: 30 s after biceps, 45 s after triceps', () => {
    const fin = buildKbSteps(2, 'A').filter((s) => s.block === 'finisher')
    expect(fin.slice(0, 2).map((s) => s.restAfter)).toEqual([REST.finisherFirst, REST.finisherSecond])
  })

  it('W7 B1 is an EMOM of 10 minutes x 8 @ 24 kg without rest timer', () => {
    const b1 = main(7, 'B').filter((s) => s.exerciseKey === 'main:B1')
    expect(b1).toHaveLength(10)
    expect(b1[0]).toMatchObject({ kind: 'emom', restAfter: null })
    expect(b1[0].planned).toMatchObject({ reps: 8, weights: [24] })
  })

  it('W16 B2 test is a single timed step of 100 swings @ 24 kg', () => {
    const t = buildKbSteps(16, 'B').filter((s) => s.kind === 'test')
    expect(t).toHaveLength(1)
    expect(t[0].planned).toMatchObject({ reps: 100, weights: [24] })
  })

  it('W11 A3 is 4 x 12 @ 2 x 16 kg', () => {
    const a3 = buildKbSteps(11, 'A').filter((s) => s.exerciseKey === 'main:A3')
    expect(a3).toHaveLength(4)
    expect(a3[0].planned).toMatchObject({ reps: 12, weights: [16, 16] })
  })

  it('W14 B2 ladder has 7 rungs 5-10-15-20-15-10-5', () => {
    const l = buildKbSteps(14, 'B').filter((s) => s.exerciseKey === 'main:B2')
    expect(l.map((s) => s.planned.reps)).toEqual([5, 10, 15, 20, 15, 10, 5])
  })

  it('every week 1-16 builds both workouts without errors', () => {
    for (let w = 1; w <= 16; w++)
      for (const x of ['A', 'B'] as const) expect(buildKbSteps(w, x).length).toBeGreaterThan(8)
  })

  it('deload week 4 has fewer main sets than week 3', () => {
    expect(main(4, 'A').length).toBeLessThan(main(3, 'A').length)
  })
})

describe('buildKneeSteps', () => {
  it('Wednesday uses K1-K3, Saturday K4-K6', () => {
    const wed = new Set(buildKneeSteps('P1', 'wed').map((s) => s.exerciseKey))
    expect([...wed]).toEqual(['knee:K1', 'knee:K2', 'knee:K3'])
    const sat = new Set(buildKneeSteps('P2', 'sat').map((s) => s.exerciseKey))
    expect([...sat]).toEqual(['knee:K4', 'knee:K5', 'knee:K6'])
  })

  it('Tuesday has one set less per exercise and skips K6 in phase 1', () => {
    const tue = buildKneeSteps('P1', 'tue')
    expect(tue.filter((s) => s.exerciseKey === 'knee:K1')).toHaveLength(2)
    expect(tue.some((s) => s.exerciseKey === 'knee:K6')).toBe(false)
  })
})

describe('calendar', () => {
  it('every kettlebell day in the calendar maps to a buildable session', () => {
    for (const w of seed.weeks)
      for (const d of w.days)
        if (d.session.kind === 'kb-a' || d.session.kind === 'kb-b')
          expect(buildKbSteps(w.week, d.session.kind === 'kb-a' ? 'A' : 'B').length).toBeGreaterThan(0)
  })
})
