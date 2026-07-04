# OSB Chrome Program — Handoff

*Updated: 2026-07-04 ~18:15 EDT | agent: GROK | project ID: `open-source-barware`*  
*Ship version: **`ac43e73`** on `main`*  
*Status: **in-progress** — caterpillar ✅ · butterfly ✅ · Analytics+Spreadsheets ✅ · installers ✅ · Test 3 ✅ · Windows VC green*

## Nexus pickup

**Read first:** `~/Me-Nexus/library/open-source-barware/HANDOFF.md`  
**Ship snapshot:** `~/Me-Nexus/library/open-source-barware/PROGRAM-SNAPSHOT-2026-07-04.md`  
**Test 3:** `~/Me-Nexus/library/open-source-barware/TEST3-REPORT-2026-07-04.md`

---

## Purpose

Local Chrome-side inventory program. OVLP POP pattern:

```
Install.command / Install.bat → ~/osb-program → auto-start → bookmark http://localhost:5052/
```

Website `/inventory` = Dojo sandbox only. **This folder is the product.**

---

## Butterfly admin (`/home`)

| Panel | Backend | Status |
|-------|---------|--------|
| Dashboard | `GET /api/metrics` | ✅ |
| Spreadsheets | `GET /api/analytics` + tabs + exports | ✅ |
| Analytics | `GET /api/analytics` | ✅ (pinned from Dojo `103cf97`) |
| In-house | `GET /api/in-house` | ✅ |
| Weekly inputs | `GET/POST /api/pos/log` | ✅ |
| Settings | bars + `POST /api/config` | ✅ |

**Cache bust:** `osb-app.js?v=20260704-analytics-spreadsheets`

---

## Installers

| Platform | Entry | Installs to |
|----------|-------|-------------|
| Mac | `Install.command` | `~/osb-program` + LaunchAgent |
| Win | `Install.bat` → `install.ps1` | `%USERPROFILE%\osb-program` + Startup shortcut |
| Zips | `npm run package:program` | `public/downloads/open-source-barware-program-{mac,win}.zip` |

**Windows verify (no physical PC):** GHA `windows-install-smoke.yml` → `program/scripts/windows-vc.ps1` (11 checks).

---

## Caterpillar — locked

Steps 1–7. Tests 1–2 pass. Do not rework UX.

---

## Remaining

1. Greystone browser QA on Analytics + Spreadsheet tabs (post-`ac43e73`)  
2. Cost fields on bottles → analytics dollar accuracy  
3. POS parse / variance metrics (P2)  
4. Purchases tab (placeholder)  
5. Second cycle → velocity/trends populate  

---

## Key files

| File | Role |
|------|------|
| `server.py` | Flask, phases, `/api/analytics`, exports, cycles |
| `static/js/osb-app.js` | Parsers, `initHome()`, `loadAnalytics()`, workbook tabs |
| `static/home.html` | Admin shell |
| `static/downloads/Bar-Inventory-Master.xlsx` | Workbook download |
| `install.ps1` / `Install.command` | Customer installers |
| `scripts/windows-vc.ps1` | Synthetic Windows VC |
| `scripts/run-test3.mjs` | E2E harness — **PASS** |

---

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
source .venv/bin/activate && python3 server.py
# → http://localhost:5052/home

node scripts/run-test1.mjs
node scripts/run-test2.mjs
node scripts/run-test3.mjs

cd .. && npm run package:program   # rebuild customer zips
```

Restart Flask after `server.py` changes. Hard-refresh after JS/CSS.

---

## Safety

- Do not delete `data/` without Richard (Greystone test bar)  
- Do not commit `osb_config.json` or `data/` runtime state  
- API keys: customer `~/osb-program/osb_config.json` only  

---

## Pickup

```bash
cat ~/Me-Nexus/library/open-source-barware/PROGRAM-SNAPSHOT-2026-07-04.md
cd ~/Documents/New\ project/open-source-barware && git pull
cd program && source .venv/bin/activate && python3 server.py
```