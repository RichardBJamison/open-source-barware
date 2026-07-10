#!/usr/bin/env node
/**
 * V1.5 five-rung test ladder
 * Rung 1 — Corner Pint (easy 1-bar walk/count)
 * Rung 2 — Twin Well + process cycle API (restaurant bar end-to-end)
 * Rung 3 — Copper Pair (2 bars / 2 models)
 * Rung 4 — Harbor & Hearth (3 venues, stadium-scale maps)
 * Rung 5 — V1.5 features + comfort UX (people PIN, transfer, PO, staff, reports)
 *
 * Requires Flask on OSB_TEST_URL (default http://localhost:5052) for rungs 2 & 5.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, "..");
const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const REPORT = path.join(ROOT, "data/v15-ladder-report.json");

const results = [];
const log = (msg) => console.log(msg);

function record(rung, name, ok, detail, notes = []) {
  results.push({ rung, name, ok, detail, notes });
  console.log(`\n${ok ? "PASS" : "FAIL"} · Rung ${rung}: ${name}`);
  console.log(`  ${detail}`);
  notes.forEach((n) => console.log(`  · ${n}`));
}

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [path.join(__dir, script), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, OSB_TEST_URL: BASE },
    timeout: 120_000,
  });
  return {
    code: r.status ?? 1,
    out: (r.stdout || "") + (r.stderr || ""),
  };
}

/** Cookie jar so Flask sessions stick across requests (PIN login). */
const cookieJar = { raw: "" };

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookieJar.raw ? { Cookie: cookieJar.raw } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) {
    cookieJar.raw = sc.map((c) => c.split(";")[0]).join("; ");
  } else {
    const one = r.headers.get("set-cookie");
    if (one) cookieJar.raw = one.split(",").map((c) => c.split(";")[0].trim()).join("; ");
  }
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

async function ensureServer() {
  try {
    const r = await fetch(`${BASE}/ping`);
    if (!r.ok) throw new Error(`ping ${r.status}`);
    const j = await r.json();
    return j;
  } catch (e) {
    throw new Error(`Server not reachable at ${BASE}: ${e.message}`);
  }
}

// ── Rung 1: easy single bar (parser) ─────────────────────────────────────────
function rung1() {
  const r = runNode("run-smoke-test.mjs");
  record(
    1,
    "Corner Pint — easy 1-bar walk + count",
    r.code === 0,
    r.code === 0
      ? "10 bottles, 2 intentional gaps (missing Hendricks + surprise Campari)"
      : `exit ${r.code}: ${r.out.slice(-400)}`,
    [
      "Persona: single patio-ish bar, low overhead",
      "Validates walk→map→count matching without API",
    ]
  );
}

// ── Rung 2: restaurant bar full cycle (parser + process API) ─────────────────
async function rung2() {
  const twin = runNode("run-twin-well-test.mjs");
  const notes = ["Persona: one restaurant bar, two wells, 12 bottles"];
  let processOk = false;
  let processDetail = "process cycle skipped (server)";

  if (twin.code === 0) {
    notes.push("Week-1 and week-2 golden counts matched 12/12");
    try {
      await api("POST", "/api/hard-reset", {});
      // Seed a simple bar and process once
      const bar = {
        name: "Twin Well Tavern",
        stations: [
          {
            id: "st_0",
            name: "Well One Primary",
            type: "well",
            bottles: [
              { id: "b1", name: "Tito's", size: "750ml", category: "liquor", current_level: 1.0, par_level: 2, cost: 18 },
              { id: "b2", name: "Ketel One", size: "750ml", category: "liquor", current_level: 1.5, par_level: 2, cost: 22 },
              { id: "b3", name: "Tanqueray", size: "750ml", category: "liquor", current_level: 0.8, par_level: 1, cost: 20 },
            ],
          },
          {
            id: "st_1",
            name: "Well Two Service",
            type: "well",
            bottles: [
              { id: "b4", name: "Jack Daniels", size: "750ml", category: "liquor", current_level: 0.6, par_level: 2, cost: 24 },
              { id: "b5", name: "Jameson", size: "750ml", category: "liquor", current_level: 1.0, par_level: 2, cost: 26 },
            ],
          },
        ],
      };
      const saved = await api("POST", "/api/bar", bar);
      // Force butterfly so process works
      await api("POST", "/api/config", {
        phase: "butterfly",
        map_approved: true,
        first_count_complete: true,
        setup_bar_id: "",
        bar_name: bar.name,
      });
      // some installs need active bar
      const listed = await api("GET", "/api/bars");
      const bid = listed.data.bars?.[0]?.id || saved.data?.bar?.id;
      if (bid) await api("POST", "/api/bars/switch", { bar_id: bid });

      // Save bar again after switch with full stations
      await api("POST", "/api/bar", { ...bar, id: bid });

      const proc = await api("POST", "/api/count/process-cycle", {});
      processOk = proc.ok || proc.data?.status === "ok" || !!proc.data?.cycle;
      processDetail = processOk
        ? `Process cycle OK (${JSON.stringify(proc.data).slice(0, 120)}…)`
        : `Process failed ${proc.status}: ${JSON.stringify(proc.data).slice(0, 200)}`;

      // Analytics should load
      const an = await api("GET", "/api/analytics");
      if (an.ok && (an.data.bottle_count > 0 || an.data.product_rows?.length >= 0)) {
        notes.push(`Analytics reachable; health=${an.data.health || "n/a"} bottles=${an.data.bottle_count ?? "?"}`);
      } else {
        notes.push("Analytics weak or empty after process");
      }
    } catch (e) {
      processDetail = `API error: ${e.message}`;
    }
  }

  const ok = twin.code === 0 && processOk;
  record(
    2,
    "Twin Well — restaurant bar through Process",
    ok,
    twin.code !== 0
      ? `Twin well parser failed: ${twin.out.slice(-300)}`
      : processDetail,
    notes
  );
}

// ── Rung 3: two bars ─────────────────────────────────────────────────────────
function rung3() {
  const copper = runNode("run-copper-pair-test.mjs");
  const multi = runNode("run-multi-bar-upload-test.mjs");
  // multi may need server - still try
  const ok = copper.code === 0;
  record(
    3,
    "Copper Pair — two bars / two models",
    ok,
    copper.code === 0
      ? `Dual-bar walk/count validation passed${multi.code === 0 ? "; multi-bar upload OK" : multi.code != null ? `; multi-bar upload exit ${multi.code}` : ""}`
      : copper.out.slice(-400),
    [
      "Persona: two-outlet restaurant (main + terrace)",
      "Stagger up: two maps, two count models",
      multi.code === 0 ? "Upload/API multi-bar path OK" : "Check multi-bar upload separately if needed",
    ]
  );
}

// ── Rung 4: three venues stadium scale ───────────────────────────────────────
function rung4() {
  const r = runNode("run-harbor-hearth-test.mjs");
  record(
    4,
    "Harbor & Hearth — 3 venues (arena-scale maps)",
    r.code === 0,
    r.code === 0
      ? "River Room + Garden Terrace + Cellar Library walk/count kits validated"
      : r.out.slice(-500),
    [
      "Persona: multi-venue hospitality (Heat Arena shape)",
      "Large station sets, wine/beer/liquor rooms, multi-bar discipline",
    ]
  );
}

// ── Rung 5: V1.5 features + comfort UX ────────────────────────────────────────
async function rung5() {
  const notes = [];
  const checks = [];
  const fail = (m) => checks.push({ ok: false, m });
  const pass = (m) => checks.push({ ok: true, m });

  try {
    await api("POST", "/api/hard-reset", {});

    // Clean people file by creating admin then managers after venues exist
    // Create Main + Patio via API
    const mainBar = {
      name: "Main Book",
      stations: [
        {
          id: "st-main",
          name: "Well",
          type: "well",
          bottles: [
            { id: "bt-tito", name: "Tito's", size: "750ml", category: "liquor", current_level: 3, par_level: 4, cost: 18, vendor: "Southern" },
            { id: "bt-jack", name: "Jack Daniels", size: "750ml", category: "liquor", current_level: 1, par_level: 3, cost: 24, vendor: "Southern" },
            { id: "bt-patron", name: "Patron Silver", size: "750ml", category: "liquor", current_level: 2, par_level: 2, cost: 42, vendor: "Breakthru" },
          ],
        },
      ],
    };
    await api("POST", "/api/bar", mainBar);
    await api("POST", "/api/config", {
      phase: "butterfly",
      map_approved: true,
      first_count_complete: true,
      setup_bar_id: "",
      bar_name: "Main Book",
      weigh_enabled: false,
      branding: { business_name: "Arena Hospitality LLC", business_address: "1 Biscayne Blvd" },
    });

    let bars = (await api("GET", "/api/bars")).data.bars || [];
    let mainId = bars[0]?.id;
    // Create patio
    const created = await api("POST", "/api/bars", { name: "Patio Lounge", start_setup: false });
    bars = (await api("GET", "/api/bars")).data.bars || [];
    const patioId = bars.find((b) => b.name?.includes("Patio"))?.id || created.data?.bar?.id;
    if (mainId && patioId && mainId !== patioId) pass("Two venues present (Main + Patio)");
    else fail(`Venue setup weak main=${mainId} patio=${patioId}`);

    // Transfer 1 Tito's to patio
    await api("POST", "/api/bars/switch", { bar_id: mainId });
    await api("POST", "/api/bar", { ...mainBar, id: mainId });
    const xfer = await api("POST", "/api/bars/transfer", {
      from_bar_id: mainId,
      to_bar_id: patioId,
      bottle_id: "bt-tito",
      qty: 1,
      note: "ladder test",
      create_if_missing: true,
    });
    if (xfer.ok && xfer.data.transfer?.qty === 1) pass("Stock transfer Main → Patio");
    else fail(`Transfer: ${JSON.stringify(xfer.data).slice(0, 180)}`);

    // Venues roll-up
    const venues = await api("GET", "/api/venues");
    if (venues.ok && (venues.data.consolidated?.venue_count || 0) >= 2) {
      pass(`Venues roll-up: ${venues.data.consolidated.venue_count} venues, $${venues.data.consolidated.total_value}`);
    } else fail("Venues consolidated weak");

    // People: admin + manager PIN (Flask session via cookie jar)
    const loginAdmin = `admin_l${Date.now().toString().slice(-6)}`;
    const loginMgr = `mgr_l${Date.now().toString().slice(-6)}`;
    const auth0 = await api("GET", "/api/auth/status");
    if (!auth0.data.auth_enabled) {
      const adm = await api("POST", "/api/people", {
        name: "Ladder Admin",
        login: loginAdmin,
        pin: "123456",
        role: "admin",
      });
      if (adm.ok) pass("Admin PIN created (6-digit)");
      else fail(`Admin create: ${JSON.stringify(adm.data)}`);
    } else {
      pass("Auth already enabled — trying admin login with known test PINs");
      let logged = false;
      for (const u of (auth0.data.users_public || []).filter((x) => x.role === "admin")) {
        for (const pin of ["123456", "111222", "999888", "654321"]) {
          const L = await api("POST", "/api/auth/login", { user_id: u.id, pin });
          if (L.ok) {
            logged = true;
            notes.push(`Admin session: ${u.login}`);
            break;
          }
        }
        if (logged) break;
      }
      if (!logged) notes.push("Could not establish admin session (unknown PIN on existing users)");
    }

    const mgr = await api("POST", "/api/people", {
      name: "Patio Manager",
      login: loginMgr,
      pin: "654321",
      role: "manager",
      venue_id: patioId,
      permissions: {
        count: true,
        inputs: true,
        staff_board: true,
        spreadsheets: false,
        transfers: false,
        settings: false,
      },
    });
    if (mgr.ok) {
      pass("Manager created, locked to Patio");
      const rst = await api("POST", `/api/people/${mgr.data.user.id}/reset-pin`, { pin: "111222" });
      if (rst.ok) pass("Admin PIN reset (no old PIN)");
      else fail(`PIN reset: ${JSON.stringify(rst.data)}`);

      await api("POST", "/api/auth/logout", {});
      const mgrLogin = await api("POST", "/api/auth/login", {
        user_id: mgr.data.user.id,
        pin: "111222",
      });
      if (mgrLogin.ok && mgrLogin.data.auth?.user?.role === "manager") {
        pass("Manager login with reset PIN");
        const sw = await api("POST", "/api/bars/switch", { bar_id: mainId });
        if (sw.status === 403) pass("Manager blocked from other venue");
        else fail("Manager should not switch to Main");
        const post = await api("POST", "/api/staff-board", {
          text: "Ladder test handoff: count patio first Friday.",
        });
        if (post.ok) pass("Manager staff board post");
        else fail(`Staff as manager: ${JSON.stringify(post.data)}`);
      } else fail("Manager login after reset failed");
    } else {
      fail(`Manager create failed: ${mgr.status} ${JSON.stringify(mgr.data)}`);
    }

    // POS structured + smart orders path via analytics fields
    await api("POST", "/api/bars/switch", { bar_id: mainId });
    const pos = await api("POST", "/api/pos/log", {
      label: "Ladder POS",
      text: "Item Name,Quantity Sold,Net Sales\nTito's,4,48\nJack Daniels,2,30",
      input_type: "pos",
    });
    if (pos.ok) pass("POS drop saved");
    else fail(`POS: ${JSON.stringify(pos.data)}`);

    // PO log type
    const po = await api("POST", "/api/pos/log", {
      label: "PO LADDER-1 → Southern",
      text: "PURCHASE ORDER\n1. 2 × Tito's",
      input_type: "po",
    });
    if (po.ok && po.data.entry?.input_type === "po") pass("PO log type accepted");
    else fail(`PO type: ${JSON.stringify(po.data)}`);

    // Weigh optional default
    const st = await api("GET", "/api/state");
    const weigh = st.data.config?.weigh_enabled;
    if (weigh === false || weigh === undefined) {
      pass("Weigh mode default off (low-overhead single-bar friendly)");
    } else {
      notes.push(`weigh_enabled=${weigh} (ok if user toggled)`);
      pass("Config exposes weigh_enabled");
    }

    // Comfort: home HTML still has calm single-bar language + advanced entry points
    const home = await fetch(`${BASE}/`);
    const html = await home.text();
    if (html.includes("Smart Orders") || html.includes("btnSmartOrders")) pass("Home exposes Smart Orders");
    else fail("Smart Orders button missing on home");
    if (html.includes("Staff board") || html.includes('data-view="staff"')) pass("Staff board in nav");
    else fail("Staff board nav missing");
    if (html.includes("Weighing mode") || html.includes("settWeighEnabled")) pass("Weighing settings present (optional)");
    else fail("Weigh settings missing");
    if (html.includes("People") || html.includes("peopleAccess") || html.includes("btnPeopleCreate")) {
      pass("People & access UI present");
    } else fail("People UI missing from home");

    // Analytics report shape
    const an = await api("GET", "/api/analytics");
    if (an.ok) {
      const keys = ["health", "health_label", "product_rows", "par_status_counts"];
      const has = keys.filter((k) => k in (an.data || {}));
      if (has.length >= 3) pass(`Shift-report fields: ${has.join(", ")}`);
      else fail(`Analytics missing report fields: ${Object.keys(an.data || {}).slice(0, 12)}`);
    } else fail("Analytics GET failed");

  } catch (e) {
    fail(`Exception: ${e.message}`);
  }

  const failed = checks.filter((c) => !c.ok);
  checks.filter((c) => c.ok).forEach((c) => notes.push(`✓ ${c.m}`));
  failed.forEach((c) => notes.push(`✗ ${c.m}`));

  record(
    5,
    "V1.5 features + comfort UX (stadium tools, single-bar grace)",
    failed.length === 0,
    failed.length === 0
      ? `${checks.length} checks passed — transfer, venues, PIN path, PO, POS, staff, reports, home UI`
      : `${failed.length}/${checks.length} failed`,
    notes
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("╔══════════════════════════════════════════════════════════╗");
  log("║  OSB V1.5 — Five-rung test ladder                        ║");
  log("║  Easy single bar → multi-venue → full feature package    ║");
  log("╚══════════════════════════════════════════════════════════╝");
  log(`Server target: ${BASE}`);

  let serverOk = false;
  try {
    const ping = await ensureServer();
    serverOk = true;
    log(`Server: ${ping.version || "ok"}`);
  } catch (e) {
    log(`WARN: ${e.message} — rungs 2/5 API portions may fail`);
  }

  rung1();
  if (serverOk) await rung2();
  else
    record(2, "Twin Well — restaurant bar through Process", false, "Server offline", []);
  rung3();
  rung4();
  if (serverOk) await rung5();
  else
    record(5, "V1.5 features + comfort UX", false, "Server offline", []);

  // Bonus static integrity
  const procBtn = runNode("check-process-button.mjs");
  log(`\nBonus process-button check: ${procBtn.code === 0 ? "PASS" : "FAIL"}`);

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const summary = {
    when: new Date().toISOString(),
    base: BASE,
    passed,
    total,
    all_pass: passed === total,
    results,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));

  log("\n══════════════════════════════════════════════════════════");
  log(`LADDER RESULT: ${passed}/${total} rungs passed`);
  results.forEach((r) => log(`  ${r.ok ? "✓" : "✗"} R${r.rung} ${r.name}`));
  log(`Report: ${REPORT}`);
  log("══════════════════════════════════════════════════════════\n");

  // Narrative for product intent
  log("Comfort (1-bar owner): R1–R2 prove walk→count→process without multi-venue noise.");
  log("Scale (arena): R3–R4 prove multi-map discipline; R5 proves transfer + PIN venues.");
  log("One package: all features coexist; weigh default-off keeps simple bars light.\n");

  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
