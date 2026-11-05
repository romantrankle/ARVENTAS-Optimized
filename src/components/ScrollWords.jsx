import { useEffect, useRef, useState } from 'react'
import { tr, subscribe } from '../i18n.js'

// Wörter werden beim Scrollen nacheinander scharf und deckend (von unscharf und blass).
// Fortschritt wird als --p am Container gesetzt, jedes Wort rechnet daraus seinen eigenen Wert (--w).
export default function ScrollWords({ text, className = '' }) {
  const ref = useRef(null)
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump((n) => n + 1)), [])
  const str = tr(text).replace(/ARVENTAS/g, 'ΛRVENTΛS')
  const words = str.split(/\s+/).filter(Boolean)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.setProperty('--p', 1); return }
    let raf = 0
    const run = () => {
      raf = 0
      const r = el.getBoundingClientRect(), vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)))
      el.style.setProperty('--p', p.toFixed(4))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); raf && cancelAnimationFrame(raf) }
  }, [])
  return (
    <p ref={ref} className={`sw ${className}`} data-notr="" role="group" aria-label={str} style={{ '--n': words.length }}>
      {words.map((w, i) => <span key={i} className="sw-w" aria-hidden="true" style={{ '--i': i }}>{w} </span>)}
    </p>
  )
}
