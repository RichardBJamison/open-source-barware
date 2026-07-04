# Chrome Program Snapshot — July 4, 2026 (ship version)

**Git:** `36b712e` on `main`  
**Program version:** `0.3.0-butterfly-2026-07-04`  
**Updated:** 2026-07-04 ~18:40 EDT

---

## BLUF

Walk-first caterpillar setup ships: voice walk **before** bar build — dictating "Well one", "Back bar" creates stations from the first walk. Release-list signup fixed with same-origin proxy, success toast, and auto-advance. All regression tests pass. Customer zip rebuilt.

---

## Setup flow (caterpillar)

```
welcome → updates_signup → name_bar → voice_walk → reconcile → build_bar → map_review → first_count → butterfly
```

| Commit | Change |
|--------|--------|
| `32d0c93` | Reorder phases: walk before build; stations from dictation |
| `36b712e` | Release-list: `/api/updates-subscribe` proxy, toast, advance |
| `cb0f2ee` | Email-only signup unless Hidden Bar Tour checked |

---

## Release-list signup

- **Chrome program:** `POST /api/updates-subscribe` on localhost (Flask proxy)
- **Production:** Cloudflare Pages Function → GHL upsert
- **Local log:** `data/release_signups.jsonl`
- **Richard notify:** GHL note + task; inbox email needs `FORWARD_EMAIL_*` on Pages

---

## Verification (passed 2026-07-04 ~18:40)

```bash
cd program
node scripts/run-test3.mjs
node scripts/run-walk-first-test.mjs
node scripts/test-updates-signup-flow.mjs
node scripts/run-harbor-hearth-test.mjs
```

---

## Customer delivery

```bash
cd ~/Documents/New\ project/open-source-barware
npm run package:program
```

| Zip | Path |
|-----|------|
| Mac | `public/downloads/open-source-barware-program-mac.zip` |
| Win | `public/downloads/open-source-barware-program-win.zip` |

**Fresh install:** unzip → `Install.command` → `http://localhost:5052/setup`  
**Cache bust:** `osb-app.js?v=20260704-signup-fix`

---

## Kelhen deploy

```bash
# Zip on Kelhen Downloads (site-download pattern):
~/Downloads/open-source-barware-program-mac.zip
# Install fresh:
unzip -o ~/Downloads/open-source-barware-program-mac.zip -d ~/Downloads
cd ~/Downloads/open-source-barware-program && ./Install.command
open http://localhost:5052/setup
```

---

## Pickup

```bash
cat ~/Me-Nexus/library/open-source-barware/HANDOFF.md
cd ~/Documents/New\ project/open-source-barware && git pull
cd program && source .venv/bin/activate && python3 server.py
```