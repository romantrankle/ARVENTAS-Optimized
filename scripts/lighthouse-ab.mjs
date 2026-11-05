// Vergleich unter gleichen Bedingungen: Referenz-Build und aktueller Build laufen abwechselnd, weil die Rechnerlast über die Zeit stark schwankt.
// Nutzung: node scripts/lighthouse-ab.mjs <referenz-dist> <label> [--rounds=3] [--routes=/,/kontakt] [--devices=mobile,desktop]
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, renameSync, writeFileSync } from 'node:fs'

const [refRoot, label = 'ab'] = process.argv.slice(2)
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d
const rounds = Number(arg('rounds', 3))
const routes = arg('routes', '/').split(',')
const devices = arg('devices', 'mobile,desktop').split(',')
const out = `docs/lighthouse/${label}`
mkdirSync(out, { recursive: true })
const KEYS = ['performance', 'accessibility', 'bestPractices', 'seo', 'fcp', 'lcp', 'si', 'tbt', 'cls', 'ttfb', 'transferKB']
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const results = []
let meta = {}
for (const route of routes) for (const device of devices) {
  const runs = { reference: [], current: [] }
  for (let i = 0; i < rounds; i++) for (const [name, root] of [['reference', refRoot], ['current', 'dist']]) {
    const tmp = `_ab_${name}`
    execFileSync('node', ['scripts/lighthouse.mjs', tmp, '--runs=1', `--routes=${route}`, `--devices=${device}`, `--root=${root}`], { stdio: 'ignore' })
    const s = JSON.parse(readFileSync(`docs/lighthouse/${tmp}/summary.json`, 'utf8'))
    meta = { lighthouseVersion: s.lighthouseVersion, chrome: s.chrome, networkUserAgent: s.networkUserAgent }
    const r = s.results[0]
    if (!r.error) runs[name].push(r)
    // Rohbericht der letzten Runde behalten
    const file = `${route.replace(/\W+/g, '_') || 'home'}.${device}.json`
    mkdirSync(`${out}/${name}`, { recursive: true })
    rmSync(`${out}/${name}/${file}`, { force: true })
    renameSync(`docs/lighthouse/${tmp}/${file}`, `${out}/${name}/${file}`)
    rmSync(`docs/lighthouse/${tmp}`, { recursive: true, force: true })
  }
  const pack = (list) => Object.fromEntries(KEYS.map((k) => [k, { median: median(list.map((r) => r[k])), min: Math.min(...list.map((r) => r[k])), max: Math.max(...list.map((r) => r[k])) }]))
  const row = { route, device, runs: rounds, reference: pack(runs.reference), current: pack(runs.current), lcpElement: runs.current.at(-1)?.lcpElement, failed: runs.current.at(-1)?.failed }
  results.push(row)
  const p = (x) => `P${x.performance.median} [${x.performance.min}-${x.performance.max}] FCP ${Math.round(x.fcp.median)} LCP ${Math.round(x.lcp.median)} SI ${Math.round(x.si.median)} TBT ${Math.round(x.tbt.median)} CLS ${x.cls.median.toFixed(3)}`
  console.log(`${route} ${device}\n  ref ${p(row.reference)}\n  now ${p(row.current)}`)
  writeFileSync(`${out}/summary.json`, JSON.stringify({ label, date: new Date().toISOString(), referenceRoot: 'commit eb6b28d, original build', roundsPerPage: rounds, ...meta, results }, null, 2))
}
