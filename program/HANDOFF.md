# OSB Chrome Program — Handoff

*Updated: 2026-07-05 (session close) | agent: GROK | project ID: `open-source-barware`*  
*Build: **all-inputs** (includes process-fix + inventory-system)*

## Nexus pickup

**Library:** `~/Me-Nexus/library/open-source-barware/HANDOFF.md`  
**Release:** `releases/v1.0-2026-07-05-all-inputs/`  
**Zip:** `~/Downloads/open-source-barware-program-mac.zip`

---

## Session deliverables (2026-07-05)

| Feature | Status |
|---------|--------|
| Process button fix (`bottles` → `allBottles()`) | ✓ 100/100 Playwright |
| Settings → Your business (name, address, logo) | ✓ |
| Inventory / Spreadsheets (live workbook vs exports) | ✓ |
| PAR & Count — editable PARs + Save | ✓ |
| All inputs hub (POS + invoices + next count) | ✓ |
| `POST /api/cycle/begin-next-count` → Count step 5 | ✓ |
| Kelhen hot-patched live (no full reinstall needed) | ✓ |

**Cache bust:** `20260705-all-inputs`

---

## Root cause — Process “does nothing”

`parseCountNotes()` referenced undefined `bottles` → silent JS crash every click. Fixed to `allBottles()`.

---

## All inputs (admin sidebar)

1. **Begin your next weekly inventory** — `Start next count →` opens Count (step 5); map + PARs unchanged
2. **POS terminal receipts** — mid-week drops
3. **Vendor invoices** — tagged `invoice` in input log
4. **Input log** — filter All / POS / Invoices

---

## Fresh install

```bash
rm -rf ~/osb-program
unzip -o ~/Downloads/open-source-barware-program-mac.zip -d ~/Downloads
bash ~/Downloads/open-source-barware-program/install.sh ~/osb-program
cd ~/osb-program && .venv/bin/python3 server.py
# Chrome Cmd+Shift+R → http://localhost:5052/setup
```

## Hot-patch (Kelhen or running install)

```bash
# From macbook15 — copy these four files, restart server
scp program/{server.py,static/home.html,static/js/osb-app.js,static/css/app.css} kelhen:~/osb-program/...
lsof -ti :5052 | xargs kill -9; cd ~/osb-program && .venv/bin/python3 server.py &
```

---

## Verify

```bash
node scripts/check-process-button.mjs
node scripts/run-sandbox-e2e.mjs
OSB_PROCESS_RUNS=20 node scripts/run-browser-process-e2e.mjs
```

## Test kits

- `test-kit/twin-well-demo/` — 12 bottles, simplest golden
- `test-kit/copper-pair-demo/` — 26+24 bottles, two bars

**First safe pickup:**

```bash
cd ~/Documents/New\ project/open-source-barware/program
node scripts/check-process-button.mjs && node scripts/run-sandbox-e2e.mjs
```

---

## V1.5 Build (started 2026-07-08)

**Version:** 1.5.0-v1.5-phase1

**Focus:** Phase 1 — Accuracy & Mobile Speed (weight entry + bottle weights DB, mobile counting view with large taps + PWA, camera barcode, visual par alerts, blueprint/shelf mapping)

**Status:** Phase 1 in progress (internal V1.5 only).

**Important:** Public site version strings remain completely untouched (still 1.0). No app/ edits. Full build + in-house test before any release or site touch. Program/ only.

Phase 1.1: Weight fully optional (default off, toggle in Setup + Settings). Nice dedicated panel with transition copy for future scale add-on. Integrated cleanly.

Phase 1.2: Mobile Count done - large taps, presets, weigh optional, camera scan (capture increments the bottle while showing live view). Par alerts (color) in mobile values.

Phase 1.3 Barcode: done (📷 per bottle in mobile: live camera, capture increments count for that item. Works with weigh. Clean, professional).

Blueprint lock added in mobile (saves walk order).

Par visual alerts (color on value) in mobile.

UI: fun (tap feedback, presets, camera), professional (copper, precise, no slop).

Phase 1 core complete.

Phase 2.1: Recipe builder + menu costing implemented and polished.
- First-time user test run-through completed (via code inspection + test-kit data simulation: fresh setup -> count -> settings -> spreadsheets costs -> recipes).
- Polishes: edit existing recipes, first-time cost warning in panel, dashboard teaser if recipes or tip, improved form UX (no dead code, better styles/rows), conditional weigh respected.
- Editor works end-to-end with demo costs for immediate value.
- Optional, clean.

Phase 2 continued: Added Smart Orders panel.
- Generates suggestions from PAR - current + usage stub.
- Export CSV.
- Accessible from dashboard.
- Uses existing data.

Phase 3.1 (2026-07-08 GROK): 1-click Ordering & Invoicing
- Smart Orders panel upgraded → **Smart Orders → Purchase Order**
- Editable order qty + per-line vendor; default vendor + PO # + supplier notes
- Actions: **Copy PO text**, **Email draft** (mailto), **CSV**, **Log as sent** (input_type=`po`), **→ Receive** (seeds receive list)
- PO text includes business name/address from Settings branding
- Grouped by vendor; zero qty drops a line
- Input log filter: **POs / Orders**; server accepts `po`/`order` types
- Closes loop: smart suggest → send PO → receive → variance

First-time flow: works, optional features gated, demo data for value.

All V1.5 internal only. Site version frozen.

V1.5 polish:
- Enhanced parsePosText with more Toast/Square variants (Item Name, Quantity Sold, Net Sales, etc.), Toast cleanup (strip " - Well"), better fallbacks.
- Wired parsed POS into variance: product_rows now include pos_sales (aggregated from recent parsed), variance table shows "POS Sales" column + "Adj Var" (variance adjusted for sales) for smoother insight vs pure count-vs-par.
- Full POS review flow added: "Parse & Review Matches" button (for pasted/file text) shows editable table with product names + auto-matched bottle dropdowns. User can correct before "Save reviewed". Raw drop option remains. Parsed with matches stored and used in log/variance.
- Smart Orders now pulls real usage from recent parsed POS sales (aggregated by matched product) instead of stub. Suggestions = ceil(PAR - current + recent_sales). Shows Recent Sales col. Much smoother/accurate.
- Added basic Receiving workflow in inputs: "Load from smart orders", edit received qtys, "Log receipt" as purchase input (with discrepancy notes). Added "purchase" filter to log. Purchases now appear in inputs and can feed variance/reconciliation.
- Purchases and sales now aggregated in analytics/product_rows (purchases column in variance/order tables, Net = purchases - sales).
- Variance table updated with Net and full columns for real usage-based variance.
- This closes the loop: POS sales + purchases logged via receive → used in variance (Adj Var, Net, columns). Much more accurate and actionable than par-only.
- Full cycle: count → inputs (POS review + receive) → variance with real data → smart orders. Better than paid systems: free, local, reviewable, data-driven.
- Smart Orders now pulls real usage from recent parsed POS sales (aggregated by matched product) instead of stub. Suggestions = ceil(PAR - current + recent_sales). Shows Recent Sales col. Much smoother/accurate.
- This is smoother with more options than competitors (review step, explicit matches, data-driven orders + adj variance).
- Auto-match improved.
- Goal: better than out there - free/local/voice + structured+reviewable POS feeding real variance + data-driven smart orders + optional weigh + recipes + smart orders, no lock-in.

**Key changes planned (see Complete Build Roadmap PDF):**
- Add weight-based counting mode (current_weight_oz + per-bottle or product full/empty weights)
- Calculate effective level from weight for higher accuracy
- Seed bottle-weights data
- Mobile count surface
- Blueprint for recurring order
- Alerts and barcode

**Status map (tick as you go):**
- [x] 1.1 Weight + bottle weights DB (optional)
- [x] 1.2 Mobile count (large taps)
- [x] 1.3 Barcode camera (mobile)
- [x] 1.4 Par alerts + blueprint lock
- [x] 2.1 Recipes + menu costing
- [x] 2.2 Advanced reports — **Shift reports** (plain-English story + scoreboard + tabs: glance / stock / money / history / export; ideal vs actual pour cost; CSV + summary copy)
- [x] 2.3 POS structured import + smart orders
- [x] 3.1 1-click ordering / PO (copy · email · CSV · log)
- [x] 3.2 Receiving (basic + load from smart orders / PO)
- [x] 4.1 Multi-venue + transfers (API + panel + company roll-up + history)
- [ ] 4.2 Food categories (deferred — paid restaurant package)
- [x] 4.3 Team access: 6-digit PIN logins, admin reset, manager venue lock, Staff board, People & access settings
- [ ] 5.x Package, Dojo parity, ship

**Phase 4.3 notes (2026-07-08):**
- `people.json` + session cookie; open mode until first admin PIN created
- `POST /api/auth/login` (6-digit PIN), logout, status
- `GET/POST /api/people`, PATCH, reset-pin (admin, no old PIN), DELETE
- Manager locked to `venue_id`; nav/cards gated by permission checkboxes
- Staff board: `GET/POST/DELETE /api/staff-board` — company + venue notes
- UI: PIN pad login, Settings → People & access, sidebar Staff board + session chip

**Phase 4.1 notes (2026-07-08):**
- `POST /api/bars/transfer` — atomic move qty between bars; match product by name+size; optional create on dest (“Transfers in”)
- `GET /api/bars/transfers` — transfer log (state)
- `GET /api/venues` — per-venue summary + consolidated totals
- UI: sidebar Transfer, Home card, Settings venues roll-up + history, Reports company strip
- Switch venue reloads barState + metrics/reports

**Test ladder (2026-07-08):** `node scripts/run-v15-ladder.mjs` → **5/5 PASS**
1. Corner Pint easy 1-bar · 2. Twin Well + Process · 3. Copper Pair dual · 4. Harbor 3-venue · 5. V1.5 PIN/transfer/PO/staff/reports (17 checks)
Report: `program/data/v15-ladder-report.json`

**Next stage:** 5.x package, release QA, ship.

**Commands for this build:**
```bash
cd "/Users/macbook15/Documents/New project/open-source-barware/program"
.venv/bin/python3 server.py
# Tests
node scripts/run-smoke-test.mjs
```

**Pickup for future sessions:** Refer to ~/Downloads/Open_Source_Barware_Complete_Build_Roadmap_Action_Map.pdf. Update this handoff as phases complete.