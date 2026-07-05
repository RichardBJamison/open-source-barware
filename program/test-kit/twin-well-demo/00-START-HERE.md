# Twin Well Demo — full week 1 + week 2 ready

**Bar:** Twin Well Tavern  
**Map:** 2 wells · 6 bottles each · **12 total**  
**Week 1 count:** golden — **0 gaps**  
**Week 2 count:** ready in kit (cycle 2 inventory)

---

## Files

| File | Use |
|------|-----|
| `walk.txt` | Step 2 — voice walk |
| `count-week-1.txt` | Step 6 — first count (golden) |
| `count-week-2.txt` | Cycle 2 count (after week 1 POS) |
| `pos/*.csv` | Home → Weekly inputs (3 drops) |

---

## Week 1 — setup to butterfly

1. Install → `http://localhost:5052/setup` · hard refresh **Cmd+Shift+R**
2. **Begin setup** → weekly cycle → Continue
3. **Walk** — bar name **Twin Well Tavern** → paste `walk.txt` → parse → reconcile → review layout → approve map
4. **First count** → paste `count-week-1.txt` → should show **Golden** (12/12, no gaps) → **Finish**
5. **Home base** — check Dashboard metrics, Spreadsheets tabs, Analytics, In-house (12 SKUs)

## Week 1 — mid-week POS (admin panel)

**Weekly inputs** (sidebar) — upload each:

| Label | File |
|-------|------|
| Monday close | `pos/monday-close.csv` |
| Wednesday lunch | `pos/wednesday-lunch.csv` |
| Friday dinner | `pos/friday-dinner.csv` |

Dashboard should show **3 POS drops**. Spreadsheets + Analytics populate from live bar data.

## Week 2 — next inventory count

1. **Settings** → Your bars → **Twin Well Tavern** → **Resume setup**
2. Click through to **First count** (map already approved — Next through reconcile/review)
3. Paste `count-week-2.txt` → golden again → Finish
4. Home → Analytics for velocity / cycle comparison

---

## Pass criteria

- [ ] 12 bottles on map after walk  
- [ ] Week 1 count: golden, no reconcile gaps  
- [ ] Butterfly: dashboard + spreadsheets + in-house show 12 items  
- [ ] 3 POS files logged  
- [ ] Week 2 count completes golden