# Open Source Barware — Handoff

*Last updated: 2026-07-01 | agent: CODEX | project ID: `open-source-barware`*
*Status: active / local trial workflow foundation and customer process page verified*

## Purpose

A free bar-inventory system evolving from downloadable AI project instructions
into a Chrome-side customer program. The target workflow uses a guided setup
flow, the customer's chosen AI provider/API connection, voice-transcribed
inventory mapping, invoice/POS uploads, spreadsheet-backed reconciliation, and
an admin home base.

## Canonical locations

- Local: `~/Documents/New project/open-source-barware/`
- Nexus consideration: `~/Me-Nexus/working/osb-full-system/`
- Production referenced in project context: `opensourcebarware.com`
- Nexus project ID: `open-source-barware`

## Current state

- Next.js App Router, TypeScript, Tailwind.
- Existing pages include home, the-process, downloads, about, resources, and
  inventory screens.
- `/downloads` is now a toolkit guide instead of a direct-download grid. The
  six cards say "Learn More" and jump to explainer sections for how each tool
  fits inside the Chrome-side program.
- `/inventory/inputs` now exists as the admin-panel Weekly Inputs page with
  local draft fields for period dates, count notes, invoice file staging, POS
  file staging, notes, and a copyable AI reconciliation packet. The inventory
  sidebar includes an Inputs menu item.
- `/inventory/settings` now exists for provider selection/status, inventory
  cycle settings, backup reminder, operational notes, local JSON backup export,
  and local data clearing.
- Inventory setup, dashboard, count, history, inputs, and settings now share
  `lib/inventory-store.ts`. The store normalizes older localStorage shapes,
  setup saves the nested station/bottle map used by the dashboard, dashboard no
  longer seeds fake demo data, and counts save through the same store.
- `/the-process` is now customer-forward "kitchen table" copy for the Chrome-side
  program: one Chrome-side program, caterpillar-to-butterfly setup, voice notes,
  spreadsheet view, AI home base, checks/gates, weekly inputs, and simple
  cycle reporting. It no longer presents open internal build decisions.
- `/about` now frames the origin story around monthly inventory dread for the
  person responsible for a bar, and uses a compact commemorative credit panel
  instead of large photo/profile cards. Hirado Junior is listed with nickname
  "Nito."
- Home hero CTAs now read, left to right: "Learn This System" (`/the-process`),
  "Read Our Story" (`/about`), and "Download Free Tools" (`/downloads`). The
  two orange CTAs share one sizing/style class.
- Home Workshop section now uses one large `/downloads` CTA panel with four
  separated internal tool tags, instead of four separate links that all point to
  the same page.
- The latest Three-Way run on 2026-06-14 completed Codex and Grok responses;
  Claude/Reeve timed out.
- The working `.meta` status is `partial`.

## Architecture and key files

- `app/` — routes and pages
- `components/` — shared UI
- `lib/inventory-store.ts` — inventory state logic
- `app/inventory/setup/page.tsx` — first-run bar map wizard
- `app/inventory/dashboard/page.tsx` — local admin inventory dashboard
- `app/inventory/inputs/page.tsx` — local weekly intake packet staging
- `app/inventory/settings/page.tsx` — provider/cycle/local backup controls
- `bar-app/` — legacy/local bar inventory implementation
- `~/Me-Nexus/working/osb-full-system/prompt.md` — full product/design prompt
- `~/Me-Nexus/working/osb-full-system/synthesis.md` — available synthesis

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware"
npm install
npm run dev
npm run build
```

Confirm scripts in `package.json` before relying on these commands.

## Safety constraints

- Preserve static-export/Cloudflare compatibility unless architecture is
  explicitly changed.
- The core tool remains free.
- Master prompts must work across Claude, ChatGPT, and Grok.
- Read the bundled Next.js version documentation before framework changes.

## Verification

- 2026-06-30 CODEX: `npm run build` passed.
- 2026-06-30 CODEX: Local dev server visual/DOM check passed for the home hero
  CTA row at desktop and mobile viewport widths.
- 2026-06-30 CODEX: Local browser DOM check passed for the Workshop CTA panel:
  one link to `/downloads`, four internal tags, and no mobile overlap.
- 2026-07-01 CODEX: `npx eslint app/the-process/page.tsx` passed.
- 2026-07-01 CODEX: `npm run build` passed after System Build Report update.
- 2026-07-01 CODEX: Local browser DOM/layout check passed for `/the-process`
  at desktop and mobile widths; required report sections present and no
  horizontal overflow.
- 2026-07-01 CODEX: Removed `/the-process` hero same-page jump buttons;
  `npx eslint app/the-process/page.tsx`, `npm run build`, and live browser DOM
  checks passed.
- 2026-07-01 CODEX: Converted `/downloads` to Learn More explainers and added
  `/inventory/inputs`; `npx eslint app/downloads/page.tsx
  app/inventory/inputs/page.tsx app/inventory/layout.tsx`, `npm run build`,
  `git diff --check`, and desktop/mobile browser checks passed.
- 2026-07-01 CODEX: Local trial workflow pass completed. Verified setup wizard
  voice-map parsing into 8 products across 3 stations, dashboard showing the
  saved `Trial Service Bar` map, voice/text count parsing and save, history
  retrieval of saved count, `/inventory/inputs`, and `/inventory/settings`.
- 2026-07-01 CODEX: `npm run lint`, `npm run build`, and `git diff --check`
  passed after unifying inventory storage, adding settings, and converting
  Weekly Inputs to local intake staging.
- 2026-07-01 CODEX: Browser desktop/mobile DOM checks passed for public pages
  and inventory admin pages; fresh reload of `/inventory/dashboard` had no new
  browser console errors/warnings after deterministic gear SVG fix and
  `data-scroll-behavior="smooth"` marker.
- 2026-07-01 CODEX: Rewrote `/the-process` as customer-facing kitchen table
  explanation; `npm run lint`, `npm run build`, and `git diff --check` passed.
  Browser checks for `/the-process` confirmed required customer-language present,
  old Build Report/Open Decisions labels absent, no desktop/mobile horizontal
  overflow, no mobile text overflow, and no fresh console warnings/errors after
  disabling final CTA prefetch.
- 2026-07-01 CODEX: Updated `/about` from screenshot feedback; `npm run lint`,
  `npm run build`, and `git diff --check` passed. Browser checks confirmed the
  new monthly-inventory-dread copy, compact no-photo credit panel, Hirado Junior
  "Nito" naming, removal of old PHOTO/Nitto/behind-the-bar copy, no desktop or
  mobile horizontal overflow, no mobile text overflow, and no fresh console
  warnings/errors. The about-page story image is marked `loading="eager"` after
  a dev-server LCP warning.
- 2026-07-01 CODEX: Fixed `/about` field-tested copy spacing so "Agave & Rye in"
  does not render as "Ryein" and changed the final CTA to "Download the Program."

## Known issues

- Three-Way result is partial because Reeve timed out.
- Live production at `opensourcebarware.com` may lag this local build until the
  static export is deployed.
- The full Chrome-side package/provider API connection is not built yet; current
  app behavior is local browser storage plus AI handoff packet staging.
- Invoice/POS file staging stores metadata and notes locally; it does not yet
  persist file bytes or parse files without an AI/provider handoff.
- The global welcome toast can appear over the inventory setup flow on a fresh
  browser profile; consider suppressing it for `/inventory/*`.

## Open work

1. Continue implementation from the customer-forward process page into the
   actual Chrome-side setup/home base: provider list, API key storage, workbook
   generation path, POS export scope, and backup/restore path.
2. Deploy the current local build to production after review so the public site
   matches the Chrome-program/product direction now in the repo.
3. Add provider/API connection and file parsing behind `/inventory/settings` and
   `/inventory/inputs`, preserving local-secret handling.
4. Convert the approved report into implementation tickets for the Chrome-side
   setup program and admin home base.
5. Review the existing Three-Way outputs and align/retire any prompt-only scope
   that conflicts with the Chrome program direction.
6. Build backup restore/import, workbook export, and POS/invoice parser paths.

## Pickup point

```bash
git -C "/Users/richardjamison/Documents/New project/open-source-barware" status --short
npm run lint && npm run build
```
