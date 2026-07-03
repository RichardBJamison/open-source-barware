# Open Source Barware — Handoff

*Last updated: 2026-07-03 | agent: GROK | project ID: `open-source-barware`*
*Status: active / The Dojo sandbox shipped to GitHub main*

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
- `/downloads` is now a program guide instead of a direct-download grid. The
  cards say "Learn More" and jump to explainer sections for how each feature
  fits inside the one Chrome-side program.
- `/downloads` now includes a GPL Download panel with direct links to a licensed
  program package, corresponding source archive, GPL text, and the public
  compliance page.
- `/open-source-compliance` now exists as the public license/source notice page.
  Footer navigation and the sitemap include it.
- `public/downloads/` now contains `LICENSE.txt`, `README.md`, `NOTICE.md`,
  `SOURCE-OFFER.md`, `open-source-barware-download-package.zip`, and
  `open-source-barware-source.zip`. Legacy direct raw-file Cloudflare redirects
  point spreadsheet/prompt URLs to the licensed package zip.
- Root `LICENSE`, `NOTICE.md`, `README.md`, and `package.json` declare
  GPL-3.0-or-later. `npm run package:compliance` regenerates the package and
  source zips from non-ignored working-tree files, and `npm run build` now
  runs that packaging step automatically through `prebuild`.
- `/inventory/inputs` now exists as the admin-panel Weekly Inputs page with
  local draft fields for period dates, count notes, invoice file staging, POS
  file staging, notes, and a copyable AI reconciliation packet. The inventory
  sidebar includes an Inputs menu item.
- `/inventory/settings` now exists for provider selection/status, inventory
  cycle settings, backup reminder, operational notes, local JSON backup export,
  and local data clearing.
- **`/inventory` is The Dojo** — a browser sandbox that mirrors the finished
  downloaded program (butterfly state). First visit shows a welcome modal:
  "Welcome to the Dojo," steampunk karate-guy illustration, and copy explaining
  caterpillar setup vs. finished playground. Demo data seeds automatically into
  isolated `osb_dojo_*` localStorage keys (separate from the Chrome download's
  `osb_*` keys).
- Dojo demo bar is **Agave & Rye** with five stations, 23 bottles, two count
  history entries, weekly-input drafts, and partial AI settings. Settings exposes
  **Reset Dojo Playground** and **Show Welcome Again**.
- Inventory setup, dashboard, count, history, inputs, and settings share
  `lib/inventory-store.ts` (dojo-prefixed on web). Setup remains at
  `/inventory/setup` for the caterpillar path; the Dojo nav skips straight to the
  finished admin shell.
- `/about` story section credits **Richard B. Jamison**, removes Hirado/Nito from
  "Who is behind it," and adds **What's next** (World Hidden Bar Tour, Miami
  September, wine inventory/forum/library roadmap).
- `/the-process` is now customer-forward "kitchen table" copy for the Chrome-side
  program: one Chrome-side program, caterpillar-to-butterfly setup, voice notes,
  spreadsheet view, AI home base, checks/gates, weekly inputs, and simple
  cycle reporting. It no longer presents open internal build decisions.
- `/about` frames the origin story around monthly inventory dread, uses the
  compact commemorative credit panel, and includes the Hidden Bar Tour roadmap.
- Home hero CTAs now read, left to right: "Learn This System" (`/the-process`),
  "Read Our Story" (`/about`), and "Download the Program" (`/downloads`). The
  two primary CTAs share one sizing/style class.
- Home stat strip now reads `$0 Cost`, `1 Free program`, `3 Easy steps / Each
  week`, and `100% Simple / Add data. Get inventory.` The Problem section uses
  the supplied hourglass image at `public/images/landing-hourglass.png` blended
  into a masked, vignetted panel with the caption "Get Your Time Back."
- `/about` has a canvas light overlay on the "Buy Us a Drink" support sign. The
  overlay is aligned to the full sign bulb border and animates the individual
  bulbs with a rotating chase/glow, while still respecting reduced-motion
  preferences by not starting the animation.
- Site-wide highlight color has been muted from bright orange to aged
  copper/brass: `--copper #a8784f`, `--copper-bright #b88958`, `--brass
  #c7a76b`, `--brass-light #d7c191`. This covers public pages, shared UI,
  download previews, the Chrome-side program CSS, and legacy local dashboard
  accent shadows.
- Public CTA language now frames Open Source Barware as one free program/app
  rather than multiple downloads, toolkits, or apps.
- 2026-07-03 email infra audit confirmed `richard@opensourcebarware.com` is
  currently only a Gmail-backed Thunderbird identity on `rbjpholdings@gmail.com`
  and not a dedicated mailbox. Live DNS for `opensourcebarware.com` still has
  no MX record. The local `getmail` backup pull now has a valid Maildir at
  `~/.mailbox/barware/{cur,new,tmp}`, but the configured Gmail source label
  `OpenSourceBarware` is not selectable yet, so the backup job still needs its
  source mailbox created or corrected.
- The latest Three-Way run on 2026-06-14 completed Codex and Grok responses;
  Claude/Reeve timed out.
- The working `.meta` status is `partial`.

## Architecture and key files

- `app/` — routes and pages
- `components/` — shared UI
- `lib/inventory-store.ts` — inventory state logic (`osb_dojo_*` on web)
- `lib/dojo.ts` — welcome flags, seed/reset helpers
- `lib/dojo-seed.ts` — Agave & Rye demo bar/counts/settings
- `components/DojoWelcomeModal.tsx` — first-run Dojo welcome overlay
- `components/SteampunkKarateGuy.tsx` — welcome illustration
- `app/inventory/setup/page.tsx` — first-run bar map wizard
- `app/inventory/dashboard/page.tsx` — local admin inventory dashboard
- `app/inventory/inputs/page.tsx` — local weekly intake packet staging
- `app/inventory/settings/page.tsx` — provider/cycle/local backup controls
- `app/open-source-compliance/page.tsx` — public GPL/source compliance notice
- `public/downloads/` — downloadable package/source archives plus license files
- `scripts/build-compliance-packages.mjs` — regenerates compliance zip packages
- `bar-app/` — legacy/local bar inventory implementation
- `~/Me-Nexus/working/osb-full-system/prompt.md` — full product/design prompt
- `~/Me-Nexus/working/osb-full-system/synthesis.md` — available synthesis

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware"
npm install
npm run dev
npm run package:compliance
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
- 2026-07-01 CODEX: Updated public CTA/navigation language from "Free Downloads"
  and "Download Free Tools" to one-program language: "Free Program" and
  "Download the Program." Field-tested copy now refers to the program rather
  than "every tool."
- 2026-07-01 CODEX: Broadened one-program language across public pages,
  metadata, header/footer, legacy download buttons, and the program guide.
  "Mobile Count App" is now "Mobile Count View." `npm run lint`,
  `npm run build`, and `git diff --check` passed.
- 2026-07-03 CODEX: Muted the bright orange palette to aged copper/brass.
  Verification passed: bright-token source scan clean for old orange values,
  `git diff --check`, `npm run lint` (0 errors, 5 existing warnings), and
  `npm run build`. Fresh local browser checks at desktop 1280px and mobile
  390px confirmed primary CTA background `rgb(168, 120, 79)`, matching hero CTA
  sizing, muted copper/brass headline gradient, and no horizontal overflow.
- 2026-07-03 CODEX: Added GPL download/source compliance package and public
  compliance page. Verification passed: `npm run package:compliance`,
  `zipinfo` confirmed package zip contains `README.md`, `LICENSE.txt`,
  `NOTICE.md`, `SOURCE-OFFER.md`, spreadsheet files, and `master-prompt.md`;
  source zip scan found no `.env`, `node_modules`, `.next`, `out`,
  `program/data`, `program/osb_config.json`, or generated zip recursion;
  `npm run lint` passed with 0 errors and 5 existing warnings; `git diff
  --check` passed; `npm run build` passed with `/open-source-compliance`
  prerendered; browser desktop/mobile DOM checks passed for `/downloads` and
  `/open-source-compliance`; local HTTP checks returned 200 for package zip,
  source zip, GPL text, and compliance page.
- 2026-07-03 CODEX: Wired GPL packaging into the build pipeline with
  `package.json` `prebuild`. Verification passed: `npm run build` triggered
  `npm run package:compliance` first, then emitted the static export containing
  `out/open-source-compliance.html`, `out/downloads/open-source-barware-download-package.zip`,
  `out/downloads/open-source-barware-source.zip`, and the public license/readme
  notice files.
- 2026-07-03 CODEX: Added the supplied hourglass image to the home Problem
  section and tightened the stat strip wording/formatting. Verification passed:
  `npm run package:compliance`, source zip includes `app/page.tsx` and
  `public/images/landing-hourglass.png`, `npm run lint` passed with 0 errors
  and 5 existing warnings, `git diff --check` passed, `npm run build` passed,
  and browser checks at 1280px and 390px confirmed the image is loaded/masked,
  stat labels do not overflow, and there is no horizontal overflow.
- 2026-07-03 CODEX: Updated the home Problem hourglass caption to "Get Your
  Time Back" and removed the hard border/frame lines around the picture.
  Verification passed: `npm run package:compliance`, source zip includes
  `app/page.tsx` and `public/images/landing-hourglass.png`, `npm run lint`
  passed with 0 errors and 5 existing warnings, `git diff --check` passed,
  `npm run build` passed, and a local browser check confirmed the caption,
  loaded image, and 0px panel border.
- 2026-07-03 CODEX: Adjusted the home Workshop heading so "for the craft." stays
  together instead of leaving "craft." alone on the next line. Verification
  passed: `npm run package:compliance`, source zip includes `app/page.tsx`,
  `npm run lint` passed with 0 errors and 5 existing warnings, `git diff
  --check` passed, `npm run build` passed, and a 703px browser check confirmed
  "the" and "craft." share the same row with no horizontal overflow.
- 2026-07-03 CODEX: Fixed the `/about` "Buy Us a Drink" sign lights. The canvas
  overlay now covers the full sign border instead of a narrow strip, draws
  individual bulb cores/halos, and runs a faster rotating chase. Verification
  passed: `npm run package:compliance`, source zip includes
  `components/AboutMockupPage.tsx` and `lib/about-sign-lights.ts`, `npm run
  lint` passed with 0 errors and 5 existing warnings, `git diff --check` passed,
  `npm run build` passed, and browser screenshots confirmed the overlay sits on
  the real sign and changes over time.
- 2026-07-03 GROK: Shipped **The Dojo** sandbox at `/inventory`. Welcome modal
  ("Welcome to the Dojo," steampunk karate guy), `osb_dojo_*` storage isolation,
  Agave & Rye demo seed, shell rebranding, reset/welcome-again controls in
  settings. About copy: Richard B. Jamison attribution + What's Next section.
  Verification passed: targeted `eslint` on Dojo files, `npm run build`, local
  dev at `http://localhost:3000/inventory`, browser opened for Richard review.
  Pushed to GitHub `main` in this session.

## Known issues

- Three-Way result is partial because Reeve timed out.
- Live production at `opensourcebarware.com` may lag GitHub `main` until
  Cloudflare Pages rebuilds. No `CLOUDFLARE_API_TOKEN` on macbook15 for manual
  `wrangler pages deploy`; deploy is Git-connected or dashboard-triggered.
- Open Source Barware mail is now domain-live on Forward Email, but Thunderbird
  is not migrated yet. On 2026-07-03, `opensourcebarware.com` was added to
  Forward Email and its setup now verifies complete with the full Forward Email
  Cloudflare record set visible in DNS (MX, TXT verification, DKIM/SPF,
  autoconfig/autodiscover, and related support records). Thunderbird still has
  `richard@opensourcebarware.com` only as a Gmail-backed identity on
  `rbjpholdings@gmail.com`, not as a direct IMAP/SMTP mailbox.
- `resonantwebdesign.com`, `richardbjamison.com`, and `rbjpholdings.com` remain
  incomplete in Forward Email. `resonantwebdesign.com` is ready for the same
  Cloudflare flow, `richardbjamison.com` still needs its GoDaddy-side DNS
  changes, and `rbjpholdings.com` still does not appear live in public DNS.
- The full Chrome-side package/provider API connection is not built yet; current
  app behavior is local browser storage plus AI handoff packet staging.
- Invoice/POS file staging stores metadata and notes locally; it does not yet
  persist file bytes or parse files without an AI/provider handoff.
- The global July 4 launch overlay can still appear over `/inventory/*` on fresh
  profiles when `NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY=true` or pre-launch date logic
  fires; consider suppressing site-wide overlays inside The Dojo.

## Open work

1. Deploy latest `main` (Dojo + About + GPL compliance) to Cloudflare Pages and
   verify live `/inventory` welcome + demo dashboard.
2. Continue implementation from the customer-forward process page into the
   actual Chrome-side setup/home base: provider list, API key storage, workbook
   generation path, POS export scope, and backup/restore path.
3. Add provider/API connection and file parsing behind `/inventory/settings` and
   `/inventory/inputs`, preserving local-secret handling.
4. Convert the approved report into implementation tickets for the Chrome-side
   setup program and admin home base.
5. Review the existing Three-Way outputs and align/retire any prompt-only scope
   that conflicts with the Chrome program direction.
6. Build backup restore/import, workbook export, and POS/invoice parser paths.
7. Finish the mail migration: create the real alias/mailbox path for
   `richard@opensourcebarware.com` in Forward Email, generate its password,
   and replace the Gmail identity stopgap in Thunderbird with direct
   IMAP/SMTP.
8. Repeat the same hosted-mail setup for `resonantwebdesign.com`, then decide
   whether `me@richardbjamison.com` should stay forwarding-only or be upgraded
   into a real Thunderbird mailbox on Forward Email.

## Pickup point

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware"
git pull origin main
npm run dev
# Dojo: http://localhost:3000/inventory
npm run lint && npm run build
```
