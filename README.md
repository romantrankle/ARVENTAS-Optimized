# ARVENTAS Optimized

Website for ARVENTAS, an off-market real estate business operating across Germany, connecting property owners and investors. This repository is the performance, SEO and accessibility optimized version of the site.

> **Status:** prototype with demo content, not yet approved for publication. Forms run in demo mode with no backend, and knowledge articles are marked as drafts. See [the handover notes](docs/UEBERGABE.md) and the [media list](docs/MEDIENVERZEICHNIS.md).

## Key features

- **Prerendered pages:** 29 routes are generated as static HTML with their own title, description, canonical URL and structured data, then hydrated by React.
- **Audience pages:** owners (`/immobilie-verkaufen`), investors (`/kapitalanlage-immobilien`), investor circle sign-up (`/investorenkreis`), property report (`/objektreport`), partners, knowledge articles, about, contact and legal pages.
- **Interactive sections:** hand-written scroll scenes (including a 3D process cube and a report stack), a Germany region map, tabs, FAQ accordions, sliders, and a multi-step investor form with validation.
- **German and English:** German is the original language. A client-side toggle translates the page in place as a reading aid, at the same URL.
- **Cookie consent dialog:** stores the visitor's choice. No optional tracking services are included.
- **Responsive images:** `srcset` variants, deferred offscreen images, and a light first-paint hero image on phones.
- **Hosting configuration:** security headers, caching, redirects and real 404 pages for Hostinger and Vercel.

## Technologies

| Area | Used |
|---|---|
| Framework | React 19, React Router 7 |
| Build | Vite 8, custom prerender step, Beasties (critical CSS) |
| Language | JavaScript (JSX) |
| Styling | One global stylesheet, `src/styles/global.css` |
| Fonts | Self-hosted WOFF2 (Instrument Serif, Manrope) |
| Testing | Playwright, axe-core, Lighthouse, Lighthouse CI |
| CI | GitHub Actions |

Node.js 22 is used in CI and is the recommended version.

## Installation

```bash
git clone https://github.com/romantrankle/ARVENTAS-Optimized.git
```

```bash
cd ARVENTAS-Optimized
```

```bash
npm ci
```

## Local development

```bash
npm run dev
```

This starts the Vite development server at `http://localhost:5173`.

**Don't measure performance on this server.** It serves unbundled source files with no prerendering or compression, so its Lighthouse scores don't reflect the real site. Use the production preview below.

## Environment variables

The site runs with no environment variables and doesn't need a `.env` file. These optional ones change build or test behaviour:

| Variable | Used by | Effect |
|---|---|---|
| `SITE_INDEXABLE=false` | Build | Forces `noindex` on all pages |
| `VERCEL` | Build (set automatically by Vercel) | Forces `noindex`, because Vercel is the preview host and `arventas.de` is canonical |
| `BASE_URL` | Tests | Runs the tests against an already running site |
| `CI` | Tests | Enables a retry and a fresh test server |

## Build and preview

```bash
npm run build
```

Output goes to `dist/`, with one HTML file per route, `404.html` and `sitemap.xml`.

```bash
npm run preview
```

This serves the build at `http://localhost:4173` with brotli compression and the same security headers as `vercel.json`.

## Tests and measurement

Run these against a finished build:

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

```bash
npm run lighthouse -- my-run
```

Results are written to `docs/lighthouse/my-run/`. To compare two builds fairly on a busy machine, use `node scripts/lighthouse-ab.mjs <other-dist-folder> <label>`, which alternates between them. `node scripts/trace.mjs /` records a Chrome trace with real throttling.

## Deployment

| Host | Role | Configuration |
|---|---|---|
| Hostinger | `arventas.de` | Upload `dist/`; `public/.htaccess` is included in the build |
| Vercel | Preview at `arventas.vercel.app` | `vercel.json` |

**A normal build can be indexed by search engines.** Before uploading to `arventas.de`, check the open items in `docs/UEBERGABE.md` section 7, or build with `SITE_INDEXABLE=false`. New routes must be added in both `src/App.jsx` (`PAGES`) and `src/entry-server.jsx` (`CURRENT`) to be prerendered.

## Project structure

```text
.github/workflows/   Build, test and Lighthouse CI workflow
docs/                Handover notes, media list, audits, Lighthouse reports
internal/            Archived older pages, not part of the build
public/              Static files: images, video, fonts, robots.txt, .htaccess
scripts/             Prerender, preview server, Lighthouse and trace tools
source/              Raw source media, not part of the build
src/
  components/        Shared React components
  content/           Page content, image data, English dictionary
  pages/             One component per page
  styles/            global.css
  App.jsx            Routes and page shell
  entry-server.jsx   Prerender entry, route list, structured data
  main.jsx           Browser entry and hydration
tests/               Playwright and axe tests
index.html           HTML template
vercel.json          Vercel headers and URL settings
vite.config.js       Vite configuration
```

## License

See [LICENSE.md](LICENSE.md).
