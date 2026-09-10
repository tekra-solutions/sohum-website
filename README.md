# Sohum Systems — Website

A rebuild of sohumsystems.com as a modern federal-technology company site.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (26 static routes)
npm run start   # serve the production build
npm run lint
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx              Root layout, fonts, Organization JSON-LD
│   ├── page.tsx                Homepage
│   ├── capabilities/
│   │   ├── page.tsx            Capability index, grouped by pillar
│   │   └── [slug]/page.tsx     11 prerendered capability pages + Service JSON-LD
│   ├── federal/                Federal mission positioning
│   ├── contract-vehicles/      Procurement data, active + expired
│   ├── about/                  Story, quality policy, leadership
│   ├── careers/                EVP, open roles, benefits, EEO
│   ├── contact/                Form + direct routes + identifiers
│   ├── privacy | terms | accessibility
│   ├── icon.svg              Favicon (mark on brand navy)
│   ├── opengraph-image.tsx   Generated social card
│   ├── sitemap.ts | robots.ts | not-found.tsx
│   └── globals.css             Design tokens + utilities (Tailwind v4 @theme)
├── components/
│   ├── Header.tsx              Sticky nav, mega-menus, mobile sheet  [client]
│   ├── Footer.tsx              Procurement quick-reference footer
│   ├── Hero.tsx | PageHero.tsx Hero + inner hero w/ Breadcrumb JSON-LD
│   ├── ContactForm.tsx         Accessible validated form            [client]
│   ├── Reveal.tsx              Scroll reveal                        [client]
│   ├── Logo.tsx              Brand lockup (mark + live-text wordmark)
│   ├── BrandMotif.tsx        Oversized mark used as background texture
│   ├── LogoWall.tsx          Client/ecosystem logos (strip + grouped wall)
│   ├── CredentialCards.tsx   Certification badges + what each commits us to
│   └── CtaBand.tsx | LegalLayout.tsx | ui.tsx
└── lib/
    ├── site.ts                 Company facts, credentials, vehicles, NAICS
    ├── logos.ts                Organisation logos, grouped by relationship type
    └── capabilities.ts         11 capability definitions

public/
├── brand/logo-full.svg        Supplied brand artwork
├── logos/                     13 organisation marks (from sohumsystems.com)
├── certs/                     Certification + contract vehicle badge art
└── team/                      Leadership photographs
```

**All factual content lives in `src/lib/`.** Pages import from there, so a fact is
changed in exactly one place. Only three components ship JavaScript to the browser.

## Design system

The palette is derived from the supplied brand mark (`public/brand/logo-full.svg`):
navy **#304368** and orange **#f25806**. Tokens live in `globals.css` under
`@theme`, which generates the Tailwind utilities (`bg-ink-900`, `text-flame-600`, …).

| Group | Role | Tokens |
|---|---|---|
| Ink | Dark grounds, built on the logo's 220deg hue | `ink-950` … `ink-500` |
| Brand navy | `#304368` — 9.87:1 on white | `brand-navy` |
| Paper | Light grounds | `paper` `paper-50` `paper-100` `paper-200` `paper-300` |
| Graphite | Body text | `graphite-400` … `graphite-700` |
| Flame | Brand orange accent | `flame-300` … `flame-700` |

**Contrast rule for the orange.** The logo orange `flame-500` (#f25806) is 3.40:1 on
white — valid for the graphic mark, rules, dots, and large display type, but short of
AA for small text. So:

- `flame-500` — the mark, fills, borders, focus ring, large type
- `flame-600` (4.82:1 on white) — small text on light grounds, including the wordmark
- `flame-400` (6.6:1 on ink-900) — text and accents on dark grounds

The logo lockup renders the mark as inline SVG and the wordmark as live text, so it
stays crisp and selectable. On dark grounds `tone="light"` swaps the navy half of the
mark for a light slate, since the brand navy would otherwise disappear.

Type is Sora (display) + Inter (UI/body). `BrandMotif` renders the mark oversized at
very low opacity as background texture on the hero.

> **Tailwind v4 note:** write `bg-ink-900`, not `bg-[--color-ink-900]`. The
> bracket form is parsed as a bare value and silently resolves to transparent.

## Logos and badges

All imagery is the artwork published on sohumsystems.com. Source marks carry a
baked-in white background, so every logo sits on a white card — never on a tint
or a dark ground. Marks render greyscale at rest and resolve to full colour on
hover, which keeps a wall of competing brand palettes from fighting the page.

**Grouping matters more than the grid.** The current site shows these
organisations in one undifferentiated strip, which reads as a customer list. It
is not — it mixes federal customers, commercial customers, technology platforms,
and delivery frameworks. `src/lib/logos.ts` separates them into *Government
organizations*, *Commercial organizations*, and *Technology & frameworks*, and
the Federal Mission page carries a note that appearance does not imply
endorsement or a current contractual relationship. That distinction protects the
company if a contracting officer asks what a given logo represents.

Certification badges are the issuing bodies' own artwork, paired with a note on
what each credential commits the company to. The CMMI DEV and SVC badges were
re-rendered from the originals to carry only the appraised mark — the source art
had an appraisal/date line baked into the image, which is not shown.

## Accessibility

Verified with axe-core across 13 pages × desktop and mobile, against
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: **0 violations.**

- Skip link is the first tab stop; focus rings are visible and `:focus-visible`-scoped
- Mobile menu manages `aria-expanded`, Escape, and body scroll lock
- Form validation announces via `aria-live` and moves focus to the first invalid field
- The expired-vehicles table is a focusable, labelled scroll region
- **Content is fully visible without JavaScript** — reveal animations are scoped to a
  `.js` class set by an inline script, so a no-JS visitor gets the complete page
- `prefers-reduced-motion` disables all motion

## Performance

Every route is statically prerendered. Measured locally: **LCP 48–92 ms, CLS 0**,
~73 KB transferred per page.

## Findings on the previous site

Recorded because they informed the rebuild and several are still live:

1. **Injected pharma SEO spam** in the body copy of About, Careers, and Contract
   Vehicles (Cialis, Rybelsus, Bupropion XL, Abilify, with outbound links). This
   is the most urgent item — it suggests a compromise or sold link placements, and
   it sits on the pages a federal evaluator reads.
2. **Another company's name on the SEWP VI section** — "JTG Solutions Contract
   Information", "JTG Solutions Program Management Contacts", "JTG Solutions SEWP
   Ordering Guide" — evidently copied from another contractor's page.
3. **Placeholder procurement data published**: `UEI: ABC123DEF456` and SEWP contract
   number `80TECH26DXXXX`. Both are omitted here rather than guessed; supply the real
   values in `src/lib/site.ts`.
4. **Truncated ZIP** — "Overland Park, KS 6622". Corrected to 66221, per the
   embedded Google Maps URL on the source page.
5. **Expired vehicles shown as current** — GSA IT Schedule 70 (ended Jul 2024) and
   SeaPort NxG (ended Jan 2024). Both are retained here but explicitly labelled.
6. Typo "Delivering Reliablity and excellence since 2013"; a Steve Jobs quote as the
   homepage centrepiece; footer credit "Designed & Developed by CITI" while Citi also
   appears in the customer logo wall.

## Content policy

No certifications, customers, contract numbers, metrics, awards, or partnerships
were invented. Where the source lacked detail (leadership bios, past performance
specifics), the copy stays factual and brief rather than filling the gap.

Claims that need owner confirmation before launch:
- SEWP VI contract number and UEI (placeholders on the source site)
- ISO 9001 / 20000-1 / 27001 and CMMI appraisal currency and expiry dates
- Whether the logo-wall organisations are customers, partners, or tooling — the
  current copy deliberately describes them as "technology ecosystems" and
  "frameworks" rather than asserting contract relationships

## Before deploying

1. Wire the contact form to a real endpoint. It currently composes a `mailto:`
   handoff so no submission is silently lost, but a server action or form service
   (with spam protection) is the production path.
2. **Confirm the CMMI appraisal is current.** No dates are shown anywhere on the
   site, but the underlying appraisal still needs to be valid for the CMMI Level 3
   claim to stand. If it has been renewed, supply the current badge artwork; if it
   has not, the claim needs to come down from every page.
3. Confirm the items under "Content policy" above.
