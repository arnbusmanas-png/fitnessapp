import { ChevronRight, CircleAlert, CloudOff, MessageCircle, Moon, RefreshCw, Settings as Gear, SunMedium } from 'lucide-react'
import { useState } from 'react'
import { Ring, StatusDot } from '../components/ui'
import { fmtDay, fmtDuration, fmtSleep, minutesOf, nowISO } from '../lib/dates'
import { useNowMinutes, useToday } from '../lib/hooks'
import { KIND } from '../lib/kinds'
import { dayPlan, timeline } from '../lib/plan'
import { adjustment, readiness, type Readiness } from '../lib/readiness'
import { updateDay, useCoach, useDay, useDays, usePlans, useProfile, useSyncState } from '../lib/store'
import { syncNow } from '../lib/sync'
import { useNav } from '../nav'
import type { BlockLog, CoachNote, CoachQuestion, DayLog, FixedItem, Morning, PlanBlock, Profile } from '../types'

const ZONE_LABEL = { green: 'Ready to push', yellow: 'Train smart', red: 'Recover today', unknown: 'Checked in' }

export function Today() {
  const date = useToday()
  const now = useNowMinutes()
  const nav = useNav()
  const profile = useProfile()
  const plans = usePlans()
  const day = useDay(date)
  const coach = useCoach()
  const days = useDays()

  const { week, day: dp } = dayPlan(plans, date)
  const r = readiness(day?.morning)
  const answered = new Set((days ?? []).flatMap((d) => Object.keys(d.answers ?? {})))
  const questions = (coach?.questions ?? []).filter((q) => !q.closed && !answered.has(q.id))
  const note = [...(coach?.notes ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  const rows = timeline(profile ?? undefined, dp, date)

  return (
    <>
      <div className="header">
        <div>
          <div className="eyebrow">{fmtDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="title">Today</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <SyncButton />
          <button className="icon-btn" onClick={() => nav.push({ name: 'settings' })} aria-label="Settings">
            <Gear size={19} />
          </button>
        </div>
      </div>

      {profile === null && <ConnectCard />}
      <ReadinessCard date={date} m={day?.morning} r={r} />
      {note && <CoachNoteCard note={note} />}
      {/* One question at a time keeps Today calm; the next appears once this one is answered. */}
      {questions[0] && <QuestionCard key={questions[0].id} q={questions[0]} date={date} more={questions.length - 1} />}

      <div className="h2">{week ? week.phase : 'Plan'}</div>
      {dp?.note && (
        <p className="small muted" style={{ margin: '0 4px 8px' }}>
          {dp.note}
        </p>
      )}
      {!dp && profile && <div className="empty">No plan for today yet. The coach writes the coming days in the daily review.</div>}
      {rows.map((row) =>
        row.block ? (
          <BlockRow key={row.key} block={row.block} log={day?.blocks[row.block.id]} date={date} now={now} r={r} />
        ) : (
          <FixedRow key={row.key} item={row.fixed!} />
        ),
      )}

      <EveningCard date={date} day={day} profile={profile} />
    </>
  )
}

function SyncButton() {
  const s = useSyncState()
  if (s.status === 'unconfigured') return null
  const icon =
    s.status === 'syncing' ? (
      <RefreshCw size={17} className="spin" />
    ) : s.status === 'error' ? (
      <CircleAlert size={18} color="var(--bad)" />
    ) : s.status === 'offline' ? (
      <CloudOff size={18} color="var(--dim)" />
    ) : (
      <RefreshCw size={17} color="var(--dim)" />
    )
  return (
    <button className="icon-btn" onClick={() => void syncNow()} aria-label={`Sync, ${s.status}`}>
      {icon}
    </button>
  )
}

function ConnectCard() {
  const nav = useNav()
  const s = useSyncState()
  if (s.status === 'syncing') return <div className="card small muted">Syncing with your data repo…</div>
  const problem = s.status === 'error'
  return (
    <button className="card cta" onClick={() => nav.push({ name: 'settings' })}>
      <div className="grow">
        <div className="bold">{problem ? 'Sync problem' : 'Connect your data repo'}</div>
        <div className="small muted">
          {problem
            ? s.message
            : 'Your plan, coach notes and logs live in a private GitHub repo. Add an access key once to start.'}
        </div>
      </div>
      <ChevronRight size={18} color="var(--dim)" />
    </button>
  )
}

function ReadinessCard({ date, m, r }: { date: string; m?: Morning; r: Readiness }) {
  const nav = useNav()
  const open = () => nav.push({ name: 'checkin', kind: 'morning', date })
  if (!m) {
    return (
      <button className="card cta" onClick={open}>
        <Ring size={54} stroke={6}>
          <SunMedium size={21} color="var(--accent)" />
        </Ring>
        <div className="grow">
          <div className="bold">Morning check-in</div>
          <div className="small muted">30 seconds: sleep, WHOOP, energy, weight.</div>
        </div>
        <ChevronRight size={18} color="var(--dim)" />
      </button>
    )
  }
  const color = r.zone === 'red' ? 'var(--bad)' : r.zone === 'yellow' ? 'var(--warn)' : 'var(--accent)'
  return (
    <button className="card cta" onClick={open}>
      <Ring value={m.recovery ?? r.score} size={70} color={color}>
        {m.recovery ?? '–'}
      </Ring>
      <div className="grow">
        <div className="bold">{ZONE_LABEL[r.zone]}</div>
        <div className="small muted num">
          HRV {m.hrv ?? '–'} · RHR {m.rhr ?? '–'} · Sleep {fmtSleep(m.sleepH)}
        </div>
        <div className="small muted num">
          {m.weightKg ? `${m.weightKg} kg · ` : ''}Energy {m.energy ?? '–'}/5 · Sore {m.soreness ?? '–'}/5
        </div>
        {r.reasons.length > 0 && (
          <div className="tiny" style={{ color, marginTop: 4 }}>
            {r.reasons.join(' · ')}
          </div>
        )}
      </div>
    </button>
  )
}

function CoachNoteCard({ note }: { note: CoachNote }) {
  const [open, setOpen] = useState(false)
  const long = note.body.length > 320
  return (
    <div className="card coach">
      <div className="who">
        <MessageCircle size={14} />
        Coach · {fmtDay(note.date)}
      </div>
      {note.title && (
        <div className="bold" style={{ marginBottom: 4 }}>
          {note.title}
        </div>
      )}
      <p
        className="small pre"
        style={!open && long ? { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        {note.body}
      </p>
      {long && (
        <button className="small accent mt" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Read all'}
        </button>
      )}
    </div>
  )
}

function QuestionCard({ q, date, more }: { q: CoachQuestion; date: string; more: number }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const send = async () => {
    if (text.trim().length < 2) {
      setErr('Write an answer first.')
      return
    }
    await updateDay(date, (d) => {
      d.answers = { ...d.answers, [q.id]: { text: text.trim(), at: nowISO() } }
    })
  }
  return (
    <div className="card coach stack">
      <div className="who" style={{ marginBottom: 0 }}>
        <MessageCircle size={14} />
        Coach asks
        {more > 0 && <span className="muted" style={{ fontWeight: 400, marginLeft: 'auto' }}>{more} more after this</span>}
      </div>
      <p>{q.text}</p>
      <textarea
        className="input"
        rows={2}
        value={text}
        placeholder="Your answer"
        onChange={(e) => {
          setText(e.target.value)
          setErr('')
        }}
      />
      {err && <div className="error">{err}</div>}
      <button className="btn sm primary" onClick={send}>
        Send answer
      </button>
    </div>
  )
}

function BlockRow({ block, log, date, now, r }: { block: PlanBlock; log?: BlockLog; date: string; now: number; r: Readiness }) {
  const nav = useNav()
  const K = KIND[block.kind]
  const start = minutesOf(block.time)
  const isNow = now >= start && now < start + block.durationMin
  const adj = !log ? adjustment(block, r) : undefined
  return (
    <button
      className={`tl-block ${isNow && !log ? 'now' : ''} ${log ? 'logged' : ''}`}
      onClick={() => nav.push({ name: 'block', date, blockId: block.id })}
    >
      <div className="t">{block.time}</div>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <K.icon size={15} color={K.color} />
          <span className="tiny muted">
            {K.label} · {fmtDuration(block.durationMin)}
          </span>
          {block.optional && <span className="pill">optional</span>}
        </div>
        <div className="bold" style={{ marginTop: 3 }}>
          {block.title}
        </div>
        {block.detail && <div className="small muted clamp2">{block.detail}</div>}
        {adj && (
          <div className="small" style={{ color: r.zone === 'red' ? 'var(--bad)' : 'var(--warn)', marginTop: 6 }}>
            {adj}
          </div>
        )}
      </div>
      <StatusDot status={log?.status} />
    </button>
  )
}

function FixedRow({ item }: { item: FixedItem }) {
  return (
    <div className="tl-fixed">
      <span className="t">{item.time}</span>
      <span className="grow">{item.title}</span>
      {item.kind === 'trading' && <span className="pill">protected</span>}
    </div>
  )
}

function EveningCard({ date, day, profile }: { date: string; day?: DayLog | null; profile?: Profile | null }) {
  const nav = useNav()
  const ev = day?.evening
  const open = () => nav.push({ name: 'checkin', kind: 'evening', date })
  if (ev && profile) {
    const habits = profile.habits.filter((h) => ev.habits[h.id]).length
    const food = profile.food.filter((f) => ev.food[f.id]).length
    return (
      <button className="card cta mt" onClick={open}>
        <Moon size={20} color="var(--accent)" />
        <div className="grow">
          <div className="bold">Evening done</div>
          <div className="small muted">
            Habits {habits}/{profile.habits.length} · Food {food}/{profile.food.length}
            {ev.focus ? ` · Tomorrow: ${ev.focus}` : ''}
          </div>
        </div>
      </button>
    )
  }
  return (
    <button className="card cta mt" onClick={open}>
      <Moon size={20} color="var(--dim)" />
      <div className="grow">
        <div className="bold">Evening check-in</div>
        <div className="small muted">60 seconds: habits, food, three lines of journal.</div>
      </div>
      <ChevronRight size={18} color="var(--dim)" />
    </button>
  )
}
