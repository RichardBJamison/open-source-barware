# OSB Chrome Program — Handoff

*Last updated: 2026-07-01 | agent: GROK | project ID: `open-source-barware`*
*Status: in-progress — frame scaffold only*

## Purpose

Local Chrome-side inventory program for Open Source Barware customers. Same delivery
model as OVLP POP: one download, local Flask service, LaunchAgent auto-start, Chrome
bookmark as the app.

The public website `/inventory/*` is a **sandbox trial** with fake sample data. It
mirrors this program's UI for marketing only. The real product lives here.

## Canonical locations

- **Source (dev):** `~/Documents/New project/open-source-barware/program/`
- **Install target (customer machine):** `~/osb-program/`
- **Nexus project ID:** `open-source-barware`
- **Reference model:** `~/ovlp-pop/` (OVLP Screen Pop)

## Lifecycle — caterpillar → butterfly

| Phase ID | Name | User sees |
|---|---|---|
| `welcome` | Welcome | Introduction; AI optional (Settings later) |
| `name_bar` | Name | Bar name + cycle length |
| `build_bar` | Build bar | Visual plug-and-play station map (site Step 2) |
| `voice_walk` | Walk | Voice parse + bottle cards grouped by station |
| `reconcile` | Reconcile | Draft map from bar data; AI when connected |
| `map_review` | Review | Audit/edit full map before counting |
| `first_count` | Count | First live inventory count |
| `butterfly` | Home base | Admin panel — metrics, spreadsheets, in-house inventory |

Legacy `ai_connect` phase auto-migrates to `name_bar` or `build_bar`.
Bar map persists in `data/bar_data.json` via `GET/POST /api/bar`.

Gates block advance until each phase passes validation.

## Butterfly — home base areas

1. **Dashboard** — hospitality landing; cycle status; selectable metrics timeframe
2. **Spreadsheets** — workbook view (numbers, variance, costs)
3. **In-house inventory** — landing + category rooms: liquor, beer, wine, mixers, dry goods (reserved)
4. **Weekly inputs** — count, invoices, POS for the active cycle window
5. **History** — past cycles and counts
6. **Settings** — cycle length (e.g. 7, 9, 14 days), provider, backup

## Cycle / metrics timeframe

Customers choose their inventory rhythm. Not hardcoded to weekly.

- `cycle_interval_days` — integer, default 7 (Germany might use 9, etc.)
- `cycle_anchor` — day-of-week or date anchor for period boundaries
- Metrics API accepts `from` / `to` or preset windows: current cycle, last N cycles, custom range

## Key files

- `server.py` — Flask service, phase state, config, API stubs
- `install.sh` — remote/customer installer (POP pattern)
- `static/setup.html` — caterpillar setup shell
- `static/home.html` — butterfly admin shell
- `static/css/app.css` — shared styles
- `static/js/osb-app.js` — client phase router + API calls
- `osb_config.example.json` — config template (no secrets in repo)

## Commands

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
/usr/bin/python3 server.py
curl -s http://localhost:5052/ping
curl -s http://localhost:5052/api/state
```

## Safety constraints

- API keys live in `~/osb-program/osb_config.json` on the customer machine only
- Do not commit `osb_config.json`, `data/`, or runtime state
- Website sandbox stays separate until program UI is stable
- Preserve OVLP POP install patterns (LaunchAgent, no Desktop install path)

## Verification

- 2026-07-01 GROK: Frame scaffold created; `/ping` and `/api/state` passed on port 5052
  with `/usr/bin/python3 server.py`
- 2026-07-04 CLAUDE: Launch-day fixes from Richard's live walk-through of setup.
  (1) **Cycle input**: `name_bar` now offers only Weekly (starts Monday) or
  Monthly (starts on the 1st) via a select; `/api/config` rejects any other
  cycle payload with 400 (legacy `interval_days` 7/30 coerces). Verified via
  curl: 850 days → 400; weekly/monthly → normalized config saved.
  (2) **Walk parser rewritten** (`parseWalkText` in `osb-app.js`): the old
  parser split on commas/periods/"and", which dictation doesn't produce, so
  whole rows landed in single fields. New parser is **size-delimited** — each
  bottle entry ends at its size token (750/liter/1.75/etc.), with
  normalization for dictation mishears ("leader"→liter, "seven fifty"→750,
  "754"→750, glued numbers), station markers (well N / row N / next row /
  back bar shelf / front wall / glass shelf / speed rail...) that fuzzy-match
  or auto-create stations, and quantity phrases ("two bottles", "a case").
  Ambiguous entries carry `parse_flags` shown in the review table (flagged
  rows sort first, brass highlight); any edit clears the flag. Verified
  against Richard's real 945-word Agave & Rye-style walk transcript:
  223 entries, 14 stations, only 13 flagged. Walk-screen copy now coaches
  "name + size only — the size ends each bottle."

## Open work

1. Flesh out caterpillar steps (voice upload, AI reconcile, XLS generation)
2. Build butterfly home base metrics with timeframe selector
3. In-house inventory category sub-pages
4. Wire install.sh + LaunchAgent (`com.opensourcebarware.program`)
5. Align website sandbox with program UI after butterfly shell is stable

## Pickup point

```bash
cd "/Users/richardjamison/Documents/New project/open-source-barware/program"
python3 server.py
open http://localhost:5052/
```