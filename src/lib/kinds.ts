import { Bike, Dumbbell, Moon, Mountain, StretchHorizontal, Sun, Target, Wind, Zap, type LucideIcon } from 'lucide-react'
import type { BlockKind } from '../types'

export const KIND: Record<BlockKind, { label: string; icon: LucideIcon; color: string }> = {
  strength: { label: 'Strength', icon: Dumbbell, color: 'var(--text)' },
  power: { label: 'Power', icon: Zap, color: 'var(--text)' },
  mobility: { label: 'Mobility', icon: StretchHorizontal, color: 'var(--muted)' },
  bike: { label: 'Zwift', icon: Bike, color: 'var(--accent)' },
  ride: { label: 'Ride', icon: Mountain, color: 'var(--accent)' },
  kite: { label: 'Kite', icon: Wind, color: 'var(--ocean)' },
  test: { label: 'Test', icon: Target, color: 'var(--warn)' },
  recovery: { label: 'Recovery', icon: Moon, color: 'var(--muted)' },
  ritual: { label: 'Ritual', icon: Sun, color: 'var(--muted)' },
}
