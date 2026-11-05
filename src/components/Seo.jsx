import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { subscribe, tr } from '../i18n.js'
import { useLang } from './LangToggle.jsx'

// Beim Vorrendern liest scripts/prerender.mjs diese Werte für den <head> der statischen Datei.
export const headSink = {}

// Setzt Seitentitel, Beschreibung und Canonical. Keine erfundenen strukturierten Unternehmensdaten.
export default function Seo({ title, description, canonical }) {
  const lang = useLang()
  // Das Wörterbuch lädt verzögert: nach dem Laden den Titel neu übersetzen, auch wenn die Sprache gleich bleibt.
  const [dict, setDict] = useState(0)
  useEffect(() => subscribe(() => setDict((n) => n + 1)), [])
  const { pathname } = useLocation()
  if (import.meta.env.SSR) Object.assign(headSink, { title, description, canonical })
  useEffect(() => {
    document.title = tr(title)
    let m = document.querySelector('meta[name="description"]')
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    if (description) m.content = tr(description)
    const c = document.querySelector('link[rel="canonical"]')
    // Die Domain bleibt die aus dem statischen HTML, auch auf der Vorschau-Adresse.
    if (c) c.href = new URL(canonical || pathname, c.href).href
  }, [title, description, canonical, pathname, lang, dict])
  return null
}
