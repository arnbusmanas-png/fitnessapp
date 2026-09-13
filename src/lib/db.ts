import Dexie, { type Table } from 'dexie'
import type { BenchmarkLog, CrampLog, DayLog, KiteLog, WorkoutLog } from '../types'

/** 1 = changed locally and not yet pushed to the data repo. Numbers, because Dexie can't index booleans. */
export interface Synced {
  dirty?: 0 | 1
}
export interface KV {
  key: string
  value: unknown
}
export interface Upload {
  path: string
  name: string
  data: Blob
  addedAt: string
  dirty: 0 | 1
}

class FormaDB extends Dexie {
  kv!: Table<KV, string>
  days!: Table<DayLog & Synced, string>
  workouts!: Table<WorkoutLog & Synced, string>
  kite!: Table<KiteLog & Synced, string>
  benchmarks!: Table<BenchmarkLog & Synced, string>
  cramps!: Table<CrampLog & Synced, string>
  uploads!: Table<Upload, string>

  constructor() {
    super('forma')
    this.version(1).stores({
      kv: 'key',
      days: 'date, dirty',
      workouts: 'id, date, blockId, dirty',
      kite: 'id, date, dirty',
      benchmarks: 'id, date, benchmarkId, dirty',
      cramps: 'id, date, dirty',
      uploads: 'path, dirty',
    })
  }
}

export const db = new FormaDB()

/** Where each log table lives in the data repo: `${dir}/${record[key]}.json`. */
export const LOG_TABLES = [
  { table: 'days', dir: 'logs/days', key: 'date' },
  { table: 'workouts', dir: 'logs/workouts', key: 'id' },
  { table: 'kite', dir: 'logs/kite', key: 'id' },
  { table: 'benchmarks', dir: 'logs/benchmarks', key: 'id' },
  { table: 'cramps', dir: 'logs/cramps', key: 'id' },
] as const

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}

export async function kvSet(key: string, value: unknown) {
  await db.kv.put({ key, value })
}
