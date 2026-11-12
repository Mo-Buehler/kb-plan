import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { deleteSetLog, finishSession, saveSetLog } from '../db/sessions'

const base = { sessionKey: '2026-12-09:kb-a', exerciseId: 'main:A1', setIndex: 0, done: true }

beforeEach(async () => {
  await Promise.all([db.setLogs.clear(), db.sessionLogs.clear(), db.measurements.clear(), db.meta.clear()])
})

describe('session storage', () => {
  it('saves a set once and overwrites it on the second tap', async () => {
    await saveSetLog({ ...base, reps: 10, weights: [16] })
    await saveSetLog({ ...base, reps: 9, weights: [16] })
    const all = await db.setLogs.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ reps: 9, weights: [16] })
  })

  it('removes a set (undo)', async () => {
    await saveSetLog({ ...base, reps: 10, weights: [16] })
    await deleteSetLog(base.sessionKey, base.exerciseId, 0)
    expect(await db.setLogs.count()).toBe(0)
  })

  it('finishing stores the session and one measurement per day and kind', async () => {
    await finishSession({ date: '2026-12-10', sessionKey: 'k1', kneePain: 2 }, [{ date: '2026-12-10', kind: 'ftp', value: 200 }])
    await finishSession({ date: '2026-12-10', sessionKey: 'k1', kneePain: 3 }, [{ date: '2026-12-10', kind: 'ftp', value: 210 }])
    expect(await db.sessionLogs.count()).toBe(1)
    expect((await db.sessionLogs.toArray())[0]).toMatchObject({ status: 'done', kneePain: 3 })
    const m = await db.measurements.toArray()
    expect(m).toHaveLength(1)
    expect(m[0].value).toBe(210)
  })
})
