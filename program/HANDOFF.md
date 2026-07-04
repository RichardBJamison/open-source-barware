# OSB Chrome Program — Handoff

*Last updated: 2026-07-04 | agent: GROK | project ID: `open-source-barware`*
*Status: **active** — coaching-path rebuild shipped; ready for clean walk-through from welcome*

## Purpose

Local Chrome-side inventory program for Open Source Barware customers. Same delivery
model as OVLP POP: one download, local Flask service, LaunchAgent auto-start, Chrome
bookmark as the app.

The public website `/inventory/*` is a **sandbox trial** (The Dojo) with demo data.
It mirrors this program's UI for marketing only. The real product lives here.

## Canonical locations

| What | Path |
|---|---|
| Source (dev) | `~/Documents/New project/open-source-barware/program/` |
| Install target (customer) | `~/osb-program/` |
| Nexus library handoff | `~/Me-Nexus/library/open-source-barware/HANDOFF.md` |
| GitHub | https://github.com/RichardBJamison/open-source-barware |
| Nexus project ID | `open-source-barware` |
| Reference model | `~/ovlp-pop/` (OVLP Screen Pop) |

## Lifecycle — caterpillar → butterfly

| Phase ID | Step | User sees | Status |
|---|---|---|---|
| `welcome` | 1 | Introduction | ✓ shipped |
| `name_bar` | 2 | Bar name + Weekly/Monthly cycle | ✓ shipped |
| `build_bar` | 3 | Visual station map | ✓ shipped |
| `voice_walk` | 4 | Size-delimited walk parser + review table | ✓ shipped |
| `reconcile` | 5 | Auto-reconcile + audit report + **green export button** | ✓ **locked** |
| `map_review` | 6 | Editable full map + **green export button** | ✓ **locked** |
| `first_count` | 7 | Walk-style count upload + level parser | ✓ shipped — minor polish only |
| `butterfly` | — | Home base admin panel | not built |

Gates block advance until each phase passes validation.

## Export toolkit (Steps 5 & 6 — shared modal)

After reconciliation (Step 5) or anytime on Review (Step 6), the green pulsating
**Print / Download MAP** button opens a shared modal with:

| Action | Detail |
|---|---|
| Print walk sheet | Opens print dialog / Save as PDF |
| Copy map to clipboard | Off-screen fallback + ✓ feedback |
| Walk sheet `.csv` / `.xlsx` | Field sheet with blank/add rows per station |
| Audit `.csv` / `.xlsx` / `.xml` | Full bottle audit — machine-readable |

**API:** `GET /api/export/bottles?format=` one of:
`csv`, `xlsx`, `xml`, `walk_csv`, `walk_xlsx`

XML returns nested `<inventory_audit>` with `<stations>` → `<bottles>` for ETL/scripts.

**Cache bust:** `osb-app.js?v=20260704-coaching-rebuild` — hard refresh after pickup.

## Coaching model (two-pass — 2026-07-04 rebuild)

| Pass | Steps | Behavior |
|---|---|---|
| Pass 1 | Build → Walk → Reconcile → Review | Map contract; humble parser; user fixes before approve |
| Pass 2 | Count | Reconcile to map; golden → lock baseline; gaps → comparison export + re-upload |

Count step: finish button **disabled** until `!hasIssues`. **Edit & re-upload count** returns to notes editor (not file picker only). Reconcile report uses **What we have / What you gave us / What we need** trio.

## Key files

| File | Role |
|---|---|
| `server.py` | Flask service, phase state, reconcile, exports |
| `static/setup.html` | Caterpillar wizard + shared `#mapToolkitModal` |
| `static/js/osb-app.js` | Phase router, parsers, map toolkit, review editor |
| `static/css/app.css` | Map toolkit modal, green button, review styles |
| `static/home.html` | Butterfly admin shell (stub) |
| `install.sh` | Customer installer (POP pattern) |
| `osb_config.example.json` | Config template — no secrets in repo |

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
source .venv/bin/activate 2>/dev/null || python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 server.py
# → http://localhost:5052/
curl -s http://localhost:5052/ping
curl -s "http://localhost:5052/api/export/bottles?format=xml" | head -5
```

**Restart Flask** after any `server.py` change. **Cmd+Shift+R** after JS/CSS changes.

## Safety constraints

- API keys live in `~/osb-program/osb_config.json` on customer machines only
- Do not commit `osb_config.json`, `data/`, or runtime state
- Do not delete `program/data/` — contains live test bar (~218 bottles, bar "jh")
- Website sandbox stays separate until butterfly shell is stable

## Verification (2026-07-04 lockdown)

| Check | Result |
|---|---|
| Walk parser (size-delimited) | ✓ 223 entries / 14 stations on Agave-style transcript |
| Step 4 reconcile green button | ✓ appears after reconcile; opens shared modal |
| Step 5 review green button | ✓ always visible in nav trio |
| Print / copy / blob downloads | ✓ map modal actions |
| `format=xml` export | ✓ `application/xml`, nested stations |
| `format=csv` / `walk_csv` | ✓ 200 |
| `POST /api/setup/count-notes` | ✓ 200 |
| `npm run build` (site + zips) | ✓ 21 static pages |

Note: `format=xlsx` falls back to CSV if `openpyxl` is not installed in the venv.

## Open work (post-lockdown — tiny only)

1. Step 7 count: CSV import/export parity with walk path
2. Butterfly home base shell (metrics, spreadsheets, in-house inventory)
3. `install.sh` + LaunchAgent (`com.opensourcebarware.program`)
4. AI reconcile when provider connected
5. Align Dojo sandbox with latest program UI after butterfly

## Pickup — first safe command

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware"
git pull origin main && git status   # expect clean
cd program && python3 server.py
open http://localhost:5052/
```

Read `~/Me-Nexus/library/open-source-barware/HANDOFF.md` before changing anything.