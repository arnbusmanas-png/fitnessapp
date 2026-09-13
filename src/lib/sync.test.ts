import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, kvGet } from './db'
import { gitBlobSha, syncWith, type CommitFile, type DataSource } from './sync'

/** In-memory data repo with the same contract as GitHub. */
class MemoryRepo implements DataSource {
  label = 'memory'
  files = new Map<string, string>()
  commits: string[][] = []
  async tree() {
    const out: Record<string, string> = {}
    for (const [p, c] of this.files) out[p] = await gitBlobSha(new TextEncoder().encode(c))
    return out
  }
  async read(path: string) {
    const c = this.files.get(path)
    if (c == null) throw new Error(`404 ${path}`)
    return c
  }
  async commit(files: CommitFile[]) {
    for (const f of files) this.files.set(f.path, f.content)
    this.commits.push(files.map((f) => f.path))
  }
}

const day = (date: string, note: string) => ({ date, blocks: {}, evening: { habits: {}, food: {}, win: note, at: '' }, updatedAt: note })

describe('sync', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('pulls coach files into the cache and logs into tables', async () => {
    const repo = new MemoryRepo()
    repo.files.set('profile.json', JSON.stringify({ name: 'A' }))
    repo.files.set('plans/2026-W38.json', JSON.stringify({ week: '2026-W38', days: {} }))
    repo.files.set('logs/days/2026-09-14.json', JSON.stringify(day('2026-09-14', 'remote')))
    repo.files.set('README.md', '# not for the app')
    await syncWith(repo)
    expect(await kvGet('file:profile.json')).toEqual({ name: 'A' })
    expect(await kvGet('file:plans/2026-W38.json')).toMatchObject({ week: '2026-W38' })
    expect((await db.days.get('2026-09-14'))?.evening?.win).toBe('remote')
    expect(repo.commits).toEqual([])
  })

  it('pushes dirty logs in one commit and then goes quiet', async () => {
    const repo = new MemoryRepo()
    await db.days.put({ ...day('2026-09-14', 'a'), dirty: 1 })
    await db.kite.put({ id: 'k1', date: '2026-09-14', spot: 's', tricks: {}, crashes: [], updatedAt: 'x', dirty: 1 })
    await syncWith(repo)
    expect(repo.commits).toEqual([['logs/days/2026-09-14.json', 'logs/kite/k1.json']])
    expect(JSON.parse(repo.files.get('logs/kite/k1.json')!)).not.toHaveProperty('dirty')
    expect((await db.days.get('2026-09-14'))?.dirty).toBe(0)
    await syncWith(repo)
    expect(repo.commits).toHaveLength(1)
  })

  it('keeps local edits over a remote copy of the same log', async () => {
    const repo = new MemoryRepo()
    repo.files.set('logs/days/2026-09-14.json', JSON.stringify(day('2026-09-14', 'remote')))
    await syncWith(repo)
    await db.days.put({ ...day('2026-09-14', 'local'), dirty: 1 })
    repo.files.set('logs/days/2026-09-14.json', JSON.stringify(day('2026-09-14', 'remote-2')))
    await syncWith(repo)
    expect(JSON.parse(repo.files.get('logs/days/2026-09-14.json')!).evening.win).toBe('local')
    expect((await db.days.get('2026-09-14'))?.evening?.win).toBe('local')
  })

  it('reports coach files that are not valid JSON', async () => {
    const repo = new MemoryRepo()
    repo.files.set('coach/feed.json', '{ broken')
    await expect(syncWith(repo)).rejects.toThrow(/coach\/feed\.json/)
  })
})
