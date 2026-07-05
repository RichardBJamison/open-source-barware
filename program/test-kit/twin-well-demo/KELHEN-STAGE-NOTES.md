# Kelhen — Twin Well Demo (primary field test)

**Kit path after unzip:**
`~/Downloads/open-source-barware-program/test-kit/twin-well-demo/`

## Fresh start

```bash
rm -rf ~/osb-program
cd ~/Downloads
unzip -o open-source-barware-program-mac.zip
cd open-source-barware-program
./Install.command
open http://localhost:5052/setup
```

Chrome: **Cmd+Shift+R** (white browser = clean session)

---

## Stage cheat sheet

| Stage | Bar name | Paste file |
|-------|----------|------------|
| Walk | **Twin Well Tavern** | `$KIT/walk.txt` |
| First count | — | `$KIT/count-week-1.txt` → **Process** (auto-opens admin) |

```bash
KIT=~/Downloads/open-source-barware-program/test-kit/twin-well-demo
```

**Expect:** **Process** runs the math → `/home` with Dashboard, Spreadsheets, In-house (12 SKUs).

---

## Admin panel (after butterfly)

| Sidebar | What to verify |
|---------|----------------|
| Dashboard | 12 bottles, cycle 1 baseline, metrics grid |
| Spreadsheets | Workbook tabs (Product Master, Count Sheet, …) |
| Analytics | Program health, product rows |
| In-house | 12 SKUs with levels |
| Weekly inputs | Upload 3 POS files below |

**POS uploads:**

| Label | File |
|-------|------|
| Monday close | `$KIT/pos/monday-close.csv` |
| Wednesday lunch | `$KIT/pos/wednesday-lunch.csv` |
| Friday dinner | `$KIT/pos/friday-dinner.csv` |

---

## Week 2 count

1. Settings → Twin Well Tavern → **Resume setup**
2. Next through to **First count**
3. Paste `$KIT/count-week-2.txt` → **Process** → check Analytics **Week over week** + Spreadsheets tab

---

## Do NOT use Harbor files on this bar

Harbor & Hearth is the stress test **after** this passes.