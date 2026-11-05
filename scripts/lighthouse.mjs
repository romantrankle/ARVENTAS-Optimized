// Lighthouse-Messreihe. Nutzung: node scripts/lighthouse.mjs <label> [--runs=3] [--base=https://…] [--routes=/,/kontakt] [--devices=mobile,desktop] [--root=dist]
// Ohne --base wird dist/ lokal über serve-dist.mjs ausgeliefert. Ergebnis: docs/lighthouse/<label>/ (Summary plus Median-Rohbericht je Seite und Gerät).
import { mkdirSync, writeFileSync } from 'node:fs'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { serveDist } from './serve-dist.mjs'

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d
const label = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'run'
const runs = Number(arg('runs', 3))
const routes = arg('routes', '/,/immobilie-verkaufen,/kapitalanlage-immobilien,/objektreport,/wissen/off-market-verstehen,/kontakt').split(',')
const devices = arg('devices', 'mobile,desktop').split(',')
const remote = arg('base')
const server = remote ? null : await serveDist(4173, arg('root', 'dist'))
const base = remote || 'http://localhost:4173'
const out = `docs/lighthouse/${label}`
mkdirSync(out, { recursive: true })

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const metric = (lhr, id) => lhr.audits[id]?.numericValue ?? null
const score = (lhr, id) => Math.round((lhr.categories[id].score ?? 0) * 100)
const read = (lhr) => ({
  performance: score(lhr, 'performance'), accessibility: score(lhr, 'accessibility'), bestPractices: score(lhr, 'best-practices'), seo: score(lhr, 'seo'),
  fcp: metric(lhr, 'first-contentful-paint'), lcp: metric(lhr, 'largest-contentful-paint'), si: metric(lhr, 'speed-index'), tbt: metric(lhr, 'total-blocking-time'), cls: metric(lhr, 'cumulative-layout-shift'), ttfb: metric(lhr, 'server-response-time'),
  transferKB: Math.round((metric(lhr, 'total-byte-weight') ?? 0) / 1024),
})

const results = []
for (const route of routes) for (const device of devices) {
  const reps = []
  for (let i = 0; i < runs; i++) {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'] })
    try {
      const r = await lighthouse(base + route, { port: chrome.port, output: 'json', logLevel: 'error' }, device === 'desktop' ? desktopConfig : undefined)
      reps.push(r.lhr)
    } catch (e) { console.error(`Lauf fehlgeschlagen ${route} ${device}:`, e.message) }
    // Windows meldet beim Aufräumen des Temp-Profils gelegentlich EPERM; die Messung ist davon nicht betroffen.
    try { await chrome.kill() } catch (e) { /* siehe oben */ }
  }
  if (!reps.length) { results.push({ route, device, error: 'NOT MEASURED' }); continue }
  const rows = reps.map(read)
  const pick = (k) => median(rows.map((r) => r[k]))
  const mid = reps[rows.findIndex((r) => r.performance === pick('performance'))]
  const row = { route, device, runs: rows.length, ...Object.fromEntries(Object.keys(rows[0]).map((k) => [k, pick(k)])), perfRange: [Math.min(...rows.map((r) => r.performance)), Math.max(...rows.map((r) => r.performance))], lcpRange: [Math.min(...rows.map((r) => r.lcp)), Math.max(...rows.map((r) => r.lcp))], lcpElement: mid.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector ?? null, failed: Object.values(mid.categories).flatMap((c) => c.auditRefs.filter((a) => a.weight > 0 && mid.audits[a.id].score !== null && mid.audits[a.id].score < 0.9).map((a) => `${c.id}:${a.id}`)) }
  results.push(row)
  console.log(`${route} ${device}: P${row.performance} A${row.accessibility} BP${row.bestPractices} S${row.seo} | FCP ${Math.round(row.fcp)} LCP ${Math.round(row.lcp)} SI ${Math.round(row.si)} TBT ${Math.round(row.tbt)} CLS ${row.cls?.toFixed(3)} | ${row.transferKB} KB | ${row.lcpElement}`)
  for (const k of ['final-screenshot', 'screenshot-thumbnails']) delete mid.audits[k]
  delete mid.fullPageScreenshot
  writeFileSync(`${out}/${route.replace(/\W+/g, '_') || 'home'}.${device}.json`, JSON.stringify(mid))
  var env = { lighthouseVersion: mid.lighthouseVersion, chrome: mid.environment.hostUserAgent, networkUserAgent: mid.environment.networkUserAgent }
}
writeFileSync(`${out}/summary.json`, JSON.stringify({ label, date: new Date().toISOString(), base, runsPerPage: runs, ...env, results }, null, 2))
server?.close()
process.exit(0)
