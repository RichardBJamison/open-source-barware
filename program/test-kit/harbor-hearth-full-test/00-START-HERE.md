# Harbor & Hearth — Full Fresh-Mac Test Kit

**Venue:** Harbor & Hearth (fictional) — three profit centers, one operator  
**Bars:** River Room (main) · Garden Terrace (patio) · The Cellar (wine/events)  
**Goal:** Install on a **clean MacBook** with zero OSB history. Walk → count → butterfly → week-1 inputs → cycle-2 count.

**Parser validation:** `node scripts/run-harbor-hearth-test.mjs` (all golden counts PASS)

---

## Before you start (clean machine)

1. Delete `~/osb-program` if it exists.
2. Download `open-source-barware-program-mac.zip` from the site or repo `public/downloads/`.
3. Unzip → double-click **Install.command** → bookmark `http://localhost:5052/`.
4. Confirm: `http://localhost:5052/ping` → `{"status":"ok",...}`
5. Copy this folder to Desktop: `test-kit/harbor-hearth-full-test/` (included in program zip).

**Setup wizard answers**

| Step | Value |
|------|-------|
| Venue name | Harbor & Hearth |
| Bar 1 name | River Room |
| Bar 2 name | Garden Terrace |
| Bar 3 name | The Cellar |
| Cycle | Weekly — starts Monday |
| Timezone | America/New_York |

---

## Station maps (build these in Step 2 — names must match)

### Bar 1 — River Room (89 bottles after walk)

| Station | Type | Dictation header in .txt |
|---------|------|--------------------------|
| Main Bar | well | `Well one primary` |
| Service Bar | well | `Well two service` |
| Point | well | `Well three point` |
| Back Bar Main | back-bar | `Back bar main` |
| Back Bar Top Shelf | back-bar | `Back bar top shelf` |
| Beer Cooler | walk-in | `Beer cooler` |
| Wine Cooler | walk-in | `Wine cooler` |
| Liquor Room | storage | `Liquor room` |

### Bar 2 — Garden Terrace (22 bottles)

| Station | Type | Dictation header |
|---------|------|------------------|
| Patio Well | well | `Well one patio` |
| Patio Beer Cooler | walk-in | `Patio cooler` |
| Patio Wine Cooler | walk-in | `Wine cooler` |

### Bar 3 — The Cellar (50 bottles)

| Station | Type | Dictation header |
|---------|------|------------------|
| Cellar Well Primary | well | `Well one primary` |
| Cellar Well Service | well | `Well two service` |
| Wine Wall | walk-in | `Wine wall` |
| Beer Cooler | walk-in | `Beer cooler` |
| Spirit Library | back-bar | `Back bar main` |
| Dry Storage | storage | `Liquor room` |

> **Why dictation headers differ from station names:** Voice parser recognizes well/cooler/back-bar patterns and maps them to the stations you built above (first well = Main Bar, etc.). Do not rename stations during build — use the table exactly.

---

## Test timeline (≈90 min)

| Step | What | File(s) |
|------|------|---------|
| A | Install + welcome | — |
| B | **Bar 1** walk (Pass 1) | `part-1-walk/bar-1-river-room-walk.txt` |
| C | Reconcile → approve map | — |
| D | **Bar 1** first count (Pass 2) | `part-2-first-count/bar-1-river-room-count-1.txt` |
| E | Finish count → **butterfly** `/home` | — |
| F | Settings → **+ Add another bar** | — |
| G | **Bar 2** walk + count | `part-1` + `part-2` bar-2 files |
| H | **Bar 3** walk + count | `part-1` + `part-2` bar-3 files |
| I | Switch active bar to **River Room** | sidebar |
| J | **Week 1 inputs** — POS + invoices | `part-4-week1-inputs/*` (table below) |
| K | **Cycle 2 count** (River Room) | `part-3-second-count/bar-1-river-room-count-2.txt` |

### Cycle 2 count (Part 3)

After Bar 1 is in butterfly:

1. **Settings → Your bars → River Room → Resume setup**
2. Advance through to **first count** (map stays approved)
3. Paste `bar-1-river-room-count-2.txt` → reconcile → finish count

Cycle 2 has intentional depletions (Tito's 0.3, Ketel 1.0, Patron spare out, Tito's case 5/6) so Analytics **Velocity** shows movers.

---

## Part file index

```
part-1-walk/
  bar-1-river-room-walk.txt
  bar-2-garden-terrace-walk.txt
  bar-3-cellar-library-walk.txt

part-2-first-count/
  bar-1-river-room-count-1.txt
  bar-2-garden-terrace-count-1.txt
  bar-3-cellar-library-count-1.txt

part-3-second-count/
  bar-1-river-room-count-2.txt

part-4-week1-inputs/
  pos-monday-close.csv
  pos-wednesday-lunch.csv
  pos-friday-dinner.csv
  pos-saturday-brunch.csv
  invoice-southern-glazers-0701.txt
  invoice-breakthru-beer-0703.txt
```

---

## Week 1 uploads (River Room active)

Go to **Weekly inputs** on `/home`. Upload each file with the label shown.

| # | Label | File | Note |
|---|-------|------|------|
| 1 | Monday close | `pos-monday-close.csv` | Toast export |
| 2 | Wednesday lunch | `pos-wednesday-lunch.csv` | Toast export |
| 3 | Friday dinner | `pos-friday-dinner.csv` | Toast export |
| 4 | Saturday brunch | `pos-saturday-brunch.csv` | Toast + patio |
| 5 | Invoice — spirits 7/1 | `invoice-southern-glazers-0701.txt` | Southern Glazer's |
| 6 | Invoice — beer 7/3 | `invoice-breakthru-beer-0703.txt` | Breakthru |

Invoices upload the same way as POS (`.txt` file or paste). Parsing is staging-only today — you should see 6 entries in the mid-week log.

---

## Pass criteria

- [ ] All 3 bars reach butterfly without hard-reset
- [ ] River Room: ~89 bottles on map after walk
- [ ] Garden Terrace: ~22 bottles
- [ ] The Cellar: ~50 bottles
- [ ] `/home` → Analytics shows category bars
- [ ] Spreadsheets tabs list bottle names from walk
- [ ] Weekly Inputs shows **6** staged files (4 POS + 2 invoices)
- [ ] After cycle-2 count: Analytics **Velocity** lists depleted items
- [ ] Optional dev check: `node scripts/run-harbor-hearth-test.mjs` → exit 0

---

## Tips

- Paste walk/count text into setup wizard text areas (or upload `.txt` if offered).
- Use **golden** count files first; if reconcile flags issues, confirm station build matches the table, then re-paste.
- Case lines use `Brand case six full` format (not "twenty four").
- Skip AI API during setup — not required.

Support: `https://opensourcebarware.com/the-process`