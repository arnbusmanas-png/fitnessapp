import type { Morning, PlanBlock } from '../types'

export type Zone = 'green' | 'yellow' | 'red' | 'unknown'
export interface Readiness {
  zone: Zone
  score?: number
  reasons: string[]
}

const rank: Record<Zone, number> = { unknown: 0, green: 1, yellow: 2, red: 3 }
const worse = (a: Zone, b: Zone) => (rank[b] > rank[a] ? b : a)

/** WHOOP-style zones (≥67 green, 34–66 yellow, ≤33 red), tightened by sleep, soreness and energy. */
export function readiness(m?: Morning): Readiness {
  if (!m) return { zone: 'unknown', reasons: [] }
  const reasons: string[] = []
  let zone: Zone = 'unknown'
  if (m.recovery != null) zone = m.recovery >= 67 ? 'green' : m.recovery >= 34 ? 'yellow' : 'red'
  if (m.sleepH != null && m.sleepH < 5) {
    zone = 'red'
    reasons.push('Under 5 h sleep')
  } else if (m.sleepH != null && m.sleepH < 6) {
    zone = worse(zone, 'yellow')
    reasons.push('Short sleep')
  }
  if (m.soreness != null && m.soreness >= 4) {
    zone = worse(zone, 'yellow')
    reasons.push('Very sore')
  }
  if (m.energy != null && m.energy <= 2) {
    zone = worse(zone, 'yellow')
    reasons.push('Low energy')
  }
  if (zone === 'unknown' && (m.energy != null || m.sleepH != null)) zone = 'green'
  const score = m.recovery ?? (m.energy != null ? m.energy * 20 : undefined)
  return { zone, score, reasons }
}

const HARD_KINDS = new Set(['strength', 'power', 'test'])
const isHard = (b: PlanBlock) => b.intensity === 'hard' || (b.intensity == null && HARD_KINDS.has(b.kind))

/** What the day's readiness means for a block, or nothing if it runs as planned. */
export function adjustment(block: PlanBlock, r: Readiness): string | undefined {
  if (!isHard(block)) return undefined
  if (r.zone === 'red') {
    if (block.lowRecovery) return block.lowRecovery
    if (block.kind === 'test') return 'Recovery is red: postpone the test. Easy 45′ spin or mobility instead.'
    if (block.kind === 'bike' || block.kind === 'ride') return 'Recovery is red: swap for 45–60′ easy Z2 under 65% FTP.'
    return 'Recovery is red: technique only. 50% loads, no plyos, nothing to failure.'
  }
  if (r.zone === 'yellow') return 'Recovery is yellow: keep it, cap effort at RPE 8 and drop the last set or interval.'
  return undefined
}
