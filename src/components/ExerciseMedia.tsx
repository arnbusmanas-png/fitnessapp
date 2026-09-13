import { Brain, Dumbbell, Footprints, Hand, MoveUp, PersonStanding, Shield, ShieldCheck, StretchHorizontal, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { imageUrl, type Exercise } from '../lib/exercises'

const ICONS = {
  hang: Hand,
  jump: MoveUp,
  core: Shield,
  stretch: StretchHorizontal,
  balance: Footprints,
  leg: PersonStanding,
  throw: Zap,
  neck: ShieldCheck,
  mind: Brain,
}

/** Start/end photos cross-faded in a loop, so each exercise reads like a short clip. */
export function ExerciseMedia({ ex, className = '', playing = true }: { ex?: Exercise; className?: string; playing?: boolean }) {
  const [frame, setFrame] = useState(0)
  const images = ex?.images ?? []
  const loop = playing && images.length > 1

  useEffect(() => {
    if (!loop) return
    const t = setInterval(() => setFrame((f) => (f + 1) % images.length), 1100)
    return () => clearInterval(t)
  }, [loop, images.length])

  if (!images.length) {
    const Icon = ICONS[ex?.icon as keyof typeof ICONS] ?? Dumbbell
    return (
      <div className={`media ${className}`}>
        <div className="fallback">
          <Icon size={className.includes('hero') ? 56 : 30} strokeWidth={1.5} />
        </div>
      </div>
    )
  }

  const shown = loop ? images : images.slice(0, 1)
  return (
    <div className={`media ${className}`}>
      {shown.map((src, i) => (
        <img key={src} src={imageUrl(src)} alt="" loading="lazy" style={{ opacity: !loop || i === frame ? 1 : 0 }} />
      ))}
    </div>
  )
}
