# OSB Chrome Program — Handoff

*Updated: 2026-07-04 ~18:05 EDT | agent: GROK | project ID: `open-source-barware`*  
*Status: **in-progress** — caterpillar ✅ · butterfly P0 ✅ · Analytics+Spreadsheets wired ✅ · Test 3 ✅ · Windows VC green*

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
| `butterfly` | Home admin | ✅ **P0 shipped** — see below |

---

## Butterfly (shipped 2026-07-04)

- Cycle close on `first_count_complete` → `program_state.json` `cycles[]`
- Live `/api/metrics` + first-week panel on dashboard
- `/api/in-house` + category table UI
- Spreadsheets panel — export download links
- Weekly inputs — POS upload log (`/api/pos/log`)
- `/api/reports/first-week`
- `node scripts/run-test3.mjs` — **PASS**

**Cache bust:** `osb-app.js?v=20260704-butterfly` on `home.html`

---

## Remaining (post-P0)

1. Full browser walk-through (welcome → home) on real dictation  
2. POS parse / mid-week inventory estimate  
3. Variance / usage metrics (needs POS reconcile)  
4. Whole-bottle display toggle (`SYNC_FROM_WEB_DOJO.md`)  
5. Dojo sandbox parity

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