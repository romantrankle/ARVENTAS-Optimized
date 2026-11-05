// Schreibt je Route eine fertige HTML-Datei nach dist/ (Inhalt, Metadaten, strukturierte Daten), dazu 404.html, und sitemap.xml.
// Vercel ist nur die Vorschau-Adresse (Hauptdomain: arventas.de) und bleibt noindex, ebenso jeder Build mit SITE_INDEXABLE=false.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ssrEntry = resolve('.ssr/entry-server.js')
const { render, ROUTES, SITEMAP_ROUTES, SITE, schemaFor } = await import(pathToFileURL(ssrEntry).href)
const indexable = process.env.SITE_INDEXABLE !== 'false' && !process.env.VERCEL
const template = readFileSync('dist/index.html', 'utf8')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const OG_IMAGE = `${SITE}/media/hero/poster.webp`
const today = new Date().toISOString().slice(0, 10)

function page(path, { html, head }, { notFound = false } = {}) {
  const canonical = SITE + (head.canonical || path).replace(/\/$/, '') + (path === '/' ? '/' : '')
  const tags = notFound ? '' : [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="ARVENTAS" />`,
    `<meta property="og:locale" content="de_DE" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${JSON.stringify(schemaFor(path, head)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
  const lcp = path === '/' ? [
    '<link rel="preload" as="image" href="/media/hero/poster-sm.webp" fetchpriority="high" media="(max-width: 600px) and (orientation: portrait)" />',
    '<link rel="preload" as="image" href="/media/hero/poster.webp" fetchpriority="high" media="not all and (max-width: 600px) and (orientation: portrait)" />',
  ].join('\n    ') : ''
  return template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(head.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(head.description)}" />`)
    .replace('<!--robots-->', indexable && !notFound ? '<meta name="robots" content="index, follow" />' : '<meta name="robots" content="noindex, nofollow" />')
    .replace('<!--head-->', [tags, lcp].filter(Boolean).join('\n    '))
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
}

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

// Beasties setzt nur die von der jeweiligen Seite genutzten Regeln inline und lädt das Gesamt-CSS nicht blockierend nach.
const { default: Beasties } = await import('beasties')
const beasties = new Beasties({ path: 'dist', publicPath: '/', preload: 'media', pruneSource: false, logLevel: 'warn', fonts: false, allowRules: [/\.in\b/, /\.on\b/, /\.clear\b/] })

// Erst nach Beasties einfügen: Es würde die kritischen Regeln sonst in dieses erste <style> schreiben.
// Beasties übernimmt @font-face nicht ins kritische CSS. Ohne diese Regeln rendert der Text bis zum Gesamt-CSS in der Ersatzschrift und springt dann um.
const cssFile = template.match(/href="\/(assets\/index-[^"]+\.css)"/)[1]
const FONT_FACES = readFileSync(join('dist', cssFile), 'utf8').match(/@font-face\{[^}]*\}/g).join('')
// Das Gesamt-CSS wird für den ersten Bildschirm nicht gebraucht (die Seite trägt ihre Regeln inline) und startet deshalb nach dem ersten Bild.
const LATE_CSS = `<script>requestAnimationFrame(function(){setTimeout(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='/${cssFile}';document.head.appendChild(l)})})</script>`
// Ein Layout statt zwei: Ohne Wartezeit läuft das teuerste Layout in Ersatzschriften und wird beim Tausch komplett wiederholt. Höchstens 700 ms, danach gilt die Ersatzschrift wie bisher.
const FONT_WAIT = `<script>(function(){var h=document.documentElement,f=document.fonts;if(!f||!f.load)return;h.classList.add('fw');var d=function(){h.classList.remove('fw')};setTimeout(d,700);Promise.all(['400 1em Manrope','500 1em Manrope','600 1em Manrope','700 1em Manrope','400 1em "Instrument Serif"'].map(function(x){return f.load(x)})).then(d,d)})()</script>`
const NOSCRIPT = '<noscript><style>.rv,.letters .lc{opacity:1!important;transform:none!important}.cookie-backdrop{display:none!important}</style></noscript>'
const finish = async (html) => (await beasties.process(html)).replace(/<link rel="stylesheet"[^>]*media="print"[^>]*>/, LATE_CSS).replace('</head>', `<style>${FONT_FACES}.fw #root{display:none}</style>${FONT_WAIT}${NOSCRIPT}</head>`).replace(' data-beasties-container', '')
  // Auf langsamen Netzen zuerst Hero-Bild und Schrift, danach JavaScript: Die Seite ist schon vollständig im HTML.
  .replace('<script type="module"', '<script type="module" fetchpriority="low"').replace(/<link rel="modulepreload"/g, '<link rel="modulepreload" fetchpriority="low"')

for (const path of ROUTES) {
  const out = join('dist', path === '/' ? 'index.html' : `${path.slice(1)}/index.html`)
  write(out, await finish(page(path, await render(path))))
}
write('dist/404.html', await finish(page('/404', await render('/404-seite-nicht-gefunden'), { notFound: true })))

write('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITEMAP_ROUTES.map((p) => `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`)

rmSync('.ssr', { recursive: true, force: true })
console.log(`${ROUTES.length} Routen + 404 vorgerendert (${indexable ? 'indexierbar' : 'noindex'}).`)
process.exit(0)
