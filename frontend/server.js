// Production server for hosts that run a Node process (e.g. Runway): `npm run build && npm start`.
// No dependencies. Serves dist/, sends index.html for app routes (/map, /quests, …), and serves
// /env.js from the host's environment variables, so keys set on the host work even if they
// weren't available while building.
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT) || 8080

if (!isFile(join(DIST, 'index.html'))) {
  console.error('dist/ is missing: run `npm run build` before `npm start`.')
  process.exit(1)
}

// Only these public, browser-safe values are exposed. Never add secret keys here.
const PUBLIC_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_MAP_ID', 'VITE_MAP_ENGINE']

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function send(res, path, cache) {
  res.writeHead(200, {
    'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': cache,
  })
  createReadStream(path).pipe(res)
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/env.js') {
    const env = Object.fromEntries(PUBLIC_ENV.filter((k) => process.env[k]).map((k) => [k, process.env[k]]))
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' })
    return res.end(`window.__ENV__ = ${JSON.stringify(env)};`)
  }

  // Resolve inside dist/ only (no ../ escapes).
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    pathname = '/'
  }
  const file = join(DIST, normalize(pathname).replace(/^(\.\.[/\\])+/, ''))
  if (file.startsWith(DIST) && isFile(file)) {
    // Vite's hashed files never change; everything else is re-checked.
    return send(res, file, pathname.startsWith('/assets/') && /-[\w-]{8,}\./.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache')
  }

  // Missing file with an extension: a real 404. Otherwise it's an app route: serve the app.
  if (extname(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Not found')
  }
  send(res, join(DIST, 'index.html'), 'no-cache')
}).listen(PORT, '0.0.0.0', () => console.log(`MIGO running on port ${PORT}`))
