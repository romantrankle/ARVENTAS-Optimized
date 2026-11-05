import { Roll } from './ui.jsx'
import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { STATES, MAP_VIEWBOX } from '../content/germany.js'

// Karte der 16 Bundesländer: Klick oder Liste wählt die Region, sie fließt als Bezug in die Kontaktanfrage ein. Ohne Auswahl gilt deutschlandweit.
const Map = memo(function Map({ selected, hovered, onHover, onSelect }) {
  const focus = STATES.find((s) => s.id === (hovered || selected))
  const sel = STATES.find((s) => s.id === selected)
  // Die Pfade sind rund 85 KB und liegen unterhalb des ersten Bildschirms: nicht ins statische HTML. Die Bundesländer stehen als Liste daneben im HTML.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <svg className="gm-map" viewBox={MAP_VIEWBOX} role="img" aria-label="Karte Deutschlands mit den 16 Bundesländern">
      <defs>
        <filter id="gm-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g>
        {mounted && STATES.map((s) => (
          <path key={s.id} d={s.d} className={`gm-state${s.id === selected ? ' is-selected' : ''}${s.id === hovered ? ' is-hover' : ''}`} onPointerEnter={() => onHover(s.id)} onPointerLeave={() => onHover(null)} onClick={() => onSelect(s.id === selected ? '' : s.id)}>
            <title>{s.name}</title>
          </path>
        ))}
      </g>
      {sel && <path d={sel.d} className="gm-outline" filter="url(#gm-glow)" pointerEvents="none" />}
      {focus && (
        <g pointerEvents="none">
          <circle cx={focus.cx} cy={focus.cy} r="3.5" className="gm-pin" />
          <text x={focus.cx} y={focus.cy - 12} textAnchor="middle" className="gm-label">{focus.name}</text>
        </g>
      )}
    </svg>
  )
})

export default function GermanyMap() {
  const [region, setRegion] = useState('')
  const [hover, setHover] = useState(null)
  const cur = STATES.find((s) => s.id === region)
  const list = useRef(null)
  // Ohne Auswahl springt „Region auswählen“ zur Liste der Bundesländer.
  const pick = () => { const b = list.current && list.current.querySelector('button'); if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.focus({ preventScroll: true }) } }
  return (
    <div className="gm">
      <div className="gm-mapwrap">
        <Map selected={region} hovered={hover} onHover={setHover} onSelect={setRegion} />
      </div>
      <div className="gm-side">
        <header className="sec-head gm-head">
          <p className="eyebrow rv">Deutschlandweit</p>
          <h2 id="h-de" className="h2 rv">Regional verstehen. Deutschlandweit verbinden.</h2>
          <p className="lead rv">Immobilienkompetenz für Eigentümer und Investoren in ganz Deutschland.</p>
        </header>
        <div className="gm-panel" aria-live="polite">
          <p className="gm-kicker">Ausgewählte Region</p>
          <p className="gm-name" key={region || 'de'}>{cur ? cur.name : 'Deutschlandweit'}</p>
          <p className="gm-text">{cur ? `Ihre Anfrage wird mit dem Bezug ${cur.name} vorbereitet – für Eigentümer und Investoren.` : 'Wählen Sie ein Bundesland auf der Karte oder in der Liste. Ohne Auswahl gilt Ihre Anfrage deutschlandweit.'}</p>
          <div className="gm-actions">
            {cur ? (
              <>
                <Link to={`/immobilie-verkaufen?region=${encodeURIComponent(cur.name)}#anfrage`} className="gm-go"><small>Für Eigentümer</small><b>Immobilie prüfen lassen</b><i aria-hidden="true">→</i></Link>
                <Link to={`/investorenkreis?region=${encodeURIComponent(cur.name)}`} className="gm-go"><small>Für Investoren</small><b>Suchprofil erstellen</b><i aria-hidden="true">→</i></Link>
                <button type="button" className="gm-reset" onClick={() => setRegion('')}>Auswahl zurücksetzen</button>
              </>
            ) : (
              <button type="button" className="btn btn-gold" onClick={pick}><Roll>Region auswählen</Roll> <span className="arr" aria-hidden="true">→</span></button>
            )}
          </div>
        </div>
        <ul className="gm-list" aria-label="Bundesländer" ref={list}>
          {STATES.map((s) => (
            <li key={s.id}>
              <button type="button" className={'gm-chip' + (s.id === region ? ' is-active' : '')} aria-pressed={s.id === region} onClick={() => setRegion(s.id === region ? '' : s.id)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)} onPointerEnter={() => setHover(s.id)} onPointerLeave={() => setHover(null)}>
                <span className="gm-iso">{s.iso.replace('DE-', '')}</span>{s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
