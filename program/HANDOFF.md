# OSB Chrome Program — Handoff

*Updated: 2026-07-04 ~15:40 EDT | agent: GROK | project ID: `open-source-barware`*  
*Status: **in-progress** — caterpillar complete; **butterfly is next (P0 for 6pm ship)***

## Nexus pickup

**Read first:** `~/Me-Nexus/library/open-source-barware/HANDOFF.md`  
**Full gap + Test 3 spec:** `~/Me-Nexus/library/open-source-barware/SHIP-GAP-AND-TEST3-2026-07-04.md`  
**Doc index:** `~/Me-Nexus/library/open-source-barware/README.md`

---

## Purpose

Local Chrome-side inventory program. OVLP POP pattern: `install.sh` → `~/osb-program/` → LaunchAgent → bookmark `http://localhost:5052/` in Chrome.

Website `/inventory` = Dojo sandbox only. Real product = this folder.

---

## Lifecycle

| Phase | Step | Status |
|-------|------|--------|
| `welcome` … `map_review` | 1–6 | ✅ **Locked** — do not rework UX |
| `first_count` | 7 | ✅ Parser + reconcile + golden gate |
| `butterfly` | Home admin | ❌ **Shell only** — see gaps below |

---

## Critical gap (root cause)

`btnFirstCountDone` sets `first_count_complete` + redirects to `/home`, but:

- `state.json` → `cycles[]` is **never written**
- `_metrics_for_window()` returns placeholder nulls
- `/api/in-house` returns empty `items`
- `home.html` spreadsheets + weekly inputs = placeholders

Levels **are** saved on bottles via `POST /api/bar` (`current_level`). Butterfly does not read them yet.

---

## P0 build list (6pm deadline)

1. Cycle close on `first_count_complete` → `cycles[0]` snapshot  
2. Real metrics in `_metrics_for_window()`  
3. `/api/in-house` + in-house UI  
4. Spreadsheets panel — wire existing export APIs  
5. Weekly inputs — POS upload log (store + list; parse later)  
6. `install.sh` — full file copy + `requirements.txt`  
7. `scripts/run-test3.mjs` — E2E API test through butterfly  

Details: Nexus `SHIP-GAP-AND-TEST3-2026-07-04.md`

---

## What's locked (caterpillar)

- Two-pass coaching (Pass 1 map / Pass 2 count)  
- Green **Print / Download MAP** modal Steps 5 & 6  
- Export: `GET /api/export/bottles?format=csv|xlsx|xml|walk_csv|walk_xlsx`  
- Count comparison: `POST /api/export/count-comparison`  
- Finish count disabled until `!hasIssues`  

**Tests:** `node scripts/run-test1.mjs` · `node scripts/run-test2.mjs` — both pass at `181a19e`

---

## Key files

| File | Role |
|------|------|
| `server.py` | Flask, phases, exports, butterfly stubs |
| `static/js/osb-app.js` | Parsers, setup router, `initHome()` |
| `static/home.html` | Admin shell (placeholders) |
| `static/setup.html` | Caterpillar wizard |
| `install.sh` | Customer installer |
| `SYNC_FROM_WEB_DOJO.md` | Additive sync from Dojo (POS log, tenths toggle) |

---

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
source .venv/bin/activate 2>/dev/null || python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 server.py
# → http://localhost:5052/
curl -s http://localhost:5052/ping
node scripts/run-test1.mjs
node scripts/run-test2.mjs
```

Restart Flask after `server.py` changes. Cmd+Shift+R after JS/CSS.

---

## Safety

- Do not delete `data/` — live test bar (~218 bottles)  
- Do not commit `osb_config.json` or runtime `data/` state  
- API keys: customer `~/osb-program/osb_config.json` only  

---

## Untracked dev file

`scripts/test-count-reconcile.mjs` — one-off harness against `data/bars.json`. Safe to commit or gitignore; not part of Test 1/2/3 suite.

---

## Pickup command

```bash
cat ~/Me-Nexus/library/open-source-barware/HANDOFF.md
cd ~/Documents/New\ project/open-source-barware && git pull && cd program && python3 server.py
```