import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App, { preloadAllRoutes } from './App.jsx'
import { headSink } from './components/Seo.jsx'
import { ARTICLES, INVESTOR_FAQ, OWNER_FAQ, CONTACT_FAQ } from './content/data.js'
import { SERVICES } from './content/site.js'

export const SITE = 'https://arventas.de'

// Alle festen URLs. /leistungen, /system und /insights sind Altseiten ohne Navigation: Sie bleiben erreichbar, gehören aber nicht in die Sitemap.
const CURRENT = ['/', '/immobilie-verkaufen', '/kapitalanlage-immobilien', '/investorenkreis', '/objektreport', '/ueber-uns', '/partner', '/wissen', '/kontakt', '/impressum', '/datenschutz', ...ARTICLES.map((a) => `/wissen/${a.slug}`)]
const LEGACY = ['/leistungen', '/system', '/insights', ...Object.keys(SERVICES).map((s) => `/leistungen/${s}`), ...ARTICLES.map((a) => `/insights/${a.slug}`)]
export const SITEMAP_ROUTES = CURRENT
export const ROUTES = [...CURRENT, ...LEGACY]

export async function render(url) {
  for (const k of Object.keys(headSink)) delete headSink[k]
  await preloadAllRoutes()
  // Synchron gerendert, damit der Inhalt direkt im HTML steht (auch für Crawler und ohne JavaScript).
  return { html: renderToString(<StaticRouter location={url}><App /></StaticRouter>), head: { ...headSink } }
}

// Nur belegte Angaben aus dem Impressum (src/pages/Legal.jsx). Keine Bewertungen, Kennzahlen oder Öffnungszeiten.
const ORG = {
  '@type': 'RealEstateAgent', '@id': `${SITE}/#organisation`, name: 'ARVENTAS', legalName: 'ARVENTAS GmbH', url: `${SITE}/`,
  logo: `${SITE}/media/arventas-logo.png`, image: `${SITE}/media/arventas-logo.png`, telephone: '+4982826029990', email: 'info@arventas.de',
  address: { '@type': 'PostalAddress', streetAddress: 'Am Grund 11', postalCode: '86489', addressLocality: 'Deisenhausen', addressCountry: 'DE' },
  areaServed: { '@type': 'Country', name: 'Deutschland' },
}
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'ARVENTAS', inLanguage: 'de', publisher: { '@id': ORG['@id'] } }
const SERVICE_PAGES = { '/immobilie-verkaufen': 'Immobilienverkauf für Eigentümer', '/kapitalanlage-immobilien': 'Off-Market-Immobilien für Investoren', '/objektreport': 'Objektreport' }
// Antworten mit „Redaktionelle Freigabe offen“ (open) sind noch nicht freigegeben und bleiben draußen.
const FAQ_PAGES = { '/immobilie-verkaufen': OWNER_FAQ, '/kapitalanlage-immobilien': INVESTOR_FAQ, '/kontakt': CONTACT_FAQ }
const PARENTS = { wissen: ['Wissen', '/wissen'], insights: ['Insights', '/insights'], leistungen: ['Leistungen', '/leistungen'] }

export function schemaFor(path, head) {
  const url = SITE + (head.canonical || path).replace(/\/$/, '') + (path === '/' ? '/' : '')
  const name = head.title.split(' | ')[0]
  const graph = [ORG, WEBSITE, { '@type': 'WebPage', '@id': `${url}#seite`, url, name: head.title, description: head.description, inLanguage: 'de', isPartOf: { '@id': WEBSITE['@id'] }, about: { '@id': ORG['@id'] } }]
  if (path !== '/') {
    const [, first, second] = path.split('/')
    const items = [['Start', '/'], second && PARENTS[first], [name, path]].filter(Boolean)
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items.map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + p })) })
  }
  if (SERVICE_PAGES[path]) graph.push({ '@type': 'Service', name: SERVICE_PAGES[path], description: head.description, url, provider: { '@id': ORG['@id'] }, areaServed: ORG.areaServed })
  const faq = (FAQ_PAGES[path] || []).filter((q) => !q.open)
  if (faq.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) })
  return { '@context': 'https://schema.org', '@graph': graph }
}
