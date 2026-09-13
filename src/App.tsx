import { CalendarDays, SunMedium, TrendingUp, Wind } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { syncNow } from './lib/sync'
import { NavContext, type Nav, type Route } from './nav'
import { BlockScreen } from './screens/Block'
import { EveningCheckIn, MorningCheckIn } from './screens/CheckIn'
import { Kite, KiteSession } from './screens/Kite'
import { ExerciseScreen, Library } from './screens/Library'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Train } from './screens/Train'
import { WorkoutScreen } from './screens/Workout'

const TABS = [
  { id: 'today', label: 'Today', icon: SunMedium },
  { id: 'train', label: 'Train', icon: CalendarDays },
  { id: 'kite', label: 'Kite', icon: Wind },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
] as const
type Tab = (typeof TABS)[number]['id']

function savedTab(): Tab {
  try {
    const t = localStorage.getItem('tab')
    if (TABS.some((x) => x.id === t)) return t as Tab
  } catch {
    // storage can be unavailable (private mode); the default tab is fine
  }
  return 'today'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(savedTab)
  const [stack, setStack] = useState<Route[]>([])
  const nav = useMemo<Nav>(
    () => ({
      push: (r) => setStack((s) => [...s, r]),
      pop: () => setStack((s) => s.slice(0, -1)),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    }),
    [],
  )

  useEffect(() => {
    void syncNow()
    const wake = () => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('locked', stack.length > 0)
  }, [stack.length])

  const choose = (t: Tab) => {
    setTab(t)
    setStack([])
    window.scrollTo(0, 0)
    try {
      localStorage.setItem('tab', t)
    } catch {
      // not critical
    }
  }
  const top = stack[stack.length - 1]

  return (
    <NavContext.Provider value={nav}>
      <main className="app">
        {tab === 'today' && <Today />}
        {tab === 'train' && <Train />}
        {tab === 'kite' && <Kite />}
        {tab === 'progress' && <Progress />}
      </main>
      <nav className="tabbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => choose(id)}>
            <Icon size={23} strokeWidth={tab === id ? 2.2 : 1.7} />
            {label}
          </button>
        ))}
      </nav>
      {top && <RouteView key={stack.length} route={top} />}
    </NavContext.Provider>
  )
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'block':
      return <BlockScreen date={route.date} blockId={route.blockId} />
    case 'workout':
      return <WorkoutScreen date={route.date} blockId={route.blockId} logId={route.logId} />
    case 'kiteSession':
      return <KiteSession id={route.id} />
    case 'checkin':
      return route.kind === 'morning' ? <MorningCheckIn date={route.date} /> : <EveningCheckIn date={route.date} />
    case 'settings':
      return <Settings />
    case 'library':
      return <Library />
    case 'exercise':
      return <ExerciseScreen id={route.id} />
  }
}
