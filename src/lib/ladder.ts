import type { KiteLog } from '../types'

export const STAGES = ['Not started', 'Learning', 'First land', '50%+', 'Consistent', 'Comp-ready'] as const
export type Stage = (typeof STAGES)[number]

export interface TrickStats {
  stage: Stage
  rate: number // landing rate over the recent window
  tries: number // attempts in the recent window
  lands: number
  totalTries: number
  totalLands: number
}

/** Most recent sessions, accumulated until at least `min` attempts. */
function window(trickId: string, logs: KiteLog[], min: number) {
  let tries = 0
  let lands = 0
  let sessions = 0
  for (const l of logs) {
    const t = l.tricks[trickId]
    if (!t?.tries) continue
    tries += t.tries
    lands += t.lands
    sessions++
    if (tries >= min) break
  }
  return { tries, lands, sessions, rate: tries ? lands / tries : 0 }
}

/**
 * Consistent = at least 80% over the last 10+ attempts.
 * Comp-ready = at least 90% over the last 20+ attempts, spread across 3+ sessions.
 */
export function trickStats(trickId: string, logs: KiteLog[]): TrickStats {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  let totalTries = 0
  let totalLands = 0
  for (const l of sorted) {
    totalTries += l.tricks[trickId]?.tries ?? 0
    totalLands += l.tricks[trickId]?.lands ?? 0
  }
  const w = window(trickId, sorted, 10)
  const base = { rate: w.rate, tries: w.tries, lands: w.lands, totalTries, totalLands }

  if (!totalTries) return { stage: 'Not started', ...base }
  if (!totalLands) return { stage: 'Learning', ...base }
  if (w.rate < 0.5) return { stage: 'First land', ...base }
  if (w.rate < 0.8 || w.tries < 10) return { stage: '50%+', ...base }
  const w20 = window(trickId, sorted, 20)
  if (w20.tries >= 20 && w20.sessions >= 3 && w20.rate >= 0.9) return { stage: 'Comp-ready', ...base }
  return { stage: 'Consistent', ...base }
}

export const stageIndex = (s: Stage) => STAGES.indexOf(s)
