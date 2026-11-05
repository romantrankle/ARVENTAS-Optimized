import Photo from './Photo.jsx'
import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { PROVIDED_PHOTOS } from '../content/providedPhotos.js'

// Quellen kommen erst per Effekt dazu, das Standbild per CSS (.hv-vid): Das statische HTML lädt das Video so auf dem Handy nicht vorab.
const SOURCES = [['/media/hero/montage.webm', 'video/webm'], ['/media/hero/montage.mp4', 'video/mp4']]
const MOBILE_DELAY = 1500

// Startseiten-Kopf: stiller Schwarzweiß-Film (Hände auf Plänen, Frankfurt, Luftbild) als Hintergrund, Überschrift links unten, kleine Karte rechts unten.
export default function HomeVideo() {
  const vid = useRef(null)
  useEffect(() => {
    const v = vid.current
    if (!v) return
    const save = navigator.connection && navigator.connection.saveData
    if (save || matchMedia('(prefers-reduced-motion: reduce)').matches) { v.pause(); v.removeAttribute('autoplay'); return }
    const attach = () => {
      SOURCES.forEach(([src, type]) => { const el = document.createElement('source'); el.src = src; el.type = type; v.appendChild(el) })
      v.load()
      const p = v.play()
      if (p && p.catch) p.catch(() => {})
    }
    // Mobil: Video erst nach dem Laden der Seite holen, damit Bild und Text zuerst erscheinen
    if (innerWidth > 900) { attach(); return }
    let t = 0
    const go = () => { t = setTimeout(attach, MOBILE_DELAY) }
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true })
    return () => { clearTimeout(t); removeEventListener('load', go) }
  }, [])
  return (
    <section className="hv" aria-label="Einführung">
      <video ref={vid} className="hv-vid" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      <div className="hv-shade" />
      <div className="hv-copy">
        <h1 className="hv-h"><span>Die richtige Immobilie.</span><span>Diskret vermittelt.</span></h1>
        <p className="hv-sub">Ausgewählte Immobilien. Fundierte Analysen. Persönlich begleitet, deutschlandweit.</p>
        <Link to="/immobilie-verkaufen#anfrage" className="hv-go"><span aria-hidden="true">↗</span> Objektreport anfragen</Link>
      </div>
      <aside className="hv-card">
        <Photo src={PROVIDED_PHOTOS.report.src} alt={PROVIDED_PHOTOS.report.alt} loading="lazy" />
        <p>Datenbasiert analysiert. Persönlich geprüft.</p>
        <Link to="/objektreport#muster" className="hv-go"><span aria-hidden="true">↗</span> Muster ansehen</Link>
      </aside>
      <span className="hv-mouse" aria-hidden="true"><i /></span>
    </section>
  )
}
