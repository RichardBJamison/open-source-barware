# OSB Chrome Program — Handoff

*Updated: 2026-07-04 ~18:40 EDT | agent: GROK | project ID: `open-source-barware`*  
*Ship version: **`36b712e`** on `main`*  
*Status: **in-progress** — walk-first setup ✅ · release-list signup ✅ · butterfly ✅ · Test 3 ✅*

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

## Caterpillar setup flow (current)

```
welcome → updates_signup → name_bar → voice_walk → reconcile → build_bar → map_review → first_count → butterfly
```

| Step | Phase | What happens |
|------|-------|----------------|
| Optional | `updates_signup` | Email + toggles → `POST /api/updates-subscribe` (local proxy → GHL) → toast → `name_bar` |
| 1 | `name_bar` | Pick inventory cycle (weekly/monthly) |
| 2 | `voice_walk` | Name bar + dictate stations ("Well one", "Back bar") — **stations auto-created from walk** |
| 3 | `reconcile` | Build auditable draft map |
| 4 | `build_bar` | Review/edit walk-created station layout |
| 5 | `map_review` | Approve map contract |
| 6 | `first_count` | Pass 2 live count → baseline lock |

**Cache bust:** `osb-app.js?v=20260704-signup-fix`

---

## Release-list signup

- Chrome program POSTs **same-origin** to `POST /api/updates-subscribe` (Flask proxy in `server.py`).
- Proxy forwards to `https://opensourcebarware.com/api/updates-subscribe` (GHL upsert).
- Join button: `Sending…` → success toast → auto-advance to `name_bar`.
- City/state required **only** when Hidden Bar Tour toggle is on.
- Signups logged locally: `data/release_signups.jsonl`.
- **Richard inbox email** needs `FORWARD_EMAIL_USER` + `FORWARD_EMAIL_PASS` on Cloudflare Pages (`NOTIFY_EMAIL` + `GHL_API_TOKEN` already set).

---

## Butterfly admin (`/home`)

| Panel | Backend | Status |
|-------|---------|--------|
| Dashboard | `GET /api/metrics` | ✅ |
| Spreadsheets | `GET /api/analytics` + tabs + exports | ✅ |
| Analytics | `GET /api/analytics` | ✅ |
| In-house | `GET /api/in-house` | ✅ |
| Weekly inputs | `GET/POST /api/pos/log` | ✅ |
| Settings | bars + `POST /api/config` | ✅ |

---

## Installers

| Platform | Entry | Installs to |
|----------|-------|-------------|
| Mac | `Install.command` | `~/osb-program` + LaunchAgent |
| Win | `Install.bat` → `install.ps1` | `%USERPROFILE%\osb-program` + Startup shortcut |
| Zips | `npm run package:program` | `public/downloads/open-source-barware-program-{mac,win}.zip` |

---

## Verification (passed 2026-07-04)

```bash
cd program
node scripts/run-test3.mjs              # butterfly E2E — 23 assertions
node scripts/run-walk-first-test.mjs      # walk-before-build phase gates
node scripts/test-updates-signup-flow.mjs # release-list proxy + advance
node scripts/run-harbor-hearth-test.mjs # parser golden counts
```

---

## Key files

| File | Role |
|------|------|
| `server.py` | Flask, phases, `/api/updates-subscribe` proxy, analytics |
| `static/js/osb-app.js` | Setup flow, parsers, signup handlers |
| `static/setup.html` | Caterpillar wizard UI |
| `scripts/run-walk-first-test.mjs` | Walk-first regression |
| `scripts/test-updates-signup-flow.mjs` | Signup regression |
| `test-kit/harbor-hearth-full-test/` | 3-bar E2E test kit (bundled in zip) |

---

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
source .venv/bin/activate && python3 server.py
# → http://localhost:5052/setup

cd .. && npm run package:program   # rebuild customer zips
```

Restart Flask after `server.py` changes. Hard-refresh after JS/CSS (`Cmd+Shift+R`).

---

## Safety

- Do not delete `data/` without Richard (test bars / signups log)  
- Do not commit `osb_config.json` or `data/` runtime state  
- API keys: customer `~/osb-program/osb_config.json` only  

---

## Pickup

```bash
cat ~/Me-Nexus/library/open-source-barware/PROGRAM-SNAPSHOT-2026-07-04.md
cd ~/Documents/New\ project/open-source-barware && git pull
cd program && source .venv/bin/activate && python3 server.py
```

**Fresh install (Kelhen):** unzip `~/Downloads/open-source-barware-program-mac.zip` → run `Install.command` → open `http://localhost:5052/setup`