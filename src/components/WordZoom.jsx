import Photo from './Photo.jsx'
import { useEffect, useRef, useState } from 'react'
import Letters from './Letters.jsx'

// Wort erscheint, zwischen den Wortteilen wechseln kleine Fotos, beim Scrollen öffnet sich das Foto auf Vollbild.
export default function WordZoom({ left, right, images }) {
  const wrap = useRef(null)
  const slot = useRef(null)
  const [idx, setIdx] = useState(0)
  // Das erste Foto steht im statischen HTML und kann vor dem Hydrieren fertig sein (dann kein onLoad). Die übrigen kommen erst nach dem Seitenladen dazu.
  const [loaded, setLoaded] = useState(() => new Set([0]))
  const [pageLoaded, setPageLoaded] = useState(false)
  useEffect(() => {
    const go = () => setPageLoaded(true)
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true })
    return () => removeEventListener('load', go)
  }, [])
  useEffect(() => {
    const t = setInterval(() => setIdx((current) => {
      for (let step = 1; step <= images.length; step++) {
        const next = (current + step) % images.length
        if (loaded.has(next)) return next
      }
      return current
    }), 1300)
    return () => clearInterval(t)
  }, [images.length, loaded])
  useEffect(() => {
    const el = wrap.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el && el.style.setProperty('--p', 1); return }
    let raf = 0
    const measure = () => {
      const sl = slot.current; if (!sl) return
      const r = sl.getBoundingClientRect(); const st = sl.closest('.wz-stick').getBoundingClientRect()
      const w = Math.max(1, r.width)
      el.style.setProperty('--dx', (r.left + r.width / 2 - (st.left + st.width / 2)).toFixed(1) + 'px')
      el.style.setProperty('--dy', (r.top + r.height / 2 - (st.top + st.height / 2)).toFixed(1) + 'px')
      el.style.setProperty('--sw', r.width.toFixed(1) + 'px'); el.style.setProperty('--sh', r.height.toFixed(1) + 'px')
    }
    const run = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))
      el.style.setProperty('--p', p.toFixed(4))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    measure(); run()
    const onR = () => { measure(); on() }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', onR)
    const t0 = setTimeout(measure, 900)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', onR); clearTimeout(t0); raf && cancelAnimationFrame(raf) }
  }, [])
  return (
    <section className="wz" ref={wrap}>
      <div className="wz-stick">
        <div className="wz-row">
          <span className="wz-w"><Letters text={left} per={60} /></span>
          <span className="wz-slot" ref={slot}>
            {pageLoaded && images.map((image, i) => <Photo key={typeof image === 'string' ? image : image.src} src={typeof image === 'string' ? image : image.thumbnail || image.src} alt="" loading="eager" className={i === idx ? 'on' : ''} />)}
          </span>
          <span className="wz-w"><Letters text={right} per={60} delay={300} /></span>
        </div>
        <div className="wz-full" aria-hidden="true">
          {images.map((image, i) => (i === 0 || pageLoaded) && <Photo key={typeof image === 'string' ? image : image.src} src={typeof image === 'string' ? image : image.src} alt="" capMobile loading="eager" decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} onLoad={() => setLoaded((previous) => previous.has(i) ? previous : new Set([...previous, i]))} className={i === idx ? 'on' : ''} />)}
        </div>
      </div>
    </section>
  )
}
