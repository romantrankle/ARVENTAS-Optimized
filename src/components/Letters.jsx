import { useEffect, useRef, useState } from 'react'
import { tr, subscribe } from '../i18n.js'

// Textanimation: Buchstaben erscheinen nacheinander (von unten, weich eingeblendet), sobald der Text sichtbar wird.
// Übersetzt selbst (data-notr), damit der DOM-Übersetzer die Buchstaben nicht einzeln anfasst.
export default function Letters({ as: Tag = 'span', text, className = '', style, per = 38, max = 1500, delay = 0 }) {
  const ref = useRef(null)
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump((n) => n + 1)), [])
  let t = tr(text)
  if (t === text) { const parts = text.split(/(?<=\.)\s+/); if (parts.length > 1) t = parts.map((x) => tr(x)).join(' ') }
  const str = t.replace(/ARVENTAS/g, 'ΛRVENTΛS')
  const words = str.split(/\s+/).filter(Boolean)
  const total = str.replace(/\s+/g, '').length
  const step = Math.min(per, max / Math.max(1, total))
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  let n = 0
  return (
    <Tag ref={ref} className={`letters ${className}`} style={style} data-notr="" role={/^h\d/.test(Tag) ? undefined : 'group'} aria-label={str}>
      {words.map((w, wi) => (
        <span key={wi}>
          {wi > 0 ? ' ' : ''}
          <span className="lw" aria-hidden="true">
            {Array.from(w).map((c, ci) => <span key={ci} className="lc" style={{ transitionDelay: `${delay + (n++) * step}ms` }}>{c}</span>)}
          </span>
        </span>
      ))}
    </Tag>
  )
}
