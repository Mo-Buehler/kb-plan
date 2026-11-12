import { db, type PlanOverride } from './db'
import { makeSessionKey } from './sessions'
import type { Tier } from '../domain/schedule'

export async function saveOverride(o: Omit<PlanOverride, 'id' | 'createdAt'>): Promise<void> {
  await db.overrides.add({ ...o, createdAt: new Date().toISOString() })
}

/** Removes every change that currently applies to this exercise in this week. */
export async function clearOverrides(exerciseId: string, week: number): Promise<void> {
  const all = await db.overrides.where('exerciseId').equals(exerciseId).toArray()
  const ids = all
    .filter((o) => (o.scope === 'week' ? o.fromWeek === week : o.fromWeek <= week))
    .map((o) => o.id!)
  await db.overrides.bulkDelete(ids)
}

export async function setTier(week: number, tier: Tier): Promise<void> {
  if (tier === 'full') await db.weekTiers.delete(week)
  else await db.weekTiers.put({ week, tier })
}

export async function moveSession(fromDate: string, kind: string, toDate: string): Promise<void> {
  await db.moves.where({ fromDate, kind }).delete()
  if (toDate !== fromDate) await db.moves.add({ fromDate, kind, toDate })
}

export async function setSkipped(date: string, kind: string, skipped: boolean): Promise<void> {
  const sessionKey = makeSessionKey(date, kind)
  const existing = await db.sessionLogs.where('sessionKey').equals(sessionKey).first()
  if (skipped) await db.sessionLogs.put({ id: existing?.id, date, sessionKey, status: 'skipped' })
  else if (existing?.status === 'skipped') await db.sessionLogs.delete(existing.id!)
}
