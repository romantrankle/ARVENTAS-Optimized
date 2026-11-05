import { startTransition, useLayoutEffect, useRef, useState } from 'react'
import { qualityPhoto } from '../content/photoQuality.js'
import { HERO_PREVIEWS } from '../content/heroPreviews.js'

// Erfüllt, sobald die Seite geladen und danach ein Frame gezeichnet ist. Lokal kann das Hydrieren sonst vor dem ersten Bild fertig sein.
const firstPaint = import.meta.env.SSR ? null : new Promise((resolve) => {
  const go = () => requestAnimationFrame(() => setTimeout(resolve))
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true })
})

let painted = false
firstPaint?.then(() => { painted = true })
// Erster Render immer ohne Quelle, damit das Hydrieren zum statischen HTML passt. Später eingehängte Fotos bekommen sie per Layout-Effekt noch vor dem Zeichnen, blitzen also nicht leer auf.
// Der Wechsel nach dem ersten Bild läuft als Transition: Sonst rendert React alle Fotos der Seite in einem langen Task neu.
export function useFirstPaint() {
  const [done, setDone] = useState(false)
  useLayoutEffect(() => {
    if (painted) { setDone(true); return }
    let active = true
    firstPaint.then(() => { if (active) startTransition(() => setDone(true)) })
    return () => { active = false }
  }, [])
  return done
}

// Vollflächige Fotos: Auf dem Handy reichen 1600 Bildpunkte, unabhängig von der Pixeldichte des Geräts (Bild unter dem Overlay; sonst effektiv rund 1,8-fach).
const MOBILE_COVER_PIXELS = 1600
// Erstes Bild auf dem Handy: Die Erstbild-Fassung trägt die Breite 1w und kommt nur durch die winzige sizes-Angabe zum Zug, also nie über 720 px.
// Nach dem ersten Bild setzt measure() die echte Größe, und der Browser holt die volle Qualität.
const FIRST_PAINT_SIZES = '(max-width: 720px) 0.1px, 100vw'
const withPreview = (source) => {
  const hero = HERO_PREVIEWS[source?.src]
  if (!hero) return source
  return { ...source, srcSet: `${hero.preview} 1w, ${source.srcSet || `${source.src} ${hero.width}w`}`, width: source.width || hero.width, height: source.height || hero.height }
}

// Cover crops need enough pixels for their height as well as their visible width.
// Measure the actual photo box so narrow, tall cards do not select a small thumbnail.
export default function Photo({ image, src, srcSet, alt, sizes = '100vw', loading = 'lazy', capMobile, ref: forwardedRef, ...props }) {
  const base = typeof image === 'string' ? { src: image, alt: '' } : image || { src, srcSet, alt: alt ?? '' }
  const quality = qualityPhoto(alt === undefined ? base : { ...base, alt })
  const source = capMobile ? withPreview(quality) : quality
  const element = useRef(null)
  // Nur das Bild des ersten Bildschirms (fetchPriority="high") steht mit Quelle im HTML. Alle anderen bekommen sie erst nach dem ersten Bild, sonst konkurrieren sie mit dem Hero-Foto.
  const deferred = !useFirstPaint() && props.fetchPriority !== 'high'
  const [measuredSize, setMeasuredSize] = useState(null)
  useLayoutEffect(() => {
    const img = element.current
    if (!img || !source?.srcSet) return
    // Handy: volle Qualität erst, wenn die Erstbild-Fassung dekodiert und einmal gezeichnet ist (nach dem Seitenladen, dann ein Frame später).
    let firstPainted = !(capMobile && window.innerWidth <= 720)
    const measure = () => {
      if (!firstPainted) return
      const box = img.getBoundingClientRect()
      if (!box.width || !box.height) return
      const ratio = source.width && source.height ? source.width / source.height : img.naturalWidth / img.naturalHeight
      const fit = getComputedStyle(img).objectFit
      const coverWidth = fit === 'cover' && ratio ? Math.max(box.width, box.height * ratio) : box.width
      // This scene grows to the viewport; load its full-screen candidate before it expands.
      const width = img.closest('.sz') ? Math.max(coverWidth, window.innerWidth) : coverWidth
      const needed = Math.ceil(width * 1.05 / 64) * 64
      const pixels = capMobile && window.innerWidth <= 720 ? Math.min(needed, Math.floor(MOBILE_COVER_PIXELS / window.devicePixelRatio)) : needed
      setMeasuredSize(previous => previous === pixels ? previous : pixels)
    }
    const upgrade = () => img.decode().catch(() => {}).then(() => requestAnimationFrame(() => setTimeout(() => { firstPainted = true; measure() })))
    if (!firstPainted) firstPaint.then(upgrade)
    measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(img)
    img.addEventListener('load', measure)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); img.removeEventListener('load', measure); window.removeEventListener('resize', measure) }
  }, [source?.src, source?.srcSet, source?.width, source?.height, capMobile])
  const attach = node => {
    element.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }
  return <img {...source} {...props} src={deferred ? undefined : source?.src} srcSet={deferred ? undefined : source?.srcSet} ref={attach} sizes={source?.srcSet ? measuredSize ? `${measuredSize}px` : capMobile ? FIRST_PAINT_SIZES : sizes : undefined} loading={loading} decoding="async" />
}
