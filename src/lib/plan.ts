import type { DayLog, DayPlan, FixedItem, PlanBlock, Profile, WeekPlan, Workout } from '../types'
import { addMinutes, isoWeekKey, minutesOf, weekday } from './dates'

export function dayPlan(plans: Record<string, WeekPlan> | undefined, date: string) {
  const week = plans?.[isoWeekKey(date)]
  return { week, day: week?.days[date] as DayPlan | undefined }
}

export function resolveWorkout(week: WeekPlan | undefined, w: Workout | string | undefined): Workout | undefined {
  if (!w) return undefined
  return typeof w === 'string' ? week?.templates?.[w] : w
}

export interface TimelineRow {
  key: string
  time: string
  end?: string
  title: string
  detail?: string
  fixed?: FixedItem
  block?: PlanBlock
}

/** The day as one ordered list: coach-planned blocks plus the fixed life schedule around them. */
export function timeline(profile: Profile | undefined, day: DayPlan | undefined, date: string): TimelineRow[] {
  const wd = weekday(date)
  const rows: TimelineRow[] = (day?.blocks ?? []).map((b) => ({
    key: b.id,
    time: b.time,
    end: addMinutes(b.time, b.durationMin),
    title: b.title,
    detail: b.detail,
    block: b,
  }))
  for (const f of profile?.schedule ?? []) {
    if (f.days && !f.days.includes(wd)) continue
    rows.push({ key: `fixed-${f.time}-${f.title}`, time: f.time, end: f.end, title: f.title, detail: f.detail, fixed: f })
  }
  return rows.sort((a, b) => minutesOf(a.time) - minutesOf(b.time) || (a.block ? -1 : 1))
}

export type Compliance = { planned: number; done: number; skipped: number }

/** How much of the planned (non-optional) work got done across a set of days. */
export function compliance(plans: Record<string, WeekPlan> | undefined, days: DayLog[], dates: string[]): Compliance {
  const byDate = new Map(days.map((d) => [d.date, d]))
  let planned = 0
  let done = 0
  let skipped = 0
  for (const date of dates) {
    const blocks = dayPlan(plans, date).day?.blocks.filter((b) => !b.optional) ?? []
    const log = byDate.get(date)
    for (const b of blocks) {
      planned++
      const s = log?.blocks[b.id]?.status
      if (s === 'done' || s === 'modified') done++
      else if (s === 'skipped') skipped++
    }
  }
  return { planned, done, skipped }
}
