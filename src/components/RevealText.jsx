import { useEffect, useRef, useState } from 'react'
import { Brandify } from './Brand.jsx'
import { tr, subscribe } from '../i18n.js'

// Textreveal: Wörter blenden beim Scrollen nacheinander von gedämpft zu voll auf.
// Übersetzung erfolgt hier selbst (data-notr), damit der DOM-Übersetzer die Wörter nicht einzeln anfasst.
export default function RevealText({ as: Tag = 'p', text, className = '' }) {
  const ref = useRef(null)
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump((n) => n + 1)), [])
  const words = tr(text).split(/\s+/).filter(Boolean)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const spans = Array.from(el.querySelectorAll('.w'))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { spans.forEach((s) => { s.style.opacity = 1 }); return }
    let raf = 0
    const run = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh * 0.9, end = vh * 0.5
      const p = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, start - end + r.height * 0.6)))
      const n = spans.length
      spans.forEach((s, i) => { s.style.opacity = String(0.28 + 0.72 * Math.min(1, Math.max(0, p * (n + 3) - i) )) })
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); raf && cancelAnimationFrame(raf) }
  }, [text, words.length])
  return (
    <Tag ref={ref} className={`reveal-text ${className}`} data-notr="" role={/^h\d/.test(Tag) ? undefined : 'group'} aria-label={words.join(' ')}>
      {words.map((w, i) => <span key={i} className="w" aria-hidden="true"><Brandify>{w}</Brandify>{' '}</span>)}
    </Tag>
  )
}
