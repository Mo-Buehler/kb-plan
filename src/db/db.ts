import Dexie, { type EntityTable } from 'dexie'

/** Personal master data, entered in the setup dialog. Lives only on this device. */
export interface Profile {
  id: 1
  name: string
  age: number
  heightCm: number
  startWeightKg: number
  createdAt: string
}

/** Key/value store for app metadata (seed hash, last backup, ...). */
export interface MetaEntry {
  key: string
  value: string
}

/** Actual results. Plan values are never stored here (see plan-seed.json). */
export interface Measurement {
  id?: number
  date: string // YYYY-MM-DD
  kind: 'weight' | 'waist' | 'ftp' | 'swing-test' | 'workout-c-rounds' | 'resting-hr'
  value: number
}

export interface SessionLog {
  id?: number
  date: string
  sessionKey: string // e.g. "2026-12-09:kb-a"
  status: 'done' | 'skipped' | 'moved'
  rpe?: number
  kneePain?: number
  note?: string
  durationMin?: number
  avgHr?: number
  rounds?: number
}

export interface SetLog {
  id?: number
  sessionKey: string
  exerciseId: string
  setIndex: number
  reps?: number
  seconds?: number
  weights?: number[]
  done: boolean
}

export class KbDb extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>
  measurements!: EntityTable<Measurement, 'id'>
  sessionLogs!: EntityTable<SessionLog, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>

  constructor(name = 'kb-plan') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      meta: 'key',
      measurements: '++id, date, kind',
      sessionLogs: '++id, date, &sessionKey',
      setLogs: '++id, sessionKey, exerciseId',
    })
    // v2: one log per set, addressed by (session, exercise, set number)
    this.version(2).stores({
      setLogs: '++id, sessionKey, exerciseId, &[sessionKey+exerciseId+setIndex]',
    })
  }
}

export const db = new KbDb()
