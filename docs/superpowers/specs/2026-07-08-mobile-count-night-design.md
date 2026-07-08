# Open Source Barware — Mobile Count Night (Design)

**Date:** 2026-07-08  
**Status:** Approved for implementation planning  
**Project ID:** `opensourcebarware`  
**Repo:** `~/Documents/New project/open-source-barware`  
**Site first, stores later**

## Goal

Ship a **simple Count Night mobile experience** this weekend:

1. Phone-first counting (stations → bottles → tenths).
2. Installable **shell** (PWA + Android APK).
3. Release on **opensourcebarware.com** (`/count` + `/download`).
4. Defer Google Play / App Store submission to a later phase.

## Non-goals (this weekend)

- Full Dojo / desktop feature parity
- POS, invoices, multi-venue, barcode, weigh
- Map editing (add/remove bottles) beyond import
- Desktop program live sync
- Apple IPA / TestFlight / App Store
- Google Play Console upload
- User accounts or cloud sync for counts

## Approach

**PWA + thin native shell (Approach A)**

| Layer | Choice |
|-------|--------|
| UI | Mobile web app in existing Next.js repo |
| Entry | `/count` (single route + step state) |
| Data | Device-local `localStorage`, reuse Dojo store types |
| iOS | Add to Home Screen (PWA) |
| Android | Capacitor shell → APK on `/download` |
| Stores | Phase 2 — same codebase |

Rejected for weekend:

- **B** Wrap full Dojo as-is — desktop-shaped, weak count UX.
- **C** Separate Expo app — too heavy; duplicates models.

## Architecture

```
Phone user
   │
   ├─ PWA (iOS/Android browser / homescreen)
   │     opens opensourcebarware.com/count
   │
   └─ Android shell (Capacitor)
         loads same /count surface
         APK hosted on /download

Data: device-local only
  localStorage (inventory-store family)
  Import map JSON / Export count CSV
  No login, no count backend required
```

**Capacitor default:** point WebView at production `https://opensourcebarware.com/count` so the APK stays current after site deploys. Offline works after first open via service worker cache of shell assets.

**Storage note:** Capacitor WebView storage is origin-scoped to the loaded URL. Same-origin with the live site keeps PWA and APK data aligned when both hit production. No cross-device sync in v1.

## Screens and UX

**Job:** One bartender, phone in hand, walks the bar. Enter levels in tenths. Finish stations. Save the night. Export optional.

### Flow

```
Home → Stations → Bottle list (one station) → Review night → Saved
         │
         └──── resume in-progress draft ────┘
```

### Screens

| # | Screen | Content | Actions |
|---|--------|---------|---------|
| 1 | Home | Bar name, last count date, primary CTA | Start count night / Resume; secondary: Demo map, Import map, Export last |
| 2 | Stations | Station list + progress (e.g. 2/4 done) | Open station; mark station done |
| 3 | Count | Bottle rows: name, size, previous (grey), current (large) | − / + 0.1; quick pad; skip; next |
| 4 | Review | Counted / skipped / total; optional notes | Save count |
| 5 | Done | Confirmation + timestamp | Export CSV, Home |

### Count rules

- Level = full bottles + open tenths (e.g. `2.4`).
- Step `0.1`; clamp `>= 0`.
- Uncounted bottles are **skipped**, not zero-filled, unless the user sets a value.
- Save allowed with skips; Review shows skipped count.
- Auto-save draft on every change so kill/refresh does not lose the night.
- One active draft at a time; save creates history entry and clears draft.

### UX constraints

- Thumb-zone controls; large tap targets.
- One station at a time; no multi-column tables.
- Midnight / Dojo palette (not marketing copper carnival).
- Marketing Header/Footer **hidden** on `/count` (use existing ConditionalSiteChrome pattern).
- Offline after first successful load.

### Map sources (v1)

1. **Demo map** — Dojo seed stations/bottles (`createDojoBar` / seed helpers).
2. **Import map** — JSON matching existing `Bar` shape; run through `normalizeBar`; one-line error on invalid.
3. **Edit map** — out of scope.

Desktop bridge this weekend: **CSV export** of the saved count.

## Data layer

Extend `lib/inventory-store.ts` (or a thin sibling that reuses its keys/helpers). Do **not** invent a parallel product model.

### Existing keys

| Key | Role |
|-----|------|
| `osb_dojo_bar` | Station / bottle map |
| `osb_dojo_counts` | Saved `InventoryCount[]` history |

### New key

| Key | Role |
|-----|------|
| `osb_dojo_count_draft` | In-progress Count Night |

### Draft shape

```ts
interface CountNightDraft {
  id: string;
  startedAt: string;
  barId: string;
  notes: string;
  /** bottleId → counted level (only bottles the user set) */
  entries: Record<string, number>;
  /** stationId → true when marked complete */
  stationsDone: Record<string, boolean>;
  updatedAt: string;
}
```

### Save Count Night algorithm

1. Load bar map + draft.
2. Build `InventoryCount`:
   - `id`, `date` / ISO timestamp, `notes`, `entries[]`
   - Each entry: `bottleId`, `bottleName`, `stationId`, `previousLevel` (from bottle `currentLevel`), `countedLevel` (from draft).
   - Only include bottles present in `draft.entries` (explicit counts). Skipped bottles omitted.
3. `saveCount(count)`.
4. Update bar bottles’ `currentLevel` for counted bottles; persist bar.
5. Clear draft.
6. Optional: trigger CSV download.

### CSV columns

`station,bottle,size,previous,counted,delta`

### Backend

None for counting. Optional analytics event `count_saved` if trivial; not required for MVP.

## Routes and PWA

| Surface | Detail |
|---------|--------|
| `/count` | Count Night app (single page + internal step state preferred for offline simplicity) |
| PWA manifest | Name: **Open Source Barware — Count**; `display: standalone`; midnight theme; icons 192 + 512 |
| Service worker | Cache app shell + JS/CSS for offline reopen |
| iOS meta | `apple-mobile-web-app-capable` and related tags |
| Instructions | Home + `/download`: Share → Add to Home Screen |

## Android shell (Capacitor)

| Item | Value |
|------|--------|
| Folder | `mobile/` or `count-app/` at repo root |
| App id | `com.opensourcebarware.count` |
| Content | Load `https://opensourcebarware.com/count` |
| Artifact | APK at `public/downloads/open-source-barware-count.apk` |
| Branding | Simplified site brand mark for icon/splash |

iOS IPA not in weekend scope.

## Site packaging

On `/download` (and optional later home chip), add **Mobile Count Night**:

- **Open in browser** → `/count`
- **Download APK** (Android)
- **iPhone** short Add to Home Screen steps
- One-liner: “Walk the bar. Count in tenths. Free. Works offline after first open.”

APK download tracking via existing download-count path if low-friction; otherwise ship untracked this weekend.

## Build and deploy

1. Implement `/count` UI + draft store + PWA bits in main Next app.
2. Deploy Cloudflare Pages as today (`out` → project `open-source-barware`).
3. Build Capacitor Android APK → `public/downloads/` → redeploy.
4. Smoke test: Safari/Chrome mobile + Android APK — full demo count, refresh mid-count, save, CSV.

## Success criteria (Sunday night)

- [ ] Complete a full demo count on a phone offline after first load
- [ ] Draft survives refresh / app kill
- [ ] Save writes count history and updates bottle levels
- [ ] CSV export works
- [ ] Live `/download` links work (browser + APK)
- [ ] Android APK installs and opens Count Night

## Phase 2 (after weekend)

- Google Play Console ($25) + store listing from Capacitor/EAS build
- Apple Developer ($99/yr) + iOS binary + review
- Map editor, barcode, sync with desktop program, multi-device

## Implementation notes for planning

- Prefer one client component tree under `app/count/page.tsx` (or `app/count/` with layout that strips marketing chrome).
- Reuse `normalizeBar`, `createDojoBar` / `seedDojoPlayground` patterns; avoid breaking Dojo keys.
- Keep GPL-3.0-or-later; notice/attribution for any Capacitor scaffolding as required.
- Surgical: do not refactor unrelated Dojo admin or marketing pages.

## Open decisions resolved

| Decision | Resolution |
|----------|------------|
| Weekend scope | Count Night only + shell |
| Approach | PWA + Capacitor Android |
| Distribution | Site first; stores later |
| Data | localStorage; CSV export bridge |
| Skipped bottles | Not zero-filled |
| iOS binary | Deferred; PWA only this weekend |
