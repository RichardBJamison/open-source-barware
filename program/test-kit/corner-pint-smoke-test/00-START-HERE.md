# Corner Pint — smoke test (one bar, ~2 gaps)

**Purpose:** Prove walk → reconcile → count → inline gap fix → finish works end-to-end before running the full Harbor & Hearth kit.

**Bar:** Corner Pint — 10 bottles, 2 stations.

**Expected gaps after count (by design):**
1. **Hendricks** — on walk map, not in count → fix with **Counted** or **Not on shelf**
2. **Campari** — in count, not on map → fix with **Add to map** or **Misheard — ignore**

Up to 2 minor gaps can remain and you can still finish.

---

## Steps

1. Fresh install → `http://localhost:5052/setup`
2. **Begin setup** → skip or join release list
3. **Get started** → Weekly cycle → Continue
4. **Walk** — bar name **Corner Pint** → paste `walk.txt` → parse → reconcile → review layout → approve map
5. **First count** → paste `count.txt` → parse
6. **Fix the 2 gaps** in the table (Fix column) — don't merge other test files
7. **Finish** → butterfly home base

**Pass:** You reach `/home` without a 72-bottle miss report. Gaps are 2 intentional items, not a file-mix mistake.

---

## File paths (after unzip)

```
KIT=~/Downloads/open-source-barware-program/test-kit/corner-pint-smoke-test
Walk:  $KIT/walk.txt
Count: $KIT/count.txt
```