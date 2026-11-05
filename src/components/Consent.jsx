import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'

const NECESSARY_ONLY = { necessary: true, statistics: false, marketing: false, externalContent: false }
const Ctx = createContext({ openSettings() {}, consent: NECESSARY_ONLY })
export const useConsent = () => useContext(Ctx)
const KEY = 'arventas-consent'
const LEGAL_PATHS = new Set(['/impressum', '/datenschutz'])

function storedChoice() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (value && !Array.isArray(value) && value.necessary === true && typeof value.statistics === 'boolean' && typeof value.marketing === 'boolean' && (value.externalContent === undefined || typeof value.externalContent === 'boolean')) {
      return NECESSARY_ONLY
    }
  } catch (e) { /* Ohne verfügbaren Speicher bleibt die Auswahl für diesen Besuch im Arbeitsspeicher. */ }
  return null
}

// Einwilligungssteuerung. Es sind keine optionalen Dienste oder externen Einbettungen eingebunden;
// ungenutzte Kategorien bleiben inaktiv und können nicht vorab freigegeben werden.
export function ConsentProvider({ children }) {
  const [saved] = useState(storedChoice)
  const [consent, setConsent] = useState(saved || NECESSARY_ONLY)
  const [hasChoice, setHasChoice] = useState(Boolean(saved))
  // Erster Render wie im statischen HTML (Dialog offen), danach zählt die gespeicherte Auswahl. Das Inline-Skript in index.html verhindert bis dahin das Aufblitzen.
  const [open, setOpen] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  useLayoutEffect(() => { if (saved) setOpen(false); setHydrated(true); document.documentElement.classList.remove('cc-set') }, [saved])
  const [manual, setManual] = useState(false)
  const [details, setDetails] = useState(false)
  const box = useRef(null)
  const { pathname } = useLocation()
  // Rechtsseiten sind auch ohne Auswahl lesbar; ihre eigenen Einstellungen bleiben aufrufbar.
  const visible = open && (manual || !LEGAL_PATHS.has(pathname))
  useEffect(() => {
    if (!visible) return
    const prev = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current && box.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
      if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter((el) => el.getClientRects().length > 0)
        const first = f[0], last = f[f.length - 1]
        if (!first) { e.preventDefault(); return }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        else if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      prev && prev.isConnected && prev.focus && prev.focus()
    }
  }, [visible])
  // Ablehnen, Speichern und "Alle akzeptieren" berücksichtigen nur tatsächlich eingebundene
  // Dienste. Aktuell ist das ausschließlich die notwendige Kategorie; neue Dienste erhalten
  // dadurch keine vorweggenommene Einwilligung.
  const save = () => {
    setConsent(NECESSARY_ONLY); setHasChoice(true); setOpen(false)
    try { localStorage.setItem(KEY, JSON.stringify(NECESSARY_ONLY)) } catch (e) { /* Auswahl gilt weiterhin für diesen Besuch. */ }
  }
  const showLegal = () => {
    setManual(false); setDetails(false); setOpen(!hasChoice)
  }
  // Stabiler Wert: Updates dieses Providers sollen beim Hydrieren nicht in die Seite durchschlagen.
  const value = useMemo(() => ({ consent, openSettings: () => { setManual(true); setDetails(true); setOpen(true) } }), [consent])
  return (
    <Ctx.Provider value={value}>
      <div className="consent-site" inert={(hydrated && visible) || undefined}>{children}</div>
      {visible && (
        <div className="cookie-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-h" aria-describedby="cookie-intro cookie-status" ref={box} tabIndex={-1}>
            <div className="cookie-top">
              <img src="/media/arventas-logo.png" width="132" height="80" alt="ARVENTAS" />
              <button type="button" className="cookie-close" aria-label="Cookie-Einstellungen schließen" onClick={() => setOpen(false)}><span aria-hidden="true">×</span></button>
            </div>
            <div className="cookie-body">
              <div className="cookie-heading"><Icon name="shield" size={28} /><h2 id="cookie-h">{details ? 'Cookie-Einstellungen' : 'Deine Privatsphäre ist uns wichtig'}</h2></div>
              <div className="cookie-copy">
                <p id="cookie-intro">{details ? 'Du kannst selbst entscheiden, welchen Kategorien du zustimmst. Deine Auswahl kannst du jederzeit ändern oder widerrufen.' : 'Wir verwenden technisch notwendige Cookies und vergleichbare Technologien, damit unsere Website sicher und funktionsfähig ist. Mit deiner Einwilligung können wir außerdem optionale Technologien für Statistik, Marketing und externe Inhalte verwenden.'}</p>
                {!details && <p>Du kannst selbst entscheiden, welchen Kategorien du zustimmst. Deine Auswahl kannst du jederzeit ändern oder widerrufen.</p>}
                <p className="cookie-policy-note"><span>Weitere Informationen findest du in unserer</span>{' '}<Link to="/datenschutz" onClick={showLegal}>Datenschutzerklärung</Link>.</p>
              </div>
              {details && <div className="cookie-options">
                <div className="cookie-option"><div><b>Notwendig</b><p>Für den Betrieb der Seite erforderlich. Immer aktiv.</p></div><input type="checkbox" checked disabled aria-label="Notwendig (immer aktiv)" /></div>
                <div className="cookie-option is-inactive"><div><b>Statistik</b><p>Derzeit nicht eingebunden.</p></div><input type="checkbox" checked={false} disabled aria-label="Statistik" /></div>
                <div className="cookie-option is-inactive"><div><b>Marketing</b><p>Derzeit nicht eingebunden.</p></div><input type="checkbox" checked={false} disabled aria-label="Marketing" /></div>
                <div className="cookie-option is-inactive"><div><b>Externe Inhalte</b><p>Derzeit nicht eingebunden.</p></div><input type="checkbox" checked={false} disabled aria-label="Externe Inhalte" /></div>
              </div>}
            </div>
            <div className="cookie-footer">
              <p id="cookie-status" className="cookie-status">Aktuell sind keine optionalen Dienste eingebunden. Die optionalen Kategorien bleiben deshalb deaktiviert.</p>
              <div className={`cookie-actions${details ? ' cookie-actions-details' : ''}`}>
                {details ? <>
                  <button type="button" className="btn btn-line" aria-label="Zurück" onClick={() => setDetails(false)}>Zurück</button>
                  <button type="button" className="btn btn-gold" aria-label="Auswahl speichern" onClick={save}>Auswahl speichern</button>
                </> : <>
                  <button type="button" className="btn btn-gold" aria-label="Alle ablehnen" onClick={save}>Alle ablehnen</button>
                  <button type="button" className="btn btn-line" aria-label="Einstellungen" onClick={() => setDetails(true)}>Einstellungen</button>
                  <button type="button" className="btn btn-gold" aria-label="Alle akzeptieren" onClick={save}>Alle akzeptieren</button>
                </>}
              </div>
              <div className="cookie-legal"><Link to="/impressum" onClick={showLegal}>Impressum</Link><Link to="/datenschutz" onClick={showLegal}>Datenschutz</Link></div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
