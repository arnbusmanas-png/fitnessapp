import { describe, expect, it } from 'vitest'
import type { PlanBlock } from '../types'
import { adjustment, readiness } from './readiness'

const block = (patch: Partial<PlanBlock>): PlanBlock => ({ id: 'b', time: '11:00', durationMin: 60, kind: 'bike', title: 't', ...patch })

describe('readiness', () => {
  it('uses WHOOP recovery zones', () => {
    expect(readiness({ recovery: 80, at: '' }).zone).toBe('green')
    expect(readiness({ recovery: 50, at: '' }).zone).toBe('yellow')
    expect(readiness({ recovery: 20, at: '' }).zone).toBe('red')
  })

  it('lets short sleep and soreness pull a green day down', () => {
    expect(readiness({ recovery: 80, sleepH: 5.5, at: '' }).zone).toBe('yellow')
    expect(readiness({ recovery: 80, sleepH: 4.5, at: '' }).zone).toBe('red')
    expect(readiness({ recovery: 80, soreness: 4, at: '' }).zone).toBe('yellow')
  })

  it('never softens a red day', () => {
    expect(readiness({ recovery: 20, energy: 5, sleepH: 8, at: '' }).zone).toBe('red')
  })

  it('only adjusts hard sessions', () => {
    const red = readiness({ recovery: 20, at: '' })
    expect(adjustment(block({ kind: 'mobility' }), red)).toBeUndefined()
    expect(adjustment(block({ intensity: 'easy' }), red)).toBeUndefined()
    expect(adjustment(block({ intensity: 'hard' }), red)).toMatch(/Z2/)
    expect(adjustment(block({ kind: 'strength' }), red)).toMatch(/technique/)
    expect(adjustment(block({ intensity: 'hard', lowRecovery: 'Walk instead.' }), red)).toBe('Walk instead.')
    expect(adjustment(block({ intensity: 'hard' }), readiness({ recovery: 80, at: '' }))).toBeUndefined()
  })
})
