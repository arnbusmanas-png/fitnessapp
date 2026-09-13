// Data contract shared by the app and the private data repo. The coach (Claude) reads and
// writes these shapes directly, so keep docs/DATA_SCHEMA.md in step with any change here.

export type ISODate = string // YYYY-MM-DD, local time

// ---- Coach-owned files (Claude writes, app reads) ----

export type FixedKind = 'ritual' | 'work' | 'meal' | 'trading' | 'family' | 'habit' | 'sleep'
export interface FixedItem {
  time: string
  end?: string
  title: string
  kind: FixedKind
  days?: number[] // 0 = Monday … 6 = Sunday; omitted = every day
  detail?: string
}
export interface HabitDef {
  id: string
  label: string
  detail?: string
}
export interface TrickDef {
  id: string
  name: string
  group: 'current' | 'new'
}
export type BenchmarkGroup = 'bike' | 'power' | 'strength' | 'mobility' | 'body' | 'lab'
export interface BenchmarkDef {
  id: string
  name: string
  unit: string
  better: 'higher' | 'lower'
  group: BenchmarkGroup
  target?: number
  how?: string
}
export interface Profile {
  name: string
  heightCm: number
  weightKg: number
  ftpW: number
  goals: { weightKg: number; ftpW: number; summary: string[] }
  targets: { proteinG: number; waterL: number; sleepH: number; lightsOut: string; wake: string }
  schedule: FixedItem[]
  habits: HabitDef[]
  food: HabitDef[]
  tricks: TrickDef[]
  benchmarks: BenchmarkDef[]
  sorenessAreas: string[]
}

export type BlockKind =
  | 'strength'
  | 'power'
  | 'mobility'
  | 'bike'
  | 'ride'
  | 'kite'
  | 'test'
  | 'recovery'
  | 'ritual'
export type Intensity = 'easy' | 'moderate' | 'hard'

export interface Segment {
  min: number
  pct: number | [number, number] // fraction of FTP; a pair is a ramp
  label?: string
  free?: boolean // all-out / ERG off
}
export interface Fuel {
  carbsGPerH: number
  fluidMlPerH: number
  sodiumMgPerH: number
  notes?: string
}
export interface BikeSession {
  summary: string
  zwo?: string
  segments?: Segment[]
  fuel?: Fuel
  indoor?: boolean
}
export interface WorkoutItem {
  exerciseId: string
  sets: number
  reps: string // "5", "8-10", "30s", "5/side"
  load?: string // "RPE 8", "BW", "+10 kg"
  restSec?: number
  tempo?: string
  cue?: string
  group?: string // superset label
  track?: 'weight' | 'reps' | 'time'
}
export interface Workout {
  hero?: string
  warmup?: string
  cooldown?: string
  items: WorkoutItem[]
}
export interface PlanBlock {
  id: string
  time: string
  durationMin: number
  kind: BlockKind
  title: string
  detail?: string
  intensity?: Intensity
  optional?: boolean
  workout?: Workout | string // string = key into WeekPlan.templates
  bike?: BikeSession
  tests?: string[] // BenchmarkDef ids to log from this block
  lowRecovery?: string // what to do instead when recovery is red
}
export interface DayPlan {
  note?: string
  blocks: PlanBlock[]
}
export interface WeekPlan {
  week: string // 2026-W38
  phase: string
  focus: string
  templates?: Record<string, Workout>
  days: Record<ISODate, DayPlan>
}

export type Pillar = 'Bike' | 'Kite' | 'Strength' | 'Mobility' | 'Sleep' | 'Food' | 'Mind' | 'Habits'
export interface CoachNote {
  id: string
  date: ISODate
  title?: string
  body: string
  tone?: 'praise' | 'warning' | 'info'
}
export interface CoachQuestion {
  id: string
  date: ISODate
  text: string
  closed?: boolean
}
export interface ReportCard {
  week: string
  grades: Partial<Record<Pillar, string>>
  summary: string
}
export interface CoachFeed {
  updatedAt: string
  notes: CoachNote[]
  questions: CoachQuestion[]
  reportCards?: ReportCard[]
}
export interface LabMarker {
  name: string
  value: number
  unit: string
  ref?: [number, number]
  optimal?: [number, number]
}
export interface LabPanel {
  date: ISODate
  source: string
  kind: 'bloods' | 'dexa' | 'vo2max' | 'bio-age' | 'other'
  markers: LabMarker[]
  summary?: string
}
export interface Labs {
  panels: LabPanel[]
}
export interface Supplement {
  name: string
  dose: string
  timing: string
  why: string
  status: 'take' | 'sessions' | 'pending-bloods' | 'stopped'
}
export interface Supplements {
  updatedAt: string
  items: Supplement[]
  note?: string
}

// ---- App-owned logs (app writes under logs/, coach reads) ----

export interface Morning {
  sleepH?: number
  recovery?: number
  hrv?: number
  rhr?: number
  energy?: number
  soreness?: number
  sorenessAreas?: string[]
  weightKg?: number
  bodyFatPct?: number
  at: string
}
export interface Evening {
  habits: Record<string, boolean> // true = held the line (avoided the bad habit)
  food: Record<string, boolean>
  stack?: boolean
  mood?: number
  stress?: number
  win?: string
  lesson?: string
  focus?: string
  at: string
}
export type BlockStatus = 'done' | 'modified' | 'skipped'
export interface BlockLog {
  status: BlockStatus
  reason?: string
  rpe?: number
  note?: string
  at: string
}
export interface DayLog {
  date: ISODate
  morning?: Morning
  evening?: Evening
  blocks: Record<string, BlockLog>
  answers?: Record<string, { text: string; at: string }>
  updatedAt: string
}
export interface SetLog {
  kg?: number
  reps?: number
  sec?: number
  rpe?: number
  done: boolean
}
export interface WorkoutLog {
  id: string
  date: ISODate
  blockId?: string
  title: string
  startedAt: string
  endedAt?: string
  items: { exerciseId: string; sets: SetLog[] }[]
  note?: string
  updatedAt: string
}
export interface KiteLog {
  id: string
  date: ISODate
  spot: string
  windAvgKn?: number
  windGustKn?: number
  kiteM?: number
  water?: 'flat' | 'chop' | 'waves'
  durationMin?: number
  tricks: Record<string, { tries: number; lands: number }>
  crashes: { area: string; pain: number; note?: string }[]
  note?: string
  updatedAt: string
}
export interface BenchmarkLog {
  id: string
  date: ISODate
  benchmarkId: string
  value: number
  note?: string
  updatedAt: string
}
export interface CrampLog {
  id: string
  date: ISODate
  hoursIn: number
  muscle: string
  intensity: number
  tempC?: number
  carbsGPerH?: number
  fluidMlPerH?: number
  sodiumMgPerH?: number
  note?: string
  updatedAt: string
}
