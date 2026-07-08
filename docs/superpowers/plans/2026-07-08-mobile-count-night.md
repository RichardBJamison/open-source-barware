# Mobile Count Night Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phone-first Count Night app at `/count` with localStorage drafts, PWA install, Android APK on `/download`, site-first (stores later).

**Architecture:** Single-route client app in the existing Next.js static-export site. Pure count logic in `lib/count-night.ts` on top of `inventory-store`. Marketing chrome hidden on `/count`. Capacitor Android shell loads production `/count`. No count backend.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind 4, localStorage (`osb_dojo_*`), Web App Manifest + service worker, Capacitor Android for APK.

**Spec:** `docs/superpowers/specs/2026-07-08-mobile-count-night-design.md`

## Global Constraints

- Weekend scope only: Count Night + shell; no map editor, POS, barcode, weigh, cloud sync, store submit.
- Reuse Dojo storage keys `osb_dojo_bar` / `osb_dojo_counts`; add `osb_dojo_count_draft` only.
- Levels step `0.1`, clamp `>= 0`; skipped bottles are omitted from save (not zero-filled).
- GPL-3.0-or-later; surgical diffs — do not refactor unrelated Dojo/marketing.
- Static export stays on (`output: "export"`); no server components that need a Node runtime for count.
- App id for Android: `com.opensourcebarware.count`.
- APK path: `public/downloads/open-source-barware-count.apk`.
- Production URL: `https://opensourcebarware.com/count`.

---

## File map

| Path | Responsibility |
|------|----------------|
| `lib/count-night.ts` | Draft CRUD, commit count, CSV, level helpers (pure + storage) |
| `lib/count-night.test.mjs` | Node test runner for pure helpers |
| `lib/inventory-store.ts` | Add draft storage key only |
| `components/count/CountNightApp.tsx` | Full UI: steps Home → Stations → Count → Review → Done |
| `app/count/page.tsx` | Route entry + metadata |
| `components/ConditionalSiteChrome.tsx` | Treat `/count` like app shell (hide marketing) |
| `app/layout.tsx` | Wrap `Header` in ConditionalSiteChrome |
| `components/JulyFourthLaunchOverlay.tsx` | Skip overlay on `/count` |
| `public/manifest-count.webmanifest` | PWA manifest for Count |
| `public/sw-count.js` | Offline shell cache |
| `public/icons/count-192.png` | PWA icon (from logo) |
| `public/icons/count-512.png` | PWA icon |
| `app/download/page.tsx` | Mobile Count Night block |
| `app/sitemap.ts` | Include `/count` |
| `mobile/` | Capacitor Android project |
| `mobile/README.md` | Build APK instructions |

---

### Task 1: Count Night data layer + tests

**Files:**
- Modify: `lib/inventory-store.ts` (STORAGE_KEYS only)
- Create: `lib/count-night.ts`
- Create: `lib/count-night.test.mjs`

**Interfaces:**
- Consumes: `Bar`, `Bottle`, `Station`, `InventoryCount`, `CountEntry`, `getBar`, `saveBar`, `saveCount`, `getCounts`, `generateId`, `normalizeBar`, `createDojoBar` from store/seed
- Produces:
  - `CountNightDraft` type
  - `clampLevel(n: number): number`
  - `stepLevel(n: number, delta: number): number`
  - `getCountDraft(): CountNightDraft | null`
  - `saveCountDraft(draft: CountNightDraft): void`
  - `clearCountDraft(): void`
  - `startCountDraft(bar: Bar): CountNightDraft`
  - `setDraftLevel(draft, bottleId, level): CountNightDraft`
  - `markStationDone(draft, stationId, done: boolean): CountNightDraft`
  - `stationProgress(bar, draft): { done: number; total: number; countedBottles: number; totalBottles: number; skippedBottles: number }`
  - `commitCountNight(bar, draft): { count: InventoryCount; bar: Bar }`
  - `countToCsv(bar, count): string`
  - `downloadTextFile(filename, text, mime?)`

- [ ] **Step 1: Add storage key**

In `lib/inventory-store.ts`, extend `STORAGE_KEYS`:

```ts
export const STORAGE_KEYS = {
  bar: `${PREFIX}bar`,
  counts: `${PREFIX}counts`,
  weeklyInputs: `${PREFIX}weekly_inputs`,
  posReports: `${PREFIX}pos_reports`,
  settings: `${PREFIX}settings`,
  countDraft: `${PREFIX}count_draft`,
} as const;
```

- [ ] **Step 2: Write failing tests**

Create `lib/count-night.test.mjs`:

```js
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

// Pure helpers will be mirrored for Node by exporting clamp/step/commit pure fns.
// Until implementation exists, import will fail — that's the red step.
import {
  clampLevel,
  stepLevel,
  buildCountFromDraft,
  applyCountToBar,
  countToCsv,
} from "./count-night-pure.mjs";

test("clampLevel floors at 0 and rounds to 1 decimal", () => {
  assert.equal(clampLevel(-1), 0);
  assert.equal(clampLevel(2.46), 2.5);
  assert.equal(clampLevel(2.44), 2.4);
});

test("stepLevel steps by 0.1", () => {
  assert.equal(stepLevel(1, 0.1), 1.1);
  assert.equal(stepLevel(0.1, -0.1), 0);
  assert.equal(stepLevel(0, -0.1), 0);
});

test("buildCountFromDraft only includes explicit entries", () => {
  const bar = {
    id: "b1",
    name: "Test",
    lastCountDate: null,
    stations: [
      {
        id: "s1",
        name: "Well",
        type: "well",
        bottles: [
          { id: "x", name: "Vodka", category: "vodka", currentLevel: 2, parLevel: 3, size: "750ml", costPerBottle: 10 },
          { id: "y", name: "Gin", category: "gin", currentLevel: 1, parLevel: 2, size: "750ml", costPerBottle: 10 },
        ],
      },
    ],
  };
  const draft = {
    id: "d1",
    startedAt: "2026-07-08T00:00:00.000Z",
    barId: "b1",
    notes: "close",
    entries: { x: 1.5 },
    stationsDone: { s1: true },
    updatedAt: "2026-07-08T00:01:00.000Z",
  };
  const count = buildCountFromDraft(bar, draft, "c1", "2026-07-08T00:02:00.000Z");
  assert.equal(count.entries.length, 1);
  assert.equal(count.entries[0].bottleId, "x");
  assert.equal(count.entries[0].previousLevel, 2);
  assert.equal(count.entries[0].countedLevel, 1.5);
  assert.equal(count.notes, "close");
});

test("applyCountToBar updates only counted bottles", () => {
  const bar = {
    id: "b1",
    name: "Test",
    lastCountDate: null,
    stations: [
      {
        id: "s1",
        name: "Well",
        type: "well",
        bottles: [
          { id: "x", name: "Vodka", category: "vodka", currentLevel: 2, parLevel: 3, size: "750ml", costPerBottle: 10 },
          { id: "y", name: "Gin", category: "gin", currentLevel: 1, parLevel: 2, size: "750ml", costPerBottle: 10 },
        ],
      },
    ],
  };
  const count = {
    id: "c1",
    date: "2026-07-08T00:02:00.000Z",
    notes: "",
    entries: [
      { bottleId: "x", bottleName: "Vodka", stationId: "s1", previousLevel: 2, countedLevel: 1.5 },
    ],
  };
  const next = applyCountToBar(bar, count);
  assert.equal(next.stations[0].bottles[0].currentLevel, 1.5);
  assert.equal(next.stations[0].bottles[1].currentLevel, 1);
  assert.equal(next.lastCountDate, count.date);
});

test("countToCsv has header and delta", () => {
  const bar = {
    id: "b1",
    name: "Test",
    lastCountDate: null,
    stations: [
      {
        id: "s1",
        name: "Well",
        type: "well",
        bottles: [
          { id: "x", name: "Vodka", category: "vodka", currentLevel: 1.5, parLevel: 3, size: "750ml", costPerBottle: 10 },
        ],
      },
    ],
  };
  const count = {
    id: "c1",
    date: "2026-07-08T00:02:00.000Z",
    entries: [
      { bottleId: "x", bottleName: "Vodka", stationId: "s1", previousLevel: 2, countedLevel: 1.5 },
    ],
  };
  const csv = countToCsv(bar, count);
  assert.match(csv, /^station,bottle,size,previous,counted,delta/);
  assert.match(csv, /Well,Vodka,750ml,2,1.5,-0.5/);
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd "/Users/macbook15/Documents/New project/open-source-barware"
node --test lib/count-night.test.mjs
```

Expected: FAIL (module not found).

- [ ] **Step 4: Implement pure module + browser wrappers**

Create `lib/count-night-pure.mjs` (Node-friendly pure functions used by tests and re-exported conceptually):

```js
export function clampLevel(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x * 10) / 10;
}

export function stepLevel(n, delta) {
  return clampLevel(clampLevel(n) + delta);
}

export function buildCountFromDraft(bar, draft, countId, dateIso) {
  const bottleIndex = new Map();
  for (const station of bar.stations) {
    for (const bottle of station.bottles) {
      bottleIndex.set(bottle.id, { bottle, stationId: station.id });
    }
  }
  const entries = [];
  for (const [bottleId, raw] of Object.entries(draft.entries || {})) {
    const hit = bottleIndex.get(bottleId);
    if (!hit) continue;
    entries.push({
      bottleId,
      bottleName: hit.bottle.name,
      stationId: hit.stationId,
      previousLevel: hit.bottle.currentLevel,
      countedLevel: clampLevel(raw),
    });
  }
  return {
    id: countId,
    date: dateIso,
    notes: draft.notes || "",
    entries,
  };
}

export function applyCountToBar(bar, count) {
  const levels = new Map(count.entries.map((e) => [e.bottleId, e.countedLevel]));
  return {
    ...bar,
    lastCountDate: count.date,
    stations: bar.stations.map((station) => ({
      ...station,
      bottles: station.bottles.map((bottle) =>
        levels.has(bottle.id)
          ? { ...bottle, currentLevel: levels.get(bottle.id) }
          : bottle
      ),
    })),
  };
}

export function countToCsv(bar, count) {
  const stationName = new Map(bar.stations.map((s) => [s.id, s.name]));
  const bottleSize = new Map();
  for (const s of bar.stations) {
    for (const b of s.bottles) bottleSize.set(b.id, b.size || "");
  }
  const lines = ["station,bottle,size,previous,counted,delta"];
  for (const e of count.entries) {
    const delta = Math.round((e.countedLevel - e.previousLevel) * 10) / 10;
    const row = [
      stationName.get(e.stationId) || e.stationId,
      e.bottleName,
      bottleSize.get(e.bottleId) || "",
      e.previousLevel,
      e.countedLevel,
      delta,
    ]
      .map((cell) => {
        const s = String(cell);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",");
    lines.push(row);
  }
  return lines.join("\n") + "\n";
}
```

Create `lib/count-night.ts` wrapping pure logic + localStorage:

```ts
import {
  generateId,
  getBar,
  saveBar,
  saveCount,
  getCounts,
  type Bar,
  type InventoryCount,
  STORAGE_KEYS,
} from "@/lib/inventory-store";
import { createDojoBar } from "@/lib/dojo-seed";

// Re-implement clamp/step/build/apply/csv in TS matching pure.mjs
// (keep logic identical — or import pure.mjs if bundler allows).
// Prefer duplicating the 40 lines in TS for Next type safety, and keep
// count-night-pure.mjs as the test oracle copy. When changing logic, update BOTH.

export type CountNightDraft = {
  id: string;
  startedAt: string;
  barId: string;
  notes: string;
  entries: Record<string, number>;
  stationsDone: Record<string, boolean>;
  updatedAt: string;
};

export function clampLevel(n: number): number { /* same as pure */ }
export function stepLevel(n: number, delta: number): number { /* same */ }
export function buildCountFromDraft(...): InventoryCount { /* same */ }
export function applyCountToBar(bar: Bar, count: InventoryCount): Bar { /* same */ }
export function countToCsv(bar: Bar, count: InventoryCount): string { /* same */ }

function readDraft(): CountNightDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.countDraft);
    return raw ? (JSON.parse(raw) as CountNightDraft) : null;
  } catch {
    return null;
  }
}

export function getCountDraft(): CountNightDraft | null {
  return readDraft();
}

export function saveCountDraft(draft: CountNightDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEYS.countDraft,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
  );
}

export function clearCountDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.countDraft);
}

export function startCountDraft(bar: Bar): CountNightDraft {
  const draft: CountNightDraft = {
    id: generateId("draft"),
    startedAt: new Date().toISOString(),
    barId: bar.id,
    notes: "",
    entries: {},
    stationsDone: {},
    updatedAt: new Date().toISOString(),
  };
  saveCountDraft(draft);
  return draft;
}

export function setDraftLevel(
  draft: CountNightDraft,
  bottleId: string,
  level: number
): CountNightDraft {
  const next = {
    ...draft,
    entries: { ...draft.entries, [bottleId]: clampLevel(level) },
    updatedAt: new Date().toISOString(),
  };
  saveCountDraft(next);
  return next;
}

export function markStationDone(
  draft: CountNightDraft,
  stationId: string,
  done: boolean
): CountNightDraft {
  const stationsDone = { ...draft.stationsDone };
  if (done) stationsDone[stationId] = true;
  else delete stationsDone[stationId];
  const next = { ...draft, stationsDone, updatedAt: new Date().toISOString() };
  saveCountDraft(next);
  return next;
}

export function ensureDemoBar(): Bar {
  const existing = getBar();
  if (existing && existing.stations.length > 0) return existing;
  const bar = createDojoBar();
  saveBar(bar);
  return bar;
}

export function commitCountNight(
  bar: Bar,
  draft: CountNightDraft
): { count: InventoryCount; bar: Bar } {
  const date = new Date().toISOString();
  const count = buildCountFromDraft(bar, draft, generateId("count"), date);
  const nextBar = applyCountToBar(bar, count);
  saveCount(count);
  saveBar(nextBar);
  clearCountDraft();
  return { count, bar: nextBar };
}

export function stationProgress(bar: Bar, draft: CountNightDraft) {
  const totalStations = bar.stations.length;
  const done = bar.stations.filter((s) => draft.stationsDone[s.id]).length;
  let totalBottles = 0;
  let countedBottles = 0;
  for (const s of bar.stations) {
    for (const b of s.bottles) {
      totalBottles += 1;
      if (Object.prototype.hasOwnProperty.call(draft.entries, b.id)) countedBottles += 1;
    }
  }
  return {
    done,
    total: totalStations,
    countedBottles,
    totalBottles,
    skippedBottles: totalBottles - countedBottles,
  };
}

export function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/csv;charset=utf-8"
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getLatestCount(): InventoryCount | null {
  return getCounts()[0] ?? null;
}
```

Implement the TS pure helpers with **identical** math to `count-night-pure.mjs`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
node --test lib/count-night.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/inventory-store.ts lib/count-night.ts lib/count-night-pure.mjs lib/count-night.test.mjs
git commit -m "feat(count): draft store, commit, CSV pure helpers + tests"
```

---

### Task 2: Hide marketing chrome on `/count`

**Files:**
- Modify: `components/ConditionalSiteChrome.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/JulyFourthLaunchOverlay.tsx`

**Interfaces:**
- Produces: `useIsAppShell(): boolean` true for `/inventory` and `/count`
- Consumes: `usePathname`

- [ ] **Step 1: Expand ConditionalSiteChrome**

```tsx
"use client";

import { usePathname } from "next/navigation";

export function useIsAppShell() {
  const pathname = usePathname();
  return Boolean(
    pathname?.startsWith("/inventory") || pathname?.startsWith("/count")
  );
}

/** @deprecated use useIsAppShell */
export function useIsInventoryApp() {
  return useIsAppShell();
}

export default function ConditionalSiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAppShell = useIsAppShell();
  if (isAppShell) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap Header in layout**

In `app/layout.tsx`, change:

```tsx
<ConditionalSiteChrome>
  <Header />
</ConditionalSiteChrome>
<main className="flex-1">{children}</main>
```

(Header currently sits outside ConditionalSiteChrome.)

- [ ] **Step 3: Skip launch overlay on `/count`**

In `JulyFourthLaunchOverlay.tsx`, where inventory is skipped:

```ts
if (pathname?.startsWith("/inventory") || pathname?.startsWith("/count")) return;
```

- [ ] **Step 4: Manual check**

```bash
npm run dev
# open /count (after Task 3) and /about — about shows header; count does not
```

- [ ] **Step 5: Commit**

```bash
git add components/ConditionalSiteChrome.tsx app/layout.tsx components/JulyFourthLaunchOverlay.tsx
git commit -m "fix: hide marketing chrome on /count app shell"
```

---

### Task 3: Count Night UI (`/count`)

**Files:**
- Create: `components/count/CountNightApp.tsx`
- Create: `app/count/page.tsx`

**Interfaces:**
- Consumes: all Task 1 exports, `getBar`, `saveBar`, `normalizeBar`, `useHydrated` from `components/dojo/useHydrated`
- Produces: full interactive flow

- [ ] **Step 1: Create page shell**

`app/count/page.tsx`:

```tsx
import type { Metadata } from "next";
import CountNightApp from "@/components/count/CountNightApp";

export const metadata: Metadata = {
  title: "Count Night — Open Source Barware",
  description:
    "Walk the bar. Count bottles in tenths. Free mobile count night — works offline after first open.",
  appleWebApp: {
    capable: true,
    title: "OSB Count",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function CountPage() {
  return <CountNightApp />;
}
```

Also add to page (via app or component effect later) link tags for manifest — Task 4.

- [ ] **Step 2: Implement CountNightApp**

Create `components/count/CountNightApp.tsx` as a client component with step state:

```ts
type Step = "home" | "stations" | "count" | "review" | "done";
```

**Required behavior:**

1. **Hydration:** use `useHydrated()`; until hydrated show “Loading…”.
2. **Home:**
   - Show bar name (`getBar()?.name` or “No map yet”).
   - Last count date from `getBar()?.lastCountDate` or latest count.
   - Primary: **Start count night** → `ensureDemoBar()` if empty? No — only Start if bar exists; else **Load demo map** first.
   - Buttons:
     - `Start count night` → `startCountDraft(bar)`, step `stations`
     - `Resume` if `getCountDraft()` non-null
     - `Load demo map` → `ensureDemoBar()` / force `createDojoBar` + `saveBar`
     - `Import map` → file input accept `.json`, `JSON.parse`, `normalizeBar`, `saveBar`, status message
     - `Export last CSV` if `getLatestCount()` and bar
3. **Stations:**
   - List stations with bottle count and whether `stationsDone[id]`
   - Progress line from `stationProgress`
   - Tap station → set `activeStationId`, step `count`
   - “Review night” → step `review`
4. **Count (one station):**
   - Header: station name, Back to stations
   - For each bottle: name, size, previous `currentLevel`, entry value (from draft.entries or show “—” if unset)
   - Controls: `−0.1`, `+0.1`, “Set” opens quick pad (buttons 0–9, .0–.9 shortcuts optional: 0, 0.5, 1, 2, 3)
   - First tap on +/− if unset: start from `previous` then step
   - “Mark station done” → `markStationDone(..., true)` → back to stations
5. **Review:**
   - Show counted / skipped / total from `stationProgress`
   - Notes textarea → update draft.notes + save
   - **Save count** → `commitCountNight` → store last count in component state → step `done`
   - Disable save if `countedBottles === 0` with message “Count at least one bottle”
6. **Done:**
   - Timestamp, counted count
   - **Export CSV** → `downloadTextFile(\`count-${date}.csv\`, countToCsv(...))`
   - **Home** → step home

**Visual:** full viewport, `bg-[#0a1628]` or `bg-bg` + silver text (`text-text`), large bottom-safe padding (`pb-8`), buttons min height 48px, primary CTA full width.

Minimal structure sketch:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useHydrated } from "@/components/dojo/useHydrated";
import { getBar, saveBar, normalizeBar, type Bar, type InventoryCount } from "@/lib/inventory-store";
import {
  getCountDraft,
  startCountDraft,
  setDraftLevel,
  markStationDone,
  commitCountNight,
  stationProgress,
  ensureDemoBar,
  countToCsv,
  downloadTextFile,
  getLatestCount,
  stepLevel,
  clampLevel,
  type CountNightDraft,
} from "@/lib/count-night";
import { createDojoBar } from "@/lib/dojo-seed";

export default function CountNightApp() {
  const hydrated = useHydrated();
  const [step, setStep] = useState<Step>("home");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  // read bar/draft after tick
  // ... implement screens as above
}
```

- [ ] **Step 3: Smoke in browser**

```bash
npm run dev
# Phone width or DevTools mobile:
# 1) Load demo map
# 2) Start count, set 3 bottles across 2 stations
# 3) Refresh mid-count — Resume works
# 4) Save — levels updated on second count previous values
# 5) Export CSV downloads
```

- [ ] **Step 4: Commit**

```bash
git add app/count/page.tsx components/count/CountNightApp.tsx
git commit -m "feat(count): Count Night mobile UI at /count"
```

---

### Task 4: PWA manifest + service worker + icons

**Files:**
- Create: `public/manifest-count.webmanifest`
- Create: `public/sw-count.js`
- Create: `public/icons/count-192.png`, `public/icons/count-512.png` (resize from `public/images/logo.png`)
- Modify: `components/count/CountNightApp.tsx` or `app/count/page.tsx` to register SW + manifest link
- Create: `components/count/CountPwaTags.tsx` client helper if needed

- [ ] **Step 1: Generate icons**

```bash
cd "/Users/macbook15/Documents/New project/open-source-barware"
mkdir -p public/icons
# Prefer sips on macOS:
sips -z 192 192 public/images/logo.png --out public/icons/count-192.png
sips -z 512 512 public/images/logo.png --out public/icons/count-512.png
```

- [ ] **Step 2: Manifest**

`public/manifest-count.webmanifest`:

```json
{
  "name": "Open Source Barware — Count",
  "short_name": "OSB Count",
  "description": "Walk the bar. Count bottles in tenths.",
  "start_url": "/count",
  "scope": "/count",
  "display": "standalone",
  "background_color": "#0a1628",
  "theme_color": "#0a1628",
  "icons": [
    {
      "src": "/icons/count-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/count-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Note: if `scope: /count` blocks caching shared `/_next` assets from SW, widen scope to `/` and keep `start_url` `/count`. **Prefer `scope: "/"`** so Next chunks cache cleanly.

Updated recommendation:

```json
"start_url": "/count",
"scope": "/",
```

- [ ] **Step 3: Service worker**

`public/sw-count.js`:

```js
const CACHE = "osb-count-v1";
const PRECACHE = ["/count", "/manifest-count.webmanifest", "/icons/count-192.png", "/icons/count-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        if (cached) return cached;
        if (req.mode === "navigate") return cache.match("/count");
        throw new Error("offline");
      }
    })
  );
});
```

- [ ] **Step 4: Register from CountNightApp**

On mount (client only):

```ts
useEffect(() => {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "/manifest-count.webmanifest";
  document.head.appendChild(link);

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", "#0a1628");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw-count.js").catch(() => {});
  }
  return () => {
    link.remove();
  };
}, []);
```

- [ ] **Step 5: Verify**

Chrome DevTools → Application → Manifest + SW registered on `/count`.

- [ ] **Step 6: Commit**

```bash
git add public/manifest-count.webmanifest public/sw-count.js public/icons components/count/CountNightApp.tsx app/count/page.tsx
git commit -m "feat(count): PWA manifest, SW, icons for Count Night"
```

---

### Task 5: Download page + sitemap

**Files:**
- Modify: `app/download/page.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add Mobile Count Night section** on download page after `ProgramDownloadPanel` section (before “program guide”):

```tsx
<section className="max-w-4xl mx-auto px-6 pb-12 md:pb-16">
  <div className="border border-gear-border bg-bg-panel p-6 md:p-8">
    <p className="text-[10px] tracking-[0.3em] uppercase text-text-light mb-3">
      Mobile
    </p>
    <h2 className="font-serif text-2xl md:text-3xl mb-3">
      Count Night on your phone
    </h2>
    <p className="text-text-muted text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
      Walk the bar. Count in tenths. Free. Works offline after first open.
    </p>
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <Link
        href="/count"
        className="inline-flex justify-center items-center bg-copper text-bg px-6 py-3 text-sm tracking-wide hover:bg-copper-bright transition-colors"
      >
        Open Count Night
      </Link>
      <a
        href="/downloads/open-source-barware-count.apk"
        className="inline-flex justify-center items-center border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-6 py-3 text-sm tracking-wide transition-all"
      >
        Download Android APK
      </a>
    </div>
    <div className="mt-6 text-text-light text-xs leading-relaxed space-y-2">
      <p>
        <span className="text-text-muted">iPhone:</span> Open Count Night in
        Safari → Share → Add to Home Screen.
      </p>
      <p>
        <span className="text-text-muted">Android APK:</span> Allow install from
        browser if prompted. Play Store release comes later.
      </p>
    </div>
  </div>
</section>
```

If APK not built yet, still ship the link; Task 6 drops the file (or show “coming same weekend” only if file missing — prefer ship link + placeholder note in README until APK exists).

- [ ] **Step 2: Sitemap entry**

```ts
{
  url: `${baseUrl}/count`,
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: 0.9,
},
```

- [ ] **Step 3: Commit**

```bash
git add app/download/page.tsx app/sitemap.ts
git commit -m "feat(count): download page + sitemap for Count Night"
```

---

### Task 6: Capacitor Android shell + APK artifact

**Files:**
- Create: `mobile/package.json`, `mobile/capacitor.config.ts`, `mobile/README.md`
- Create: Android project via CLI
- Output: `public/downloads/open-source-barware-count.apk`

**Interfaces:**
- App id `com.opensourcebarware.count`
- Server URL `https://opensourcebarware.com/count`

- [ ] **Step 1: Scaffold mobile folder**

```bash
mkdir -p "/Users/macbook15/Documents/New project/open-source-barware/mobile"
cd "/Users/macbook15/Documents/New project/open-source-barware/mobile"
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "OSB Count" com.opensourcebarware.count --web-dir www
mkdir -p www
printf '%s\n' '<!doctype html><meta http-equiv="refresh" content="0;url=https://opensourcebarware.com/count"><p><a href="https://opensourcebarware.com/count">Open Count Night</a></p>' > www/index.html
```

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.opensourcebarware.count",
  appName: "OSB Count",
  webDir: "www",
  server: {
    url: "https://opensourcebarware.com/count",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

```bash
npx cap add android
npx cap sync android
```

- [ ] **Step 2: Build release or debug APK**

Requires Android SDK / Android Studio. If SDK available:

```bash
cd android
./gradlew assembleDebug
# APK typically:
# android/app/build/outputs/apk/debug/app-debug.apk
cp app/build/outputs/apk/debug/app-debug.apk \
  "../../public/downloads/open-source-barware-count.apk"
```

If Android SDK **not** available on this machine:

- Document exact Android Studio steps in `mobile/README.md`
- Add `public/downloads/OPEN-SOURCE-BARWARE-COUNT-APK.md` explaining “build with mobile/README.md; link live once APK copied”
- Download page link stays; do not block web ship on APK

- [ ] **Step 3: Write `mobile/README.md`**

Include: Node version agnostic, `npm i`, `npx cap open android`, generate signed release for Play later, debug APK path for site hosting, package id, intent to replace `server.url` with bundled assets later if needed.

- [ ] **Step 4: Commit**

```bash
# Do not commit huge android build intermediates if any — commit sources + README + APK if size reasonable
git add mobile/package.json mobile/package-lock.json mobile/capacitor.config.ts mobile/www mobile/README.md mobile/android
# If APK < ~30MB:
git add public/downloads/open-source-barware-count.apk
git commit -m "feat(count): Capacitor Android shell for Count Night APK"
```

Add `mobile/android/.gitignore` defaults from Capacitor if not present (build/, local.properties, etc.).

---

### Task 7: Build, deploy, verify

**Files:** none new required; use existing deploy scripts.

- [ ] **Step 1: Production build**

```bash
cd "/Users/macbook15/Documents/New project/open-source-barware"
npm run build
# Confirm out/count.html or out/count/index.html exists (Next static export shape)
ls out/count* out/count 2>/dev/null
test -f public/sw-count.js && test -f public/manifest-count.webmanifest
```

Expected: build succeeds; count route in `out/`.

- [ ] **Step 2: Deploy Pages**

```bash
npm run deploy:pages
# or: npx wrangler pages deploy out --project-name=open-source-barware --branch=main
```

- [ ] **Step 3: Live smoke checklist**

- [ ] `https://opensourcebarware.com/count` loads without site header/footer  
- [ ] Load demo map → start count → set levels → refresh → Resume  
- [ ] Save → export CSV  
- [ ] Airplane mode after first load still opens shell (SW)  
- [ ] `/download` shows Mobile block; Open Count Night works  
- [ ] APK installs on Android if artifact present  
- [ ] `node --test lib/count-night.test.mjs` still passes  

- [ ] **Step 4: Coordination log**

```bash
python3 ~/Me-Nexus/scripts/coordination_append.py \
  --agent GROK \
  --project opensourcebarware \
  --action "Ship Mobile Count Night: /count PWA + download page (+ APK if built)" \
  --status shipped \
  --verification passed
```

Use `partial` if web shipped but APK blocked on SDK.

- [ ] **Step 5: Final commit if deploy scripts or handoff notes changed**

```bash
git add HANDOFF.md  # only if you update handoff
git commit -m "docs: Count Night ship notes" || true
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| `/count` phone flow | 3 |
| Draft auto-save / resume | 1, 3 |
| Tenths, skip not zero-fill | 1, 3 |
| Demo map + import JSON | 3 |
| CSV export | 1, 3 |
| Hide marketing chrome | 2 |
| PWA + offline | 4 |
| Download page mobile block | 5 |
| Sitemap | 5 |
| Capacitor APK site host | 6 |
| Deploy + smoke | 7 |
| Stores deferred | (no task — intentional) |

## Type consistency

- `CountNightDraft.entries: Record<string, number>` used in UI + commit  
- `buildCountFromDraft` / `applyCountToBar` / `countToCsv` shared names in pure.mjs and count-night.ts  
- Storage key `STORAGE_KEYS.countDraft` → `osb_dojo_count_draft`

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-mobile-count-night.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session, task-by-task with checkpoints  

Which approach?
