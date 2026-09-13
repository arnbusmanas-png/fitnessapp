import { describe, expect, it } from 'vitest'
import type { DayLog, Profile, WeekPlan } from '../types'
import { compliance, timeline } from './plan'

const profile = {
  schedule: [
    { time: '04:20', title: 'Ritual', kind: 'ritual' },
    { time: '16:00', end: '17:30', title: 'Trading', kind: 'trading', days: [0, 1, 2, 3, 4] },
  ],
} as unknown as Profile

const plans: Record<string, WeekPlan> = {
  '2026-W38': {
    week: '2026-W38',
    phase: 'Base',
    focus: '',
    days: {
      '2026-09-14': {
        blocks: [
          { id: 'gym', time: '11:00', durationMin: 90, kind: 'strength', title: 'Gym A' },
          { id: 'mob', time: '20:00', durationMin: 10, kind: 'mobility', title: 'Mobility', optional: true },
        ],
      },
      '2026-09-15': { blocks: [{ id: 'z', time: '11:00', durationMin: 75, kind: 'bike', title: 'VO2' }] },
    },
  },
}

describe('plan', () => {
  it('interleaves planned blocks with the fixed day, respecting weekdays', () => {
    const monday = timeline(profile, plans['2026-W38'].days['2026-09-14'], '2026-09-14').map((r) => r.title)
    expect(monday).toEqual(['Ritual', 'Gym A', 'Trading', 'Mobility'])
    const sunday = timeline(profile, undefined, '2026-09-20').map((r) => r.title)
    expect(sunday).toEqual(['Ritual'])
  })

  it('counts done and modified, ignores optional blocks', () => {
    const days: DayLog[] = [
      { date: '2026-09-14', blocks: { gym: { status: 'modified', at: '' } }, updatedAt: '' },
      { date: '2026-09-15', blocks: { z: { status: 'skipped', reason: 'sick', at: '' } }, updatedAt: '' },
    ]
    expect(compliance(plans, days, ['2026-09-14', '2026-09-15'])).toEqual({ planned: 2, done: 1, skipped: 1 })
  })
})
