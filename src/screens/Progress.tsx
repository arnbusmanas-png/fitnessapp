import { Plus, Upload } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Bars, LineChart, RangeBar } from '../components/charts'
import { NumField, Scale, Sheet, Stat } from '../components/ui'
import { addDays, fmtDay, mondayOf, today, weekday } from '../lib/dates'
import { exerciseName, useExercises } from '../lib/exercises'
import { useToday } from '../lib/hooks'
import { uid } from '../lib/ids'
import { stageIndex, trickStats } from '../lib/ladder'
import { compliance } from '../lib/plan'
import {
  addUpload,
  saveRecord,
  useBenchmarkLogs,
  useCoach,
  useCrampLogs,
  useDays,
  useKiteLogs,
  useLabs,
  usePlans,
  useProfile,
  useSupplements,
  useUploads,
  useWorkoutLogs,
} from '../lib/store'
import { e1rmHistory } from '../lib/strength'
import { useNav } from '../nav'
import type { BenchmarkDef, BenchmarkGroup, BenchmarkLog } from '../types'

const GROUPS: Record<BenchmarkGroup, string> = {
  bike: 'Bike',
  power: 'Power and jumps',
  strength: 'Strength',
  mobility: 'Mobility',
  body: 'Body',
  lab: 'Lab',
}
const LAB_KIND = { bloods: 'Blood panel', dexa: 'DEXA', vo2max: 'VO2max and lactate', 'bio-age': 'Biological age', other: 'Lab result' }
const gradeTone = (g?: string) => (!g ? '' : g.startsWith('A') ? 'good' : g.startsWith('B') ? 'accent' : g.startsWith('C') ? 'warn' : 'bad')

export function Progress() {
  const todayDate = useToday()
  const nav = useNav()
  const profile = useProfile()
  const days = useDays()
  const bms = useBenchmarkLogs()
  const kites = useKiteLogs()
  const coach = useCoach()
  const plans = usePlans()
  const workouts = useWorkoutLogs()
  const labs = useLabs()
  const supplements = useSupplements()
  const cramps = useCrampLogs()
  const uploads = useUploads()
  const lib = useExercises()
  const [bm, setBm] = useState<BenchmarkDef>()
  const [crampOpen, setCrampOpen] = useState(false)

  const lifts = useMemo(() => {
    const ids = new Set((workouts ?? []).flatMap((w) => w.items.map((i) => i.exerciseId)))
    return [...ids]
      .map((id) => ({ id, hist: e1rmHistory(id, workouts ?? []) }))
      .filter((x) => x.hist.length > 0)
      .sort((a, b) => b.hist.at(-1)!.value - a.hist.at(-1)!.value)
      .slice(0, 6)
  }, [workouts])

  const header = (
    <div className="header">
      <div>
        <div className="eyebrow">Benchmarks and trends</div>
        <h1 className="title">Progress</h1>
      </div>
    </div>
  )
  if (profile === undefined) return header
  if (profile === null) {
    return (
      <>
        {header}
        <div className="empty">Connect your data repo in Settings to see your progress.</div>
      </>
    )
  }

  const allDays = days ?? []
  const weights = allDays.filter((d) => d.morning?.weightKg != null).map((d) => ({ date: d.date, y: d.morning!.weightKg! }))
  const lastWeek = weights.filter((w) => w.date > addDays(todayDate, -7))
  const w7 = lastWeek.length ? lastWeek.reduce((a, w) => a + w.y, 0) / lastWeek.length : weights.at(-1)?.y
  const latest = (id: string) => (bms ?? []).filter((b) => b.benchmarkId === id).at(-1)
  const ftp = latest('ftp')?.value ?? profile.ftpW
  const weight = w7 ?? profile.weightKg
  const consistent = profile.tricks.filter((t) => stageIndex(trickStats(t.id, kites ?? []).stage) >= stageIndex('Consistent')).length
  const byDate = new Map(allDays.map((d) => [d.date, d]))
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayDate, i - 13))
  const card = [...(coach?.reportCards ?? [])].sort((a, b) => b.week.localeCompare(a.week))[0]
  const monday = mondayOf(todayDate)
  const thisWeek = compliance(
    plans,
    allDays,
    Array.from({ length: weekday(todayDate) + 1 }, (_, i) => addDays(monday, i)),
  )

  return (
    <>
      {header}
      <div className="grid2">
        <Stat label="FTP" value={`${ftp} W`} sub={`goal ${profile.goals.ftpW} W`} />
        <Stat label="Weight, 7-day" value={`${weight.toFixed(1)} kg`} sub={`goal ${profile.goals.weightKg} kg`} />
        <Stat label="Watts per kg" value={(ftp / weight).toFixed(2)} sub={`goal ${(profile.goals.ftpW / profile.goals.weightKg).toFixed(2)}`} />
        <Stat label="Tricks consistent" value={`${consistent}/${profile.tricks.length}`} sub="80%+ over 10 tries" />
      </div>

      <div className="h2">Report card</div>
      <div className="card">
        {card ? (
          <>
            <div className="row between">
              <span className="small muted">{card.week}</span>
              {thisWeek.planned > 0 && (
                <span className="pill">
                  this week {thisWeek.done}/{thisWeek.planned}
                </span>
              )}
            </div>
            <div className="grid3 mt" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {Object.entries(card.grades).map(([pillar, g]) => (
                <div key={pillar} style={{ textAlign: 'center' }}>
                  <div className={`pill ${gradeTone(g)}`} style={{ fontSize: 16, fontWeight: 700, padding: '4px 12px' }}>
                    {g}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    {pillar}
                  </div>
                </div>
              ))}
            </div>
            <p className="small mt pre">{card.summary}</p>
          </>
        ) : (
          <div className="small muted">
            The first grades arrive after the Sunday review.
            {thisWeek.planned > 0 && ` This week so far: ${thisWeek.done} of ${thisWeek.planned} sessions done, ${thisWeek.skipped} skipped.`}
          </div>
        )}
      </div>

      <div className="h2">Weight</div>
      <div className="card">
        <LineChart points={weights.slice(-60)} target={profile.goals.weightKg} />
      </div>

      <div className="h2">Recovery and sleep, 14 days</div>
      <div className="card stack">
        <div className="tiny muted">WHOOP recovery</div>
        <Bars values={last14.map((d) => byDate.get(d)?.morning?.recovery)} max={100} goal={67} />
        <div className="tiny muted">Sleep, hours (goal {profile.targets.sleepH})</div>
        <Bars values={last14.map((d) => byDate.get(d)?.morning?.sleepH)} max={9} goal={profile.targets.sleepH} />
      </div>

      {(Object.keys(GROUPS) as BenchmarkGroup[]).map((g) => {
        const defs = profile.benchmarks.filter((b) => b.group === g)
        if (!defs.length) return null
        return (
          <div key={g}>
            <div className="h2">{GROUPS[g]}</div>
            <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {defs.map((d) => {
                const hist = (bms ?? []).filter((b) => b.benchmarkId === d.id)
                const cur = hist.at(-1)
                const prev = hist.at(-2)
                const delta = cur && prev ? cur.value - prev.value : undefined
                const good = delta != null && (d.better === 'higher' ? delta > 0 : delta < 0)
                return (
                  <button key={d.id} className="list-row" onClick={() => setBm(d)}>
                    <div className="grow">
                      <div className="small">{d.name}</div>
                      {d.target != null && (
                        <div className="tiny dim">
                          target {d.target} {d.unit}
                        </div>
                      )}
                    </div>
                    {delta != null && delta !== 0 && (
                      <span className={`pill ${good ? 'good' : 'bad'}`}>
                        {delta > 0 ? '+' : ''}
                        {Math.round(delta * 10) / 10}
                      </span>
                    )}
                    <span className="num bold" style={{ minWidth: 70, textAlign: 'right' }}>
                      {cur ? `${cur.value} ${d.unit}` : '–'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {lifts.length > 0 && (
        <>
          <div className="h2">Top lifts, estimated 1RM</div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {lifts.map((l) => (
              <button key={l.id} className="list-row" onClick={() => nav.push({ name: 'exercise', id: l.id })}>
                <span className="grow small">{exerciseName(lib, l.id)}</span>
                <span className="num bold">{l.hist.at(-1)!.value} kg</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="h2">Labs</div>
      <LabsSection labs={labs?.panels ?? []} uploads={uploads ?? []} />

      {supplements && supplements.items.length > 0 && (
        <>
          <div className="h2">Supplement stack</div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {supplements.items.map((s) => (
              <div key={s.name} className="list-row">
                <div className="grow">
                  <div className="small bold">
                    {s.name} <span className="muted" style={{ fontWeight: 400 }}>· {s.dose}</span>
                  </div>
                  <div className="tiny muted">
                    {s.timing}. {s.why}
                  </div>
                </div>
                <span className={`pill ${s.status === 'take' ? 'accent' : s.status === 'stopped' ? '' : 'warn'}`}>
                  {s.status === 'pending-bloods' ? 'after bloods' : s.status === 'sessions' ? 'key sessions' : s.status}
                </span>
              </div>
            ))}
          </div>
          {supplements.note && <p className="tiny dim" style={{ margin: '8px 4px 0' }}>{supplements.note}</p>}
        </>
      )}

      <div className="h2">Cramp log</div>
      <div className="card">
        {(cramps ?? []).length === 0 && <div className="small muted">No cramps logged. Log every one: when, which muscle, what you'd eaten and drunk.</div>}
        {(cramps ?? []).slice(0, 8).map((c) => (
          <div key={c.id} className="list-row small">
            <span className="grow">
              {fmtDay(c.date)} · {c.muscle} after {c.hoursIn} h
            </span>
            <span className="muted num">
              {c.carbsGPerH ?? '–'} g/h · {c.sodiumMgPerH ?? '–'} mg/h
            </span>
          </div>
        ))}
        <button className="btn sm mt" onClick={() => setCrampOpen(true)}>
          <Plus size={16} /> Log cramp
        </button>
      </div>

      {bm && <BenchmarkSheet def={bm} history={(bms ?? []).filter((b) => b.benchmarkId === bm.id)} onClose={() => setBm(undefined)} />}
      {crampOpen && <CrampSheet onClose={() => setCrampOpen(false)} />}
    </>
  )
}

function LabsSection({ labs, uploads }: { labs: import('../types').LabPanel[]; uploads: { path: string; name: string; dirty: 0 | 1 }[] }) {
  const [err, setErr] = useState('')
  const panels = [...labs].sort((a, b) => b.date.localeCompare(a.date))
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 20 * 1024 * 1024) return setErr('That file is over 20 MB. Export a smaller PDF.')
    setErr('')
    await addUpload(f)
  }
  return (
    <>
      {panels.length === 0 && (
        <div className="card small muted">
          No results yet. Upload a blood panel, DEXA or VO2max report; the coach pulls out the markers on the next review.
        </div>
      )}
      {panels.slice(0, 4).map((p) => (
        <div className="card" key={`${p.date}-${p.kind}`}>
          <div className="row between">
            <div className="bold">{LAB_KIND[p.kind]}</div>
            <span className="small muted">{fmtDay(p.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {p.summary && <p className="small muted mt">{p.summary}</p>}
          {p.markers.map((m) => (
            <div key={m.name} className="list-row" style={{ display: 'block' }}>
              <div className="row between small">
                <span>{m.name}</span>
                <span className="num bold">
                  {m.value} <span className="muted" style={{ fontWeight: 400 }}>{m.unit}</span>
                </span>
              </div>
              {(m.ref || m.optimal) && (
                <div style={{ marginTop: 8 }}>
                  <RangeBar value={m.value} range={m.ref} optimal={m.optimal} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <label className="btn block mt">
        <Upload size={18} /> Upload results
        <input type="file" accept="application/pdf,image/*" hidden onChange={onFile} />
      </label>
      {err && <div className="error">{err}</div>}
      {uploads.length > 0 && (
        <div className="card mt" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {uploads.map((u) => (
            <div className="list-row small" key={u.path}>
              <span className="grow">{u.name}</span>
              <span className={`pill ${u.dirty ? 'warn' : 'good'}`}>{u.dirty ? 'waiting to sync' : 'uploaded'}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function BenchmarkSheet({ def, history, onClose }: { def: BenchmarkDef; history: BenchmarkLog[]; onClose: () => void }) {
  const [value, setValue] = useState<number>()
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    if (value == null) return setErr('Enter a value first.')
    await saveRecord('benchmarks', { id: uid('b-'), date, benchmarkId: def.id, value, note: note.trim() || undefined })
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <div className="bold">{def.name}</div>
      {def.how && <p className="small muted mt">{def.how}</p>}
      {history.length > 1 && (
        <div className="mt">
          <LineChart points={history.map((h) => ({ y: h.value }))} target={def.target} height={90} />
        </div>
      )}
      {history.length > 0 && (
        <div className="tiny muted mt">
          {history
            .slice(-4)
            .map((h) => `${fmtDay(h.date, { day: 'numeric', month: 'short' })}: ${h.value}`)
            .join(' · ')}
        </div>
      )}
      <div className="grid2 mt">
        <NumField label={def.unit} value={value} onChange={(v) => { setValue(v); setErr('') }} decimal />
        <label className="field">
          <span>Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <input className="input mt" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <div className="error">{err}</div>}
      <button className="btn primary block mt" onClick={save}>
        Save result
      </button>
    </Sheet>
  )
}

const MUSCLES = ['Adductors', 'Calves', 'Hamstrings', 'Quads']

function CrampSheet({ onClose }: { onClose: () => void }) {
  const [c, setC] = useState<{ hoursIn?: number; muscle: string; intensity: number; tempC?: number; carbsGPerH?: number; fluidMlPerH?: number; sodiumMgPerH?: number; note: string }>({
    muscle: 'Adductors',
    intensity: 3,
    note: '',
  })
  const [err, setErr] = useState('')
  const save = async () => {
    if (c.hoursIn == null) return setErr('How many hours into the ride?')
    await saveRecord('cramps', { id: uid('c-'), date: today(), ...c, hoursIn: c.hoursIn, note: c.note.trim() || undefined })
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <div className="bold">Log a cramp</div>
      <div className="chips mt">
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${c.muscle === m ? 'on' : ''}`} onClick={() => setC({ ...c, muscle: m })}>
            {m}
          </button>
        ))}
      </div>
      <div className="small muted mt" style={{ margin: '12px 4px 6px' }}>
        How bad
      </div>
      <Scale value={c.intensity} onChange={(v) => setC({ ...c, intensity: v })} labels={['Twinge', 'Locked up']} />
      <div className="grid2 mt">
        <NumField label="Hours in" value={c.hoursIn} decimal onChange={(v) => { setC({ ...c, hoursIn: v }); setErr('') }} />
        <NumField label="Temp °C" value={c.tempC} onChange={(v) => setC({ ...c, tempC: v })} />
      </div>
      <div className="grid3 mt">
        <NumField label="Carbs g/h" value={c.carbsGPerH} onChange={(v) => setC({ ...c, carbsGPerH: v })} />
        <NumField label="Fluid ml/h" value={c.fluidMlPerH} onChange={(v) => setC({ ...c, fluidMlPerH: v })} />
        <NumField label="Sodium mg/h" value={c.sodiumMgPerH} onChange={(v) => setC({ ...c, sodiumMgPerH: v })} />
      </div>
      <input className="input mt" placeholder="Climbing, surging, steady?" value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} />
      {err && <div className="error">{err}</div>}
      <button className="btn primary block mt" onClick={save}>
        Save
      </button>
    </Sheet>
  )
}
