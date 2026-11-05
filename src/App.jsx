import { Routes, Route, matchRoutes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import Ambient from './components/Ambient.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import { ConsentProvider } from './components/Consent.jsx'
import { MenuProvider, useMenu } from './components/MenuContext.jsx'
import MenuPanel from './components/MenuPanel.jsx'
// Lazy-Seite, die sich vorab laden lässt: Vor dem Hydrieren muss das Seiten-Chunk da sein, sonst verwirft React das vorgerenderte HTML, sobald ein Update den noch wartenden Bereich erreicht.
function page(load) {
  const Lazy = lazy(load)
  let Loaded = null
  const Page = () => (Loaded ? <Loaded /> : <Lazy />)
  Page.preload = () => load().then((m) => { Loaded = m.default })
  return Page
}
const Home = page(() => import('./pages/Home.jsx'))
const Leistungen = page(() => import('./pages/Leistungen.jsx'))
const ServicePage = page(() => import('./pages/ServicePage.jsx'))
const System = page(() => import('./pages/System.jsx'))
const Insights = page(() => import('./pages/Insights.jsx'))
const About = page(() => import('./pages/About.jsx'))
const Article = page(() => import('./pages/Article.jsx'))
const Owners = page(() => import('./pages/Owners.jsx'))
const Investors = page(() => import('./pages/Investors.jsx'))
const InvestorCircle = page(() => import('./pages/InvestorCircle.jsx'))
const ReportPage = page(() => import('./pages/ReportPage.jsx'))
const Partners = page(() => import('./pages/Partners.jsx'))
const Knowledge = page(() => import('./pages/Knowledge.jsx'))
const Contact = page(() => import('./pages/Contact.jsx'))
const Impressum = page(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Impressum })))
const Datenschutz = page(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Datenschutz })))
const NotFound = page(() => import('./pages/NotFound.jsx'))

const PAGES = [
  { path: '/', Page: Home },
  { path: '/immobilie-verkaufen', Page: Owners },
  { path: '/kapitalanlage-immobilien', Page: Investors },
  { path: '/investorenkreis', Page: InvestorCircle },
  { path: '/objektreport', Page: ReportPage },
  { path: '/partner', Page: Partners },
  { path: '/wissen', Page: Knowledge },
  { path: '/wissen/:slug', Page: Article },
  { path: '/leistungen', Page: Leistungen },
  { path: '/leistungen/:slug', Page: ServicePage },
  { path: '/system', Page: System },
  { path: '/insights', Page: Insights },
  { path: '/insights/:slug', Page: Article },
  { path: '/ueber-uns', Page: About },
  { path: '/kontakt', Page: Contact },
  { path: '/impressum', Page: Impressum },
  { path: '/datenschutz', Page: Datenschutz },
  { path: '*', Page: NotFound },
]
export const preloadRoute = (pathname) => matchRoutes(PAGES, pathname)[0].route.Page.preload()
export const preloadAllRoutes = () => Promise.all(PAGES.map((p) => p.Page.preload()))

// Scroll-Reveal (400–700 ms, siehe global.css). Beobachtet nach jedem Routenwechsel alle neuen .rv/.tl/.tri-Elemente.
function useReveal(key) {
  useEffect(() => {
    const sel = '.rv:not(.in), .tl:not(.in), .tri:not(.in)'
    const reduce = !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches
    const seen = new WeakSet()
    const pending = new Set()
    const show = (e) => { e.classList.add('in'); pending.delete(e); io && io.unobserve(e) }
    // Reveal startet schon vor dem Sichtbarwerden (rootMargin), damit schnelles Scrollen keine leeren Flächen zeigt.
    const io = reduce ? null : new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target) })
    }, { threshold: 0, rootMargin: '0px 0px 25% 0px' })
    // Seiten werden lazy geladen: neu eingefügte Elemente werden nachträglich erfasst.
    const scan = () => {
      document.querySelectorAll(sel).forEach((e) => {
        if (seen.has(e)) return
        seen.add(e)
        if (reduce) { e.classList.add('in'); return }
        pending.add(e); io.observe(e)
      })
    }
    scan()
    // Sicherheitsnetz: Elemente, die beim schnellen Scrollen übersprungen wurden, werden nachträglich eingeblendet.
    let raf = 0
    const sweep = () => { raf = 0; pending.forEach((e) => { if (e.getBoundingClientRect().top < innerHeight * 1.25) show(e) }) }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sweep) }
    window.addEventListener('scroll', onScroll, { passive: true })
    let sr = 0
    const mo = new MutationObserver(() => { if (!sr) sr = requestAnimationFrame(() => { sr = 0; scan(); sweep() }) })
    mo.observe(document.getElementById('main') || document.body, { childList: true, subtree: true })
    sweep()
    return () => { io && io.disconnect(); mo.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(sr) }
  }, [key])
}

// Bilder reagieren leicht auf die Mausbewegung (sanfte Parallaxe über CSS-Variablen).
function useMouseParallax() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Nur sichtbare Bilder werden direkt bewegt (kein Root-Variablenwechsel, kein globales Style-Recalc).
    const SEL = '.phero-img, .imgf img, .choose-img img, .hs-img img, .step-row img, .door img'
    const vis = new Set(), seen = new WeakSet()
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))))
    const scan = () => document.querySelectorAll(SEL).forEach((el) => { if (!seen.has(el)) { seen.add(el); io.observe(el) } })
    scan(); const t = setInterval(scan, 1500)
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0
    const tick = () => {
      x += (tx - x) * 0.1; y += (ty - y) * 0.1
      vis.forEach((el) => { el.style.translate = `${(x * -12).toFixed(1)}px ${(y * -8).toFixed(1)}px` })
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0
    }
    const move = (e) => { tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1; if (!raf) raf = requestAnimationFrame(tick) }
    window.addEventListener('mousemove', move, { passive: true })
    return () => { window.removeEventListener('mousemove', move); clearInterval(t); io.disconnect(); raf && cancelAnimationFrame(raf) }
  }, [])
}

// Scroll-Geschwindigkeit als CSS-Variable (--sv: -1..1, --sa: 0..1): Bilder biegen sich beim Scrollen leicht.
function useScrollBend() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return
    const root = document.documentElement
    let last = window.scrollY, v = 0, raf = 0
    const tick = () => {
      const y = window.scrollY
      const target = Math.max(-1, Math.min(1, (y - last) / 38))
      last = y
      v += (target - v) * 0.14
      if (Math.abs(v) < 0.002 && Math.abs(target) < 0.002) v = 0
      root.style.setProperty('--sv', v.toFixed(4)); root.style.setProperty('--sa', Math.abs(v).toFixed(4))
      raf = v !== 0 || target !== 0 ? requestAnimationFrame(tick) : 0
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); raf && cancelAnimationFrame(raf) }
  }, [])
}

function Shell() {
  const { pathname, hash } = useLocation()
  const { open } = useMenu()
  const main = useRef(null)
  const firstRender = useRef(true)
  useReveal(pathname)
  useMouseParallax()
  useScrollBend()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) { el.scrollIntoView(); return }
    }
    window.scrollTo(0, 0)
    // Fokusführung: nach Seitenwechsel springt der Fokus an den Seitenanfang. Beim ersten Laden nicht, sonst überspringt Tab den Sprunglink und die Navigation.
    if (firstRender.current) { firstRender.current = false; return }
    main.current && main.current.focus({ preventScroll: true })
  }, [pathname, hash])
  return (
    <>
      <a className="skip" href="#main">Zum Inhalt springen</a>
      <Ambient />
      <Header />
      <div className="page" inert={open || undefined}>
      <main id="main" ref={main} tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<div style={{ minHeight: '100svh' }} />}>
        <Routes>
          {PAGES.map(({ path, Page }) => <Route key={path} path={path} element={<Page />} />)}
        </Routes>
        </Suspense>
      </main>
      <Footer />
      </div>
      <MenuPanel />
    </>
  )
}

export default function App() {
  return (
    <ConsentProvider>
      <MenuProvider>
        <Shell />
      </MenuProvider>
    </ConsentProvider>
  )
}
