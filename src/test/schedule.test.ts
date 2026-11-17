import { describe, expect, it } from 'vitest'
import type { PlanOverride } from '../db/db'
import { itemsForDate, moveWarnings, tierEffect } from '../domain/schedule'
import { buildKbSteps, kbExercises } from '../domain/steps'

const ov = (o: Partial<PlanOverride> & Pick<PlanOverride, 'exerciseId' | 'fromWeek' | 'scope'>): PlanOverride => ({
  id: 1,
  createdAt: '',
  ...o,
})

describe('moves and tiers', () => {
  it('plan day without changes shows its own session', () => {
    const { items, movedAway } = itemsForDate('2026-12-23', [], {})
    expect(items.map((i) => i.kind)).toEqual(['kb-a'])
    expect(movedAway).toHaveLength(0)
  })

  it('a moved session disappears from its day and appears on the new day', () => {
    const moves = [{ fromDate: '2026-12-23', kind: 'kb-a', toDate: '2026-12-25' }]
    expect(itemsForDate('2026-12-23', moves, {}).items).toHaveLength(0)
    expect(itemsForDate('2026-12-23', moves, {}).movedAway[0].toDate).toBe('2026-12-25')
    const target = itemsForDate('2026-12-25', moves, {}).items.find((i) => i.kind === 'kb-a')
    expect(target).toMatchObject({ moved: true, originDate: '2026-12-23' })
  })

  it('Kompakt drops the Tuesday knee programme, Minimum also Thursday bike', () => {
    expect(tierEffect('compact', 'knee', 'di').hidden).toBeTruthy()
    expect(tierEffect('compact', 'bike', 'do').hidden).toBeUndefined()
    expect(tierEffect('compact', 'bike', 'do').hint).toMatch(/45 min/)
    expect(tierEffect('minimum', 'bike', 'do').hidden).toBeTruthy()
    expect(tierEffect('minimum', 'bike', 'so').hint).toBeTruthy()
    expect(tierEffect('full', 'knee', 'di')).toEqual({})
  })

  it('tier of the week hides sessions in the calendar items', () => {
    const items = itemsForDate('2026-12-22', [], { 1: 'compact' }).items
    expect(items[0]).toMatchObject({ kind: 'knee' })
    expect(items[0].hiddenReason).toBeTruthy()
  })

  it('warns for less than 24 h between kettlebell sessions and 48 h after football', () => {
    expect(moveWarnings('kb-a', '2026-12-23', '2026-12-25', [], {}).length).toBeGreaterThan(0) // next to Saturday B
    expect(moveWarnings('kb-a', '2026-12-23', '2026-12-22', [], {})).toHaveLength(1) // day after football
    expect(moveWarnings('knee', '2026-12-22', '2026-12-25', [], {})).toHaveLength(0)
  })
})

describe('plan overrides', () => {
  it('changes only the chosen week when scope is "week"', () => {
    const o = [ov({ exerciseId: 'kb-kreuzheben', fromWeek: 2, scope: 'week', patch: { reps: 8, weights: [12] } })]
    const w2 = buildKbSteps(2, 'A', o).filter((s) => s.exerciseKey === 'main:A1')
    expect(w2[0].planned).toMatchObject({ reps: 8, weights: [12] })
    const w3 = buildKbSteps(3, 'A', o).filter((s) => s.exerciseKey === 'main:A1')
    expect(w3[0].planned).toMatchObject({ reps: 12, weights: [16] })
  })

  it('applies to all following weeks where the same exercise exists', () => {
    const o = [ov({ exerciseId: 'kb-kreuzheben', fromWeek: 2, scope: 'forward', patch: { sets: 2 } })]
    expect(buildKbSteps(3, 'A', o).filter((s) => s.exerciseKey === 'main:A1')).toHaveLength(2)
    expect(buildKbSteps(1, 'A', o).filter((s) => s.exerciseKey === 'main:A1')).toHaveLength(2) // original W1 is 2 sets
    // phase 2 renames the exercise (Doppel-KB-Kreuzheben), so it keeps its plan values
    expect(buildKbSteps(5, 'A', o).filter((s) => s.exerciseKey === 'main:A1')).toHaveLength(4)
  })

  it('replaces Reverse Lunge by Split Squat and keeps the plan values', () => {
    const o = [ov({ exerciseId: 'reverse-lunge-goblet-nur-schmerzfrei', fromWeek: 5, scope: 'week', replaceWith: 'Split Squat' })]
    const view = kbExercises(5, 'B', o).find((v) => v.ex.painFreeAlternative)!
    expect(view.name).toBe('Split Squat')
    expect(view.replaced).toBe(true)
    const steps = buildKbSteps(5, 'B', o).filter((s) => s.exerciseKey === 'main:B2')
    expect(steps[0].title).toBe('Split Squat')
    expect(steps).toHaveLength(3)
  })

  it('never changes the seed values', () => {
    const before = JSON.stringify(kbExercises(2, 'A', []).map((v) => v.amount))
    kbExercises(2, 'A', [ov({ exerciseId: 'kb-kreuzheben', fromWeek: 2, scope: 'week', patch: { sets: 9 } })])
    expect(JSON.stringify(kbExercises(2, 'A', []).map((v) => v.amount))).toBe(before)
  })
})
