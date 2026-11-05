# ARVENTAS – Übergabe an den Webdesigner

Stand: Prototyp mit Demo-Inhalten. **Nicht zur Veröffentlichung freigegeben.** Der Build ist indexierbar, außer auf Vercel (Vorschau) und mit `SITE_INDEXABLE=false npm run build`. **Vor dem Hochladen auf arventas.de die offenen Punkte in Abschnitt 7 prüfen**: Sobald diese Fassung dort liegt, kann die Seite in Suchmaschinen erscheinen.

## 1. Start und Build
- Entwicklung: `npm install`, dann `npm run dev`
- Produktions-Build: `npm run build` (Ausgabe in `dist/`, jede Route als fertige HTML-Datei), Vorschau: `npm run preview`
- Tests: `npm run test:e2e` (Playwright und axe gegen den Build), Messung: `npm run lighthouse -- <name>`
- Hosting: Hostinger (arventas.de, `public/.htaccess`) und Vercel (Vorschau, `vercel.json`). Unbekannte Adressen liefern `404.html` mit Status 404.
- Neue Route: in `src/App.jsx` (`PAGES`) und `src/entry-server.jsx` (`CURRENT`) eintragen, sonst wird sie nicht vorgerendert.
- Hero-Fotos: Neue Motive brauchen eine Erstbild-Fassung in `public/media/lq` und einen Eintrag in `src/content/heroPreviews.js`. Ohne Eintrag lädt das Handy direkt die volle Qualität (funktioniert, nur langsamer).
- Rahmen: Vite, React, React Router (bestehendes Projekt, daher weiter JavaScript statt TypeScript).

## 2. Seiten (alle 12 Routen umgesetzt)
| Route | Datei | Inhalt |
|---|---|---|
| `/` | `src/pages/Home.jsx` | Scroll-Film-Hero plus 10 weitere Sektionen und Footer |
| `/immobilie-verkaufen` | `Owners.jsx` | Eigentümer: Tabs, Ablauf, FAQ, Anfrageformular |
| `/kapitalanlage-immobilien` | `Investors.jsx` | Investoren: Prüfmatrix, FAQ |
| `/investorenkreis` | `InvestorCircle.jsx` | 4-stufige Registrierung (Suchprofil) |
| `/objektreport` | `ReportPage.jsx` | Bausteine, interaktive Musteransicht, FAQ |
| `/ueber-uns` | `About.jsx` | Modell, Werte, Struktur-Platzhalter |
| `/partner` | `Partners.jsx` | Prozess, Partnerformular |
| `/wissen`, `/wissen/:slug` | `Knowledge.jsx`, `Article.jsx` | Editorial, Beitragsvorlage (3 Entwürfe) |
| `/kontakt` | `Contact.jsx` | Drei getrennte Zugänge, Region-Vorbelegung (`?region=`) |
| `/impressum`, `/datenschutz` | `Legal.jsx` | Vorbereitete Rechtsseiten mit Platzhaltern |
| `*` | `NotFound.jsx` | 404 |

## 3. Komponenten (`src/components`)
Logo/Header (`Header.jsx`), Footer (`Footer.jsx`), Buttons, Section Header, Tabs, FAQ, Platzhalter (`ui.jsx`), Scroll-Film (`ScrollFilm.jsx`), Report Viewer (`ReportViewer.jsx`), Timeline (`ProcessTimeline.jsx`), Matching Illustration (`MatchingIllustration.jsx`), Germany Region Selector (`GermanyRegionSelector.jsx`), Lead Forms und Investoren-Wizard (`forms.jsx`), Consent Controls (`Consent.jsx`), Markenschreibweise (`Brand.jsx`), SEO (`Seo.jsx`), Seiten-Hero (`PageHero.jsx`).
Design-Tokens: `src/styles/global.css` (`:root`). Inhalte und Auswahllisten: `src/content/data.js`.

## 4. Designgrundlage
- Farben: Gold #B09E80, Marineblau #192537, Elfenbein #F5F3EF, Schwarz #0B0B0B. Weiß nur für die Wortmarke und Lesbarkeit.
- Schriften: Playfair Display (Headlines), Inter (Fließtext, Navigation, Formulare). Griechisches Lambda kommt aus Inter (Greek-Subset).
- Keine dekorativen Verläufe, Gold-Glows, Drop-Shadows, Neonfarben oder Glas-Effekte.
- Motion: UI 200 ms, Reveals 600 ms, kein Custom Cursor, kein Autoplay-Ton, kein Scroll-Snapping. Bei reduzierter Bewegung statische Alternativen.
- Logo: Originaldatei unverändert (`public/media/arventas-logo.png`, nur leerer Rand beschnitten), eine zentrale Komponente im Header und Footer.
- **Markenschreibweise:** Sichtbar „ΛRVENTΛS“ (Komponente `Brand.jsx`, Brandbook). Technische Lesefassung „ARVENTAS“ für Alt-Texte, Titel, Meta, URLs und Screenreader.

## 5. Abweichungen und Entscheidungen
1. **Startseiten-Hero:** Auf ausdrücklichen Wunsch bleibt der scroll-gesteuerte Film (Bildsequenz) erhalten. Das Lade-Intro wurde entfernt (Briefing: „kein vorgeschaltetes Logo-Intro“); der Hero ist sofort sichtbar, ein Standbild füllt die Fläche, bis die Frames geladen sind. Das Briefing nennt außerdem keine sehr langen fixierten Scroll-Szenen. Der Film ist 1250vh lang (mobil 900vh) und kann bei Bedarf gekürzt werden. Der Header liegt dabei transparent über dem Film und wird danach zur flachen Marine-Leiste.
2. **Gradienten:** Die frühere Verlaufs-Abdunklung des Films wurde durch ein gleichmäßiges Overlay ersetzt.
3. **Brandbook:** Es liegen bisher nur einzelne Screenshots vor (Seiten zu Markenname, Verwendung, Markenessenz, Zielgruppe, Logo-System). Erkennbar übernommen: Schreibweise mit Lambda. Alle übrigen Brandbook-Vorgaben stammen aus dem Briefing (Farben S. 14, Typografie S. 12, Bildsprache S. 22).
4. **Interne Strategie:** Die frühere Seite `/strategie` (internes Go-to-Market-Dokument) ist nicht mehr öffentlich. Sie liegt unverändert unter `internal/strategie-old/` und wird nicht gebaut.
5. **Deutsch und Leseversion:** Alle Originaltexte sind Deutsch in Sie-Ansprache. Zusätzlich gibt es einen DE/EN-Umschalter im Header als Lesehilfe für die Abnahme (`src/i18n.js`, Wörterbuch `src/content/en.js`). Die englischen Texte sind eine einfache Übersetzung ohne redaktionelle Prüfung. Vor Veröffentlichung entscheiden, ob der Umschalter bleibt (Briefing: alle sichtbaren Texte Deutsch).

## 6. Integrationspunkte (nicht angebunden, nichts vorgetäuscht)
- Formulare (Eigentümer, Partner, Investorenkreis): laufen im Demo-Modus, `submitDemo()` in `src/components/forms.jsx` ersetzen durch einen serverseitigen Endpunkt. Fehlerzustand testbar mit `?demo=fehler`.
- onOffice (operatives CRM), n8n (Workflow), DeepImmo und PriceHubble (interne Datenquellen), Supabase (mögliche Analyse-Datenebene): nur serverseitig anbinden, der Browser erhält keine Schlüssel. Benötigte Freigaben: Datenschutz, Auftragsverarbeitung, Zugangsdaten.
- Einwilligung: `Consent.jsx` speichert nur die Auswahl. Statistik- oder Marketing-Dienste sind nicht eingebunden; vor Aktivierung technische Einwilligungsumsetzung ergänzen.
- Kalender: keine Integration, daher „Termin anfragen“ statt Buchung.

## 7. Fehlende Originaldaten und Freigaben (offene Produktionsaufgaben)
- Brandbook vollständig (nur Screenshots erhalten)
- Transparente/horizontale Logo-Variante für den Header (aktuell die quadratische Datei, siehe Medienverzeichnis)
- Echte Fotografie, Architekturclip, Porträts und Team-Profile (Name, Rolle, Fachgebiet)
- Verifizierte Kontaktdaten, Impressum-Pflichtangaben, Unternehmensstruktur
- Partnerlogos nur nach bestätigter Beziehung und Nutzungsfreigabe (Baumann Immobilien und ROUD-HAUS erscheinen bewusst nicht)
- Konditionen und Bearbeitungszeit (FAQ-Antworten mit Kennzeichnung „Redaktionelle Freigabe offen“)
- Echte anonymisierte Objektreport-Daten; bis dahin nur das gekennzeichnete Muster
- Redaktionelle Freigabe der Wissensbeiträge (derzeit Entwürfe)
- Rechtliche Prüfung von Datenschutz, Impressum und Cookie-Texten

## 8. Teststatus (tatsächlich durchgeführt)
- Build: `npm run build` erfolgreich.
- Alle 12 Routen plus 404 im Browser (Chromium, Playwright) geladen: keine Konsolenfehler.
- Prüfbreiten 360, 390, 768, 1024, 1440, 1920 px: keine horizontale Überbreite auf allen Seiten.
- Interaktionen geprüft: Formularvalidierung, Ladezustand, Demo-Bestätigung, Fehlerzustand, mehrstufige Registrierung (Pflichtfelder, Zurück, Zusammenfassung), Report-Tabs per Tastatur, Karte und Liste synchron, Region-Vorbelegung, Matching-Auswahl, Cookie-Dialog (Öffnen, Escape), mobiles Menü (Öffnen, Escape).
- Nicht getestet: Screenreader, Kontrastprüfung mit Werkzeug, Safari und Firefox, Lighthouse-Werte, echte Mobilgeräte. Es werden keine Performance- oder Ladezeitwerte behauptet.
- Status je Funktion: visuell umgesetzt und im Prototyp funktionsfähig; **nicht** mit echtem Backend verbunden; **nicht** für die Veröffentlichung freigegeben.

## 9. Brandbook-Abgleich (Prüfung vom 17.10.2026)
Grundlage: nur die als Screenshots gelieferten Brandbook-Seiten (Markenname, Verwendung, Markenessenz, Zielgruppe, Logo-System/Variationen/Symbol/Freiraum, Typografie, Farben, Fotografie-Richtung, Tonfall, Website-Richtung, Do's/Don'ts) plus die Vorgaben des Briefings. Das vollständige Brandbook liegt nicht vor.

**Bestätigt und korrigiert**
- Sichtbare Markennennung: Neun Stellen schrieben noch „ARVENTAS“ (Formular-Einwilligungen, Film-Hinweis, FAQ, Partner-Seite, Über uns, Startseite). Jetzt überall ΛRVENTΛS über `Brandify`/`Brand`; technische Lesefassung nur in Alt-Texten, Titeln, Meta, Screenreader-Text.
- Farben: Die vier Brandbook-Farben stimmten. Entfernt wurden abweichende Zusatzfarben: Karten-Hover `#2D405B` (jetzt Gold-Kontur), graue Textfarben `#3D3F43`/`#CFD1D6` (jetzt Schwarz/Elfenbein mit Transparenz), grauer Formularrand `#8D9199` (jetzt Marine mit Transparenz). Schrift auf Dunkel nutzt Elfenbein statt Weiß; reines Weiß nur noch als Formular- und Infografikfläche (`--surface`).
- Fotos: Die eingebaute Vignette (hinzugefügter Schatten/Verlauf, laut Briefing S. 22 untersagt) und die starke Abdunklung wurden entfernt; die Bilder sind neu und natürlicher abgestimmt. Textlesbarkeit über Fotos bleibt über ein gleichmäßiges Overlay gesichert (berechnet, mindestens 4,5:1 an den hellsten Stellen).
- Typografie: Inter 700 wurde künstlich erzeugt (nur 400/500/600 geladen). `b`/`strong` jetzt 600.
- Kontrast: Der „Demo“-Hinweis und Formular-Meldungen auf Anfrage- und Partnerseite hatten hellen Text auf heller Fläche (1,2:1). Behoben.
- Leere Bereiche beim schnellen Scrollen: Einblend-Animationen starteten erst beim Sichtbarwerden; bei schnellem Scrollen waren ca. 23 % der sichtbaren Inhalte noch ausgeblendet. Jetzt Start 25 % vor dem Sichtbarwerden plus Nachholmechanismus (ca. 2–3 % in der Einblendung).
- Logo: Header-Logo vergrößert (80 px, mobil 64 px; Wortmarke war mobil nur ca. 6 px hoch). Datei bleibt unverändert (Pixel-Vergleich mit der gelieferten Datei: Differenz 0; Seitenverhältnis 1,647 in Header, Footer und Intro).
- Favicon ergänzt: unveränderter Ausschnitt des Logo-Symbols (Brandbook zeigt „Logo-Symbol“ separat); Freigabe der Verwendung bitte bestätigen.
- Mobil: Karten auf der Startseite zeigten einen schwarzen Rahmen um das Bild (Hover-Effekt ohne Hover). Entfernt. Zweispaltige Textblöcke: Abstand Überschrift zu Text angepasst.

**Geprüft und in Ordnung**
- Keine Verläufe, keine Schatten, keine Glas-Effekte im Code. Alle internen Links und Ankerziele funktionieren. Keine horizontale Überbreite bei 360, 390, 768, 1024, 1440, 1920 px. Alle 830 geprüften Textelemente auf einfarbigen Flächen erfüllen den Kontrast.

**Nicht verifizierbar (bitte manuell prüfen)**
- Logo-Schutzraum und Mindestgrößen: Brandbook-Seite „Freiraumregeln“ liegt nur als Bild vor, Maße nicht lesbar. Horizontale Logo-Variante fehlt (siehe Medienverzeichnis).
- Schriftgewichte der Headlines (aktuell Playfair Display 500; Brandbook nennt keine lesbaren Gewichte).
- Gold/Elfenbein-Hex gegen das Original-Brandbook: Werte stammen aus dem Briefing (S. 14), nicht aus einer eigenen Messung im PDF.
- Fotografie-Richtung (Brandbook „Vermeiden“-Liste nicht vollständig lesbar); Fotos sind Platzhalter (Unsplash) und der Film ist eine KI-Illustration.
- Echte Geräte, Safari, Firefox, Screenreader.
