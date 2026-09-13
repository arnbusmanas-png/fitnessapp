import { Check, Plus, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { NumInput, Screen, Sheet, Stat } from '../components/ui'
import { fmtRest, nowISO } from '../lib/dates'
import { exerciseName, useExercises, type Library } from '../lib/exercises'
import { useClock } from '../lib/hooks'
import { uid } from '../lib/ids'
import { dayPlan, resolveWorkout } from '../lib/plan'
import { saveRecord, updateDay, usePlans, useWorkoutLogs } from '../lib/store'
import { lastSets, summarize, type Summary } from '../lib/strength'
import { useNav } from '../nav'
import type { SetLog, WorkoutItem, WorkoutLog } from '../types'
import { ExerciseInfo } from './Library'

type Col = 'kg' | 'reps' | 'sec' | 'rpe'
const trackOf = (p?: WorkoutItem) => p?.track ?? (/\d\s*s\b/.test(p?.reps ?? '') ? 'time' : 'weight')
const COLS: Record<string, Col[]> = { weight: ['kg', 'reps', 'rpe'], reps: ['reps', 'rpe'], time: ['sec', 'rpe'] }
const firstNum = (s?: string) => {
  const m = s?.match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : undefined
}
const fmtSet = (s: SetLog) => (s.sec ? `${s.sec}s` : s.kg ? `${s.kg}×${s.reps ?? '?'}` : `${s.reps ?? '?'}`)

export function WorkoutScreen({ date, blockId, logId }: { date: string; blockId?: string; logId?: string }) {
  const nav = useNav()
  const plans = usePlans()
  const lib = useExercises()
  const history = useWorkoutLogs()
  const clock = useClock(1000)
  const [log, setLog] = useState<WorkoutLog>()
  const [rest, setRest] = useState<{ until: number; total: number }>()
  const [adding, setAdding] = useState(false)
  const [info, setInfo] = useState<string>()
  const [summary, setSummary] = useState<Summary>()

  const { week, day } = dayPlan(plans, date)
  const block = blockId ? day?.blocks.find((b) => b.id === blockId) : undefined
  const workout = resolveWorkout(week, block?.workout)

  useEffect(() => {
    if (log || !history || plans === undefined) return
    const existing = history.find((l) => (logId ? l.id === logId : !!blockId && l.blockId === blockId && l.date === date))
    if (existing) {
      setLog(existing)
      return
    }
    setLog({
      id: uid('w-'),
      date,
      blockId,
      title: block?.title ?? 'Free workout',
      startedAt: nowISO(),
      items: (workout?.items ?? []).map((it) => ({
        exerciseId: it.exerciseId,
        sets: Array.from({ length: it.sets }, () => ({ done: false })),
      })),
      updatedAt: nowISO(),
    })
  }, [log, history, plans, logId, blockId, date, block, workout])

  const remaining = rest ? Math.max(0, Math.ceil((rest.until - clock) / 1000)) : 0
  useEffect(() => {
    if (!rest || remaining > 0) return
    const t = setTimeout(() => setRest(undefined), 4000)
    return () => clearTimeout(t)
  }, [rest, remaining])

  if (!log) return <Screen title="Workout">{null}</Screen>

  const presc = (i: number) =>
    workout && i < workout.items.length && workout.items[i].exerciseId === log.items[i].exerciseId ? workout.items[i] : undefined

  const persist = (next: WorkoutLog, sync = false) => {
    setLog(next)
    void saveRecord('workouts', next, sync)
  }

  const placeholder = (i: number, j: number): SetLog => {
    const last = lastSets(log.items[i].exerciseId, history ?? [], log.id)
    const ref = last?.[j] ?? last?.[last.length - 1]
    const p = presc(i)
    const time = trackOf(p) === 'time'
    return {
      done: false,
      kg: ref?.kg,
      reps: ref?.reps ?? (time ? undefined : firstNum(p?.reps)),
      sec: ref?.sec ?? (time ? firstNum(p?.reps) : undefined),
    }
  }

  const edit = (i: number, j: number, patch: Partial<SetLog>) => {
    const next = structuredClone(log)
    Object.assign(next.items[i].sets[j], patch)
    persist(next)
  }

  const toggle = (i: number, j: number) => {
    const next = structuredClone(log)
    const s = next.items[i].sets[j]
    if (s.done) {
      s.done = false
    } else {
      const ph = placeholder(i, j)
      s.kg ??= ph.kg
      s.reps ??= ph.reps
      s.sec ??= ph.sec
      s.done = true
      const secs = presc(i)?.restSec ?? 90
      setRest({ until: Date.now() + secs * 1000, total: secs })
    }
    persist(next)
  }

  const addSet = (i: number) => {
    const next = structuredClone(log)
    next.items[i].sets.push({ done: false })
    persist(next)
  }

  const addExercise = (exerciseId: string) => {
    const next = structuredClone(log)
    next.items.push({ exerciseId, sets: [{ done: false }, { done: false }, { done: false }] })
    persist(next)
    setAdding(false)
  }

  const finish = async () => {
    const next = { ...log, endedAt: nowISO() }
    persist(next, true)
    if (blockId) {
      await updateDay(date, (d) => {
        d.blocks[blockId] = { ...d.blocks[blockId], status: d.blocks[blockId]?.status ?? 'done', at: nowISO() }
      })
    }
    setSummary(summarize(next, history ?? []))
  }

  const close = () => {
    void saveRecord('workouts', log, true)
    nav.pop()
  }

  const total = log.items.reduce((a, it) => a + it.sets.length, 0)
  const done = log.items.reduce((a, it) => a + it.sets.filter((s) => s.done).length, 0)
  const elapsed = Math.max(0, Math.floor((clock - Date.parse(log.startedAt)) / 60000))

  return (
    <Screen
      className={rest ? 'resting' : ''}
      footer={
        rest && (
          <RestBar
            remaining={remaining}
            total={rest.total}
            onSkip={() => setRest(undefined)}
            onAdd={() => setRest((r) => r && { until: Math.max(r.until, Date.now()) + 15000, total: r.total + 15 })}
          />
        )
      }
    >
      <div className="eyebrow num">
        {log.endedAt ? 'Completed' : `${elapsed} min`} · {done}/{total} sets
      </div>
      <h1 className="h1">{log.title}</h1>
      <div className="progress" style={{ margin: '10px 0 16px' }}>
        <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      {log.items.map((item, i) => {
        const p = presc(i)
        const cols = COLS[trackOf(p)]
        const last = lastSets(item.exerciseId, history ?? [], log.id)
        return (
          <div key={i} className="card">
            <div className="row top">
              <button className="thumb" onClick={() => setInfo(item.exerciseId)} aria-label="How to do this exercise">
                <ExerciseMedia ex={lib?.[item.exerciseId]} />
              </button>
              <div className="grow">
                <div className="bold">
                  {p?.group && (
                    <span className="pill accent" style={{ marginRight: 6 }}>
                      {p.group}
                    </span>
                  )}
                  {exerciseName(lib, item.exerciseId)}
                </div>
                {p && (
                  <div className="small muted">
                    {p.sets} × {p.reps}
                    {p.load ? ` · ${p.load}` : ''}
                    {p.restSec ? ` · rest ${fmtRest(p.restSec)}` : ''}
                    {p.tempo ? ` · tempo ${p.tempo}` : ''}
                  </div>
                )}
                {p?.cue && <div className="tiny dim" style={{ marginTop: 2 }}>{p.cue}</div>}
                {last && <div className="tiny dim" style={{ marginTop: 2 }}>Last time: {last.map(fmtSet).join(' · ')}</div>}
              </div>
            </div>
            <table className="sets">
              <thead>
                <tr>
                  <th>SET</th>
                  {cols.map((c) => (
                    <th key={c}>{c.toUpperCase()}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {item.sets.map((s, j) => {
                  const ph = placeholder(i, j)
                  return (
                    <tr key={j} className={s.done ? 'done' : ''}>
                      <td>{j + 1}</td>
                      {cols.map((c) => (
                        <td key={c}>
                          <NumInput
                            className="cell"
                            decimal={c === 'kg'}
                            value={s[c]}
                            placeholder={ph[c]?.toString() ?? '–'}
                            ariaLabel={`${c} for set ${j + 1}`}
                            onChange={(v) => edit(i, j, { [c]: v } as Partial<SetLog>)}
                          />
                        </td>
                      ))}
                      <td>
                        <button className={`check ${s.done ? 'on' : ''}`} onClick={() => toggle(i, j)} aria-label={`Complete set ${j + 1}`}>
                          <Check size={20} strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button className="btn ghost sm" onClick={() => addSet(i)}>
              <Plus size={16} /> Set
            </button>
          </div>
        )
      })}

      <button className="btn block mt" onClick={() => setAdding(true)}>
        <Plus size={18} /> Add exercise
      </button>
      {log.endedAt ? (
        <button className="btn primary block mt" onClick={close}>
          Close
        </button>
      ) : (
        <button className="btn primary block mt" onClick={finish}>
          Finish workout
        </button>
      )}

      {adding && <AddExercise lib={lib} onPick={addExercise} onClose={() => setAdding(false)} />}
      {info && (
        <Sheet onClose={() => setInfo(undefined)}>
          <ExerciseInfo id={info} />
        </Sheet>
      )}
      {summary && <SummarySheet summary={summary} lib={lib} onClose={nav.pop} />}
    </Screen>
  )
}

function RestBar({ remaining, total, onSkip, onAdd }: { remaining: number; total: number; onSkip: () => void; onAdd: () => void }) {
  return (
    <div className="restbar">
      <div className="inner">
        <div className="row between">
          <button className="btn sm" onClick={onSkip}>
            Skip
          </button>
          <div className="big num" style={{ color: remaining === 0 ? 'var(--accent)' : undefined }}>
            {remaining === 0 ? 'Go' : fmtRest(remaining)}
          </div>
          <button className="btn sm" onClick={onAdd}>
            +15s
          </button>
        </div>
        <div className="progress mt">
          <i style={{ width: `${total ? (1 - remaining / total) * 100 : 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function AddExercise({ lib, onPick, onClose }: { lib?: Library; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!lib || needle.length < 2) return []
    return Object.values(lib)
      .filter((e) => e.name.toLowerCase().includes(needle))
      .slice(0, 30)
  }, [lib, q])
  return (
    <Sheet onClose={onClose}>
      <input className="input" autoFocus placeholder="Search, e.g. deadlift" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt">
        {list.map((e) => (
          <button key={e.id} className="list-row" onClick={() => onPick(e.id)}>
            <div className="thumb" style={{ width: 56 }}>
              <ExerciseMedia ex={e} playing={false} />
            </div>
            <div className="grow small">{e.name}</div>
          </button>
        ))}
        {q.trim().length >= 2 && list.length === 0 && <div className="empty">No match.</div>}
      </div>
    </Sheet>
  )
}

function SummarySheet({ summary, lib, onClose }: { summary: Summary; lib?: Library; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ gap: 8 }}>
        <Trophy size={20} color="var(--accent)" />
        <div className="bold">Session complete</div>
      </div>
      <div className="grid3 mt">
        <Stat label="Time" value={`${summary.minutes}′`} />
        <Stat label="Volume" value={`${summary.volumeKg.toLocaleString('en-GB')}`} sub="kg" />
        <Stat label="Sets" value={summary.sets} />
      </div>
      {summary.prs.length > 0 ? (
        <div className="card mt">
          <div className="small bold accent">New personal records</div>
          {summary.prs.map((p) => (
            <div className="list-row small" key={p.exerciseId}>
              <span className="grow">{exerciseName(lib, p.exerciseId)}</span>
              <span className="num">e1RM {p.e1rm} kg</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted mt">No new records today. Keep stacking sessions and they'll come.</p>
      )}
      <button className="btn primary block mt" onClick={onClose}>
        Done
      </button>
    </Sheet>
  )
}
