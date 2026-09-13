import { describe, expect, it } from 'vitest'
import { addDays, addMinutes, isoWeekKey, mondayOf, weekday } from './dates'

describe('dates', () => {
  it('computes ISO week keys, including year edges', () => {
    expect(isoWeekKey('2026-09-14')).toBe('2026-W38')
    expect(isoWeekKey('2026-09-20')).toBe('2026-W38')
    expect(isoWeekKey('2026-09-21')).toBe('2026-W39')
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01')
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53')
  })

  it('treats Monday as the first day', () => {
    expect(weekday('2026-09-14')).toBe(0)
    expect(weekday('2026-09-13')).toBe(6)
    expect(mondayOf('2026-09-13')).toBe('2026-09-07')
  })

  it('steps across the autumn clock change', () => {
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addMinutes('11:00', 90)).toBe('12:30')
  })
})
