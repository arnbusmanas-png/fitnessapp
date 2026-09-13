import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Dev-only stand-in for the private data repo: serves a local checkout through the same
// tree/read/commit contract that src/lib/sync.ts uses against the GitHub API, so the whole
// app (including sync) can be exercised without a token.
function localDataRepo(dir: string): Plugin {
  const root = path.resolve(dir)
  const resolveInside = (p: string) => {
    const full = path.resolve(root, p)
    if (!full.startsWith(root + path.sep)) throw new Error(`path escapes data repo: ${p}`)
    return full
  }
  const walk = async (rel = ''): Promise<string[]> => {
    const entries = await fs.readdir(path.join(root, rel), { withFileTypes: true }).catch(() => [])
    const out: string[] = []
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const p = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) out.push(...(await walk(p)))
      else out.push(p)
    }
    return out
  }
  const gitBlobSha = (buf: Buffer) =>
    createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')

  return {
    name: 'local-data-repo',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__data', async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://local')
          if (url.pathname === '/tree') {
            const tree: Record<string, string> = {}
            for (const f of await walk()) tree[f] = gitBlobSha(await fs.readFile(resolveInside(f)))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(tree))
            return
          }
          if (url.pathname === '/file') {
            res.end(await fs.readFile(resolveInside(url.searchParams.get('path') ?? '')))
            return
          }
          if (url.pathname === '/commit' && req.method === 'POST') {
            const chunks: Buffer[] = []
            for await (const c of req) chunks.push(c as Buffer)
            const { files } = JSON.parse(Buffer.concat(chunks).toString()) as {
              files: { path: string; content: string; encoding: 'utf8' | 'base64' }[]
            }
            for (const f of files) {
              const full = resolveInside(f.path)
              await fs.mkdir(path.dirname(full), { recursive: true })
              await fs.writeFile(full, Buffer.from(f.content, f.encoding))
            }
            res.end('{}')
            return
          }
          res.statusCode = 404
          res.end()
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
        }
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  base: process.env.BASE ?? (command === 'build' ? '/fitnessapp/' : '/'),
  plugins: [
    react(),
    localDataRepo(process.env.DATA_DIR ?? '../fitnessapp-data'),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Forma',
        short_name: 'Forma',
        description: 'Training, recovery and coaching in one place.',
        theme_color: '#0b0706',
        background_color: '#0b0706',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__data/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
