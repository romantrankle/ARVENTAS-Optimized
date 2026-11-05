import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/immobilie-verkaufen', '/kapitalanlage-immobilien', '/investorenkreis', '/objektreport', '/ueber-uns', '/partner', '/wissen', '/wissen/off-market-verstehen', '/wissen/immobilien-bewerten', '/kontakt', '/impressum', '/datenschutz']
const SITE = 'https://arventas.de'

// Einwilligung vorab gesetzt, damit die Seite selbst geprüft wird. Der Dialog hat einen eigenen Test.
const consented = (page) => page.addInitScript(() => localStorage.setItem('arventas-consent', JSON.stringify({ necessary: true, statistics: false, marketing: false, externalContent: false })))

function watchErrors(page) {
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))
  // Abgebrochene Videos und Bilder beim Seitenwechsel sind keine Fehler.
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  return errors
}

for (const route of ROUTES) {
  test(`${route}: lädt ohne Fehler und ohne Hydrierungsfehler`, async ({ page }) => {
    const errors = watchErrors(page)
    await consented(page)
    // Das vorgerenderte DOM muss die Hydrierung überleben. Verwirft React es, blitzt die Seite leer auf, ohne dass ein Fehler erscheint.
    await page.addInitScript(() => addEventListener('DOMContentLoaded', () => { window.__ssrFirst = document.getElementById('main').firstElementChild }))
    await page.goto(route, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await page.evaluate(() => window.__ssrFirst.isConnected), 'vorgerendertes DOM erhalten').toBe(true)
    expect(errors).toEqual([])
  })

  test(`${route}: Inhalt und Metadaten stehen im statischen HTML`, async ({ request }) => {
    const res = await request.get(route)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/<title>[^<]*ARVENTAS[^<]*<\/title>/)
    expect(html, 'Inhalt darf nicht in React-Streaming-Hüllen stecken').not.toContain('$RC(')
    expect(html).toContain(`<link rel="canonical" href="${SITE}${route === '/' ? '/' : route}"`)
    expect(html).toMatch(/<meta name="description" content="[^"]{30,}"/)
    expect(html).toContain('<meta name="robots" content="index, follow">')
    const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)
    expect(ld).not.toBeNull()
    const types = JSON.parse(ld[1])['@graph'].map((n) => n['@type'])
    expect(types).toContain('RealEstateAgent')
    expect(types).toContain('WebPage')
  })

  test(`${route}: keine schweren axe-Verstöße`, async ({ page }) => {
    test.setTimeout(120000) // axe prüft auf den langen Seiten mehrere Tausend Elemente.
    await consented(page)
    await page.goto(route, { waitUntil: 'load' })
    // Einblend-Animationen abwarten; scroll-gesteuerte Textaufdeckung (.reveal-text) ist bis zum Scrollen absichtlich blass.
    await page.waitForTimeout(3500)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('.reveal-text .w').analyze()
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([])
  })
}

test('Titel sind seitenweit eindeutig', async ({ request }) => {
  const titles = await Promise.all(ROUTES.map(async (r) => (await (await request.get(r)).text()).match(/<title>(.*?)<\/title>/)[1]))
  expect(new Set(titles).size).toBe(titles.length)
})

test('Unbekannte Adresse: echter 404-Status und Fehlerseite', async ({ page, request }) => {
  expect((await request.get('/gibt-es-nicht')).status()).toBe(404)
  await page.goto('/gibt-es-nicht')
  await expect(page.locator('h1')).toHaveAttribute('class', /h1/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('Sitemap: alle Einträge erreichbar, robots.txt ist Text und verweist darauf', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.headers()['content-type']).toContain('text/plain')
  const robots = await res.text()
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  expect(robots).toMatch(/User-agent: GPTBot\nDisallow: \//)
  const xml = await (await request.get('/sitemap.xml')).text()
  const paths = [...xml.matchAll(/<loc>https:\/\/arventas\.de(.*?)<\/loc>/g)].map((m) => m[1])
  expect(paths.length).toBeGreaterThan(10)
  for (const p of paths) expect((await request.get(p)).status(), p).toBe(200)
})

test('Interne Links im statischen HTML führen zu vorhandenen Seiten', async ({ request }) => {
  const seen = new Set()
  for (const route of ROUTES) {
    const html = await (await request.get(route)).text()
    for (const [, href] of html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)) seen.add(href)
  }
  expect(seen.size).toBeGreaterThan(5)
  for (const href of seen) expect((await request.get(href)).status(), href).toBe(200)
})

test('Einwilligung: erscheint beim ersten Besuch, Auswahl bleibt, kein Aufblitzen danach', async ({ page }) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Alle ablehnen' }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.locator('.cookie-backdrop')).toBeHidden()
  await page.waitForLoadState('load')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.consent-site')).not.toHaveAttribute('inert')
})

test('Ohne JavaScript sind Inhalte sichtbar und kein Dialog sperrt die Seite', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto('/objektreport')
  await expect(page.locator('.cookie-backdrop')).toBeHidden()
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('h1 .lc').first()).toHaveCSS('opacity', '1')
  await ctx.close()
})

test('Tastatur: Sprunglink führt zum Inhalt', async ({ page }) => {
  await consented(page)
  await page.goto('/kontakt', { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})

test('FAQ klappt per Klick auf', async ({ page }) => {
  await consented(page)
  await page.goto('/immobilie-verkaufen', { waitUntil: 'load' })
  const q = page.locator('.faq-q button').first()
  await page.waitForTimeout(800)
  await q.scrollIntoViewIfNeeded()
  await expect(q).toHaveAttribute('aria-expanded', 'false')
  await q.click()
  await expect(q).toHaveAttribute('aria-expanded', 'true')
})

test('Seitenwechsel im Browser aktualisiert Titel und Canonical', async ({ page }) => {
  await consented(page)
  await page.goto('/kontakt', { waitUntil: 'load' })
  await page.locator('.logo').click()
  await expect(page).toHaveTitle(/Off-Market/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`)
})

test('Sprachumschalter übersetzt die Seite und stellt sie wieder her', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Umschalter liegt mobil im Menü')
  await consented(page)
  await page.goto('/kontakt', { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.locator('.hdr .lang button[lang="en"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.hdr-cta')).toHaveText('Contact')
  await page.locator('.hdr .lang button[lang="de"]').click()
  await expect(page.locator('.hdr-cta')).toHaveText('Kontakt')
})

test('Menü öffnet und schließt per Escape', async ({ page }) => {
  test.skip(page.viewportSize().width > 1260, 'Ab 1261 px gibt es die volle Navigation')
  await consented(page)
  await page.goto('/kontakt', { waitUntil: 'load' })
  await page.waitForTimeout(500)
  const burger = page.locator('.burger')
  await burger.click()
  await expect(burger).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(burger).toHaveAttribute('aria-expanded', 'false')
})

test('Hero: Erstbild-Fassung nur am Handy und nur kurz, danach volle Qualität', async ({ page }) => {
  const previews = []
  page.on('request', (r) => { if (r.url().includes('/media/lq/')) previews.push(r.url()) })
  await consented(page)
  await page.goto('/objektreport', { waitUntil: 'load' })
  const hero = page.locator('.phero-img')
  await expect.poll(() => hero.evaluate((i) => i.currentSrc), { timeout: 10000 }).toContain('/media/quality/')
  if (page.viewportSize().width > 720) expect(previews, 'über 720 px nie laden').toEqual([])
  else expect(previews.length).toBe(1)
})

test('Fotos unterhalb des ersten Bildschirms erhalten nach dem Hydrieren ihre Quelle', async ({ page, request }) => {
  const html = await (await request.get('/immobilie-verkaufen')).text()
  expect((html.match(/<img [^>]*fetchpriority="high"/g) || []).length).toBe(1)
  await consented(page)
  await page.goto('/immobilie-verkaufen', { waitUntil: 'load' })
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('main img')].filter((i) => !i.getAttribute('src')).length)).toBe(0)
})

test('Adresse mit Query: Region ist vorbelegt, keine Fehler', async ({ page }) => {
  const errors = watchErrors(page)
  await consented(page)
  await page.goto('/kontakt?region=Bayern', { waitUntil: 'load' })
  await expect(page.getByText('Vorgewählte Region:')).toBeVisible()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})

test('Direktaufruf mit Anker springt zum Abschnitt', async ({ page }) => {
  await consented(page)
  await page.goto('/immobilie-verkaufen#anfrage', { waitUntil: 'load' })
  await expect.poll(() => page.evaluate(() => { const r = document.getElementById('anfrage').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 }), { timeout: 8000 }).toBe(true)
})

test('Wiederkehrender Besuch auf Englisch: übersetzt, ohne Fehler', async ({ page }) => {
  const errors = watchErrors(page)
  await consented(page)
  await page.addInitScript(() => localStorage.setItem('arventas-lang', 'en'))
  await page.goto('/kontakt', { waitUntil: 'load' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.hdr-cta')).toHaveText('Contact')
  await expect(page).toHaveTitle(/Contact/)
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})

// Bis 860 px zeigt der Ablauf eine Liste statt des Würfels (ProcessTimeline.jsx).
const hasCube = (page) => page.viewportSize().width > 860

test('Startseite: Karte und Würfel bekommen nach dem ersten Bild ihre Inhalte', async ({ page }) => {
  await consented(page)
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('.gm-map path.gm-state')).toHaveCount(16)
  if (!hasCube(page)) return
  await expect.poll(() => page.locator('.pck-f').first().evaluate((f) => f.style.backgroundImage)).toContain('url(')
})

// Klassen, die erst zur Laufzeit zusammengesetzt werden (Footer.jsx: 'g' + Buchstabe, ProcessTimeline.jsx: 'pck-f--' + Seite). Sie stehen nicht wörtlich im Quelltext und dürfen im CSS nicht fehlen.
test('Zusammengesetzte Klassen haben ihre Regeln: Würfel und Wortmarke', async ({ page }) => {
  await consented(page)
  await page.goto('/', { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await expect(page.locator('.sf-mark svg.gS')).toHaveCSS('stroke-linecap', 'butt')
  await expect(page.locator('.sf-mark svg.gR')).toHaveCSS('stroke-linejoin', 'miter')
  test.skip(!hasCube(page), 'Der Würfel erscheint erst über 860 px')
  const faces = await page.locator('.pck-f').evaluateAll((list) => list.map((f) => { const s = getComputedStyle(f); return { cls: f.className, transform: s.transform, size: f.offsetWidth, bg: s.backgroundImage } }))
  expect(faces).toHaveLength(6)
  for (const f of faces) {
    expect(f.transform, f.cls).not.toBe('none')
    expect(f.size, f.cls).toBeGreaterThan(50)
    expect(f.bg, f.cls).toContain('url(')
  }
})

test('Würfel ist im Ablauf tatsächlich sichtbar', async ({ page }) => {
  test.skip(!hasCube(page), 'Der Würfel erscheint erst über 860 px')
  await consented(page)
  await page.goto('/', { waitUntil: 'load' })
  const top = await page.locator('#ablauf').evaluate((e) => e.getBoundingClientRect().top + scrollY)
  await page.evaluate((y) => window.scrollTo({ top: y + 900, behavior: 'instant' }), top)
  await page.waitForTimeout(1500)
  const box = await page.locator('.pck-stage').boundingBox()
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } })
  // Mit Fotofläche ist das PNG deutlich größer als der glatte Hintergrund, der ohne Würfel übrig bleibt .
  expect(shot.length).toBeGreaterThan(150000)
})

test('Nachträglich eingehängte Fotos haben sofort eine Quelle', async ({ page }) => {
  await consented(page)
  await page.goto('/immobilie-verkaufen', { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const empty = await page.evaluate(() => new Promise((resolve) => {
    let seen = 0
    new MutationObserver((records) => { for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) for (const img of n.matches('img') ? [n] : n.querySelectorAll('img')) if (!img.getAttribute('src')) seen++ }).observe(document.getElementById('main'), { childList: true, subtree: true })
    const h = document.documentElement.scrollHeight; let y = 0
    const step = () => { y += 500; window.scrollTo({ top: y, behavior: 'instant' }); if (y < h) setTimeout(step, 60); else setTimeout(() => resolve(seen), 200) }
    step()
  }))
  expect(empty).toBe(0)
})
