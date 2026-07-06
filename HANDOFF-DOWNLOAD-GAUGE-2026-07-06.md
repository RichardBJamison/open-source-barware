# Open Source Barware — Download Page Handoff

*2026-07-06 | agent: GROK | project ID: `opensourcebarware`*
*Ship: `eab32b0` · https://opensourcebarware.com/download*

## Summary

Full `/download` page pass: live download counter, email signup defaults, Ko-fi support, Mac Gatekeeper docs, install layout cleanup. All deployed to Cloudflare Pages production.

## Commits (newest first)

| Commit | What |
|--------|------|
| `eab32b0` | Install section: cards first, short notes below |
| `9dd71c3` | `START-HERE-MAC.html` + Gatekeeper docs in zip |
| `327f7ae` | Both signup toggles ON; remove Skip button |
| `73b7e4b` | Gauge: crop gray bar, inline caption + Ko-fi row |
| `5394d6b` | Ko-fi Buy Me a Coffee link |
| `030ca7b` | Live total-downloads gauge + `/api/download-count` |

## Download counter

- **Read:** `GET /api/download-count` → `{ total }` from KV `total_downloads`
- **Write:** `POST /api/download` (existing) increments by 1
- **UI:** `components/TotalDownloadsGauge.tsx` — 6-digit DSEG7 overlay on `public/images/total-downloads-gauge.jpg`
- **Live update:** `public/osb-analytics.js` dispatches `osb-download-count` with API response count
- **Dedup:** 1.5s per file; programmatic downloads use `data-osb-no-track` on anchor

## Signup form

- `ProgramDownloadPanel.tsx`: `programUpdates` + `hiddenBarTour` both default `true`
- Skip button removed; only **Join the release list**
- City/state show when Hidden Bar Tour is on (default)

## Mac install / Gatekeeper

- Unsigned `Install.command` → macOS blocks double-click on first download per machine
- **Workaround:** right-click → Open → Open once (same file, same Mac: double-click works after)
- **In zip:** `program/START-HERE-MAC.html` (opens in browser, no block)
- **Permanent fix:** Apple Developer ID + notarization (not done yet)

## Key files

| File | Role |
|------|------|
| `components/TotalDownloadsGauge.tsx` | Gauge + Ko-fi + caption footer |
| `components/ProgramDownloadPanel.tsx` | Signup, install cards, placement |
| `public/osb-analytics.js` | Download tracking + count event |
| `functions/api/download-count.js` | Public count API |
| `program/START-HERE-MAC.html` | Mac Gatekeeper guide in zip |
| `app/globals.css` | Gauge + footer styles |

## Verify

```bash
curl -s https://opensourcebarware.com/api/download-count
# Manual: /download → download zip → gauge +1 without refresh
# Manual: signup with email + city/state → success toast
```

## KV bindings (required)

- `VISITOR_COUNTER` — download count + analytics
- `OSB_SIGNUPS` — release-list signups