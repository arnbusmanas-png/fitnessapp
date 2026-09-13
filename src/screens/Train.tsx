import { BookOpen, ChevronLeft, ChevronRight, Dumbbell, Plus, Wind } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusDot } from '../components/ui'
import { addDays, fmtClock, fmtDay, fmtDuration, mondayOf, parseISODate, toISODate } from '../lib/dates'
import { useToday } from '../lib/hooks'
import { KIND } from '../lib/kinds'
import { dayPlan } from '../lib/plan'
import { useDays, useKiteLogs, usePlans, useWorkoutLogs } from '../lib/store'
import { useNav } from '../nav'

function monthCells(month: string) {
  const first = `${month}-01`
  const d = parseISODate(first)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  const end = addDays(mondayOf(toISODate(d)), 6)
  const cells: string[] = []
  for (let c = mondayOf(first); c <= end; c = addDays(c, 1)) cells.push(c)
  return cells
}

const shiftMonth = (month: string, n: number) => {
  const d = parseISODate(`${month}-01`)
  d.setMonth(d.getMonth() + n)
  return toISODate(d).slice(0, 7)
}

export function Train() {
  const nav = useNav()
  const todayDate = useToday()
  const plans = usePlans()
  const days = useDays()
  const workouts = useWorkoutLogs()
  const kites = useKiteLogs()
  const [sel, setSel] = useState(todayDate)
  const [month, setMonth] = useState(todayDate.slice(0, 7))

  const cells = useMemo(() => monthCells(month), [month])
  const logs = useMemo(() => new Map((days ?? []).map((d) => [d.date, d])), [days])
  const current = dayPlan(plans, todayDate).week
  const { week, day } = dayPlan(plans, sel)
  const log = logs.get(sel)
  const free = (workouts ?? []).filter((w) => w.date === sel && !w.blockId)
  const kiteDay = (kites ?? []).filter((k) => k.date === sel)

  const dotsFor = (date: string) => {
    const l = logs.get(date)
    const dots = (dayPlan(plans, date).day?.blocks ?? []).map((b) => ({
      color: KIND[b.kind].color,
      filled: !!l?.blocks[b.id] && l.blocks[b.id].status !== 'skipped',
    }))
    for (const k of kites ?? []) if (k.date === date) dots.push({ color: KIND.kite.color, filled: true })
    for (const w of workouts ?? []) if (w.date === date && !w.blockId) dots.push({ color: KIND.strength.color, filled: true })
    return dots.slice(0, 4)
  }

  return (
    <>
      <div className="header">
        <div>
          <div className="eyebrow">{current?.phase ?? 'Training'}</div>
          <h1 className="title">Train</h1>
        </div>
        <button className="icon-btn" onClick={() => nav.push({ name: 'library' })} aria-label="Exercise library">
          <BookOpen size={19} />
        </button>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="bold">{parseISODate(`${month}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="cal">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="dow">
              {d}
            </div>
          ))}
          {cells.map((c) => (
            <button
              key={c}
              className={[c.slice(0, 7) !== month && 'out', c === todayDate && 'today', c === sel && 'sel'].filter(Boolean).join(' ')}
              onClick={() => setSel(c)}
            >
              {Number(c.slice(8))}
              <span className="dots">
                {dotsFor(c).map((d, i) => (
                  <i key={i} style={d.filled ? { background: d.color } : { border: `1.5px solid ${d.color}` }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {week && (
        <div className="card">
          <div className="eyebrow">
            {week.week} · {week.phase}
          </div>
          <p className="small pre" style={{ marginTop: 6 }}>
            {week.focus}
          </p>
        </div>
      )}

      <div className="h2">{fmtDay(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      {day?.note && (
        <p className="small muted" style={{ margin: '0 4px 8px' }}>
          {day.note}
        </p>
      )}
      {day?.blocks.map((b) => {
        const K = KIND[b.kind]
        return (
          <button key={b.id} className="tl-block" onClick={() => nav.push({ name: 'block', date: sel, blockId: b.id })}>
            <div className="t">{b.time}</div>
            <div className="grow">
              <div className="row" style={{ gap: 6 }}>
                <K.icon size={15} color={K.color} />
                <span className="tiny muted">
                  {K.label} · {fmtDuration(b.durationMin)}
                </span>
              </div>
              <div className="bold" style={{ marginTop: 3 }}>
                {b.title}
              </div>
            </div>
            <StatusDot status={log?.blocks[b.id]?.status} />
          </button>
        )
      })}
      {free.map((w) => (
        <button key={w.id} className="tl-block" onClick={() => nav.push({ name: 'workout', date: sel, logId: w.id })}>
          <div className="t">{fmtClock(w.startedAt)}</div>
          <div className="grow">
            <div className="row" style={{ gap: 6 }}>
              <Dumbbell size={15} />
              <span className="tiny muted">Free workout</span>
            </div>
            <div className="bold" style={{ marginTop: 3 }}>
              {w.title}
            </div>
          </div>
          <StatusDot status={w.endedAt ? 'done' : undefined} />
        </button>
      ))}
      {kiteDay.map((k) => (
        <button key={k.id} className="tl-block" onClick={() => nav.push({ name: 'kiteSession', id: k.id })}>
          <div className="t">
            <Wind size={16} color={KIND.kite.color} />
          </div>
          <div className="grow">
            <div className="bold">{k.spot || 'Kite session'}</div>
            <div className="tiny muted">
              {k.windAvgKn ?? '–'} kn · {k.kiteM ?? '–'} m
            </div>
          </div>
          <StatusDot status="done" />
        </button>
      ))}
      {!day?.blocks.length && !free.length && !kiteDay.length && <div className="empty">Nothing planned.</div>}

      <button className="btn block mt" onClick={() => nav.push({ name: 'workout', date: sel })}>
        <Plus size={18} /> Log a free workout
      </button>
    </>
  )
}
