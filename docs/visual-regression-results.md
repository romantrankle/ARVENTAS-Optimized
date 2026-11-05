# Visual and functional regression results

Status: **measured**, comparing the original build (commit `eb6b28d`) with the optimized build. These comparisons were one-off scripts, not part of `npm run test:e2e`. The automated suite covers the specific regressions found, not pixel comparison.

## Regressions found and fixed

All were caused by this optimization work and caught before any deploy.

| Regression | Cause | How it was found | Fix |
|---|---|---|---|
| **Cube image missing** (desktop) | CSS purge removed `pck-f--front` and siblings, built at runtime as `'pck-f--' + f` | Screenshot comparison | Protected; test added |
| **Footer wordmark stroke joins** | Purge removed `.gR .gE .gN .gT .gS`, built as `'g' + c` | Live-class crawl (no screenshot flagged it) | Protected; test added |
| Owners page 800 px too tall | Purge removed attribute selectors such as `img[src^="/media/team/"]` | Page height comparison | All 83 attribute rules kept |
| Hero stuck on low-quality preview at 1024 px | Preview's width descriptor let any screen up to about 1439 px select it | New tablet test | `1w` descriptor; test added |
| Content thrown away at hydration, blank flash | Update reached a Suspense boundary still waiting for its chunk | DOM identity check (React logged no error) | Route chunk loads before hydration; test added |
| Content hidden from crawlers and no-JS visitors | React streaming output put it in a hidden `<div>` | No-JS test | Synchronous prerender; test added |
| Fallback font until full CSS loaded, reflow | Critical CSS tool dropped `@font-face` | Layout comparison, CLS 0.07 | Rules inlined; CLS back to 0 |
| One-frame blank on remounted photos | First-paint hook started `false` on every mount | Code review after a suspicious screenshot | `useSyncExternalStore`; test added |
| Query URLs and returning English visitors mismatched | Static HTML has neither | Tests | Those render on the client |

## CSS purge validation

The purge was one-off, removing about 28% of `global.css` from the source. No build step does this, so future classes can't be removed by it.

- Every removed selector was checked against the source for runtime construction: **0** remaining cases.
- Classes seen live in the original build across 21 routes, 2 viewports and UI states (455 classes): after protecting the families above, none were left without rules. The crawl that found the wordmark was not re-run after the final purge. Those classes are covered by tests instead.
- All 83 attribute-selector rules are preserved.

## Screenshot comparison

Pixels differing by more than 28/255 on any channel, after in-view images finished loading.

| Scope | Result |
|---|---|
| Page height, 17 routes, 1440 and 412 px | **Identical on all** |
| Page height, 12 main routes, 1024, 768, 390 px | **Identical on all** |
| Hero top, 12 main routes, 1440 / 1024 / 768 / 390 px | Max 0.7 / 0.6 / 1.9 / 0.7% |
| Scroll walk, Home and Objektreport, 1440 and 412 px (before the last two photo fixes) | **0.0% at all 48 positions** |
| Scroll walk, 15 more routes, 412 px | ≤1.1%, except rotating slides |
| Scroll walk, 3 routes at 1024 px, 4 at 768 px | ≤1.5%, one exception below |
| Images stuck after 12 s | **None** |
| UI states, desktop and mobile: cookie dialog, details, menu, tabs, form errors, FAQ, map, process toggle, wizard, language, reduced motion | ≤0.86% |

### Larger differences at 1440 px, and what they are

A scroll walk of 15 routes at 1440 px showed 5–65% differences at some positions, with images blank in one build or the other. Two explanations were checked:

1. **Rotating content**, such as the Investors slide.
2. **Delayed painting of very large images in software-rendered headless Chrome.** A settle test of 6 such positions, run twice per build, showed the **original build behaves the same**, with 20–65% differences lasting 3–6 s and sometimes longer. The direction varied between runs, and every image reported complete.

These are test-rig effects, not regressions. **However, that walk ran before the last two photo fixes.** The 1440 px hero tops were re-verified afterwards; the full walk at that width was not repeated.

One position at 1024 px (`/immobilie-verkaufen`, 10.1%) was a blank process image with identical layout. It prompted the remount review. After the fix, the tests confirm no photo mounts without a source, but this position was not re-compared.

## Functional tests

`npm run test:e2e`, Playwright against the production build: **230 passed, 0 failed, 6 skipped.** The skips are device-specific (no cube under 860 px; language toggle in the mobile menu; desktop has no burger menu). Viewports: 1440, 1024, 768, 390 px.

| Area | Checked |
|---|---|
| 13 main routes | Load without console errors, failed requests or hydration loss; one `h1`; content and metadata in static HTML; axe |
| Accessibility | No critical or serious axe violations (scroll-reveal words excluded, see `accessibility-audit.md`) |
| Regressions | Cube faces, wordmark classes, cube visible, map, photos get sources, preview only under 720 px |
| Interactions | Cookie choice persists, FAQ, menu with Escape, language switch and restore, skip link, client navigation updates title and canonical, query URL, hash deep link, returning English visitor |
| SEO | Unique titles, sitemap entries return 200, robots content type, internal links, real 404 |
| No JavaScript | Content visible, dialog doesn't lock the page |

Limits:

- **Form submission** is only compared visually in its validation state; the forms run in demo mode with no backend.
- **Sliders and scroll scenes** were compared at fixed scroll positions, not as continuous playback. No human watched them play.
- **Chromium only.** Safari and Firefox not tested. No real devices.

**Please check by eye before deploying:** the Home cube, the footer wordmark, and hero images on a real phone.
