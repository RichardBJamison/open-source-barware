# Kelhen — Copper Pair field test

**Build:** `20260705-copper-paint`  
**Kit:** `test-kit/copper-pair-demo/`

## Before you start

1. Hard refresh Chrome: `Cmd+Shift+R`
2. Confirm cache bust in page source: `copper-paint`

## Bar 1 — The Copper Rail (26 bottles)

| Step | File |
|------|------|
| Walk | `bar-1-copper-rail/walk.txt` |
| Count week 1 | `bar-1-copper-rail/count-week-1.txt` → **Process** |
| POS | `pos/monday-close.csv`, `wednesday-lunch.csv`, `friday-dinner.csv` |
| Count week 2 | `bar-1-copper-rail/count-week-2.txt` → **Process** |

**Expect after Process:** redirect to `/home` — dashboard hero, 26 SKUs, Week over Week tab with 26 reconciliation rows.

## Bar 2 — Garden Terrace (24 bottles)

Settings → **+ Add another bar** → Garden Terrace → repeat with `bar-2-garden-terrace/` files.

## If Process stops

Red banner at top = gaps. Use the kit files exactly — don't mix Harbor walk into Copper Rail.