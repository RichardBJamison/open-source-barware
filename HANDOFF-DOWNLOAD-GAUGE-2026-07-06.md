# Open Source Barware — Download Gauge Handoff

*2026-07-06 | agent: GROK | project ID: `opensourcebarware`*

## What shipped

Steampunk **Total Downloads** counter on `/download`, placed **below** the Mac/Windows install buttons and above Community.

- **Visual:** `public/images/total-downloads-gauge.jpg` (display panel blanked; live digits overlaid)
- **Component:** `components/TotalDownloadsGauge.tsx`
- **Styles:** `app/globals.css` (DSEG7 7-segment font, cyan glow, slot alignment)
- **Public count API:** `GET /api/download-count` → `{ total: number }` from `VISITOR_COUNTER` KV key `total_downloads`
- **Increment API:** `POST /api/download` (existing) bumps `total_downloads` by 1 per tracked download

## Live counter flow

1. User clicks Mac or Windows installer on `/download` (or any `.zip` / `download` link site-wide).
2. `public/osb-analytics.js` → `trackDownload()` → `POST /api/download`.
3. KV `total_downloads` increments by **exactly 1** (deduped: same file within 1.5s ignored; programmatic anchor clicks use `data-osb-no-track` to avoid double fire).
4. API response `{ ok: true, count: N }` dispatches browser event `osb-download-count`.
5. Gauge listens for that event and updates digits immediately (6-digit zero-padded, e.g. `000027`).
6. On page load, gauge also fetches `GET /api/download-count`.

## Files touched

| File | Role |
|------|------|
| `components/TotalDownloadsGauge.tsx` | Gauge UI + live count |
| `components/ProgramDownloadPanel.tsx` | Placement + single-track download buttons |
| `components/DownloadButton.tsx` | Same anti-double-track for modal downloads |
| `public/osb-analytics.js` | Download tracking + count event |
| `functions/api/download-count.js` | Public read endpoint |
| `functions/api/download.js` | Write endpoint (pre-existing) |
| `public/images/total-downloads-gauge.jpg` | Steampunk art asset |
| `app/globals.css` | Gauge layout + digit styling |

## Verify after deploy

```bash
# Live count
curl -s https://opensourcebarware.com/api/download-count

# Full analytics (needs key if ANALYTICS_KEY set)
curl -s 'https://opensourcebarware.com/api/stats?days=7' | python3 -m json.tool

# Deploy
cd ~/Documents/New\ project/open-source-barware
npm run build
npx wrangler pages deploy out --project-name=open-source-barware --branch=main --commit-dirty=true
```

**Manual test:** Open `/download`, note count, download Mac zip, confirm gauge ticks up by 1 without refresh.

## KV binding (required)

Cloudflare Pages production must bind **`VISITOR_COUNTER`** (`ea495eafc1904a36b558bcb2117bebe6` in `wrangler.toml`). Without it, `/api/download-count` and `/api/download` fail.

## Not in scope

- Gauge does not appear on `/downloads` (program guide page) — only `/download`.
- Count tracks first-party `/api/download` events, not raw CDN/nginx zip hits unless they go through site analytics JS.

## Next agent pickup

```bash
cd ~/Documents/New\ project/open-source-barware && git pull
# Handoff: HANDOFF-DOWNLOAD-GAUGE-2026-07-06.md + HANDOFF.md
```