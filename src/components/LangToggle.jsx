import { useSyncExternalStore } from 'react'
import { getLang, setLang, subscribe } from '../i18n.js'

export const useLang = () => useSyncExternalStore(subscribe, getLang, () => 'de')

export default function LangToggle() {
  const l = useLang()
  return (
    <div className="lang" role="group" aria-label="Sprache / Language">
      <button type="button" aria-pressed={l === 'de'} lang="de" onClick={() => setLang('de')}>DE</button>
      <span aria-hidden="true">/</span>
      <button type="button" aria-pressed={l === 'en'} lang="en" onClick={() => setLang('en')}>EN</button>
    </div>
  )
}
