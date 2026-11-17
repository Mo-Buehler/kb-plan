import { describe, expect, it } from 'vitest'
import type { Measurement, SessionLog, SetLog } from '../db/db'
import { average7, checkpointResults, compliance, kbHistory, twoAboveInARow, weightRows } from '../domain/progress'
import { footballSuggestion, keepWeightSuggestions, kneeSuggestions } from '../domain/rules'
import { buildKbSteps } from '../domain/steps'

const w = (date: string, value: number): Measurement => ({ date, kind: 'weight', value })

describe('weight tracking', () => {
  it('7-day average ignores older values and gaps', () => {
    const m = new Map([['2026-12-14', 100], ['2026-12-21', 98], ['2026-12-20', 97]])
    expect(average7('2026-12-21', m)).toBe(97.5)
    expect(average7('2027-01-03', m)).toBeNull()
  })

  it('weight rows contain the target corridor of every Sunday', () => {
    const rows = weightRows([w('2026-12-20', 98)])
    const sunday = rows.find((r) => r.date === '2027-03-14')!
    expect(sunday.target).toBe(91.9)
    expect(sunday.band).toEqual([91.3, 92.5])
    expect(rows.find((r) => r.date === '2026-12-20')).toMatchObject({ raw: 98, avg: 98, target: 98 })
  })

  it('classifies control points and finds two above the corridor in a row', () => {
    // W4 corridor 95.8-97.0, W8 93.5-94.7, W12 91.3-92.5
    const ms = [w('2027-01-17', 98), w('2027-02-14', 96), w('2027-03-14', 91.9)]
    const r = checkpointResults(ms)
    expect(r.map((x) => x.status)).toEqual(['above', 'above', 'within', 'none'])
    const pair = twoAboveInARow(r)!
    expect(pair.map((x) => x.week)).toEqual([4, 8])
    expect(twoAboveInARow(checkpointResults([w('2027-01-17', 98), w('2027-02-14', 94)]))).toBeNull()
  })
})

describe('compliance and history', () => {
  it('counts planned versus done per started week', () => {
    const logs: SessionLog[] = [{ date: '2026-12-23', sessionKey: '2026-12-23:kb-a', status: 'done' }]
    const c = compliance(logs, [], {}, '2026-12-27')
    const w1 = c.find((x) => x.week === 1)!
    expect(w1.done).toBe(1)
    expect(w1.planned).toBe(6) // football, knee, A, FTP test, B, Sunday ride (rest day excluded)
    expect(c.find((x) => x.week === 2)).toBeUndefined()
  })

  it('computes used weight and volume per exercise and week', () => {
    const logs: SetLog[] = [
      { sessionKey: '2026-12-23:kb-a', exerciseId: 'main:A5', setIndex: 0, reps: 10, weights: [12, 16], done: true },
      { sessionKey: '2026-12-23:kb-a', exerciseId: 'main:A1', setIndex: 0, reps: 10, weights: [16], done: true },
      { sessionKey: '2026-12-23:kb-a', exerciseId: 'main:A1', setIndex: 1, reps: 8, weights: [16], done: true },
    ]
    const h = kbHistory(logs)
    expect(h.get('KB-Kreuzheben')).toEqual([{ week: 1, maxWeight: 16, volume: 288 }])
    expect(h.get('Farmer Carry')![0].maxWeight).toBe(28)
  })
})

function doneLogs(week: number, workout: 'A' | 'B', date: string, shortfallKey?: string): SetLog[] {
  const kind = workout === 'A' ? 'kb-a' : 'kb-b'
  return buildKbSteps(week, workout)
    .filter((s) => s.kind === 'set' && s.block !== 'knee')
    .map((s) => ({
      sessionKey: `${date}:${kind}`,
      exerciseId: s.exerciseKey,
      setIndex: s.setIndex,
      reps: s.exerciseKey === shortfallKey && s.setIndex === 0 ? (s.planned.reps ?? 1) - 1 : s.planned.reps,
      seconds: s.planned.seconds,
      weights: s.planned.weights,
      done: true,
    }))
}

describe('rule hints', () => {
  it('suggests keeping last weeks weight only when the target was missed', () => {
    // Week 5 uses heavier bells than week 4 for the rowing (16 -> 24 in week 6), so look at week 6.
    const missed = keepWeightSuggestions(6, 'A', doneLogs(5, 'A', '2027-01-20', 'main:A3'), [])
    expect(missed).toHaveLength(1)
    expect(missed[0].keepWeights).toBeTruthy()
    const ok = keepWeightSuggestions(6, 'A', doneLogs(5, 'A', '2027-01-20'), [])
    expect(ok).toHaveLength(0)
    expect(keepWeightSuggestions(6, 'A', [], [])).toHaveLength(0) // not trained: nothing to judge
  })

  it('suggests lighter legs after Tuesday knee pain of 4 or more', () => {
    const tue = (pain: number): SessionLog[] => [{ date: '2026-12-29', sessionKey: '2026-12-29:knee', status: 'done', kneePain: pain }]
    expect(kneeSuggestions(2, tue(3), [])).toHaveLength(0)
    const s = kneeSuggestions(2, tue(5), [])
    expect(s).toHaveLength(1)
    expect(s[0].detail).toMatch(/5 von 10/)
  })

  it('suggests Workout C after three weeks without football', () => {
    expect(footballSuggestion([], '2027-01-19', false)).toHaveLength(1)
    expect(footballSuggestion([], '2027-01-19', true)).toHaveLength(0)
    expect(footballSuggestion([], '2027-01-03', false)).toHaveLength(0) // fewer than 3 finished weeks
    const played: SessionLog[] = [{ date: '2027-01-04', sessionKey: '2027-01-04:football', status: 'done' }]
    expect(footballSuggestion(played, '2027-01-19', false)).toHaveLength(0)
  })
})
