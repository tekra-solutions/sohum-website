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
│   ├── sitemap.ts | robots.ts | not-found.tsx
│   └── globals.css             Design tokens + utilities (Tailwind v4 @theme)
├── components/
│   ├── Header.tsx              Sticky nav, mega-menus, mobile sheet  [client]
│   ├── Footer.tsx              Procurement quick-reference footer
│   ├── Hero.tsx | PageHero.tsx Hero + inner hero w/ Breadcrumb JSON-LD
│   ├── ContactForm.tsx         Accessible validated form            [client]
│   ├── Reveal.tsx              Scroll reveal                        [client]
│   ├── CtaBand.tsx | LegalLayout.tsx | Logo.tsx | ui.tsx
└── lib/
    ├── site.ts                 Company facts, credentials, vehicles, NAICS
    └── capabilities.ts         11 capability definitions
```

**All factual content lives in `src/lib/`.** Pages import from there, so a fact is
changed in exactly one place. Only three components ship JavaScript to the browser.

## Design system

Tokens are declared in `globals.css` under `@theme`, which generates the Tailwind
utilities (`bg-ink-900`, `text-graphite-600`, …).

| Group | Tokens |
|---|---|
| Ink (dark grounds) | `ink-950` `ink-900` `ink-850` `ink-800` `ink-700` `ink-600` `ink-500` |
| Paper (light grounds) | `paper` `paper-50` `paper-100` `paper-200` `paper-300` |
| Graphite (body text) | `graphite-400` `graphite-500` `graphite-600` `graphite-700` |
| Signal (accent) | `signal-300` `signal-400` `signal-500` `signal-600` `signal-700` |

`signal-700` and `graphite-500`+ are the text-safe values — they clear 4.5:1 on
white and on the paper tints. Type is Sora (display) + Inter (UI/body).

> **Tailwind v4 note:** write `bg-ink-900`, not `bg-[--color-ink-900]`. The
> bracket form is parsed as a bare value and silently resolves to transparent.

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
2. Add `public/og-image.png` (1200×630) — Open Graph metadata is configured and
   will pick it up.
3. Replace leadership monograms with photographs if available.
4. Confirm the items under "Content policy" above.
