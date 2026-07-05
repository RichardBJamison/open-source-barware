# Copper Pair Demo — Two bars, full week

**Bar 1:** The Copper Rail (main dining) — 26 bottles + liquor room backup  
**Bar 2:** Garden Terrace (patio) — 24 bottles

## Week 1 field test (Kelhen)

### Bar 1 — The Copper Rail

1. Setup → name bar **The Copper Rail**
2. Walk → paste `bar-1-copper-rail/walk.txt`
3. Reconcile → approve map
4. Count → paste `bar-1-copper-rail/count-week-1.txt` → **Process**
5. Admin opens — check Dashboard hero, Spreadsheets, Analytics
6. Weekly inputs → upload 3 POS files from `pos/`

### Bar 2 — Garden Terrace (second bar)

1. Settings → **+ Add another bar** → **Garden Terrace**
2. Walk → `bar-2-garden-terrace/walk.txt`
3. Count → `bar-2-garden-terrace/count-week-1.txt` → **Process**

### Week 2

1. Settings → Resume setup on active bar
2. Count → `count-week-2.txt` for that bar → **Process**
3. Spreadsheets → **Week over Week** tab shows reconciliation deltas

## Verify locally

```bash
node scripts/run-copper-pair-test.mjs
node scripts/run-copper-pair-sandbox.mjs
```