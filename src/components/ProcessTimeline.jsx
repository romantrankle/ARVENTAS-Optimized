import { useEffect, useRef, useState } from 'react'
import { OWNER_PROCESS, INVESTOR_PROCESS } from '../content/data.js'
import { TEAM_PROCESS_PHOTOS } from '../content/team.js'
import { qualityPhoto } from '../content/photoQuality.js'
import { useFirstPaint } from './Photo.jsx'

// Ablauf: Würfel wie in der Landingpage. Beim Scrollen kippt und dreht er sich von Schritt zu Schritt (Seite nach vorn), wechselt die Seite
// und der Text wechselt mit. Schmale Bildschirme und reduzierte Bewegung: schlichte nummerierte Liste.
const FACES = ['front', 'right', 'back', 'left', 'top', 'bottom']
const POSE = [[0, 0], [0, -90], [0, -180], [0, -270], [-90, -360], [90, -360]]
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function ProcessTimeline({ initial = 'owner' }) {
  // Die Würfelflächen sind CSS-Hintergründe: Der Browser lädt sie sofort, auch weit unterhalb des ersten Bildschirms.
  const painted = useFirstPaint()
  const [who, setWho] = useState(initial)
  const [flat, setFlat] = useState(false)
  const box = useRef(null)
  const steps = who === 'owner' ? OWNER_PROCESS : INVESTOR_PROCESS
  const n = steps.length
  useEffect(() => {
    const mq = matchMedia('(max-width: 860px), (prefers-reduced-motion: reduce)')
    let raf = 0
    const sync = () => {
      raf = 0
      const el = box.current
      if (!el || mq.matches) return
      const r = el.getBoundingClientRect()
      const t = clamp(-r.top / Math.max(1, el.offsetHeight - innerHeight), 0, 1)
      const p = clamp(((t - 0.08) / 0.84) * (n - 1), 0, n - 1)
      let seg = Math.min(n - 2, Math.floor(p)), fr = p - seg
      if (p >= n - 1) { seg = n - 2; fr = 1 }
      const f = ease(clamp((fr - 0.3) / 0.4, 0, 1)), bump = Math.sin(Math.PI * f)
      const A = POSE[seg], B = POSE[seg + 1]
      const xa = seg % 2 ? -0.21 : 0.21, xb = (seg + 1) % 2 ? -0.21 : 0.21
      const stage = el.querySelector('.pck-stage')
      const w = stage.clientWidth
      const x = (xa + (xb - xa) * f) * w
      stage.style.perspectiveOrigin = `${(50 + (x / w) * 100).toFixed(2)}% 50%`
      const rx = A[0] + (B[0] - A[0]) * f + (seg === 0 ? bump * -38 : 0)
      const ry = A[1] + (B[1] - A[1]) * f + bump * (seg === 0 ? 30 : -14)
      const rz = bump * (seg === 0 ? -12 : -9)
      const fx = `translate3d(${x.toFixed(1)}px, 0, 0)`
      el.querySelector('.pck-glow').style.transform = fx
      el.querySelector('.pck-floor').style.transform = `${fx} scale(${(1 - bump * 0.18).toFixed(3)})`
      el.querySelector('.pck-scene').style.transform = `translate3d(${x.toFixed(1)}px, 12px, 0) scale(${(1 + bump * 0.18).toFixed(3)})`
      el.querySelector('.pck-cube').style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`
      el.querySelectorAll('.pck-copy').forEach((c, i) => {
        const dd = i - p, o = Math.max(0, 1 - Math.max(0, Math.abs(dd) - 0.3) * 5)
        c.style.opacity = o.toFixed(3)
        c.style.transform = `translate3d(0, calc(-50% + ${(dd * 46).toFixed(2)}vh), 0)`
      })
      const near = Math.round(p)
      el.querySelectorAll('.pck-dots i').forEach((d, k) => d.classList.toggle('on', k <= near))
    }
    const tick = () => { raf = raf || requestAnimationFrame(sync) }
    const mode = () => { setFlat(mq.matches); tick() }
    mode()
    addEventListener('scroll', tick, { passive: true }); addEventListener('resize', mode)
    return () => { removeEventListener('scroll', tick); removeEventListener('resize', mode); cancelAnimationFrame(raf) }
  }, [n, who, flat])
  const toggle = (
    <div className="toggle" role="tablist" aria-label="Prozess wählen">
      <button type="button" role="tab" aria-selected={who === 'owner'} onClick={() => setWho('owner')}>Für Eigentümer</button>
      <button type="button" role="tab" aria-selected={who === 'investor'} onClick={() => setWho('investor')}>Für Investoren</button>
    </div>
  )
  if (flat) {
    return (
      <div className="pls">
        {toggle}
        <ol className="pls-list">
          {steps.map((s, i) => (
            <li key={who + s.t}><span>{String(i + 1).padStart(2, '0')}</span><b>{s.t}</b><p>{s.d}</p></li>
          ))}
        </ol>
      </div>
    )
  }
  return (
    <div ref={box} className="pck" style={{ '--n': n }}>
      <div className="pck-pin">
        <div className="pck-top">{toggle}</div>
        <div className="pck-stage">
          <span className="pck-glow" aria-hidden="true" />
          <span className="pck-floor" aria-hidden="true" />
          <div className="pck-scene" aria-hidden="true">
            <div className="pck-cube">
              {FACES.map((f, i) => {
                const source = TEAM_PROCESS_PHOTOS[who][i]
                const photo = qualityPhoto(typeof source === 'string' ? { src: source } : source)
                return <i key={f} className={'pck-f pck-f--' + f} style={painted ? { backgroundImage: `url(${photo.src})` } : undefined} />
              })}
            </div>
          </div>
          {steps.map((s, i) => (
            <div key={who + s.t} className={'pck-copy ' + (i % 2 ? 'r' : 'l')}>
              <span className="pck-n"><b>{String(i + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}</span>
              <h3 lang="de" className={s.t.length > 13 ? 'long' : ''}>{s.t}</h3>
              <i className="pck-rule" aria-hidden="true" />
              <p>{s.d}</p>
            </div>
          ))}
          <div className="pck-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} />)}</div>
        </div>
      </div>
    </div>
  )
}

export function SimpleTimeline({ steps }) {
  return (
    <ol className="tl rv" style={{ '--n': steps.length }}>
      {steps.map((s) => <li key={s.t}><b>{s.t}</b><span>{s.d}</span></li>)}
    </ol>
  )
}
