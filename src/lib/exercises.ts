import { useEffect, useState } from 'react'

export interface Exercise {
  id: string
  name: string
  category: string
  equipment?: string | null
  primary: string[]
  instructions: string[]
  images: string[]
  icon?: string
  custom?: boolean
}
export type Library = Record<string, Exercise>

// Photos come from the public-domain free-exercise-db, served through jsDelivr and cached
// on-device by the service worker after first view.
const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
export const imageUrl = (p: string) => IMAGE_BASE + p

let lib: Promise<Library> | undefined

export function loadExercises() {
  lib ??= fetch(`${import.meta.env.BASE_URL}exercises.json`)
    .then((r) => r.json() as Promise<Exercise[]>)
    .then((list) => Object.fromEntries(list.map((e) => [e.id, e])))
    .catch((e) => {
      lib = undefined
      throw e
    })
  return lib
}

export function useExercises() {
  const [library, setLibrary] = useState<Library>()
  useEffect(() => {
    loadExercises().then(setLibrary, () => setLibrary({}))
  }, [])
  return library
}

export const exerciseName = (library: Library | undefined, id: string) =>
  library?.[id]?.name ?? id.replace(/^x_/, '').replace(/_/g, ' ')
