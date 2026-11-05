# SEO fixes

Lighthouse SEO went from **58 to 100** on all tested routes, mobile and desktop. Status: **measured** on the production build; hosting behaviour **not tested** on the real hosts.

## The failed audits

Read from the Lighthouse JSON reports (`docs/lighthouse/baseline-local/`), the same on all 6 baseline routes:

| Audit | Cause | Fix | Result |
|---|---|---|---|
| `is-crawlable` | `<meta name="robots" content="noindex, nofollow">` hard-coded in `index.html` | Set per build in `scripts/prerender.mjs` | Pass |
| `robots-txt` | No file existed, so the SPA fallback answered with HTML | Static `public/robots.txt` | Pass, also on the dev server |

Those two were the only failures. The rest of this document is what Lighthouse doesn't check.

## ⚠️ Indexing decision

Your site was deliberately `noindex`: `docs/UEBERGABE.md` said it isn't approved for publication. To give you SEO 100 with `npm run build`, as you asked, the build is now indexable by default.

| Build | Robots |
|---|---|
| `npm run build` | `index, follow` |
| On Vercel (`VERCEL` is set) | `noindex`: preview host; `arventas.de` is canonical |
| `SITE_INDEXABLE=false npm run build` | `noindex` |
| `404.html` | Always `noindex` |

**Nothing changes on the live site until you deploy.** Once you upload this build to arventas.de, search engines may index it, including draft articles and any demo content. Check `docs/UEBERGABE.md` section 7 first.

## Beyond Lighthouse

| Item | Before | Now | Verified by |
|---|---|---|---|
| Content in HTML | Empty `<div id="root">` | All 29 routes prerendered | Test, also with JavaScript off |
| Titles, descriptions | Same on every page until JS ran | Per page, in the static HTML | Test: present and unique |
| Canonical | None | Per page, on `arventas.de` | Test |
| Duplicate articles | `/insights/x` and `/wissen/x` identical | `/insights/x` canonical → `/wissen/x` | Build output |
| Sitemap | HTML fallback | Generated from the route list, 16 current URLs | Test: all return 200 |
| Unknown URLs | 200 (soft 404) | Real 404 with `404.html` | Test on local server |
| Open Graph, Twitter | None | Per page | Present; **not tested** in a social debugger |
| Structured data | None | See below | JSON parses, types present; **Rich Results Test not run** |
| `www` and trailing slash | Both hosts served 200 | Redirect rules in `.htaccess`, `vercel.json` | **Not tested** on the real hosts |
| Internal links | Not checked | None broken in static HTML | Test |

### Structured data

All from visible content and the Impressum. Nothing invented.

| Type | Where |
|---|---|
| `RealEstateAgent`, `WebSite`, `WebPage` | All pages |
| `BreadcrumbList` | All except home |
| `Service` | `/immobilie-verkaufen`, `/kapitalanlage-immobilien`, `/objektreport` |
| `FAQPage` | Only answers without the "Redaktionelle Freigabe offen" label: 1 of 6 on Owners, 4 of 5 on Investors, 2 of 4 on Kontakt |

Left out on purpose:
- `AggregateRating`, `Review`: no verified data.
- `Article`: the articles are drafts with no author or date.
- `Person`: the Impressum names the managing directors, but whether they should be public profiles in schema is your call.

## German and English

**No `hreflang`, and this is correct for the current architecture.** There are no separate English URLs. English is a client-side reading aid that translates the German page in place at the same URL, so there's nothing for `hreflang` to point at. Crawlers see German.

In the browser, language switching does update `<html lang>`, the title and the description (tested).

Separate `/en/…` pages would be the least disruptive way to get English indexed, since the prerender could generate them without touching the design. But `docs/UEBERGABE.md` describes these translations as simple and editorially unreviewed, so publishing them for search is a business decision. It isn't implemented.

## Before and after you deploy

- Check the `.htaccess` on Hostinger in a staging folder first. `DirectorySlash Off` and the rewrite rules have not run on LiteSpeed.
- Check on a Vercel preview that `/kontakt` serves `kontakt/index.html`, and that `/gibt-es-nicht` returns 404.
- Run the Rich Results Test and submit the sitemap in Search Console.
