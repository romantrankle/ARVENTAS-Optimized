# AEO and GEO readiness

AEO and GEO have no standard score, so this uses checkable criteria. No implementation guarantees that AI systems will mention or cite the site. No copy was changed.

## Readiness

Status based on the production build. "After deploy" means the criterion is met in the build but can't take effect until it's live.

| Criterion | Status | Evidence |
|---|---|---|
| Content readable without JavaScript | **Met** | Test with JavaScript off; 300–800 words per page in static HTML |
| Answers crawlable, even when collapsed | **Met** | FAQ answers are in the static HTML |
| Search and answer crawlers allowed | **After deploy** | `public/robots.txt`; the live site is still `noindex` |
| Training crawlers handled separately | **Met** | See below |
| Consistent identity (name, address, phone) | **Met on the site** | Impressum matches schema; external listings **not checked** |
| Clear service descriptions | **Met** on main pages | Page copy, `Service` schema |
| Direct answers under question headings | **Partial** | Articles yes, service pages rarely |
| Service pages link to related articles | **Not met** | Needs a copy decision |
| Authorship, dates, sources | **Not met** | Articles say "Quellen: noch zu ergänzen" |
| Original evidence, case studies | **Not met** | None published |

## Crawler policy

`public/robots.txt` allows search and answer crawlers through the default rule (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot and others). It blocks these model-training crawlers: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent.

This is a business decision, set to the more conservative default. To change it, edit that file. `robots.txt` is voluntary, and CDN or firewall bot rules were not reviewed.

`llms.txt` was not added: it's optional and experimental, and not a ranking factor.

## Content work that needs your input

These can't be solved with code, because the answers have to come from you.

1. **Costs.** "Wann entstehen Kosten?", "Was kostet der Objektreport?" and "Welche Kosten entstehen für Investoren?" all say the terms aren't approved. These are probably the most-asked commercial questions.
2. **Duration.** "Wie lange dauert die Erstellung?" has no concrete answer.
3. **FAQ sign-off.** Answers labelled "Redaktionelle Freigabe offen" stay out of `FAQPage`. Each approved one is included automatically.
4. **Article sign-off.** Add author, date and sources, then remove the "Entwurf" label. Until then, consider `noindex` for the five articles.
5. **Internal links.** For example `/kapitalanlage-immobilien` → `/wissen/kapitalanlage-einordnen`.

No keyword map is included: there's no keyword data available, and search volumes won't be invented.

## Repeatable benchmark

**All results: NOT MEASURED.** Nothing can be cited while the live site is `noindex`. Run this about 4–8 weeks after go-live and then monthly, in a clean session, on Google AI Overviews/AI Mode, ChatGPT Search, Bing Copilot and Perplexity.

Prompts (from the site's positioning, not search data):

1. Was sind Off-Market-Immobilien und wie funktioniert der Zugang?
2. Wie verkaufe ich meine Immobilie diskret, ohne sie öffentlich anzubieten?
3. Welche Anbieter vermitteln Off-Market-Immobilien in Deutschland?
4. Was ist ein Objektreport und was enthält er?
5. Worauf sollten Investoren bei Off-Market-Angeboten achten?
6. Was ist ARVENTAS? (checks identity accuracy)

| Test date | Platform | Exact prompt | Brand mentioned | URL cited | Answer accurate | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |
