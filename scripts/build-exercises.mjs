// Builds public/exercises.json: the public-domain free-exercise-db (github.com/yuhonas/free-exercise-db,
// Unlicense) slimmed to what the app renders, plus our own drills from custom-exercises.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`)
const all = await res.json()
const custom = JSON.parse(await readFile(new URL('./custom-exercises.json', import.meta.url), 'utf8'))

const slim = all.map((e) => ({
  id: e.id,
  name: e.name,
  category: e.category,
  equipment: e.equipment ?? null,
  primary: e.primaryMuscles,
  instructions: e.instructions,
  images: e.images,
}))

const ids = new Set(slim.map((e) => e.id))
for (const c of custom) if (ids.has(c.id)) throw new Error(`custom id collides with library: ${c.id}`)

await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../public/exercises.json', import.meta.url),
  JSON.stringify([...slim, ...custom.map((c) => ({ images: [], ...c, custom: true }))]),
)
console.log(`exercises.json: ${slim.length} library + ${custom.length} custom`)
