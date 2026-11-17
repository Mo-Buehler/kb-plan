import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { adoptNewPlan, backupFileName, buildBackup, deleteAllData, isBackupDue, parseBackup, restoreBackup, summarize } from '../db/backup'
import { db } from '../db/db'
import { setMeta } from '../db/sessions'
import { checklistGroups, isOverdue, overdueCount, shoppingGroups } from '../domain/lists'

async function fill() {
  await db.profile.put({ id: 1, name: 'Test', age: 30, heightCm: 180, startWeightKg: 80, createdAt: '2026-12-01T08:00:00Z' })
  await db.measurements.bulkAdd([
    { date: '2026-12-21', kind: 'weight', value: 98 },
    { date: '2026-12-22', kind: 'weight', value: 97.8 },
  ])
  await db.sessionLogs.add({ date: '2026-12-23', sessionKey: '2026-12-23:kb-a', status: 'done', rpe: 7, kneePain: 2 })
  await db.setLogs.add({ sessionKey: '2026-12-23:kb-a', exerciseId: 'main:A1', setIndex: 0, reps: 10, weights: [16], done: true })
  await db.overrides.add({ exerciseId: 'kb-kreuzheben', fromWeek: 2, scope: 'forward', patch: { sets: 4 }, createdAt: 'x' })
  await db.moves.add({ fromDate: '2026-12-26', kind: 'kb-b', toDate: '2026-12-25' })
  await db.weekTiers.put({ week: 3, tier: 'compact' })
  await db.checkStates.put({ key: 'x', done: true, at: 'y' })
  await setMeta('rest', { sessionKey: 'a', endsAt: 1 }) // transient, must not be exported
  await setMeta('mondayWorkoutC', true)
}

const snapshot = async () => JSON.stringify((await buildBackup()).tables)

beforeEach(async () => {
  await deleteAllData()
})

describe('backup', () => {
  it('export then import on an empty device gives identical data', async () => {
    await fill()
    const before = await snapshot()
    const text = JSON.stringify(await buildBackup())
    await deleteAllData()
    expect(await db.measurements.count()).toBe(0)

    const parsed = parseBackup(text)
    if (!parsed.ok) throw new Error(parsed.error)
    await restoreBackup(parsed.file)
    const after = JSON.parse(await snapshot()) as Record<string, unknown[]>
    const orig = JSON.parse(before) as Record<string, unknown[]>
    // lastBackup is written by the restore itself
    after.meta = after.meta.filter((m) => (m as { key: string }).key !== 'lastBackup')
    expect(after).toEqual(orig)
  })

  it('does not export short-lived timer state', async () => {
    await fill()
    const keys = (await buildBackup()).tables.meta.map((m) => m.key)
    expect(keys).toContain('mondayWorkoutC')
    expect(keys).not.toContain('rest')
  })

  it('import replaces existing data instead of merging', async () => {
    await fill()
    const text = JSON.stringify(await buildBackup())
    await db.measurements.add({ date: '2027-01-03', kind: 'waist', value: 90 })
    const parsed = parseBackup(text)
    if (!parsed.ok) throw new Error(parsed.error)
    await restoreBackup(parsed.file)
    expect(await db.measurements.count()).toBe(2)
  })

  it('rejects broken and foreign files', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup('{"app":"other"}').ok).toBe(false)
    expect(parseBackup('{"app":"kb-plan","format":99,"tables":{}}')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"kb-plan","format":1,"tables":{"setLogs":[1]}}')).toMatchObject({ ok: false })
  })

  it('accepts a file with missing tables as empty', () => {
    const r = parseBackup('{"app":"kb-plan","format":1,"tables":{}}')
    expect(r.ok).toBe(true)
    if (r.ok) expect(summarize(r.file)).toEqual([])
  })

  it('summarizes what a backup contains', async () => {
    await fill()
    const s = summarize(await buildBackup())
    expect(s).toContainEqual({ label: 'Messwerte', count: 2 })
    expect(s).toContainEqual({ label: 'Einheiten', count: 1 })
  })

  it('reminds after 7 days without backup, counted from setup if there is none', () => {
    const day = 86400000
    const now = Date.parse('2026-12-20T12:00:00Z')
    expect(isBackupDue(undefined, '2026-12-10T12:00:00Z', now)).toBe(true)
    expect(isBackupDue(undefined, '2026-12-15T12:00:00Z', now)).toBe(false)
    expect(isBackupDue(new Date(now - 6 * day).toISOString(), '2026-12-01T00:00:00Z', now)).toBe(false)
    expect(isBackupDue(new Date(now - 7 * day).toISOString(), '2026-12-01T00:00:00Z', now)).toBe(true)
    expect(isBackupDue(undefined, undefined, now)).toBe(false)
  })

  it('names the file by date', () => {
    expect(backupFileName('2027-01-07T10:00:00Z')).toBe('kb-plan-backup-2027-01-07.json')
  })
})

describe('checklists and shopping list', () => {
  it('derives due dates from the plan', () => {
    const start = checklistGroups().find((g) => g.title === 'Vor dem Start')!
    expect(start.entries.every((e) => e.due === '2026-12-20')).toBe(true)
    const week6 = checklistGroups().flatMap((g) => g.entries).find((e) => e.text.startsWith('Woche 6:'))!
    expect(week6.due).toBe('2027-01-25')
    const bells = shoppingGroups().flatMap((g) => g.entries).find((e) => e.text.startsWith('Kettlebell 12 kg'))!
    expect(bells.due).toBe('2026-12-07')
    expect(shoppingGroups().map((g) => g.title)).toEqual(['Pflicht', 'Empfohlen', 'Optional'])
  })

  it('flags open entries past their due date', () => {
    const e = { id: 'a', text: 'x', due: '2026-12-07' }
    expect(isOverdue(e, false, '2026-12-08')).toBe(true)
    expect(isOverdue(e, true, '2026-12-08')).toBe(false)
    expect(isOverdue(e, false, '2026-12-07')).toBe(false)
    expect(overdueCount(new Set(), '2026-11-26')).toBe(0)
    expect(overdueCount(new Set(), '2027-12-15')).toBeGreaterThan(10)
  })
})

describe('new training cycle', () => {
  it('keeps results but drops edits, moves, tiers, list ticks and rule answers', async () => {
    await fill()
    await setMeta('rule-dismissed:x', true)
    await setMeta('seedHash', 'old')
    await adoptNewPlan()
    expect(await db.measurements.count()).toBe(2)
    expect(await db.sessionLogs.count()).toBe(1)
    expect(await db.setLogs.count()).toBe(1)
    expect(await db.profile.count()).toBe(1)
    expect(await db.overrides.count()).toBe(0)
    expect(await db.moves.count()).toBe(0)
    expect(await db.weekTiers.count()).toBe(0)
    expect(await db.checkStates.count()).toBe(0)
    const keys = (await db.meta.toArray()).map((m) => m.key)
    expect(keys).not.toContain('rule-dismissed:x')
    expect(keys).not.toContain('mondayWorkoutC')
    expect(JSON.parse((await db.meta.get('seedHash'))!.value)).not.toBe('old')
  })
})

describe('stored plan version', () => {
  it('startup stores the hash readable by the new-plan check, also in the legacy plain-text form', async () => {
    const { initStorage } = await import('../db/startup')
    const { isNewPlanVersion } = await import('../db/backup')
    await initStorage()
    expect(await isNewPlanVersion()).toBe(false)
    await db.meta.put({ key: 'seedHash', value: 'oldplainhash' }) // written as plain text by an earlier version
    expect(await isNewPlanVersion()).toBe(true) // different from the current seed, but must not throw
  })
})

describe('app update', () => {
  it('keeps data written by the first release when the database schema is upgraded', async () => {
    const { default: Dexie } = await import('dexie')
    const { KbDb } = await import('../db/db')
    const old = new Dexie('upgrade-test')
    old.version(1).stores({
      profile: 'id',
      meta: 'key',
      measurements: '++id, date, kind',
      sessionLogs: '++id, date, &sessionKey',
      setLogs: '++id, sessionKey, exerciseId',
    })
    await old.table('profile').put({ id: 1, name: 'Test', age: 30, heightCm: 180, startWeightKg: 80, createdAt: 'x' })
    await old.table('measurements').add({ date: '2026-12-21', kind: 'weight', value: 98 })
    await old.table('setLogs').add({ sessionKey: 'k', exerciseId: 'main:A1', setIndex: 0, reps: 10, done: true })
    old.close()

    const current = new KbDb('upgrade-test')
    expect((await current.profile.get(1))?.name).toBe('Test')
    expect(await current.measurements.count()).toBe(1)
    expect(await current.setLogs.count()).toBe(1)
    expect(await current.checkStates.count()).toBe(0) // new tables exist and are empty
    current.close()
  })
})

describe('moving the plan start keeps list ticks', () => {
  it('maps ids written with dates by earlier versions to the date-free ids', async () => {
    const { legacyListKey } = await import('../db/backup')
    expect(legacyListKey('vor-dem-start-bis-06-12-1')).toBe('vor-dem-start-1')
    expect(legacyListKey('kettlebell-12-kg-gusseisen-w1-07-12')).toBe('kettlebell-12-kg-gusseisen-w1')
    expect(legacyListKey('personenwaage-und-massband-w0-30-11')).toBe('personenwaage-und-massband-w0')
    expect(legacyListKey('waehrend-des-plans-2')).toBe('waehrend-des-plans-2')
  })

  it('keeps valid and legacy ticks, drops unknown ones', async () => {
    await db.checkStates.bulkAdd([
      { key: 'vor-dem-start-bis-06-12-2', done: true, at: 'a' }, // legacy checklist id
      { key: 'kettlebell-16-kg-gusseisen-w1-07-12', done: true, at: 'b' }, // legacy shopping id
      { key: 'saisonstart-rennrad-1', done: true, at: 'c' }, // already valid
      { key: 'gibt-es-nicht', done: true, at: 'd' },
    ])
    await adoptNewPlan()
    const keys = (await db.checkStates.toArray()).map((c) => c.key).sort()
    expect(keys).toEqual(['kettlebell-16-kg-gusseisen-w1', 'saisonstart-rennrad-1', 'vor-dem-start-2'])
  })
})
