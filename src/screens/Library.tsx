import { useMemo, useState } from 'react'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { LineChart } from '../components/charts'
import { Screen, Sheet } from '../components/ui'
import { exerciseName, useExercises } from '../lib/exercises'
import { useWorkoutLogs } from '../lib/store'
import { e1rmHistory } from '../lib/strength'

const CATEGORIES = ['all', 'custom', 'strength', 'plyometrics', 'stretching', 'cardio', 'olympic weightlifting']

export function Library() {
  const lib = useExercises()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState<string>()

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.values(lib ?? {})
      .filter((e) => cat === 'all' || (cat === 'custom' ? e.custom : e.category === cat))
      .filter((e) => !needle || e.name.toLowerCase().includes(needle))
      .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || a.name.localeCompare(b.name))
      .slice(0, 60)
  }, [lib, q, cat])

  return (
    <Screen title="Exercise library">
      <input className="input" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips mt" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} style={{ flex: 'none' }} onClick={() => setCat(c)}>
            {c === 'custom' ? 'Forma drills' : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid2 mt">
        {list.map((e) => (
          <button key={e.id} className="tile" onClick={() => setOpen(e.id)}>
            <ExerciseMedia ex={e} playing={false} />
            <div className="name">{e.name}</div>
          </button>
        ))}
      </div>
      {lib && list.length === 0 && <div className="empty">No match.</div>}
      {open && (
        <Sheet onClose={() => setOpen(undefined)}>
          <ExerciseInfo id={open} />
        </Sheet>
      )}
    </Screen>
  )
}

export function ExerciseScreen({ id }: { id: string }) {
  return (
    <Screen title="Exercise">
      <ExerciseInfo id={id} />
    </Screen>
  )
}

export function ExerciseInfo({ id }: { id: string }) {
  const lib = useExercises()
  const logs = useWorkoutLogs()
  const ex = lib?.[id]
  const hist = useMemo(() => e1rmHistory(id, logs ?? []), [id, logs])
  const tags = ex ? [ex.category, ex.equipment, ...ex.primary].filter((t): t is string => !!t) : []

  return (
    <div>
      <ExerciseMedia ex={ex} className="hero" />
      <h2 className="h1">{exerciseName(lib, id)}</h2>
      <div className="chips">
        {tags.map((t) => (
          <span key={t} className="pill">
            {t}
          </span>
        ))}
      </div>
      {hist.length > 0 && (
        <>
          <div className="h2">Estimated 1RM</div>
          <div className="card">
            <div className="row between">
              <span className="big num">{hist.at(-1)!.value} kg</span>
              <span className="small muted">best {Math.max(...hist.map((h) => h.value))} kg</span>
            </div>
            {hist.length > 1 && <LineChart points={hist.map((h) => ({ y: h.value }))} height={80} />}
          </div>
        </>
      )}
      {ex && ex.instructions.length > 0 && (
        <>
          <div className="h2">How to</div>
          <ol className="small" style={{ paddingLeft: 20, margin: 0, lineHeight: 1.55 }}>
            {ex.instructions.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {s}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
