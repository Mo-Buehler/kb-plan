import { describe, expect, it } from 'vitest'
import type { Measurement, SessionLog } from '../db/db'
import { stepTone, toneOfKind } from '../domain/colors'
import { nextSession, weekQuota, weekStrip, weightTile } from '../domain/dashboard'
import { exerciseCount, overviewSections, rowSummary, setCount } from '../domain/overview'
import { seed } from '../domain/plan'
import { buildKbSteps, buildKneeSteps } from '../domain/steps'

describe('colours', () => {
  it('maps every session kind of the plan to a tone', () => {
    const kinds = new Set(seed.weeks.flatMap((w) => w.days.map((d) => d.session.kind)))
    for (const k of kinds) expect(toneOfKind(k)).toBeTruthy()
    expect(toneOfKind('kb-a')).toBe('kb')
    expect(toneOfKind('bike')).toBe('bike')
    expect(toneOfKind('knee')).toBe('knee')
    expect(toneOfKind('football')).toBe('ball')
    expect(toneOfKind('rest')).toBe('rest')
  })

  it('colours blocks: supersets orange, single exercises cyan, finisher magenta', () => {
    const steps = buildKbSteps(7, 'A')
    const tone = (key: string) => stepTone(steps.find((s) => s.exerciseKey === key)!)
    expect(tone('main:A1')).toBe('kb')
    expect(tone('main:A4')).toBe('kb')
    expect(tone('main:A5')).toBe('solo')
    expect(tone('finisher:A7')).toBe('fin')
    expect(stepTone(steps[0])).toBe('warm')
    expect(stepTone(steps.at(-1)!)).toBe('cool')
  })
})

describe('session overview', () => {
  const sections = overviewSections(buildKbSteps(7, 'A'))
  const byId = (id: string) => sections.find((s) => s.id === id)!

  it('lists the blocks of workout A in order', () => {
    expect(sections.map((s) => s.title)).toEqual(['Warm-up', 'Knie-Block', 'Supersatz 1', 'Supersatz 2', 'Einzelübungen', 'Arm-Finisher', 'Cool-down'])
  })

  it('shows sets, reps and weight exactly like the plan', () => {
    const [a1, a2] = byId('main-1').rows
    expect(a1).toMatchObject({ title: 'Doppel-KB-Kreuzheben', summary: '4 × 12 · 12+16 kg' })
    expect(a2.summary).toBe('4 × 12 · 16 kg')
    expect(byId('main-2').rows[0].summary).toBe('4 × 10/S · 24 kg')
    expect(byId('main-solo').rows[0].summary).toBe('3 × 45 s · 16+24 kg')
  })

  it('names the pauses of each block', () => {
    expect(byId('main-1').meta).toBe('30 s / 75 s Pause')
    expect(byId('main-solo').meta).toBe('75 s Pause')
    expect(byId('finisher').meta).toBe('30 s / 45 s Pause')
    expect(byId('warmup').meta).toBe('6 min')
  })

  it('describes EMOM, ladder, test and complex rounds', () => {
    const emom = overviewSections(buildKbSteps(7, 'B')).find((s) => s.rows.some((r) => r.summary.startsWith('10 min')))!
    expect(emom.rows[0].summary).toBe('10 min × 8 · 24 kg')
    expect(emom.meta).toBe('jede volle Minute')
    const p4 = overviewSections(buildKbSteps(14, 'B')).flatMap((s) => s.rows).map((r) => r.summary)
    expect(p4).toContain('4 Runden · 16 kg')
    expect(p4.some((s) => s.startsWith('Leiter 5-10-15-20-15-10-5'))).toBe(true)
    expect(overviewSections(buildKbSteps(16, 'B')).flatMap((s) => s.rows).map((r) => r.summary)).toContain('100 Swings auf Zeit · 24 kg')
  })

  it('counts exercises and sets without the knee block', () => {
    const steps = buildKbSteps(7, 'A')
    expect(exerciseCount(steps)).toBe(8)
    expect(setCount(steps)).toBe(4 * 4 + 3 * 2 + 3 * 2) // A1-A4, A5-A6, A7-A8 (see plan W7)
  })

  it('knee-only session has just the knee block', () => {
    const s = overviewSections(buildKneeSteps('P2', 'tue'))
    expect(s).toHaveLength(1)
    expect(s[0].title).toBe('Knie-Block')
  })

  it('row summary handles weightless sets', () => {
    const dead = buildKbSteps(7, 'A').filter((s) => s.exerciseKey === 'main:A6')
    expect(rowSummary(dead)).toBe('3 × 12/S')
  })
})

describe('dashboard data', () => {
  const w = (date: string, value: number): Measurement => ({ date, kind: 'weight', value })

  it('weight tile compares the 7-day average with the corridor of the week', () => {
    expect(weightTile([], '2026-12-23').status).toBe('none')
    // week 1 corridor is 96.9 to 98.1
    expect(weightTile([w('2026-12-22', 97.5), w('2026-12-23', 97.7)], '2026-12-23')).toMatchObject({ value: 97.6, status: 'within' })
    expect(weightTile([w('2026-12-23', 99)], '2026-12-23').status).toBe('above')
    expect(weightTile([w('2026-12-23', 95)], '2026-12-23').status).toBe('below')
  })

  it('finds the next session and skips rest days', () => {
    const n = nextSession('2026-12-24', [], {})!
    expect(n.date).toBe('2026-12-26') // Friday is rest day, Saturday is KB B
    expect(n.item.kind).toBe('kb-b')
    // week tier "minimum" hides the Thursday ride, so the next session after Wednesday is Saturday
    const m = nextSession('2027-01-20', [], { 5: 'minimum' })!
    expect(m.item.kind).toBe('kb-b')
  })

  it('builds a 7-day strip following moves', () => {
    const week = seed.weeks[1]
    const moves = [{ fromDate: '2026-12-26', kind: 'kb-b', toDate: '2026-12-25' }]
    const strip = weekStrip(week, moves, {})
    expect(strip).toHaveLength(7)
    expect(strip[4].item?.kind).toBe('kb-b') // Friday now shows the moved session
    expect(strip[5].item).toBeUndefined() // Saturday is empty
  })

  it('quota counts this week and reports last weeks percentage', () => {
    const logs: SessionLog[] = [
      { date: '2026-12-23', sessionKey: '2026-12-23:kb-a', status: 'done' },
      { date: '2026-12-29', sessionKey: '2026-12-29:knee', status: 'done' },
    ]
    const q = weekQuota(logs, [], {}, '2026-12-30', 2)
    expect(q.current?.planned).toBeGreaterThan(0)
    expect(q.previousPct).toBe(Math.round((1 / 6) * 100))
  })
})

describe('bike workout variants', () => {
  it('picks the variant out of the family text', async () => {
    const { bikeDetails } = await import('../domain/dashboard')
    expect(bikeDetails('MB-SweetSpot V1')?.content).toBe('3 × 8 min @ 90 %, Pausen @ 55 %')
    expect(bikeDetails('MB-SweetSpot V3')?.content).toBe('2 × 15 min @ 90 %, Pausen @ 55 %')
    expect(bikeDetails('MB-Schwelle V4')?.content).toBe('2 × 20 min @ 95 %')
    expect(bikeDetails('MB-Schwelle V2')?.content).toBe('3 × 10 min @ 97 %')
    expect(bikeDetails('MB-Z2-60')?.content).toBe('25 min @ 65 % + 25 min @ 70 %')
    expect(bikeDetails('MB-Unbekannt')).toBeNull()
  })
})

describe('knee exercise names', () => {
  it('shows only the variant of the current phase', () => {
    expect(buildKneeSteps('P1', 'wed')[0].title).toBe('Clamshell mit Miniband')
    expect(buildKneeSteps('P3', 'wed')[0].title).toBe('Seitstütz mit Abheben des oberen Beins')
    expect(buildKneeSteps('P4', 'wed')[0].title).toBe('Seitstütz mit Abheben des oberen Beins')
  })
})
