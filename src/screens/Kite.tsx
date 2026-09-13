import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NumField, Screen, Seg, Sheet, Stat } from '../components/ui'
import { fmtDay, fmtDuration, today } from '../lib/dates'
import { uid } from '../lib/ids'
import { stageIndex, trickStats, type TrickStats } from '../lib/ladder'
import { saveRecord, useKiteLogs, useProfile } from '../lib/store'
import { useNav } from '../nav'
import type { KiteLog } from '../types'

const KITES = [7, 8, 9, 10, 11, 12, 14]

export function Kite() {
  const nav = useNav()
  const profile = useProfile()
  const logs = useKiteLogs()
  const all = logs ?? []
  const stats = (profile?.tricks ?? []).map((t) => ({ t, s: trickStats(t.id, all) }))
  const consistent = stats.filter((x) => stageIndex(x.s.stage) >= stageIndex('Consistent')).length
  const year = String(new Date().getFullYear())
  const season = all.filter((l) => l.date.startsWith(year))
  const hours = season.reduce((a, l) => a + (l.durationMin ?? 0), 0) / 60

  return (
    <>
      <div className="header">
        <div>
          <div className="eyebrow">Trick ladder</div>
          <h1 className="title">Kite</h1>
        </div>
      </div>

      <div className="grid3">
        <Stat label="Consistent" value={`${consistent}/${stats.length}`} />
        <Stat label="Sessions" value={season.length} />
        <Stat label="Hours" value={hours.toFixed(1)} />
      </div>
      <button className="btn primary block mt" onClick={() => nav.push({ name: 'kiteSession' })}>
        <Plus size={18} /> Log session
      </button>

      {profile === null && <div className="empty">Connect your data repo to load your trick list.</div>}
      {(['current', 'new'] as const).map((group) => {
        const rows = stats.filter((x) => x.t.group === group)
        if (!rows.length) return null
        return (
          <div key={group}>
            <div className="h2">{group === 'current' ? 'Make consistent' : 'Next tricks'}</div>
            <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {rows.map((x) => (
                <TrickRow key={x.t.id} name={x.t.name} s={x.s} />
              ))}
            </div>
          </div>
        )
      })}

      <div className="h2">Sessions</div>
      {all.length === 0 && <div className="empty">No sessions yet. Log the next one on the beach, right after you come in.</div>}
      {all.map((l) => {
        const counts = Object.values(l.tricks)
        const tries = counts.reduce((a, c) => a + c.tries, 0)
        const lands = counts.reduce((a, c) => a + c.lands, 0)
        return (
          <button key={l.id} className="card row" onClick={() => nav.push({ name: 'kiteSession', id: l.id })}>
            <div className="grow">
              <div className="bold">{l.spot || 'Session'}</div>
              <div className="small muted">
                {fmtDay(l.date)} · {l.windAvgKn ?? '–'} kn · {l.kiteM ?? '–'} m{l.durationMin ? ` · ${fmtDuration(l.durationMin)}` : ''}
              </div>
            </div>
            <div className="num small muted">
              {lands}/{tries}
            </div>
          </button>
        )
      })}
    </>
  )
}

function TrickRow({ name, s }: { name: string; s: TrickStats }) {
  const idx = stageIndex(s.stage)
  const tone = idx >= 5 ? 'good' : idx >= 4 ? 'accent' : idx >= 2 ? 'warn' : ''
  return (
    <div className="list-row">
      <div className="grow">
        <div className="row between">
          <span className="bold small">{name}</span>
          <span className={`pill ${tone}`}>{s.stage}</span>
        </div>
        <div className="progress" style={{ height: 4, marginTop: 8 }}>
          <i style={{ width: `${(idx / 5) * 100}%` }} />
        </div>
        <div className="tiny muted num" style={{ marginTop: 6 }}>
          {s.tries ? `${Math.round(s.rate * 100)}% of last ${s.tries} · ` : ''}
          {s.totalLands}/{s.totalTries} all time
        </div>
      </div>
    </div>
  )
}

export function KiteSession({ id }: { id?: string }) {
  const nav = useNav()
  const profile = useProfile()
  const logs = useKiteLogs()
  const [log, setLog] = useState<KiteLog>()
  const [crash, setCrash] = useState<{ area?: string; pain: number; note: string }>()

  useEffect(() => {
    if (log || !logs) return
    const existing = id ? logs.find((l) => l.id === id) : undefined
    setLog(
      existing ?? { id: uid('k-'), date: today(), spot: logs[0]?.spot ?? '', kiteM: logs[0]?.kiteM, tricks: {}, crashes: [], updatedAt: '' },
    )
  }, [logs, log, id])

  if (!log || !profile) {
    return (
      <Screen title="Session">
        {profile === null && <div className="empty">Connect your data repo first so your trick list loads.</div>}
      </Screen>
    )
  }

  const spots = [...new Set((logs ?? []).map((l) => l.spot).filter(Boolean))].slice(0, 6)
  // Autosave once there's something worth keeping, so cold hands never lose a session.
  const update = (fn: (l: KiteLog) => void) => {
    const next = structuredClone(log)
    fn(next)
    setLog(next)
    const worthKeeping = Object.keys(next.tricks).length > 0 || next.crashes.length > 0 || !!next.durationMin
    if (worthKeeping || id) void saveRecord('kite', next, false)
  }
  const bump = (trick: string, kind: 'try' | 'land' | 'undo') =>
    update((l) => {
      const c = l.tricks[trick] ?? { tries: 0, lands: 0 }
      if (kind === 'try') c.tries++
      if (kind === 'land') {
        c.tries++
        c.lands++
      }
      if (kind === 'undo' && c.tries > 0) {
        c.tries--
        c.lands = Math.min(c.lands, c.tries)
      }
      l.tricks[trick] = c
    })
  const save = async () => {
    await saveRecord('kite', log, true)
    nav.pop()
  }

  return (
    <Screen title={id ? 'Edit session' : 'New session'}>
      <div className="card stack">
        <div className="grid2">
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={log.date} onChange={(e) => update((l) => void (l.date = e.target.value))} />
          </label>
          <NumField label="Minutes on water" value={log.durationMin} onChange={(v) => update((l) => void (l.durationMin = v))} />
        </div>
        <label className="field">
          <span>Spot</span>
          <input className="input" value={log.spot} placeholder="Where" onChange={(e) => update((l) => void (l.spot = e.target.value))} />
        </label>
        {spots.length > 0 && (
          <div className="chips">
            {spots.map((s) => (
              <button key={s} className={`chip ${s === log.spot ? 'on' : ''}`} onClick={() => update((l) => void (l.spot = s))}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="grid2">
          <NumField label="Wind, knots" value={log.windAvgKn} onChange={(v) => update((l) => void (l.windAvgKn = v))} />
          <NumField label="Gusts, knots" value={log.windGustKn} onChange={(v) => update((l) => void (l.windGustKn = v))} />
        </div>
        <div>
          <div className="small muted" style={{ margin: '0 4px 6px' }}>
            Kite size (m)
          </div>
          <div className="chips">
            {KITES.map((k) => (
              <button key={k} className={`chip ${log.kiteM === k ? 'on' : ''}`} onClick={() => update((l) => void (l.kiteM = k))}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <Seg
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'chop', label: 'Chop' },
            { value: 'waves', label: 'Waves' },
          ]}
          value={log.water}
          onChange={(v) => update((l) => void (l.water = v))}
        />
      </div>

      {(['current', 'new'] as const).map((group) => (
        <div key={group}>
          <div className="h2">{group === 'current' ? 'Make consistent' : 'Next tricks'}</div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {profile.tricks
              .filter((t) => t.group === group)
              .map((t) => {
                const c = log.tricks[t.id] ?? { tries: 0, lands: 0 }
                return (
                  <div key={t.id} className="list-row">
                    <div className="grow">
                      <div className="bold small">{t.name}</div>
                      <div className="tiny muted num">
                        {c.lands}/{c.tries}
                        {c.tries ? ` · ${Math.round((c.lands / c.tries) * 100)}%` : ''}
                      </div>
                    </div>
                    <div className="counter">
                      <button className="undo" onClick={() => bump(t.id, 'undo')} aria-label={`Remove an attempt at ${t.name}`}>
                        −
                      </button>
                      <button onClick={() => bump(t.id, 'try')}>Try</button>
                      <button className="land" onClick={() => bump(t.id, 'land')}>
                        Land
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ))}

      <div className="h2">Crashes</div>
      <div className="card">
        {log.crashes.map((c, i) => (
          <div key={i} className="list-row small">
            <span className="grow">
              {c.area}
              {c.note ? ` · ${c.note}` : ''}
            </span>
            <span className={`pill ${c.pain >= 6 ? 'bad' : c.pain >= 3 ? 'warn' : ''}`}>pain {c.pain}/10</span>
          </div>
        ))}
        <button className="btn sm" onClick={() => setCrash({ pain: 3, note: '' })}>
          <Plus size={16} /> Hard crash
        </button>
      </div>

      <label className="field mt">
        <span>Notes</span>
        <textarea
          className="input"
          value={log.note ?? ''}
          placeholder="What clicked, what didn't"
          onChange={(e) => update((l) => void (l.note = e.target.value))}
        />
      </label>
      <button className="btn primary block mt" onClick={save}>
        Save session
      </button>

      {crash && (
        <Sheet onClose={() => setCrash(undefined)}>
          <div className="bold">Hard crash</div>
          <div className="chips mt">
            {[...profile.sorenessAreas, 'Head / neck'].map((a) => (
              <button key={a} className={`chip ${crash.area === a ? 'on' : ''}`} onClick={() => setCrash({ ...crash, area: a })}>
                {a}
              </button>
            ))}
          </div>
          <div className="small muted mt">Pain {crash.pain}/10</div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={crash.pain}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            onChange={(e) => setCrash({ ...crash, pain: Number(e.target.value) })}
          />
          <input className="input mt" placeholder="What happened" value={crash.note} onChange={(e) => setCrash({ ...crash, note: e.target.value })} />
          <button
            className="btn primary block mt"
            onClick={() => {
              update((l) => void l.crashes.push({ area: crash.area ?? 'Unspecified', pain: crash.pain, note: crash.note || undefined }))
              setCrash(undefined)
            }}
          >
            Add crash
          </button>
        </Sheet>
      )}
    </Screen>
  )
}
