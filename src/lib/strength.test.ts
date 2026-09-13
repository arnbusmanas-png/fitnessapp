import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../types'
import { e1rm, lastSets, summarize } from './strength'

const workout = (id: string, startedAt: string, kg: number, reps: number): WorkoutLog => ({
  id,
  date: startedAt.slice(0, 10),
  title: 'Gym',
  startedAt,
  endedAt: startedAt.replace('T11:00', 'T12:00'),
  items: [{ exerciseId: 'Trap_Bar_Deadlift', sets: [{ kg, reps, done: true }, { kg: 200, reps: 5, done: false }] }],
  updatedAt: startedAt,
})

describe('strength', () => {
  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.7, 1)
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(undefined, 5)).toBe(0)
  })

  it('pre-fills from the most recent other session, done sets only', () => {
    const logs = [workout('a', '2026-09-01T11:00:00.000Z', 100, 5), workout('b', '2026-09-08T11:00:00.000Z', 110, 5)]
    expect(lastSets('Trap_Bar_Deadlift', logs, 'c')).toEqual([{ kg: 110, reps: 5, done: true }])
    expect(lastSets('Trap_Bar_Deadlift', logs, 'b')).toEqual([{ kg: 100, reps: 5, done: true }])
  })

  it('flags a PR only when it beats earlier history', () => {
    const first = workout('a', '2026-09-01T11:00:00.000Z', 100, 5)
    expect(summarize(first, [first]).prs).toEqual([])
    const better = workout('b', '2026-09-08T11:00:00.000Z', 110, 5)
    const s = summarize(better, [first, better])
    expect(s.prs.map((p) => p.exerciseId)).toEqual(['Trap_Bar_Deadlift'])
    expect(s.volumeKg).toBe(550)
    expect(s.minutes).toBe(60)
  })
})
