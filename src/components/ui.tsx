import { Check, ChevronLeft, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNav } from '../nav'
import type { BlockStatus } from '../types'

export function Screen({
  title,
  right,
  children,
  footer,
  className,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const nav = useNav()
  return (
    <div className={`screen ${className ?? ''}`}>
      <div className="inner">
        <div className="topbar">
          <button className="icon-btn" onClick={nav.pop} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <div className="small bold">{title}</div>
          <div>{right}</div>
        </div>
        {children}
      </div>
      {footer}
    </div>
  )
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  )
}

export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = 'var(--accent)',
  children,
}: {
  value?: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value ?? 0))
  const mid = size / 2
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {value != null && (
          <circle
            cx={mid}
            cy={mid}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * c} ${c}`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Scale({
  value,
  onChange,
  max = 5,
  labels,
}: {
  value?: number
  onChange: (v: number) => void
  max?: number
  labels?: [string, string]
}) {
  return (
    <div>
      <Seg options={Array.from({ length: max }, (_, i) => ({ value: i + 1, label: i + 1 }))} value={value} onChange={onChange} />
      {labels && (
        <div className="row between tiny dim" style={{ marginTop: 5, padding: '0 8px' }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}

export const parseNum = (s: string) => {
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}

/** Numeric input that keeps the typed text (so "79." or "79,4" survive) while reporting a number. */
export function NumInput({
  value,
  onChange,
  decimal,
  placeholder,
  className = 'input num',
  ariaLabel,
}: {
  value?: number
  onChange: (v: number | undefined) => void
  decimal?: boolean
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  const [text, setText] = useState(value != null ? String(value) : '')
  useEffect(() => {
    if (parseNum(text) !== value) setText(value != null ? String(value) : '')
    // only react to outside changes of the value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseNum(e.target.value))
      }}
    />
  )
}

export function NumField({
  label,
  value,
  onChange,
  decimal,
  placeholder,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
  decimal?: boolean
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <NumInput value={value} onChange={onChange} decimal={decimal} placeholder={placeholder} />
    </label>
  )
}

export function StatusDot({ status }: { status?: BlockStatus }) {
  return (
    <span className={`status-dot ${status ?? ''}`} aria-label={status ?? 'open'}>
      {status === 'done' && <Check size={16} strokeWidth={3} />}
      {status === 'modified' && <Check size={15} strokeWidth={3} />}
      {status === 'skipped' && <X size={15} strokeWidth={3} />}
    </span>
  )
}

export function Tick({ on }: { on: boolean }) {
  return (
    <span className={`tick ${on ? 'on' : ''}`}>
      <Check size={17} strokeWidth={3} />
    </span>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  )
}
