import { describe, expect, it } from 'vitest'
import type { KiteLog } from '../types'
import { trickStats } from './ladder'

const session = (date: string, tries: number, lands: number): KiteLog => ({
  id: date,
  date,
  spot: 'x',
  tricks: { ha: { tries, lands } },
  crashes: [],
  updatedAt: '',
})

describe('trick ladder', () => {
  it('walks up the stages', () => {
    expect(trickStats('ha', []).stage).toBe('Not started')
    expect(trickStats('ha', [session('2026-09-01', 5, 0)]).stage).toBe('Learning')
    expect(trickStats('ha', [session('2026-09-01', 10, 3)]).stage).toBe('First land')
    expect(trickStats('ha', [session('2026-09-01', 10, 6)]).stage).toBe('50%+')
    expect(trickStats('ha', [session('2026-09-01', 10, 8)]).stage).toBe('Consistent')
  })

  it('needs 10 attempts before calling anything consistent', () => {
    expect(trickStats('ha', [session('2026-09-01', 6, 6)]).stage).toBe('50%+')
  })

  it('judges on recent sessions, not all-time history', () => {
    const logs = [session('2026-06-01', 10, 2), session('2026-08-01', 10, 9)]
    const s = trickStats('ha', logs)
    expect(s.stage).toBe('Consistent')
    expect(s.totalTries).toBe(20)
  })

  it('calls it comp-ready at 90%+ over 20+ attempts across 3+ sessions', () => {
    const logs = [session('2026-08-01', 8, 8), session('2026-08-05', 8, 7), session('2026-08-09', 8, 8)]
    expect(trickStats('ha', logs).stage).toBe('Comp-ready')
  })
})
