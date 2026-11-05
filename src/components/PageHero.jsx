import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Letters from './Letters.jsx'
import { Brandify } from './Brand.jsx'
import Photo from './Photo.jsx'

function useFadeOut(on, ref) {
  useEffect(() => {
    const el = ref.current
    if (!on || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const run = () => {
      raf = 0
      const k = Math.min(1, window.scrollY / (window.innerHeight * 0.55))
      el.style.opacity = String(1 - k)
      el.style.transform = `translateY(${(-k * 40).toFixed(1)}px)`
    }
    const onS = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', onS, { passive: true })
    return () => { window.removeEventListener('scroll', onS); raf && cancelAnimationFrame(raf); el.style.opacity = ''; el.style.transform = '' }
  }, [on, ref])
}

export default function PageHero({ crumb, eyebrow, title, lead, children, image, tall, fadeOut, blur }) {
  const wrapRef = useRef(null)
  useFadeOut(fadeOut, wrapRef)
  return (
    <section className={`phero dark${image ? ' has-img' : ''}${image?.srcSet ? ' has-team-photo' : ''}${tall ? ' tall' : ''}${blur ? ' phero-blur' : ''}`}>
      {image && <Photo className="phero-img" image={image} loading="eager" fetchPriority="high" capMobile={!image?.srcSet} />}
      <div className="wrap" ref={wrapRef}>
        {crumb && <p className="crumbs"><Link to="/">Start</Link> / {crumb}</p>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h1">{typeof title === 'string' ? <Letters text={title} per={45} delay={800} /> : title}</h1>
        {lead && <p className="lead">{typeof lead === 'string' ? <Letters text={lead} per={14} max={1400} delay={1500} /> : <Brandify>{lead}</Brandify>}</p>}
        {children}
      </div>
    </section>
  )
}
