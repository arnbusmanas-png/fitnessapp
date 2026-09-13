const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISODate(new Date())
export const nowISO = () => new Date().toISOString()

export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number) {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 0 = Monday … 6 = Sunday */
export const weekday = (s: string) => (parseISODate(s).getDay() + 6) % 7
export const mondayOf = (s: string) => addDays(s, -weekday(s))

export function isoWeekKey(s: string) {
  const d = parseISODate(s)
  d.setDate(d.getDate() + 3 - weekday(s)) // Thursday decides the ISO year
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const week =
    1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${pad(week)}`
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const hhmm = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`
export const addMinutes = (time: string, mins: number) => hhmm(minutesOf(time) + mins)
export const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export const fmtDay = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseISODate(s).toLocaleDateString('en-GB', opts)

export function fmtDuration(min: number) {
  if (min < 60) return `${min}′`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${pad(m)}` : `${h}h`
}

export const fmtRest = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}:${pad(sec % 60)}` : `${sec}s`)

export const fmtClock = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtSleep(h?: number) {
  if (h == null) return '–'
  const mins = Math.round(h * 60)
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`
}
