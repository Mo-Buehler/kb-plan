import { checklistGroups, shoppingGroups } from '../domain/lists'
import { seed } from '../domain/plan'
import { db } from './db'
import { getMeta, setMeta } from './sessions'

export const BACKUP_FORMAT = 1

const TABLES = ['profile', 'meta', 'measurements', 'sessionLogs', 'setLogs', 'overrides', 'moves', 'weekTiers', 'checkStates'] as const
type TableName = (typeof TABLES)[number]

export interface BackupFile {
  app: 'kb-plan'
  format: number
  exportedAt: string
  seedHash: string
  tables: Record<TableName, Record<string, unknown>[]>
}

const LABELS: Record<TableName, string> = {
  profile: 'Profil',
  meta: 'Einstellungen',
  measurements: 'Messwerte',
  sessionLogs: 'Einheiten',
  setLogs: 'Sätze',
  overrides: 'Plan-Änderungen',
  moves: 'Verschiebungen',
  weekTiers: 'Wochenstufen',
  checkStates: 'Haken in Listen',
}

/** Short-lived timer state is not worth saving. */
const isTransient = (key: string) => key === 'rest' || key.startsWith('stopwatch:')

export async function buildBackup(): Promise<BackupFile> {
  const tables = {} as BackupFile['tables']
  for (const t of TABLES) {
    const rows = (await db.table(t).toArray()) as Record<string, unknown>[]
    tables[t] = t === 'meta' ? rows.filter((r) => !isTransient(String(r.key))) : rows
  }
  return { app: 'kb-plan', format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), seedHash: seed.sourceHash, tables }
}

export type ParseResult = { ok: true; file: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' }
  }
  const f = data as Partial<BackupFile> | null
  if (!f || f.app !== 'kb-plan' || typeof f.tables !== 'object' || f.tables === null)
    return { ok: false, error: 'Das ist keine KB-Plan-Sicherung.' }
  if (typeof f.format !== 'number' || f.format > BACKUP_FORMAT)
    return { ok: false, error: 'Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.' }
  const tables = {} as BackupFile['tables']
  for (const t of TABLES) {
    const rows = (f.tables as Record<string, unknown>)[t] ?? []
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null))
      return { ok: false, error: `Die Sicherung ist beschädigt (Tabelle ${t}).` }
    tables[t] = rows as Record<string, unknown>[]
  }
  return { ok: true, file: { app: 'kb-plan', format: f.format, exportedAt: String(f.exportedAt ?? ''), seedHash: String(f.seedHash ?? ''), tables } }
}

export const summarize = (file: BackupFile) =>
  TABLES.filter((t) => file.tables[t].length > 0 && t !== 'meta').map((t) => ({ label: LABELS[t], count: file.tables[t].length }))

/** Replaces all data on this device by the backup. Runs in one transaction: all or nothing. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = t === 'meta' ? file.tables[t].filter((r) => !isTransient(String(r.key))) : file.tables[t]
      if (rows.length) await db.table(t).bulkAdd(rows)
    }
  })
  await setMeta('lastBackup', new Date().toISOString())
}

export async function markBackupDone(): Promise<void> {
  await setMeta('lastBackup', new Date().toISOString())
}

export const getLastBackup = () => getMeta<string>('lastBackup')

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
}

/** True when the bundled plan is a different version than the one the stored changes were made for. */
export async function isNewPlanVersion(): Promise<boolean> {
  const known = await getMeta<string>('seedHash')
  return known !== undefined && known !== seed.sourceHash
}

/** "vor-dem-start-bis-06-12-1" and "kettlebell-12-kg-w1-07-12" (first release) -> "vor-dem-start-1", "kettlebell-12-kg-w1". */
export const legacyListKey = (k: string) => k.replace(/-bis-\d{2}-\d{2}(?=-\d+$)/, '').replace(/(-w\d+)-\d{2}-\d{2}$/, '$1')

/**
 * New training cycle or moved start: results (measurements, sessions, sets, profile) and list ticks stay.
 * Edits, moves, week tiers and rule answers refer to the old plan and are removed.
 */
export async function adoptNewPlan(): Promise<void> {
  await db.transaction('rw', db.overrides, db.moves, db.weekTiers, db.checkStates, db.meta, async () => {
    await Promise.all([db.overrides.clear(), db.moves.clear(), db.weekTiers.clear()])
    // Ticks stay for entries that still exist; ids written with a date by earlier versions are mapped to the date-free id.
    const valid = new Set([...checklistGroups(), ...shoppingGroups()].flatMap((g) => g.entries.map((e) => e.id)))
    const ticks = await db.checkStates.toArray()
    await db.checkStates.clear()
    for (const t of ticks) {
      const key = valid.has(t.key) ? t.key : legacyListKey(t.key)
      if (valid.has(key)) await db.checkStates.put({ ...t, key })
    }
    const stale = (await db.meta.toArray()).filter((m) => m.key.startsWith('rule-dismissed:') || m.key === 'mondayWorkoutC')
    await db.meta.bulkDelete(stale.map((m) => m.key))
    await setMeta('seedHash', seed.sourceHash)
  })
}

/** True when no backup was made for `days` days (counted from setup if there never was one). */
export function isBackupDue(lastBackup: string | undefined, createdAt: string | undefined, now = Date.now(), days = 7): boolean {
  const ref = lastBackup ?? createdAt
  if (!ref) return false
  const t = Date.parse(ref)
  return Number.isFinite(t) && now - t >= days * 86400000
}

export const backupFileName = (iso = new Date().toISOString()) => `kb-plan-backup-${iso.slice(0, 10)}.json`
