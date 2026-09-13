import type { Segment } from '../types'

const W = 320

export function LineChart({ points, target, height = 110 }: { points: { y: number }[]; target?: number; height?: number }) {
  if (points.length < 2) return <div className="empty">Log a few more days to see the trend.</div>
  const pad = 8
  const ys = points.map((p) => p.y).concat(target != null ? [target] : [])
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const span = max - min || 1
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('')
  const lastP = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      {target != null && (
        <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--accent)" strokeDasharray="4 5" strokeWidth={1.2} opacity={0.7} />
      )}
      <path d={d} fill="none" stroke="var(--text)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(lastP.y)} r={4.5} fill="var(--accent)" />
    </svg>
  )
}

export function Bars({
  values,
  max,
  height = 56,
  goal,
}: {
  values: (number | undefined)[]
  max: number
  height?: number
  goal?: number
}) {
  const n = values.length
  const gap = 4
  const bw = (W - gap * (n - 1)) / n
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      {values.map((v, i) => {
        const h = v == null ? 3 : Math.max(3, (Math.min(v, max) / max) * height)
        const hit = goal != null && v != null && v >= goal
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            rx={3}
            fill={v == null ? 'var(--surface-2)' : hit ? 'var(--accent)' : 'var(--surface-3)'}
          />
        )
      })}
      {goal != null && (
        <line x1={0} x2={W} y1={height - (goal / max) * height} y2={height - (goal / max) * height} stroke="var(--dim)" strokeDasharray="3 4" />
      )}
    </svg>
  )
}

const zoneColor = (pct: number, free?: boolean) =>
  free || pct >= 1.06 ? 'var(--accent)' : pct >= 0.88 ? 'color-mix(in srgb, var(--accent) 70%, var(--text))' : pct >= 0.76 ? 'var(--muted)' : 'var(--surface-3)'

/** Zwift-style workout profile: width = time, height = % of FTP. */
export function SegmentsChart({ segments, height = 70 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((a, s) => a + s.min, 0) || 1
  const top = 1.6
  const yOf = (p: number) => height - (Math.min(p, top) / top) * height
  let x = 0
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      {segments.map((s, i) => {
        const w = (s.min / total) * W
        const [a, b] = Array.isArray(s.pct) ? s.pct : [s.pct, s.pct]
        const pa = s.free ? 1.5 : a
        const pb = s.free ? 1.5 : b
        const x0 = x
        x += w
        return (
          <polygon
            key={i}
            points={`${x0},${height} ${x0},${yOf(pa)} ${x0 + w},${yOf(pb)} ${x0 + w},${height}`}
            fill={zoneColor(Math.max(pa, pb), s.free)}
            stroke="var(--surface)"
            strokeWidth={0.6}
          />
        )
      })}
    </svg>
  )
}

/** A marker against reference and optimal ranges, for lab values. */
export function RangeBar({ value, range, optimal }: { value: number; range?: [number, number]; optimal?: [number, number] }) {
  const ref = range
  const lo = Math.min(value, ref?.[0] ?? value, optimal?.[0] ?? value)
  const hi = Math.max(value, ref?.[1] ?? value, optimal?.[1] ?? value)
  const pad = (hi - lo) * 0.15 || 1
  const a = lo - pad
  const span = hi + pad - a
  const pos = (v: number) => `${((v - a) / span) * 100}%`
  const inOptimal = optimal ? value >= optimal[0] && value <= optimal[1] : undefined
  const inRef = ref ? value >= ref[0] && value <= ref[1] : undefined
  const color = inOptimal ? 'var(--good)' : inRef === false ? 'var(--bad)' : 'var(--warn)'
  return (
    <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'var(--surface-2)' }}>
      {ref && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos(ref[0]), right: `calc(100% - ${pos(ref[1])})`, background: 'var(--surface-3)', borderRadius: 5 }} />
      )}
      {optimal && (
        <div
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: pos(optimal[0]),
            right: `calc(100% - ${pos(optimal[1])})`,
            background: 'color-mix(in srgb, var(--good) 45%, transparent)',
            borderRadius: 3,
          }}
        />
      )}
      <div style={{ position: 'absolute', top: -3, width: 4, height: 16, borderRadius: 2, left: `calc(${pos(value)} - 2px)`, background: color }} />
    </div>
  )
}
