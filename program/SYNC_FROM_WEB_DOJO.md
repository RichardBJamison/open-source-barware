# Sync Brief — Web Dojo → Downloadable Program

**From:** the web-dojo build (`app/inventory/*` on the marketing site)
**To:** the downloadable Chrome program build (`program/`, `bar-app/`)
**Purpose:** three changes just landed on the web-dojo demo. This explains the
*process reasoning* behind them and asks you to **verify** the program has the
same behavior. **You already have a higher-detail system than the dojo — do not
rebuild it. Add only what is genuinely missing, in your own idiom.**

---

## 0. Read this first — the relationship between the two apps

- The **web dojo** (`app/inventory/dashboard|settings|inputs`) is a lightweight
  localStorage sandbox on the marketing site. It uses a flat `Bottle.currentLevel`
  number. It is deliberately simple — a try-before-download demo.
- **You (the program)** are the real product. You already have things the dojo
  does not: voice-note level parsing (`sealed`/`unopened`/`new` = 1.0, a case =
  12 bottles, single-digit inference to tenths), sealed-vs-partial modeling,
  par levels, POS reconciliation, and product delete endpoints.
- So this is **not** "port the dojo down." It is: *"the dojo surfaced three
  operator-facing behaviors — confirm the program expresses them, and fill any
  gap without touching what already works."*

---

## 1. What changed on the dojo, and why it matters to the process

### Change A — Remove a product from the dashboard
Operators need to delete a bottle that no longer belongs on the map (dropped a
brand, mistaken entry). The dojo added a per-bottle trash button with a confirm.

**Process reason:** the map must stay honest. A bottle that isn't really behind
the bar poisons every count and every variance calc after it.

> **You almost certainly already have this** (delete endpoints exist in
> `program/server.py` and `bar-app/server.py`). **Verify it's reachable from the
> operator's main product view with a confirm step. If it is, do nothing.**

### Change B — Open-bottle "tenths" visibility toggle  ← the important one
The dojo added a **Settings** toggle: *"Show the open-bottle tenths on the
dashboard."* When **off**, the home base stops showing fractional levels (e.g.
`2.4`) and shows **whole bottles on hand** instead — where an open bottle still
counts as one physical bottle (`2.4` → `3`).

**Process reason (this is the operator's mental model — get it right):**
- During a **count**, tenths are essential. You must record that the open Tito's
  well bottle is at `0.5` (five-tenths / a "fifth" in the bar sense of a partial).
- On the **home base / admin dashboard between counts**, most operators do **not**
  want the open-bottle ounces shown, because that number changes by the hour and
  reads as false precision. What a manager actually needs at a glance is:
  *"how many bottles did I start the week with, and how many are in each section."*
- Operators **"marry" bottles** — pour three half-bottles of the same product
  together into one. So the physical-bottle-on-hand count is what's real and
  stable; the exact open-bottle level is transient.
- Example: a back bar with 4 Tito's = 3 sealed + 1 open. The open one carries the
  tenths. The number the manager trusts mid-week is **4 bottles in that section**,
  not `3.2`. On Friday when a bartender says "we're out of Tito's," the manager
  pulls the sheet, remembers Monday's whole-bottle picture per section across the
  whole place, and instantly knows whether product moved or walked.

**The behavior to confirm/add:** counting keeps full tenths precision (you have
this). The **display layer** needs an operator preference to collapse the
between-count home base to whole-bottle-on-hand counts (round an open bottle up
to 1 physical bottle: `ceil(level)` per line, summed per section). Default is
your call — the dojo defaulted the tenths **on** to look detailed, but Richard's
note is that **most bars will want them off** on the home base.

> **Careful:** do NOT remove tenths from the count/reconcile path. This is a
> *view preference on the dashboard only*. If you already have a display setting
> like this, leave it. If you don't, add it as a settings flag + a display
> transform, nothing deeper.

### Change C — Mid-week POS report log
The dojo added an **Inputs** panel to add POS exports **throughout the week** —
each one dated + labeled ("Tuesday close"), attached file, note — stacked into a
running list, and folded into the AI handoff packet and the backup.

**Process reason:** counts are weekly, but sales happen daily. If you can drop
POS pulls in mid-week, the system stays current between physical counts and the
AI can estimate movement without waiting for the next count. That's the path to a
*mid-week inventory read from POS alone* — which is the goal. Richard: "we might
find a way to get a mid-week inventory through POS reports — that would be
brilliant. Let's build that in."

> **You have POS handling already** (import + reconcile). The likely **gap** is
> that POS is treated as a **single end-of-cycle import tied to reconciliation**,
> not an **accumulating, date-stamped mid-week log**. Verify. If POS is one-shot,
> add a running log that accepts multiple dated POS drops across the week and
> keeps them until the next count closes the cycle. If you already accumulate
> dated POS entries, do nothing.

---

## 2. What you already have — DO NOT rebuild (confirmed in your code)

- Voice-note **level parsing**: `sealed/unopened/new/full` → 1.0, case → 12
  bottles, single-digit → tenths inference, partial-word overlap. **Keep. Superior
  to the dojo.**
- **Sealed vs. partial** bottle modeling. **Keep.**
- **Par levels** per product. **Keep.**
- **POS import + reconcile** logic. **Keep** — only check the mid-week cadence above.
- **Delete/remove** product endpoints. **Keep** — only check operator reachability.

If any item in §1 is already present at equal-or-better fidelity, **skip it and
say so.** The instruction is additive-only.

---

## 3. Acceptance checks (what "done" looks like)

1. An operator can remove a product from the main view with a confirm, and it
   disappears from counts/variance. *(likely already true — just verify)*
2. A settings preference exists that collapses the **home base** display to
   whole-bottle-on-hand counts (open bottle = 1 physical bottle), while the
   **count/reconcile** path keeps full tenths precision untouched.
3. POS reports can be added **multiple times across the week**, each dated, and
   persist in a running log that feeds reconciliation — not overwritten by the
   next drop.

## 4. Guardrails

- **Do not** flatten or remove tenths anywhere in counting or reconciliation.
- **Do not** replace your voice-parsing or sealed/partial model with the dojo's
  flat `currentLevel`.
- **Do not** refactor unrelated code. Smallest additive change that satisfies §3.
- If a change would touch the reconciliation engine, **stop and report** what
  you'd change before doing it — that engine is the crown jewel.

---

*The dojo is the shallow demo; you are the deep product. This brief only asks you
to make sure three operator-facing behaviors the demo exposed are also true — at
your fidelity, not the demo's.*
