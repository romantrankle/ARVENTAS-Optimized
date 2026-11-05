import React, { startTransition } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App, { preloadRoute } from './App.jsx'
import { getLang, initI18n } from './i18n.js'

const root = document.getElementById('root')
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// Vorgerenderte Seiten werden in kleinen Abschnitten hydriert (startTransition), damit keine langen Tasks entstehen.
// Adressen mit Query (?region=…) und die englische Lesefassung rendern neu: Das statische HTML ist deutsch und kennt keine Parameter, es würde vom ersten Render abweichen.
if (root.hasChildNodes() && !location.search && getLang() === 'de') preloadRoute(location.pathname).finally(() => startTransition(() => hydrateRoot(root, app)))
else preloadRoute(location.pathname).finally(() => createRoot(root).render(app))

initI18n()
