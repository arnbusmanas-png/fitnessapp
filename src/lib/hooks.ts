import { useEffect, useState } from 'react'
import { toISODate } from './dates'

/** Re-renders on an interval and whenever the app comes back to the foreground. */
export function useClock(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const t = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}

export const useToday = () => toISODate(new Date(useClock()))

export function useNowMinutes() {
  const d = new Date(useClock())
  return d.getHours() * 60 + d.getMinutes()
}
