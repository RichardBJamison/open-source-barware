# OSB Program — Test & Dev Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `run-test1.mjs` | Parser Test 1 — single bar, 51 bottles, golden + hard | ✅ Committed |
| `run-test2.mjs` | Parser Test 2 — multi-bar, wine wall, 86+12 bottles | ✅ Committed |
| `run-test3.mjs` | **E2E API** welcome → butterfly + admin assertions | ❌ Not built — spec in Nexus `SHIP-GAP-AND-TEST3-2026-07-04.md` |
| `test-count-reconcile.mjs` | One-off count reconcile against live `data/bars.json` | Dev only — untracked |

## Run

```bash
cd program
node scripts/run-test1.mjs
node scripts/run-test2.mjs
```

Test 3 requires Flask on `:5052` and butterfly P0 shipped first.