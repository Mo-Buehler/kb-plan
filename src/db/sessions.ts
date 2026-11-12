import { db, type Measurement, type SessionLog, type SetLog } from './db'

export { makeSessionKey } from '../domain/keys'

export async function saveSetLog(log: Omit<SetLog, 'id'>): Promise<void> {
  const existing = await db.setLogs
    .where('[sessionKey+exerciseId+setIndex]')
    .equals([log.sessionKey, log.exerciseId, log.setIndex])
    .first()
  await db.setLogs.put({ ...log, id: existing?.id })
}

export async function deleteSetLog(sessionKey: string, exerciseId: string, setIndex: number): Promise<void> {
  await db.setLogs.where('[sessionKey+exerciseId+setIndex]').equals([sessionKey, exerciseId, setIndex]).delete()
}

export async function finishSession(
  log: Omit<SessionLog, 'id' | 'status'>,
  measurements: Omit<Measurement, 'id'>[] = [],
): Promise<void> {
  await db.transaction('rw', db.sessionLogs, db.measurements, db.meta, async () => {
    const existing = await db.sessionLogs.where('sessionKey').equals(log.sessionKey).first()
    await db.sessionLogs.put({ ...log, status: 'done', id: existing?.id })
    for (const m of measurements) {
      // one value per day and kind: replace instead of duplicating
      await db.measurements.where({ date: m.date, kind: m.kind }).delete()
      await db.measurements.add(m)
    }
    await db.meta.delete('rest')
  })
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value: JSON.stringify(value) })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const m = await db.meta.get(key)
  return m ? (JSON.parse(m.value) as T) : undefined
}

export const deleteMeta = (key: string) => db.meta.delete(key)
