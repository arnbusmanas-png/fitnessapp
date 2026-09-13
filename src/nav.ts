import { createContext, useContext } from 'react'

export type Route =
  | { name: 'block'; date: string; blockId: string }
  | { name: 'workout'; date: string; blockId?: string; logId?: string }
  | { name: 'kiteSession'; id?: string }
  | { name: 'checkin'; kind: 'morning' | 'evening'; date: string }
  | { name: 'settings' }
  | { name: 'library' }
  | { name: 'exercise'; id: string }

export interface Nav {
  push(route: Route): void
  pop(): void
  replace(route: Route): void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav() {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav must be used inside NavContext')
  return nav
}
