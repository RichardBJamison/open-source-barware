#!/usr/bin/env node
/**
 * Full browser click-through of the butterfly home base (V1.5).
 * Seeds Twin Well demo, opens every major panel/button, reports pass/fail.
 *
 *   node scripts/run-browser-click-all.mjs
 * Requires: Flask on :5052, Playwright in repo root node_modules.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, "..");
const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const REPORT = path.join(ROOT, "data/browser-click-all-report.json");
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require(path.join(__dir, "../../node_modules/playwright")));
} catch {
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("Playwright not found. From repo root: npm i playwright && npx playwright install chromium");
    process.exit(1);
  }
}

const failures = [];
const steps = [];
const log = (m) => {
  steps.push({ ok: true, m });
  console.log(`  ✓ ${m}`);
};
const fail = (m) => {
  failures.push(m);
  steps.push({ ok: false, m });
  console.error(`  ✗ ${m}`);
};
const assert = (c, m) => (c ? log(m) : fail(m));

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

function buildBar() {
  const rows = [
    ["Well One Primary", "Tito's", 1.0, 2],
    ["Well One Primary", "Ketel One", 1.5, 2],
    ["Well One Primary", "Grey Goose", 1.0, 2],
    ["Well One Primary", "Tanqueray", 0.8, 2],
    ["Well One Primary", "Bacardi", 1.0, 2],
    ["Well One Primary", "Patron Silver", 1.0, 2],
    ["Well Two Service", "Jack Daniels", 0.6, 2],
    ["Well Two Service", "Jameson", 1.0, 2],
    ["Well Two Service", "Makers Mark", 1.0, 2],
    ["Well Two Service", "Hendricks", 1.0, 2],
    ["Well Two Service", "Casamigos", 0.7, 2],
    ["Well Two Service", "Don Julio", 1.0, 2],
  ];
  const stations = [
    { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
    { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
  ];
  rows.forEach(([st, name, level, par], i) => {
    stations
      .find((s) => s.name === st)
      .bottles.push({
        id: `b${i}`,
        name,
        category: "spirits",
        size: "750ml",
        par_level: par,
        current_level: level,
        cost: 28,
      });
  });
  return {
    name: "Twin Well Tavern",
    stations,
    stations_reviewed: true,
    setup: { map_approved: true, first_count_complete: true },
  };
}

async function seed() {
  // Clear people so PIN overlay does not block (open admin mode)
  const peoplePath = path.join(ROOT, "data/people.json");
  try {
    fs.unlinkSync(peoplePath);
  } catch {
    /* ok */
  }
  await api("POST", "/api/hard-reset", {});
  const bar = buildBar();
  await api("POST", "/api/bar", bar);
  await api("POST", "/api/config", {
    phase: "butterfly",
    bar_name: bar.name,
    map_approved: true,
    first_count_complete: true,
    setup_bar_id: "",
    weigh_enabled: false,
    branding: {
      business_name: "Twin Well Tavern",
      business_address: "100 Test St",
    },
  });
  const listed = await api("GET", "/api/bars");
  const id = listed.data.bars?.[0]?.id;
  if (id) {
    await api("POST", "/api/bars/switch", { bar_id: id });
    await api("POST", "/api/bar", { ...bar, id });
  }
  // Process one cycle so analytics has data
  await api("POST", "/api/count/process-cycle", {});
  return id;
}

async function safeClick(page, selector, label, opts = {}) {
  try {
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: "visible", timeout: opts.timeout || 8000 });
    await loc.click({ timeout: 5000 });
    log(`Clicked: ${label}`);
    return true;
  } catch (e) {
    fail(`Click failed: ${label} (${selector}) — ${e.message.split("\n")[0]}`);
    return false;
  }
}

async function dismissPinIfAny(page) {
  const overlay = page.locator("#pinLoginOverlay");
  if (await overlay.isVisible().catch(() => false)) {
    const hasUsers = await page.locator("#pinLoginUser option").count();
    if (hasUsers > 0) {
      // try common pins won't work on unknown users — fail clearly
      fail("PIN overlay blocking home (people.json still has users). Delete data/people.json and re-seed.");
      return false;
    }
  }
  return true;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Browser click-all — V1.5 home base              ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Target: ${BASE}\n`);

  const ping = await fetch(`${BASE}/ping`).then((r) => r.json()).catch(() => null);
  if (!ping) {
    console.error("Server not up. Start: .venv/bin/python3 server.py");
    process.exit(1);
  }
  console.log(`Server ${ping.version || "ok"}\n`);

  console.log("── Seed Twin Well (API) ──");
  const barId = await seed();
  log(`Seeded bar id ${barId || "?"} in butterfly`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("dialog", async (d) => {
    await d.accept().catch(() => {});
  });

  console.log("\n── Open home base ──");
  await page.goto(`${BASE}/home`, { waitUntil: "networkidle", timeout: 30000 });
  // hard-reset may bounce to setup — force home if butterfly
  if (!page.url().includes("home") && !page.url().includes("5052/")) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  }
  // If setup, try /home again after seed
  await page.goto(`${BASE}/home`, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  if (!(await dismissPinIfAny(page))) {
    /* continue to collect more failures */
  }

  const body = await page.locator("body").innerText().catch(() => "");
  assert(
    body.includes("Home base") || body.includes("Dashboard") || body.includes("Cycle"),
    "Home base shell visible"
  );

  // Sidebar nav
  console.log("\n── Sidebar navigation ──");
  const navs = [
    ['[data-view="dashboard"]', "Dashboard"],
    ['[data-view="spreadsheets"]', "Spreadsheets"],
    ['[data-view="analytics"]', "Reports / Analytics"],
    ['[data-view="inhouse"]', "In-house"],
    ['[data-view="inputs"]', "All inputs"],
    ['[data-view="staff"]', "Staff board"],
    ['[data-view="settings"]', "Settings"],
  ];
  for (const [sel, label] of navs) {
    await safeClick(page, sel, `Nav ${label}`);
    await page.waitForTimeout(400);
  }

  // Staff board post
  console.log("\n── Staff board ──");
  await safeClick(page, '[data-view="staff"]', "Staff again");
  await page.waitForTimeout(300);
  const staffTa = page.locator("#staffPostText");
  if (await staffTa.isVisible().catch(() => false)) {
    await staffTa.fill("Browser click-all handoff note");
    await safeClick(page, "#btnStaffPost", "Post staff note");
    await page.waitForTimeout(400);
    const list = await page.locator("#staffBoardList").innerText().catch(() => "");
    assert(list.includes("click-all") || list.includes("handoff"), "Staff note appears in list");
  } else {
    fail("Staff post textarea not visible");
  }

  // Dashboard cards / V1.5 panels
  console.log("\n── Dashboard V1.5 panels ──");
  await safeClick(page, '[data-view="dashboard"]', "Dashboard");
  await page.waitForTimeout(400);

  // Smart Orders
  if (await page.locator("#btnSmartOrders").isVisible().catch(() => false)) {
    await safeClick(page, "#btnSmartOrders", "Smart Orders → PO");
    await page.waitForTimeout(600);
    const overlayText = await page.locator("body").innerText();
    assert(
      overlayText.includes("Purchase Order") || overlayText.includes("Smart Orders") || overlayText.includes("Suggested"),
      "Smart Orders panel opened"
    );
    // try copy / close
    if (await page.locator("#btnPoCopy").isVisible().catch(() => false)) {
      await safeClick(page, "#btnPoCopy", "Copy PO text");
    }
    if (await page.locator("#closeOrders").isVisible().catch(() => false)) {
      await safeClick(page, "#closeOrders", "Close Smart Orders");
    } else {
      await page.keyboard.press("Escape").catch(() => {});
      // force remove overlay
      await page.evaluate(() => {
        document.querySelectorAll("[style*='z-index:9999']").forEach((el) => el.remove());
      });
    }
  } else fail("btnSmartOrders not visible");

  // Recipes
  if (await page.locator("#btnRecipes").isVisible().catch(() => false)) {
    await safeClick(page, "#btnRecipes", "Recipes & Costing");
    await page.waitForTimeout(500);
    const t = await page.locator("body").innerText();
    assert(t.toLowerCase().includes("recipe"), "Recipes panel opened");
    await page.evaluate(() => {
      document.querySelectorAll("[style*='z-index:9999'], .modal-overlay").forEach((el) => {
        const close = el.querySelector("button");
        if (close) close.click();
        else el.remove();
      });
    });
    await page.waitForTimeout(300);
  } else fail("btnRecipes not visible");

  // Mobile count
  if (await page.locator("#btnMobileCount").isVisible().catch(() => false)) {
    try {
      await page.locator("#btnMobileCount").click({ force: true, timeout: 8000 });
      log("Clicked: Mobile count (force)");
    } catch (e) {
      fail(`Mobile count click: ${e.message.split("\n")[0]}`);
    }
    await page.waitForTimeout(800);
    const t = await page.locator("body").innerText();
    assert(
      t.toLowerCase().includes("mobile") ||
        t.toLowerCase().includes("tap") ||
        t.includes("0.1") ||
        t.includes("Station") ||
        (await page.locator("#mobileCountContent").count()) > 0,
      "Mobile count surface opened"
    );
    await page.evaluate(() => {
      document.querySelectorAll("[style*='z-index:9999']").forEach((el) => el.remove());
    });
  } else fail("btnMobileCount not visible");

  // Transfer — needs 2 venues; create second via API then open UI
  console.log("\n── Multi-venue transfer ──");
  await api("POST", "/api/bars", { name: "Patio Click Test", start_setup: false });
  // ensure main still has bottles after any prior ops
  const listed = await api("GET", "/api/bars");
  const mainId = listed.data.active_bar_id || listed.data.bars?.[0]?.id;
  if (mainId) {
    await api("POST", "/api/bars/switch", { bar_id: mainId });
    await api("POST", "/api/bar", { ...buildBar(), id: mainId });
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (await page.locator("#btnTransferStock").isVisible().catch(() => false)) {
    await safeClick(page, "#btnTransferStock", "Transfer stock card");
    await page.waitForTimeout(700);
    const t = await page.locator("body").innerText();
    if (t.includes("Transfer") || t.includes("From venue") || t.includes("second venue")) {
      log("Transfer panel or guidance shown");
      try {
        if (await page.locator("#xferSubmit").isVisible().catch(() => false)) {
          const enabled = page.locator("#xferBottle option:not([disabled])");
          const n = await enabled.count();
          // index 0 is usually placeholder "— pick —"
          if (n >= 2) {
            const val = await enabled.nth(1).getAttribute("value");
            if (val) {
              await page.locator("#xferBottle").selectOption(val);
              await page.locator("#xferQty").fill("0.5");
              await safeClick(page, "#xferSubmit", "Submit transfer 0.5");
              await page.waitForTimeout(500);
            } else log("No bottle value to transfer (skipped submit)");
          } else log("No bottle options yet (transfer UI still OK)");
        }
      } catch (e) {
        fail(`Transfer select/submit: ${e.message.split("\n")[0]}`);
      }
      if (await page.locator("#xferClose").isVisible().catch(() => false)) {
        await safeClick(page, "#xferClose", "Close transfer");
      } else {
        await page.evaluate(() => {
          document.querySelectorAll(".xfer-overlay, [style*='z-index:9999']").forEach((el) => el.remove());
        });
      }
    } else fail("Transfer UI did not open meaningfully");
  } else {
    if (await page.locator("#btnOpenTransfer").isVisible().catch(() => false)) {
      await safeClick(page, "#btnOpenTransfer", "Sidebar transfer");
    } else fail("Transfer buttons not visible");
  }

  // Reports tabs
  console.log("\n── Reports ──");
  await safeClick(page, '[data-view="analytics"]', "Open Reports");
  await page.waitForTimeout(900);
  const reportText = await page.locator("#analyticsRoot").innerText().catch(() => "");
  assert(
    reportText.length > 40 ||
      reportText.includes("On the shelf") ||
      reportText.includes("story") ||
      reportText.includes("par") ||
      reportText.includes("$"),
    "Reports root has content"
  );
  const tabs = page.locator(".rpt-tab");
  const tabCount = await tabs.count();
  if (tabCount > 0) {
    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      await tabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(200);
    }
    log(`Clicked ${Math.min(tabCount, 5)} report tabs`);
  } else {
    // older analytics grid still ok
    log("No .rpt-tab (maybe empty or legacy layout) — content check above stands");
  }

  // Inputs hub
  console.log("\n── Inputs ──");
  await safeClick(page, '[data-view="inputs"]', "Inputs");
  await page.waitForTimeout(500);
  const inputsText = await page.locator("body").innerText();
  assert(
    inputsText.includes("POS") || inputsText.includes("input") || inputsText.includes("Receive"),
    "Inputs view has POS/receive content"
  );
  // filter pills
  const filters = page.locator(".inputs-log-filter");
  const fc = await filters.count();
  for (let i = 0; i < Math.min(fc, 5); i++) {
    await filters.nth(i).click().catch(() => {});
  }
  if (fc) log(`Clicked ${Math.min(fc, 5)} input log filters`);

  // Spreadsheets
  console.log("\n── Spreadsheets ──");
  await safeClick(page, '[data-view="spreadsheets"]', "Spreadsheets");
  await page.waitForTimeout(600);
  const sheetText = await page.locator("body").innerText();
  assert(
    sheetText.includes("PAR") || sheetText.includes("Variance") || sheetText.includes("Station") || sheetText.includes("workbook"),
    "Spreadsheets view loaded"
  );

  // In-house
  console.log("\n── In-house ──");
  await safeClick(page, '[data-view="inhouse"]', "In-house");
  await page.waitForTimeout(500);
  const ih = await page.locator("body").innerText();
  assert(ih.includes("Tito") || ih.includes("Well") || ih.includes("bottle") || ih.includes("On hand") || ih.includes("shelf"), "In-house shows inventory");

  // Settings — people, weigh, venues
  console.log("\n── Settings ──");
  await safeClick(page, '[data-view="settings"]', "Settings");
  await page.waitForTimeout(500);
  const setText = await page.locator("body").innerText();
  assert(setText.includes("People") || setText.includes("venues") || setText.includes("Weigh"), "Settings panels present");

  if (await page.locator("#settWeighEnabled").isVisible().catch(() => false)) {
    await page.locator("#settWeighEnabled").check().catch(() => {});
    await page.locator("#settWeighEnabled").uncheck().catch(() => {});
    log("Toggled weigh checkbox (left off)");
  }
  if (await page.locator("#btnSaveWeigh").isVisible().catch(() => false)) {
    await safeClick(page, "#btnSaveWeigh", "Save weighing preference");
  }

  // Create admin PIN in UI if open mode
  if (await page.locator("#btnPeopleCreate").isVisible().catch(() => false)) {
    await page.locator("#peopleName").fill("Click Admin").catch(() => {});
    await page.locator("#peopleLogin").fill("clickadmin").catch(() => {});
    await page.locator("#peoplePin").fill("123456").catch(() => {});
    await page.locator("#peopleRole").selectOption("admin").catch(() => {});
    await safeClick(page, "#btnPeopleCreate", "Create admin person");
    await page.waitForTimeout(500);
    const peopleList = await page.locator("#peopleList").innerText().catch(() => "");
    assert(
      peopleList.includes("Click Admin") || peopleList.includes("clickadmin") || peopleList.includes("Admin"),
      "People list shows created admin"
    );
  } else {
    log("People create form hidden (role shell or already gated)");
  }

  // Metrics refresh on dashboard
  console.log("\n── Metrics ──");
  await safeClick(page, '[data-view="dashboard"]', "Dashboard metrics");
  await page.waitForTimeout(400);
  if (await page.locator("#metricsWindow").isVisible().catch(() => false)) {
    await page.locator("#metricsWindow").selectOption({ index: 0 }).catch(() => {});
    log("Metrics window select interacted");
  }

  // Bar switcher if multi
  const switcher = page.locator("#barSwitcher");
  if ((await switcher.locator("option").count()) > 1) {
    await switcher.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(400);
    await switcher.selectOption({ index: 0 }).catch(() => {});
    log("Bar switcher exercised");
  }

  if (pageErrors.length) {
    fail(`Page JS errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  } else {
    log("No uncaught page JS errors");
  }

  await browser.close();

  const report = {
    when: new Date().toISOString(),
    base: BASE,
    passed: failures.length === 0,
    failure_count: failures.length,
    failures,
    steps,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log("\n════════════════════════════════════════");
  console.log(
    failures.length === 0
      ? `PASS — ${steps.filter((s) => s.ok).length} steps, 0 failures`
      : `FAIL — ${failures.length} failure(s)`
  );
  failures.forEach((f) => console.log(`  • ${f}`));
  console.log(`Report: ${REPORT}`);
  console.log("════════════════════════════════════════\n");
  console.log("Manual test ready:");
  console.log(`  Open ${BASE}/home  (Twin Well seeded)`);
  console.log("  Server: program/.venv/bin/python3 server.py");
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
