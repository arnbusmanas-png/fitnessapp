import { Flame } from 'lucide-react'
import { useState } from 'react'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { SegmentsChart } from '../components/charts'
import { NumField, Screen, Seg } from '../components/ui'
import { fmtDay, fmtDuration, fmtRest, nowISO } from '../lib/dates'
import { exerciseName, useExercises, type Library } from '../lib/exercises'
import { uid } from '../lib/ids'
import { KIND } from '../lib/kinds'
import { dayPlan, resolveWorkout } from '../lib/plan'
import { adjustment, readiness } from '../lib/readiness'
import { saveRecord, updateDay, useBenchmarkLogs, useDay, usePlans, useProfile, useWorkoutLogs } from '../lib/store'
import { useNav } from '../nav'
import type { BikeSession, BlockLog, BlockStatus, Fuel, PlanBlock, Profile, Segment, Workout } from '../types'

export function BlockScreen({ date, blockId }: { date: string; blockId: string }) {
  const nav = useNav()
  const plans = usePlans()
  const profile = useProfile()
  const day = useDay(date)
  const logs = useWorkoutLogs()
  const lib = useExercises()

  if (plans === undefined || day === undefined) return <Screen>{null}</Screen>
  const { week, day: dp } = dayPlan(plans, date)
  const block = dp?.blocks.find((b) => b.id === blockId)
  if (!block) {
    return (
      <Screen>
        <div className="empty">This session is no longer in the plan.</div>
      </Screen>
    )
  }

  const K = KIND[block.kind]
  const workout = resolveWorkout(week, block.workout)
  const log = day?.blocks[block.id]
  const r = readiness(day?.morning)
  const adj = !log ? adjustment(block, r) : undefined
  const started = logs?.find((l) => l.blockId === block.id && l.date === date)
  const heroId = workout?.hero ?? workout?.items[0]?.exerciseId

  return (
    <Screen title={fmtDay(date)}>
      {heroId && <ExerciseMedia ex={lib?.[heroId]} className="hero" />}
      <div className="row" style={{ gap: 6 }}>
        <K.icon size={15} color={K.color} />
        <span className="small muted">
          {K.label} · {block.time} · {fmtDuration(block.durationMin)}
        </span>
        {block.intensity && <span className="pill">{block.intensity}</span>}
      </div>
      <h1 className="h1">{block.title}</h1>
      {block.detail && <p className="muted pre small">{block.detail}</p>}
      {adj && <div className={`banner mt ${r.zone === 'red' ? 'red' : ''}`}>{adj}</div>}

      {block.bike && <BikeCard bike={block.bike} ftp={profile?.ftpW} durationMin={block.durationMin} />}
      {workout && <WorkoutPreview workout={workout} lib={lib} />}
      {workout && (
        <button className="btn primary block mt" onClick={() => nav.push({ name: 'workout', date, blockId: block.id })}>
          {started ? (started.endedAt ? 'Open workout log' : 'Continue workout') : 'Start workout'}
        </button>
      )}
      {block.tests && profile && <TestLogger date={date} tests={block.tests} profile={profile} />}

      <div className="h2">Log it</div>
      <StatusControls date={date} block={block} current={log} />
    </Screen>
  )
}

const watts = (s: Segment, ftp?: number) => {
  if (s.free) return 'all-out'
  const [a, b] = Array.isArray(s.pct) ? s.pct : [s.pct, s.pct]
  if (!ftp) return a === b ? `${Math.round(a * 100)}%` : `${Math.round(a * 100)}–${Math.round(b * 100)}%`
  return a === b ? `${Math.round(a * ftp)} W` : `${Math.round(a * ftp)}–${Math.round(b * ftp)} W`
}

function BikeCard({ bike, ftp, durationMin }: { bike: BikeSession; ftp?: number; durationMin: number }) {
  const key = bike.segments?.filter((s) => s.label) ?? []
  return (
    <div className="card stack mt">
      {bike.segments && <SegmentsChart segments={bike.segments} />}
      <p className="small pre">{bike.summary}</p>
      {key.length > 0 && (
        <div>
          {key.map((s, i) => (
            <div key={i} className="list-row small">
              <span className="grow">{s.label}</span>
              <span className="muted num">{fmtDuration(s.min)}</span>
              <span className="num bold" style={{ width: 100, textAlign: 'right' }}>
                {watts(s, ftp)}
              </span>
            </div>
          ))}
        </div>
      )}
      {bike.zwo && <div className="tiny dim">In Zwift: Workouts → Custom Workouts. The file is already in your Zwift folder.</div>}
      {bike.fuel && <FuelCard fuel={bike.fuel} minutes={durationMin} />}
    </div>
  )
}

function FuelCard({ fuel, minutes }: { fuel: Fuel; minutes: number }) {
  const h = minutes / 60
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 14 }}>
      <div className="row" style={{ gap: 6 }}>
        <Flame size={15} color="var(--accent)" />
        <span className="bold small">Fuel plan</span>
      </div>
      <div className="grid3 mt">
        <div>
          <div className="big num">{fuel.carbsGPerH}</div>
          <div className="tiny muted">g carbs / h</div>
        </div>
        <div>
          <div className="big num">{fuel.fluidMlPerH}</div>
          <div className="tiny muted">ml fluid / h</div>
        </div>
        <div>
          <div className="big num">{fuel.sodiumMgPerH}</div>
          <div className="tiny muted">mg sodium / h</div>
        </div>
      </div>
      <div className="small muted mt">
        Whole ride: about {Math.round(fuel.carbsGPerH * h)} g carbs, {((fuel.fluidMlPerH * h) / 1000).toFixed(1)} L,{' '}
        {Math.round(fuel.sodiumMgPerH * h)} mg sodium. Eat every 20 minutes from minute 20.
      </div>
      {fuel.notes && <div className="small mt pre">{fuel.notes}</div>}
    </div>
  )
}

function WorkoutPreview({ workout, lib }: { workout: Workout; lib?: Library }) {
  return (
    <>
      {workout.warmup && (
        <>
          <div className="h2">Warm-up</div>
          <p className="small muted pre" style={{ margin: '0 4px' }}>
            {workout.warmup}
          </p>
        </>
      )}
      <div className="h2">{workout.items.length} exercises</div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {workout.items.map((it, i) => (
          <div key={i} className="list-row">
            <div className="thumb">
              <ExerciseMedia ex={lib?.[it.exerciseId]} playing={false} />
            </div>
            <div className="grow">
              <div className="bold small">
                {it.group && (
                  <span className="pill accent" style={{ marginRight: 6 }}>
                    {it.group}
                  </span>
                )}
                {exerciseName(lib, it.exerciseId)}
              </div>
              <div className="small muted">
                {it.sets} × {it.reps}
                {it.load ? ` · ${it.load}` : ''}
                {it.restSec ? ` · rest ${fmtRest(it.restSec)}` : ''}
              </div>
              {it.cue && <div className="tiny dim">{it.cue}</div>}
            </div>
          </div>
        ))}
      </div>
      {workout.cooldown && (
        <>
          <div className="h2">Cool-down</div>
          <p className="small muted pre" style={{ margin: '0 4px' }}>
            {workout.cooldown}
          </p>
        </>
      )}
    </>
  )
}

function TestLogger({ date, tests, profile }: { date: string; tests: string[]; profile: Profile }) {
  const history = useBenchmarkLogs()
  const defs = tests.flatMap((id) => profile.benchmarks.filter((b) => b.id === id))
  const [vals, setVals] = useState<Record<string, number | undefined>>({})
  const [saved, setSaved] = useState(false)
  const save = async () => {
    for (const d of defs) {
      const value = vals[d.id]
      if (value != null) await saveRecord('benchmarks', { id: uid('b-'), date, benchmarkId: d.id, value })
    }
    setSaved(true)
  }
  return (
    <>
      <div className="h2">Test results</div>
      <div className="card stack">
        {defs.map((d) => {
          const prev = history?.filter((h) => h.benchmarkId === d.id).at(-1)
          return (
            <div key={d.id}>
              <NumField
                label={`${d.name} (${d.unit})${prev ? ` · last ${prev.value}` : ''}`}
                value={vals[d.id]}
                decimal
                onChange={(v) => {
                  setSaved(false)
                  setVals((s) => ({ ...s, [d.id]: v }))
                }}
              />
              {d.how && (
                <div className="tiny dim" style={{ margin: '6px 4px 0' }}>
                  {d.how}
                </div>
              )}
            </div>
          )
        })}
        <button className="btn primary block" onClick={save}>
          {saved ? 'Saved' : 'Save results'}
        </button>
      </div>
    </>
  )
}

function StatusControls({ date, block, current }: { date: string; block: PlanBlock; current?: BlockLog }) {
  const nav = useNav()
  const [status, setStatus] = useState<BlockStatus | undefined>(current?.status)
  const [rpe, setRpe] = useState<number | undefined>(current?.rpe)
  const [reason, setReason] = useState(current?.reason ?? '')
  const [err, setErr] = useState('')
  const needsReason = status === 'skipped' || status === 'modified'

  const save = async () => {
    if (!status) return setErr('Pick done, modified or skipped.')
    if (needsReason && reason.trim().length < 3) return setErr(status === 'skipped' ? 'No silent skips. Say why.' : 'Say what changed.')
    await updateDay(date, (d) => {
      d.blocks[block.id] = {
        status,
        rpe: status === 'skipped' ? undefined : rpe,
        reason: needsReason ? reason.trim() : undefined,
        at: nowISO(),
      }
    })
    nav.pop()
  }

  return (
    <div className="card stack">
      <Seg
        options={[
          { value: 'done', label: 'Done' },
          { value: 'modified', label: 'Modified' },
          { value: 'skipped', label: 'Skipped' },
        ]}
        value={status}
        onChange={(v) => {
          setStatus(v)
          setErr('')
        }}
      />
      {status && status !== 'skipped' && (
        <div>
          <div className="small muted" style={{ margin: '0 4px 8px' }}>
            Effort, RPE 1–10
          </div>
          <div className="chips">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`chip ${rpe === n ? 'on' : ''}`} style={{ minWidth: 40, justifyContent: 'center' }} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      {needsReason && (
        <textarea
          className="input"
          value={reason}
          placeholder={status === 'skipped' ? 'Why? No silent skips.' : 'What changed?'}
          onChange={(e) => {
            setReason(e.target.value)
            setErr('')
          }}
        />
      )}
      {err && <div className="error">{err}</div>}
      <button className="btn primary block" onClick={save}>
        Save
      </button>
    </div>
  )
}
