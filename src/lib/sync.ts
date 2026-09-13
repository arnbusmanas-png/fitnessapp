import { db, kvGet, kvSet, LOG_TABLES } from './db'
import { nowISO } from './dates'

// Sync model: the app owns everything under logs/ (plus health/uploads/); the coach owns
// everything else. Each side only writes its own paths, so a sync never has to merge content —
// it pushes dirty logs as one commit, then pulls whatever changed, keyed by git blob SHA.

export interface CommitFile {
  path: string
  content: string
  encoding: 'utf8' | 'base64'
}
export interface DataSource {
  label: string
  tree(): Promise<Record<string, string>> // path -> git blob sha
  read(path: string): Promise<string>
  commit(files: CommitFile[], message: string): Promise<void>
}
export interface RepoSettings {
  owner: string
  repo: string
  token: string
  branch?: string
}

export class SyncError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/')

export class GitHubSource implements DataSource {
  readonly label: string
  private readonly branch: string

  constructor(private readonly s: RepoSettings) {
    this.branch = s.branch || 'main'
    this.label = `${s.owner}/${s.repo}`
  }

  private async api(path: string, init: RequestInit & { accept?: string } = {}) {
    const { accept, ...rest } = init
    const res = await fetch(`https://api.github.com/repos/${this.s.owner}/${this.s.repo}${path}`, {
      ...rest,
      cache: 'no-store',
      headers: {
        Accept: accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${this.s.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (!res.ok) throw new SyncError(res.status, `GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res
  }

  private async json<T>(path: string, init?: RequestInit & { accept?: string }) {
    return (await (await this.api(path, init)).json()) as T
  }

  async tree() {
    const j = await this.json<{ tree: { path: string; type: string; sha: string }[] }>(
      `/git/trees/${encodeURIComponent(this.branch)}?recursive=1`,
    )
    return Object.fromEntries(j.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]))
  }

  async read(path: string) {
    const res = await this.api(`/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`, {
      accept: 'application/vnd.github.raw+json',
    })
    return res.text()
  }

  async commit(files: CommitFile[], message: string) {
    for (let attempt = 0; ; attempt++) {
      const ref = await this.json<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(this.branch)}`)
      const head = await this.json<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`)
      const entries = await Promise.all(
        files.map(async (f) =>
          f.encoding === 'utf8'
            ? { path: f.path, mode: '100644', type: 'blob', content: f.content }
            : {
                path: f.path,
                mode: '100644',
                type: 'blob',
                sha: (
                  await this.json<{ sha: string }>('/git/blobs', {
                    method: 'POST',
                    body: JSON.stringify({ content: f.content, encoding: 'base64' }),
                  })
                ).sha,
              },
        ),
      )
      const tree = await this.json<{ sha: string }>('/git/trees', {
        method: 'POST',
        body: JSON.stringify({ base_tree: head.tree.sha, tree: entries }),
      })
      const commit = await this.json<{ sha: string }>('/git/commits', {
        method: 'POST',
        body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
      })
      try {
        await this.api(`/git/refs/heads/${encodeURIComponent(this.branch)}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: commit.sha }),
        })
        return
      } catch (e) {
        // The coach pushed between reading the ref and updating it: rebuild on the new head.
        if (e instanceof SyncError && e.status === 422 && attempt < 2) continue
        throw e
      }
    }
  }
}

/** Dev server stand-in, backed by a local checkout of the data repo (see vite.config.ts). */
export class DevSource implements DataSource {
  readonly label = 'Local data folder (dev)'

  private async req(url: string, init?: RequestInit) {
    const res = await fetch(url, init)
    if (!res.ok) throw new SyncError(res.status, await res.text())
    return res
  }
  async tree() {
    return (await this.req('/__data/tree')).json()
  }
  async read(path: string) {
    return (await this.req(`/__data/file?path=${encodeURIComponent(path)}`)).text()
  }
  async commit(files: CommitFile[]) {
    await this.req('/__data/commit', { method: 'POST', body: JSON.stringify({ files }) })
  }
}

export async function gitBlobSha(bytes: Uint8Array) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const buf = new Uint8Array(header.length + bytes.length)
  buf.set(header)
  buf.set(bytes, header.length)
  const digest = await crypto.subtle.digest('SHA-1', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const COACH_FILE = /^(profile\.json|coach\/[^/]+\.json|health\/(labs|supplements)\.json|plans\/[^/]+\.json)$/

// ---- sync state for the UI ----

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'unconfigured'
export interface SyncState {
  status: SyncStatus
  at?: string
  message?: string
}
let state: SyncState = { status: 'idle' }
const listeners = new Set<() => void>()
export const syncState = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}
function setState(next: SyncState) {
  state = next
  listeners.forEach((l) => l())
}

export async function getSource(): Promise<DataSource | null> {
  const s = await kvGet<RepoSettings>('settings')
  if (s?.token && s.owner && s.repo) return new GitHubSource(s)
  if (import.meta.env.DEV) return new DevSource()
  return null
}

let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Debounced sync, for use right after a local save. */
export function requestSync(delayMs = 2500) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delayMs)
}

export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await runSync()
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

async function runSync() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setState({ ...state, status: 'offline' })
    return
  }
  const src = await getSource()
  if (!src) {
    setState({ status: 'unconfigured' })
    return
  }
  setState({ ...state, status: 'syncing', message: undefined })
  try {
    await syncWith(src)
    setState({ status: 'idle', at: nowISO() })
  } catch (e) {
    setState({ ...state, status: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}

export async function syncWith(src: DataSource) {
  const shas = (await kvGet<Record<string, string>>('shas')) ?? {}
  await push(src, shas)
  await kvSet('shas', shas)
  await pull(src, shas)
  await kvSet('shas', shas)
}

async function push(src: DataSource, shas: Record<string, string>) {
  const enc = new TextEncoder()
  const files: CommitFile[] = []
  const after: (() => Promise<void>)[] = []

  for (const { table, dir, key } of LOG_TABLES) {
    const dirty = await db.table(table).where('dirty').equals(1).toArray()
    for (const rec of dirty) {
      const clean = { ...rec }
      delete clean.dirty
      const path = `${dir}/${rec[key]}.json`
      const content = JSON.stringify(clean, null, 2) + '\n'
      files.push({ path, content, encoding: 'utf8' })
      after.push(async () => {
        shas[path] = await gitBlobSha(enc.encode(content))
        // Only clear the flag if nothing changed the record while the commit was in flight.
        await db
          .table(table)
          .where(key)
          .equals(rec[key])
          .modify((r: { updatedAt?: string; dirty?: number }) => {
            if (r.updatedAt === rec.updatedAt) r.dirty = 0
          })
      })
    }
  }

  for (const u of await db.uploads.where('dirty').equals(1).toArray()) {
    const bytes = new Uint8Array(await u.data.arrayBuffer())
    files.push({ path: u.path, content: toBase64(bytes), encoding: 'base64' })
    after.push(async () => {
      shas[u.path] = await gitBlobSha(bytes)
      await db.uploads.update(u.path, { dirty: 0 })
    })
  }

  if (!files.length) return
  await src.commit(files, `app: sync ${files.length} file${files.length > 1 ? 's' : ''}`)
  for (const fn of after) await fn()
}

async function pull(src: DataSource, shas: Record<string, string>) {
  const tree = await src.tree()
  const broken: string[] = []

  for (const [path, sha] of Object.entries(tree)) {
    if (shas[path] === sha) continue
    try {
      if (COACH_FILE.test(path)) {
        await kvSet(`file:${path}`, JSON.parse(await src.read(path)))
        shas[path] = sha
        continue
      }
      const t = LOG_TABLES.find((x) => path.startsWith(`${x.dir}/`) && path.endsWith('.json'))
      if (!t) continue
      const id = path.slice(t.dir.length + 1, -'.json'.length)
      const local = await db.table(t.table).get(id)
      if (local?.dirty) continue // local edits win; they go up on the next push
      await db.table(t.table).put({ ...JSON.parse(await src.read(path)), dirty: 0 })
      shas[path] = sha
    } catch {
      broken.push(path)
    }
  }

  for (const path of Object.keys(shas)) {
    if (path in tree) continue
    delete shas[path]
    if (COACH_FILE.test(path)) await db.kv.delete(`file:${path}`)
  }

  if (broken.length) throw new Error(`Couldn't read ${broken.join(', ')}`)
}
