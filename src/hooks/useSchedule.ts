import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Measurement, type PlanOverride, type SessionLog, type SetLog } from '../db/db'
import { makeSessionKey } from '../db/sessions'
import type { Move, ScheduledItem, Tier, TierMap } from '../domain/schedule'

export interface ScheduleData {
  moves: Move[]
  tiers: TierMap
  logs: SessionLog[]
  overrides: PlanOverride[]
  setLogs: SetLog[]
  measurements: Measurement[]
  /** Rule hints the user already answered. */
  dismissed: Set<string>
  /** Set when the user accepted "Workout C on Mondays". */
  mondayWorkoutC: boolean
}

/** Everything that changes the calendar, or undefined while loading. */
export function useSchedule(): ScheduleData | undefined {
  return useLiveQuery(async () => {
    const [moves, tierRows, logs, overrides, setLogs, measurements, meta] = await Promise.all([
      db.moves.toArray(),
      db.weekTiers.toArray(),
      db.sessionLogs.toArray(),
      db.overrides.toArray(),
      db.setLogs.toArray(),
      db.measurements.toArray(),
      db.meta.toArray(),
    ])
    const tiers: TierMap = {}
    for (const t of tierRows) tiers[t.week] = t.tier as Tier
    const dismissed = new Set(meta.filter((m) => m.key.startsWith('rule-dismissed:')).map((m) => m.key.slice(15)))
    const mondayWorkoutC = meta.some((m) => m.key === 'mondayWorkoutC' && m.value === 'true')
    return { moves, tiers, logs, overrides, setLogs, measurements, dismissed, mondayWorkoutC }
  }, [])
}

export type ItemStatus = 'done' | 'skipped' | 'moved' | 'planned'

export function statusOf(item: ScheduledItem, logs: SessionLog[], movedAway = false): ItemStatus {
  const log = logs.find((l) => l.sessionKey === makeSessionKey(item.originDate, item.kind))
  if (log?.status === 'done') return 'done'
  if (log?.status === 'skipped') return 'skipped'
  return movedAway ? 'moved' : 'planned'
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  done: 'erledigt',
  skipped: 'ausgelassen',
  moved: 'verschoben',
  planned: 'geplant',
}
