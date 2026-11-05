# Accessibility audit

Test date: 2026-11-05. Tools: axe-core via Playwright (WCAG 2.0, 2.1 and 2.2 A/AA rules), Lighthouse 12.8.2, keyboard tests in Playwright.

## Lighthouse's 100 was misleading

Baseline Lighthouse Accessibility was 100 on every page, but that score didn't reflect the pages. Lighthouse runs as a first-time visitor, so the cookie dialog is open and the whole page behind it is `inert`. It effectively audited only the dialog.

The axe tests therefore set the consent choice first and audit the real page. This found issues Lighthouse never reported, listed below. Lighthouse scores in these docs still have this limitation.

## Issues found and fixed

| Issue | Rule / impact | Where | Fix | Visual change |
|---|---|---|---|---|
| `aria-label` on elements with no role, so assistive technology may ignore it | `aria-prohibited-attr`, serious | `Letters`, `RevealText`, `ScrollWords` (most headings on most pages) | `role="group"` where the element isn't a heading | None |
| Focus jumped to `<main>` on first load, so Tab skipped the skip link and navigation | Keyboard | `App.jsx` | Focus only moves on page change, as the code comment always intended | None |
| Animated text stayed invisible without JavaScript | Robustness | `.rv`, `.letters .lc` | `<noscript>` style makes it visible | None with JavaScript on |
| Cookie dialog locked the page without JavaScript | Keyboard, robustness | `Consent.jsx` | Hidden via `<noscript>`; `inert` only set after hydration | None with JavaScript on |

Also added: an inline check so returning visitors don't see the cookie dialog flash, tested.

## Results

| Check | Result |
|---|---|
| axe, critical and serious violations, 12 main routes, desktop and mobile | **0** (after fixes) |
| Lighthouse Accessibility, 6 routes, mobile and desktop | See `docs/lighthouse-results.md` |
| Skip link reachable with first Tab and moves to content | Pass |
| Cookie dialog: appears, choice persists, no lock afterwards | Pass |
| Mobile menu opens and closes with Escape | Pass |
| FAQ opens by click, `aria-expanded` correct | Pass |
| Only one `h1` per page | Pass, 12 main routes |
| `lang` attribute, correct after language switch | Pass |

## Exclusion in the automated test

`.reveal-text .w` is excluded from axe. These are the words of a scroll-driven text reveal, deliberately pale until scrolled to. They are `aria-hidden`, and the full text is exposed via `aria-label`. A sighted user sees low contrast on not-yet-revealed words by design, so a designer may want to review this against WCAG 1.4.3.

Other reveal animations are given time to finish before axe runs, because contrast is measured wrongly during a fade.

## Not tested

- Screen readers (NVDA, JAWS, VoiceOver). `role="group"` with a label inside text can be announced differently between them, so this is worth one manual pass.
- Safari and Firefox.
- Real mobile devices.
- A manual walkthrough of the multi-step investor form with keyboard only.
- 200% zoom and text-spacing overrides.

A passing automated score doesn't prove WCAG conformance. Automated tools catch only part of the possible issues.
