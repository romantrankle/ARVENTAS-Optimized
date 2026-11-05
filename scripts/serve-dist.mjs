// Statischer Produktions-Server für Messungen: Kompression und Caching wie beim Hosting, ohne Vite-Dev-Verhalten.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' }
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt'])
const isFile = (p) => stat(p).then((s) => s.isFile(), () => false)
// Sicherheits-Header wie im Hosting, damit Tests eine zu strenge CSP bemerken.
const hostHeaders = Object.fromEntries(JSON.parse(readFileSync('vercel.json', 'utf8')).headers?.find((h) => h.source === '/(.*)')?.headers.map((h) => [h.key, h.value]) ?? [])

export function serveDist(port = 4173, root = 'dist') {
  const cache = new Map()
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/\\/g, '/').replace(/\/$/, '')
    const candidates = [join(root, path), join(root, path, 'index.html')]
    let file = null
    for (const c of candidates) if (await isFile(c)) { file = c; break }
    let status = 200
    if (!file) {
      // Mit Prerendering echtes 404, im reinen SPA-Build die alte Rückfallseite.
      if (await isFile(join(root, '404.html'))) { file = join(root, '404.html'); status = 404 } else file = join(root, 'index.html')
    }
    const ext = extname(file)
    const headers = { ...hostHeaders, 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=2592000', Vary: 'Accept-Encoding' }
    const accepts = String(req.headers['accept-encoding'] || '')
    let body = await readFile(file)
    if (COMPRESSIBLE.has(ext)) {
      const enc = accepts.includes('br') ? 'br' : accepts.includes('gzip') ? 'gzip' : null
      if (enc) {
        const key = `${enc}:${file}`
        if (!cache.has(key)) cache.set(key, enc === 'br' ? brotliCompressSync(body) : gzipSync(body))
        body = cache.get(key)
        headers['Content-Encoding'] = enc
      }
    }
    headers['Content-Length'] = body.length
    res.writeHead(status, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  })
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}

if (process.argv[1]?.endsWith('serve-dist.mjs')) {
  await serveDist(Number(process.argv[2]) || 4173)
  console.log(`dist auf http://localhost:${Number(process.argv[2]) || 4173}`)
}
