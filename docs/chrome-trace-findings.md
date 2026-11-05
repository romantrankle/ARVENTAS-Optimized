# Chrome trace findings

Status: **measured.** Tool: `scripts/trace.mjs` (`node scripts/trace.mjs / --out=trace.json`).

Conditions: production build via `scripts/serve-dist.mjs` with brotli, real devtools throttling (150 ms RTT, 1.6 Mbps down, 750 kbps up, 4× CPU), 412×823 at DPR 1.75, cache disabled, fresh browser, Playwright Chromium on Windows 11.

These timings are slower than Lighthouse's mobile numbers on purpose. Lighthouse *simulates* throttling from an unthrottled run. This applies it for real, so the two are not comparable with each other.

## The bottleneck is layout, not CSS size or JavaScript

Home, first visit, largest single events:

| Work | Time (4× CPU) | Note |
|---|---|---|
| **Layout, first pass** | **2,903–3,950 ms** | 1,335 layout objects |
| Layout, second pass | 818–1,282 ms | Full relayout when web fonts apply |
| Style recalculation, first | 394–632 ms | 905 elements |
| CSS parsing | 22–29 ms | The stylesheet itself is cheap to parse |
| Selector matching | about 110 ms total | Measured on `/kontakt`, with selector stats on |
| Script evaluation | 11–16 ms | Compile and evaluate; hydration work appears later as function calls |
| Largest hydration task | 156–348 ms | After first paint |
| Image decode | about 12 ms | Not a factor |

The first long task runs about 3.5–4.9 s and contains parsing, style, layout and paint. FCP cannot happen before it ends. The document and hero image have both arrived within about 1 s, so **the delay is rendering, not network.**

## What makes layout slow

Largest layout on Home in a fresh browser, 4× CPU, medians of 5–7 runs. "No JS" removes the bundle so hydration can't affect the result.

| Experiment | Largest layout | Conclusion |
|---|---|---|
| Full page | 1,448 ms | Reference for this series |
| No JavaScript | 1,214–1,354 ms | JavaScript is not the cause |
| No JS, no web fonts | 1,786 ms | Downloading web fonts is not the cause |
| No JS, no CSS at all | 426 ms | CSS plus DOM drives the cost |
| Synthetic page, 1,335 spans | 111 ms | Object count alone is not the cause |
| **One font description everywhere** | **314 ms** | **Main cause** |
| One font size only | 770 ms | Most of it is size variety |
| One font family only | 1,838 ms | Family is not the driver |
| No SVG / no images / no pseudo-elements | 1,920 / 1,227 / 2,173 ms | Not the cause |
| No animations / no filters | 1,339 / 1,340 ms | Not the cause |
| `position: static` everywhere | 758 ms | Some effect, not usable |
| Same page, repeat load in same browser | **43–101 ms** | **It is a cold-start cost** |

Conclusion: the browser must create a font instance for each distinct size and weight on first use, and Home has **53 distinct combinations** (35 on Owners, 28 on Kontakt). Those instances are cached afterwards, which is why repeat loads are about 20× faster. Lighthouse always starts a fresh browser, so it always pays the full cost.

**How much of this reaches real phones is unknown.** Font creation is platform-specific and these tests ran on Windows. Some of the cost may be specific to this platform, but that was not tested on Android or Linux. Only field data can settle it.

## Tested and rejected

Each of these was measured and made no reliable difference, so none was kept.

| Change | Result |
|---|---|
| Replace arrow glyphs missing from the web fonts | Within noise (1,223 vs 1,015 ms) |
| Disable `hyphens: auto`, `text-wrap` | Within noise |
| Shorten fallback font stacks | Same in real-throttling traces |
| `blocking="render"` on font preloads | First layout still ran in fallback fonts; attribute removed |
| `content-visibility` on non-scroll sections (map, knowledge, contact, footer) | First layout unchanged; about 1–2 points, within noise; reverted |

`content-visibility` on **all** below-the-fold sections did cut layout from 1,184 to 342 ms. It was not applied: it replaces section heights with estimates, and the cube, sticky stacks and report stack read those heights to drive their scroll positions.

## Resource competition, found and fixed

| Finding | Evidence | Fix |
|---|---|---|
| Below-the-fold images started before LCP | `loading="lazy"` images requested at about 150 ms | `Photo` sets their `src` after first paint |
| Six cube faces downloaded immediately (about 620 KB) | CSS backgrounds in `ProcessTimeline`, not going through `Photo` | Set after first paint |
| `KnowledgeTabs` marked a far-below-fold image `fetchpriority="high"` | 87 KB at 41 ms | High priority only where it is really the first screen |
| Hero files of 775 KB to 3.1 MB on phones | Waterfall | Responsive variants and a light first-paint version |
| JS requested at high priority ahead of the hero | Waterfall | `fetchpriority="low"` on module scripts |
| Second layout from late font weights | Weights 500/600/700 requested only after style | All used weights preloaded |

## LCP element

- **Mobile, first visit (Home):** the cookie dialog paragraph (`#cookie-intro`), 37,506 px. The dialog is the largest paint for a first-time visitor.
- **Mobile, returning visit (Home):** a hero heading span (`SPAN`), 24,465 px.
- **Mobile, other pages:** the hero photo (`img.phero-img`, `.ow-pic img`), or text on `/kapitalanlage-immobilien`.
- **Desktop (Home):** footer heading `.sf-cta h2`. It is laid out and painted early even though the page covers it, and Chrome's LCP doesn't account for occlusion.

Home's hero is a video with a CSS background poster (`.hv-vid`), not an `<img>`. The poster is preloaded and discovered from the HTML without JavaScript, and it is not the LCP element in these traces.

## GSAP

`gsap` is listed in `package.json` but **no file in `src/` imports it**; only `internal/strategie-old/` does, and that isn't built. There is no GSAP or ScrollTrigger on the site, so no time is spent there. Scroll scenes are hand-written with `requestAnimationFrame` and they did not appear among the largest long tasks.
