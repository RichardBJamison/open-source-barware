# Kelhen — What to paste/upload at each setup stage

**Test kit folder (after unzip):**
`~/Downloads/open-source-barware-program/test-kit/harbor-hearth-full-test/`

**Program:** `http://localhost:5052/setup`

**Venue test:** Harbor & Hearth — 3 bars (do Bar 1 fully first, then add bars 2 & 3 from butterfly)

---

## Fresh start

```bash
rm -rf ~/osb-program
cd ~/Downloads
unzip -o open-source-barware-program-mac.zip
cd open-source-barware-program
./Install.command
open http://localhost:5052/setup
```

Hard refresh in Chrome: **Cmd+Shift+R**

---

## Welcome

| Action | Notes |
|--------|-------|
| Click | **Begin setup** |

No file.

---

## Step 1 — Get started (`name_bar`)

| Field | Enter |
|-------|-------|
| Inventory cycle | **Weekly — counts start every Monday** |
| Click | **Continue** |

No file.

---

## Step 2 — Walk (`voice_walk`) — Bar 1

| Action | Upload or paste |
|-------|-----------------|
| File | **This file:** |

```
~/Downloads/open-source-barware-program/test-kit/harbor-hearth-full-test/part-1-walk/bar-1-river-room-walk.txt
```

| Action | |
|--------|--|
| 1 | Click **Upload files here** or paste into the box → **Parse pasted notes** |
| 2 | Review table — check sizes, tick **OK?** on rows (or **I've checked every size**) |
| 3 | Click **Review your map first** → Reconcile |
| 4 | At reconcile, rename **Bar 1** → **River Room** |

**What this does:** Creates stations from dictation (Well one primary, Well two service, Back bar, coolers, etc.) + ~89 bottles.

---

## Step 3 — Reconcile

| Action | Notes |
|--------|-------|
| Click | **Run reconciliation** |
| Scan | Audit report |
| Click | **Next step →** (goes to Review bar layout) |

No file.

---

## Step 4 — Review bar layout (`build_bar`)

| Action | Notes |
|--------|-------|
| Check | Stations match walk (wells, back bar, beer/wine cooler, liquor room) |
| Fix | Rename/reorder only if parser missed something |
| Bar name | **River Room** (top field) |
| Click | **Continue** |

No file — layout came from walk.

---

## Step 5 — Approve map (`map_review`)

| Action | Notes |
|--------|-------|
| Scan | Full bottle map (~89 items) |
| Fix | Any wrong name/size/station in the editor |
| Click | **Map approved — start counting** |

No file.

---

## Step 6 — First count (`first_count`) — Bar 1: River Room

| Action | Notes |
|--------|-------|
| Click | **Enter your count** |
| Upload or paste | **This file:** |

```
~/Downloads/open-source-barware-program/test-kit/harbor-hearth-full-test/part-2-first-count/bar-1-river-room-count-1.txt
```

| Then | |
|------|--|
| 1 | Parse / paste count notes |
| 2 | Review levels in table |
| 3 | Reconcile if flagged |
| 4 | Click **Finish first count** → **butterfly** `/home` |

---

## After butterfly — Bar 2 & 3 (optional full test)

**Settings → + Add another bar** (or create from home), then **Resume setup** for each bar.

### Bar 2 — Garden Terrace

| Stage | File |
|-------|------|
| Walk (name bar **Garden Terrace**) | `part-1-walk/bar-2-garden-terrace-walk.txt` |
| First count | `part-2-first-count/bar-2-garden-terrace-count-1.txt` |

### Bar 3 — The Cellar

| Stage | File |
|-------|------|
| Walk (name bar **The Cellar**) | `part-1-walk/bar-3-cellar-library-walk.txt` |
| First count | `part-2-first-count/bar-3-cellar-library-count-1.txt` |

Same wizard steps per bar: walk → reconcile → review layout → approve → count.

---

## Weekly inputs (butterfly `/home`) — River Room active

**Weekly inputs** panel — upload each with label:

| # | Label to type | File |
|---|---------------|------|
| 1 | Monday close | `part-4-week1-inputs/pos-monday-close.csv` |
| 2 | Wednesday lunch | `part-4-week1-inputs/pos-wednesday-lunch.csv` |
| 3 | Friday dinner | `part-4-week1-inputs/pos-friday-dinner.csv` |
| 4 | Saturday brunch | `part-4-week1-inputs/pos-saturday-brunch.csv` |
| 5 | Invoice spirits 7/1 | `part-4-week1-inputs/invoice-southern-glazers-0701.txt` |
| 6 | Invoice beer 7/3 | `part-4-week1-inputs/invoice-breakthru-beer-0703.txt` |

Full path prefix: `~/Downloads/open-source-barware-program/test-kit/harbor-hearth-full-test/`

---

## Cycle 2 count (optional)

1. Settings → Your bars → **River Room** → Resume setup → advance to **first count**
2. Paste: `part-3-second-count/bar-1-river-room-count-2.txt`
3. Finish count → check Analytics **Velocity**

---

## Quick file list (copy paths)

```
KIT=~/Downloads/open-source-barware-program/test-kit/harbor-hearth-full-test

Walk Bar 1:    $KIT/part-1-walk/bar-1-river-room-walk.txt
Count Bar 1:   $KIT/part-2-first-count/bar-1-river-room-count-1.txt
Walk Bar 2:    $KIT/part-1-walk/bar-2-garden-terrace-walk.txt
Count Bar 2:   $KIT/part-2-first-count/bar-2-garden-terrace-count-1.txt
Walk Bar 3:    $KIT/part-1-walk/bar-3-cellar-library-walk.txt
Count Bar 3:   $KIT/part-2-first-count/bar-3-cellar-library-count-1.txt
Count cycle 2: $KIT/part-3-second-count/bar-1-river-room-count-2.txt
```

**Pass targets:** River Room ~89 bottles · Garden Terrace ~22 · The Cellar ~50