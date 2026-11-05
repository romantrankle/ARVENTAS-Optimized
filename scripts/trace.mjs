// Chrome-Trace mit echter Drosselung (Slow 4G, 4x CPU) gegen den Produktions-Build. Nutzung: node scripts/trace.mjs /route [--returning] [--selectors] [--out=datei.json]
// Zeigt, was den Hauptthread tatsächlich belegt: Lighthouse simuliert seine Mobilwerte nur aus einem ungedrosselten Lauf.
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { serveDist } from './serve-dist.mjs'

const route = process.argv[2] || '/'
const flag = (n) => process.argv.includes(`--${n}`)
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6)
const server = await serveDist(4190)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

const reqs = new Map()
cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, prio: e.request.initialPriority, start: e.timestamp, type: e.type }))
cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength } })

await page.addInitScript((returning) => {
  if (returning) localStorage.setItem('arventas-consent', '{"necessary":true,"statistics":false,"marketing":false,"externalContent":false}')
  window.__lcp = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: Math.round(e.startTime), size: Math.round(e.size), url: e.url.slice(-46), el: e.element ? e.element.tagName + '.' + String(e.element.className).slice(0, 24) : '' }))).observe({ type: 'largest-contentful-paint', buffered: true })
}, flag('returning'))

const events = []
cdp.on('Tracing.dataCollected', (d) => events.push(...d.value))
const categories = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'loading', 'v8', 'disabled-by-default-v8.compile']
if (flag('selectors')) categories.push('blink.debug', 'disabled-by-default-blink.debug')
await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: categories } })
await page.goto(`http://localhost:4190${route}`, { waitUntil: 'load', timeout: 120000 })
await page.waitForTimeout(9000)
const lcp = await page.evaluate(() => window.__lcp)
await new Promise((res) => { cdp.once('Tracing.tracingComplete', res); cdp.send('Tracing.end') })
if (out) writeFileSync(out, JSON.stringify({ traceEvents: events }))

const mainPid = events.find((e) => e.name === 'navigationStart' && e.args?.data?.isOutermostMainFrame !== false)?.pid
const nav = events.find((e) => e.name === 'navigationStart' && e.pid === mainPid && e.args?.data?.documentLoaderURL?.startsWith('http'))
const t0 = nav.ts
const ms = (ts) => Math.round((ts - t0) / 1000)
const mainTid = events.find((e) => e.name === 'CrRendererMain' || (e.name === 'thread_name' && e.args?.name === 'CrRendererMain' && e.pid === mainPid))?.tid
const main = events.filter((e) => e.pid === mainPid && e.tid === mainTid && e.ph === 'X' && e.dur && e.ts >= t0)
const mark = (n) => { const e = events.find((x) => x.name === n && x.pid === mainPid && x.ts >= t0); return e ? ms(e.ts) : null }
console.log(`\n=== ${route} ${flag('returning') ? '(wiederkehrend)' : '(Erstbesuch)'} ===`)
console.log(`FP ${mark('firstPaint')} ms | FCP ${mark('firstContentfulPaint')} ms | DCL ${mark('domContentLoadedEventEnd')} ms | load ${mark('loadEventEnd')} ms`)
console.log('LCP-Kandidaten:', lcp.map((c) => `${c.t}ms ${c.size}px ${c.el} ${c.url}`).join('\n                '))

const WATCH = ['ParseHTML', 'ParseAuthorStyleSheet', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'EvaluateScript', 'v8.compile', 'FunctionCall', 'FireAnimationFrame', 'TimerFire', 'EventDispatch', 'MajorGC', 'MinorGC', 'Decode Image', 'ImageDecodeTask', 'RasterTask']
const all = events.filter((e) => e.pid === mainPid && e.ph === 'X' && e.dur && e.ts >= t0)
console.log('\nSumme nach Art (gedrosselt):')
for (const n of WATCH) {
  const list = all.filter((e) => e.name === n)
  if (!list.length) continue
  const sum = list.reduce((s, e) => s + e.dur, 0) / 1000
  const top = [...list].sort((a, b) => b.dur - a.dur).slice(0, 4).map((e) => `${Math.round(e.dur / 1000)}${e.args?.elementCount ? `/${e.args.elementCount}el` : ''}@${ms(e.ts)}`).join(' ')
  console.log(`  ${n.padEnd(24)} n=${String(list.length).padEnd(4)} ${String(Math.round(sum)).padStart(6)} ms   größte: ${top}`)
}

const tasks = main.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask').sort((a, b) => b.dur - a.dur)
const fcp = mark('firstContentfulPaint')
const tbt = tasks.filter((t) => ms(t.ts) >= fcp && t.dur > 50000).reduce((s, t) => s + (t.dur - 50000), 0) / 1000
console.log(`\nLange Tasks (>50 ms): ${tasks.filter((t) => t.dur > 50000).length}, TBT ab FCP (ohne TTI-Grenze): ${Math.round(tbt)} ms`)
for (const t of tasks.slice(0, 6)) {
  const inner = all.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t && e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask')
  const by = {}
  for (const e of inner) if (WATCH.includes(e.name)) by[e.name] = (by[e.name] || 0) + e.dur
  const parts = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${Math.round(v / 1000)}`).join(', ')
  console.log(`  ${String(Math.round(t.dur / 1000)).padStart(5)} ms @${String(ms(t.ts)).padEnd(6)} ${parts}`)
}

const scripts = {}
for (const e of all.filter((x) => x.name === 'EvaluateScript' || x.name === 'v8.compile')) { const u = (e.args?.data?.url || e.args?.fileName || '?').split('/').pop().slice(0, 30); scripts[u] = (scripts[u] || 0) + e.dur }
console.log('\nSkripte (Auswertung + Kompilierung):', Object.entries(scripts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${Math.round(v / 1000)}ms`).join(' | '))

const wall = [...reqs.values()].filter((r) => r.start).sort((a, b) => a.start - b.start)
const base = wall[0]?.start ?? 0
console.log('\nWasserfall (ms, relativ zum Dokument):')
for (const r of wall.slice(0, Number(process.env.REQS || 22))) console.log(`  ${String(Math.round((r.start - base) * 1000)).padStart(6)}-${String(r.end ? Math.round((r.end - base) * 1000) : '?').padEnd(6)} ${String(Math.round((r.bytes || 0) / 1024)).padStart(5)}KB ${(r.prio || '').padEnd(8)} ${r.url.replace('http://localhost:4190', '').slice(0, 60)}`)

if (flag('selectors')) {
  const sel = new Map()
  for (const e of events) if (e.name === 'SelectorStats') for (const s of e.args?.selector_stats?.selector_timings || []) { const r = sel.get(s.selector) || { t: 0, a: 0 }; r.t += s['elapsed (us)'] ?? 0; r.a += s.match_attempts; sel.set(s.selector, r) }
  const arr = [...sel].sort((a, b) => b[1].t - a[1].t)
  console.log(`\nSelektoren: ${arr.length}, Abgleich gesamt ${Math.round(arr.reduce((s, [, r]) => s + r.t, 0) / 1000)} ms`)
  for (const [k, r] of arr.slice(0, 8)) console.log(`  ${Math.round(r.t / 1000)} ms  ${r.a} Versuche  ${k.slice(0, 90)}`)
}
await browser.close(); server.close(); process.exit(0)
