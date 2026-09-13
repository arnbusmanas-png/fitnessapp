import type { SetLog, WorkoutLog } from '../types'

/** Epley estimate; a single rep is its own max. */
export const e1rm = (kg?: number, reps?: number) => {
  if (!kg || !reps) return 0
  return reps === 1 ? kg : kg * (1 + reps / 30)
}

const bestOf = (sets: SetLog[]) => Math.max(0, ...sets.filter((s) => s.done).map((s) => e1rm(s.kg, s.reps)))

/** Sets from the most recent other session that logged this exercise. */
export function lastSets(exerciseId: string, logs: WorkoutLog[], excludeId?: string): SetLog[] | undefined {
  const sorted = [...logs].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  for (const l of sorted) {
    if (l.id === excludeId) continue
    const item = l.items.find((i) => i.exerciseId === exerciseId && i.sets.some((s) => s.done))
    if (item) return item.sets.filter((s) => s.done)
  }
  return undefined
}

export function bestE1rm(exerciseId: string, logs: WorkoutLog[], excludeId?: string) {
  let best = 0
  for (const l of logs) {
    if (l.id === excludeId) continue
    for (const i of l.items) if (i.exerciseId === exerciseId) best = Math.max(best, bestOf(i.sets))
  }
  return best
}

export interface Summary {
  minutes: number
  sets: number
  reps: number
  volumeKg: number
  prs: { exerciseId: string; e1rm: number }[]
}

export function summarize(log: WorkoutLog, history: WorkoutLog[]): Summary {
  let sets = 0
  let reps = 0
  let volumeKg = 0
  const prs: Summary['prs'] = []
  for (const item of log.items) {
    const done = item.sets.filter((s) => s.done)
    sets += done.length
    for (const s of done) {
      reps += s.reps ?? 0
      volumeKg += (s.kg ?? 0) * (s.reps ?? 0)
    }
    const now = bestOf(done)
    const before = bestE1rm(item.exerciseId, history, log.id)
    if (now > 0 && before > 0 && now > before) prs.push({ exerciseId: item.exerciseId, e1rm: Math.round(now) })
  }
  const end = log.endedAt ? Date.parse(log.endedAt) : Date.now()
  const minutes = Math.max(0, Math.round((end - Date.parse(log.startedAt)) / 60000))
  return { minutes, sets, reps, volumeKg: Math.round(volumeKg), prs }
}

/** Best estimated 1RM per session, oldest first, for a progress chart. */
export function e1rmHistory(exerciseId: string, logs: WorkoutLog[]) {
  return logs
    .map((l) => ({ date: l.date, value: Math.round(bestOf(l.items.find((i) => i.exerciseId === exerciseId)?.sets ?? [])) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}
