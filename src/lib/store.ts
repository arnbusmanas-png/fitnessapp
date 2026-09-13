import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import type {
  BenchmarkLog,
  CoachFeed,
  CrampLog,
  DayLog,
  KiteLog,
  Labs,
  Profile,
  Supplements,
  WeekPlan,
  WorkoutLog,
} from '../types'
import { db, kvGet, kvSet } from './db'
import { nowISO, today } from './dates'
import { requestSync, syncNow, syncState, type RepoSettings } from './sync'

// Live queries resolve to undefined while loading; missing things resolve to null.
export function useFile<T>(path: string) {
  return useLiveQuery(async () => (await kvGet<T>(`file:${path}`)) ?? null, [path])
}
export const useProfile = () => useFile<Profile>('profile.json')
export const useCoach = () => useFile<CoachFeed>('coach/feed.json')
export const useLabs = () => useFile<Labs>('health/labs.json')
export const useSupplements = () => useFile<Supplements>('health/supplements.json')

export function usePlans() {
  return useLiveQuery(async () => {
    const rows = await db.kv.where('key').startsWith('file:plans/').toArray()
    const plans: Record<string, WeekPlan> = {}
    for (const r of rows) {
      const p = r.value as WeekPlan
      if (p?.week) plans[p.week] = p
    }
    return plans
  }, [])
}

export const useDay = (date: string) => useLiveQuery(async () => (await db.days.get(date)) ?? null, [date])
export const useDays = () => useLiveQuery(() => db.days.orderBy('date').toArray(), [])
export const useWorkoutLogs = () => useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray(), [])
export const useKiteLogs = () => useLiveQuery(() => db.kite.orderBy('date').reverse().toArray(), [])
export const useBenchmarkLogs = () => useLiveQuery(() => db.benchmarks.orderBy('date').toArray(), [])
export const useCrampLogs = () => useLiveQuery(() => db.cramps.orderBy('date').reverse().toArray(), [])
export const useUploads = () => useLiveQuery(() => db.uploads.toArray(), [])
export const useSettings = () => useLiveQuery(async () => (await kvGet<RepoSettings>('settings')) ?? null, [])
export const useSyncState = () => useSyncExternalStore(syncState.subscribe, syncState.get)

export async function updateDay(date: string, fn: (d: DayLog) => void) {
  await db.transaction('rw', db.days, async () => {
    const cur: DayLog = (await db.days.get(date)) ?? { date, blocks: {}, updatedAt: '' }
    const next = structuredClone(cur)
    fn(next)
    next.updatedAt = nowISO()
    await db.days.put({ ...next, dirty: 1 })
  })
  requestSync()
}

type Tables = {
  workouts: WorkoutLog
  kite: KiteLog
  benchmarks: BenchmarkLog
  cramps: CrampLog
}
/** Saves locally and marks for upload. Pass sync=false for rapid edits (e.g. mid-workout) to avoid a commit per tap. */
export async function saveRecord<K extends keyof Tables>(table: K, rec: Omit<Tables[K], 'updatedAt'>, sync = true) {
  await (db[table] as unknown as { put(r: unknown): Promise<unknown> }).put({ ...rec, updatedAt: nowISO(), dirty: 1 })
  if (sync) requestSync()
}

export async function deleteLocal<K extends keyof Tables>(table: K, id: string) {
  await db[table].delete(id)
}

export async function addUpload(file: File) {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  const path = `health/uploads/${today()}-${safe}`
  await db.uploads.put({ path, name: file.name, data: file, addedAt: nowISO(), dirty: 1 })
  requestSync(500)
  return path
}

export async function saveSettings(s: RepoSettings | undefined) {
  if (s) await kvSet('settings', s)
  else await db.kv.delete('settings')
  // A different repo means our SHA bookkeeping is meaningless; start clean.
  await db.kv.delete('shas')
  await syncNow()
}

export async function exportBackup() {
  const [days, workouts, kite, benchmarks, cramps] = await Promise.all([
    db.days.toArray(),
    db.workouts.toArray(),
    db.kite.toArray(),
    db.benchmarks.toArray(),
    db.cramps.toArray(),
  ])
  return new Blob([JSON.stringify({ exportedAt: nowISO(), days, workouts, kite, benchmarks, cramps }, null, 2)], {
    type: 'application/json',
  })
}
