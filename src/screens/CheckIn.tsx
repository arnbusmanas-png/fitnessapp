import { useEffect, useState } from 'react'
import { NumField, Scale, Screen, Tick } from '../components/ui'
import { fmtDay, nowISO } from '../lib/dates'
import { updateDay, useDay, useProfile, useSupplements } from '../lib/store'
import { useNav } from '../nav'
import type { Evening, Morning } from '../types'

const round = (n: number) => Math.round(n * 1000) / 1000

export function MorningCheckIn({ date }: { date: string }) {
  const nav = useNav()
  const day = useDay(date)
  const profile = useProfile()
  const [m, setM] = useState<Morning>()

  useEffect(() => {
    if (!m && day !== undefined) setM(day?.morning ?? { at: '' })
  }, [day, m])

  if (!m) return <Screen title="Morning">{null}</Screen>

  const set = (patch: Partial<Morning>) => setM({ ...m, ...patch })
  const hours = m.sleepH != null ? Math.floor(m.sleepH) : undefined
  const mins = m.sleepH != null ? Math.round((m.sleepH - Math.floor(m.sleepH)) * 60) : undefined
  const areas = profile?.sorenessAreas ?? []
  const save = async () => {
    await updateDay(date, (d) => {
      d.morning = { ...m, at: nowISO() }
    })
    nav.pop()
  }

  return (
    <Screen title={fmtDay(date)}>
      <h1 className="h1">Morning check-in</h1>
      <p className="muted small">Numbers straight from WHOOP. Honest answers only.</p>

      <div className="h2">Sleep and recovery</div>
      <div className="card stack">
        <div className="grid2">
          <NumField label="Sleep, hours" value={hours} onChange={(h) => set({ sleepH: h == null ? undefined : round(h + (mins ?? 0) / 60) })} />
          <NumField label="Minutes" value={mins} onChange={(mm) => set({ sleepH: round((hours ?? 0) + (mm ?? 0) / 60) })} />
        </div>
        <div className="grid3">
          <NumField label="Recovery %" value={m.recovery} onChange={(v) => set({ recovery: v })} />
          <NumField label="HRV ms" value={m.hrv} onChange={(v) => set({ hrv: v })} />
          <NumField label="RHR bpm" value={m.rhr} onChange={(v) => set({ rhr: v })} />
        </div>
      </div>

      <div className="h2">How you feel</div>
      <div className="card stack">
        <div>
          <div className="small muted" style={{ margin: '0 4px 6px' }}>
            Energy
          </div>
          <Scale value={m.energy} onChange={(v) => set({ energy: v })} labels={['Empty', 'Flying']} />
        </div>
        <div>
          <div className="small muted" style={{ margin: '0 4px 6px' }}>
            Soreness
          </div>
          <Scale value={m.soreness} onChange={(v) => set({ soreness: v })} labels={['Fresh', 'Wrecked']} />
        </div>
        {(m.soreness ?? 0) >= 3 && areas.length > 0 && (
          <div className="chips">
            {areas.map((a) => {
              const on = m.sorenessAreas?.includes(a) ?? false
              return (
                <button
                  key={a}
                  className={`chip ${on ? 'on' : ''}`}
                  onClick={() =>
                    set({ sorenessAreas: on ? m.sorenessAreas?.filter((x) => x !== a) : [...(m.sorenessAreas ?? []), a] })
                  }
                >
                  {a}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="h2">Body</div>
      <div className="card grid2">
        <NumField label="Weight kg" value={m.weightKg} onChange={(v) => set({ weightKg: v })} decimal />
        <NumField label="Body fat %" value={m.bodyFatPct} onChange={(v) => set({ bodyFatPct: v })} decimal placeholder="optional" />
      </div>

      <button className="btn primary block mt" onClick={save}>
        Save check-in
      </button>
    </Screen>
  )
}

export function EveningCheckIn({ date }: { date: string }) {
  const nav = useNav()
  const day = useDay(date)
  const profile = useProfile()
  const supplements = useSupplements()
  const [ev, setEv] = useState<Evening>()

  useEffect(() => {
    if (!ev && day !== undefined) setEv(day?.evening ?? { habits: {}, food: {}, at: '' })
  }, [day, ev])

  if (profile === null) {
    return (
      <Screen title="Evening">
        <div className="empty">Connect your data repo first. Your habits and food targets come from your profile.</div>
      </Screen>
    )
  }
  if (!ev || !profile) return <Screen title="Evening">{null}</Screen>

  const set = (patch: Partial<Evening>) => setEv({ ...ev, ...patch })
  const hasStack = supplements?.items.some((s) => s.status === 'take') ?? false
  const save = async () => {
    await updateDay(date, (d) => {
      d.evening = { ...ev, at: nowISO() }
    })
    nav.pop()
  }

  return (
    <Screen title={fmtDay(date)}>
      <h1 className="h1">Evening check-in</h1>
      <p className="muted small">Tick what you held today. No one sees this but you and the coach.</p>

      <div className="h2">Habits</div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {profile.habits.map((h) => (
          <button key={h.id} className="toggle-row" onClick={() => set({ habits: { ...ev.habits, [h.id]: !ev.habits[h.id] } })}>
            <Tick on={!!ev.habits[h.id]} />
            <div className="grow">
              <div>{h.label}</div>
              {h.detail && <div className="tiny muted">{h.detail}</div>}
            </div>
          </button>
        ))}
        {hasStack && (
          <button className="toggle-row" onClick={() => set({ stack: !ev.stack })}>
            <Tick on={!!ev.stack} />
            <div className="grow">Supplement stack taken</div>
          </button>
        )}
      </div>

      <div className="h2">Clean day</div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {profile.food.map((f) => (
          <button key={f.id} className="toggle-row" onClick={() => set({ food: { ...ev.food, [f.id]: !ev.food[f.id] } })}>
            <Tick on={!!ev.food[f.id]} />
            <div className="grow">
              <div>{f.label}</div>
              {f.detail && <div className="tiny muted">{f.detail}</div>}
            </div>
          </button>
        ))}
      </div>

      <div className="h2">Mind</div>
      <div className="card stack">
        <div>
          <div className="small muted" style={{ margin: '0 4px 6px' }}>
            Mood
          </div>
          <Scale value={ev.mood} onChange={(v) => set({ mood: v })} labels={['Low', 'Great']} />
        </div>
        <div>
          <div className="small muted" style={{ margin: '0 4px 6px' }}>
            Stress
          </div>
          <Scale value={ev.stress} onChange={(v) => set({ stress: v })} labels={['Calm', 'Maxed']} />
        </div>
        <label className="field">
          <span>Win of the day</span>
          <input className="input" value={ev.win ?? ''} onChange={(e) => set({ win: e.target.value })} />
        </label>
        <label className="field">
          <span>Lesson</span>
          <input className="input" value={ev.lesson ?? ''} onChange={(e) => set({ lesson: e.target.value })} />
        </label>
        <label className="field">
          <span>Tomorrow's one focus</span>
          <input className="input" value={ev.focus ?? ''} onChange={(e) => set({ focus: e.target.value })} />
        </label>
      </div>

      <button className="btn primary block mt" onClick={save}>
        Save check-in
      </button>
    </Screen>
  )
}
