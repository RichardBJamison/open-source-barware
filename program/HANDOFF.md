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