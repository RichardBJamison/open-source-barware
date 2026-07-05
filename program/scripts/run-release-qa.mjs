#!/usr/bin/env node
/**
 * Release QA — 3 bar personas, welcome AI paths, admin bells & whistles.
 * Requires Flask on localhost:5052 + Playwright.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { mkStation, runBarTest } from "./run-test2.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(__dir, "../../node_modules/playwright"));

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const REPORT = path.join(__dir, "../data/release-qa-report.json");
const CACHE_BUST = "20260705-positioning";

const failures = [];
const log = [];
const record = (msg) => {
  log.push(msg);
  console.log(msg);
};
const fail = (msg) => {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
};
const assert = (cond, msg) => (cond ? record(`  ✓ ${msg}`) : fail(msg));

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

async function fetchHtml(route) {
  const r = await fetch(`${BASE}${route}`);
  return { ok: r.ok, status: r.status, html: await r.text() };
}

// ── Static copy QA ─────────────────────────────────────────────────────────

async function qaStaticCopy() {
  record("\n══ STATIC COPY QA ══");
  const setup = await fetchHtml("/setup");
  assert(setup.ok, "setup page 200");
  assert(setup.html.includes(CACHE_BUST), `setup cache bust ${CACHE_BUST}`);
  assert(setup.html.includes("no AI required"), "welcome: no AI required");
  assert(setup.html.includes("welcomeAiPanel"), "welcome AI panel present");
  assert(setup.html.includes("btnWelcomeSkipAi"), "welcome skip AI button");
  assert(!setup.html.includes("cannot finish reconciliation"), "no false AI blocker copy");

  const home = await fetchHtml("/home");
  assert(home.ok, "home page 200");
  assert(home.html.includes("Optional AI connection"), "settings optional AI heading");
  assert(home.html.includes("Read photo (needs AI)"), "invoice photo button labeled honestly");
  assert(home.html.includes("workbook-tabs"), "live workbook tabs");

  const guide = await fetchHtml("/help/api-key");
  assert(guide.ok, "api-guide 200");
  assert(guide.html.includes("Do you need this?"), "api-guide leads with optional");
  assert(!guide.html.includes("cannot finish reconciliation"), "api-guide no false blocker");
}

// ── Browser helpers ──────────────────────────────────────────────────────────

async function freshReset() {
  await api("POST", "/api/hard-reset", {});
}

async function browserContext() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  page.on("dialog", async (d) => {
    if (d.type() === "alert" || d.type() === "confirm") await d.accept();
  });
  return { browser, context, page, jsErrors };
}

// ── Run 1: Corner Pint — small bar, skip AI, first-time welcome ─────────────

async function run1CornerPintSkipAi() {
  record("\n══ RUN 1 — Corner Pint (small bar · skip AI on welcome) ══");
  await freshReset();

  const KIT = path.join(__dir, "../test-kit/corner-pint-smoke-test");
  const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
  const count = fs.readFileSync(path.join(KIT, "count.txt"), "utf8");
  const spec = {
    name: "Corner Pint",
    stations: [mkStation("Well One Patio", "well", 0), mkStation("Patio Cooler", "walk-in", 1)],
    expectedCount: 10,
  };
  const parsed = runBarTest(spec, walk, count, null);
  assert(parsed.pass1.applied === 10, "parser: 10 bottles from walk");
  assert(parsed.pass2_golden.missing === 1, "parser: 1 intentional gap (Hendricks)");
  assert(parsed.pass2_golden.surprises === 1, "parser: 1 surprise (Campari)");

  const { browser, context, page, jsErrors } = await browserContext();
  try {
    await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
    await page.waitForSelector("#welcomeAiPanel", { timeout: 10000 });
    const welcomeText = await page.locator('[data-step="welcome"]').innerText();
    const aiPanelText = await page.locator("#welcomeAiPanel").innerText();
    assert(welcomeText.includes("self-contained"), "welcome explains self-contained");
    assert(/optional/i.test(aiPanelText) && /invoice photo/i.test(aiPanelText), "welcome optional AI framing");

    await page.click("#btnWelcomeSkipAi");
    await page.waitForSelector('[data-step="name_bar"]:not(.hidden)', { timeout: 10000 });

    const cfg = await api("GET", "/api/state");
    assert(cfg.data?.config?.api_connection_status === "skipped", "API status skipped after welcome skip");

    await page.click("#btnNameContinue");
    await page.waitForSelector('[data-step="voice_walk"]:not(.hidden)', { timeout: 10000 });
    await page.fill("#voiceNotes", walk);
    await page.click("#btnParsePasted");
    await page.waitForSelector("#walkParsed:not(.hidden)", { timeout: 20000 });
    const continueWalk = page.locator("#btnWalkContinue");
    if (await continueWalk.isVisible()) await continueWalk.click();
    await page.waitForSelector('[data-step="reconcile"]:not(.hidden), [data-step="build_bar"]:not(.hidden)', {
      timeout: 15000,
    }).catch(() => null);

    const barAfterWalk = await api("GET", "/api/bar");
    const bottleCount = (barAfterWalk.data?.stations || []).reduce(
      (n, s) => n + (s.bottles?.length || 0),
      0
    );
    assert(bottleCount >= 8, `walk parse applied bottles (${bottleCount})`);

    await api("POST", "/api/phase/advance", { phase: "reconcile" });
    const recon = await api("POST", "/api/setup/reconcile", {});
    assert(recon.ok, "reconcile without AI");
    const flags = recon.data?.draft_map?.flags || [];
    assert(
      !flags.some((f) => /cannot finish|deeper reconciliation/i.test(f)),
      "reconcile flag does not imply AI required"
    );

    await api("POST", "/api/phase/advance", { phase: "build_bar" });
    await api("POST", "/api/bar", { stations_reviewed: true, stations: barAfterWalk.data.stations });
    await api("POST", "/api/phase/advance", { phase: "map_review" });
    await api("POST", "/api/setup/approve-map", {});
    await api("POST", "/api/phase/advance", { phase: "first_count" });

    await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
    await page.waitForSelector("#countNotes", { timeout: 10000 });
    await page.fill("#countNotes", count);
    await page.locator("#btnProcessSticky").click();
    await page.waitForURL(/\/home/, { timeout: 20000 });

    const metrics = await page.evaluate(async () => {
      const r = await fetch("/api/metrics?window=current_cycle");
      return (await r.json()).summary;
    });
    assert(metrics?.bottle_count >= 8, `home after process: ${metrics?.bottle_count} bottles`);
    assert(jsErrors.length === 0, `no JS errors (${jsErrors.join("; ") || "clean"})`);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ── Run 2: Copper Rail — connect AI on welcome, admin panels, inputs ────────

async function run2CopperRailConnectAi() {
  record("\n══ RUN 2 — Copper Rail (26 SKUs · connect AI on welcome · admin sweep) ══");
  await freshReset();

  const KIT = path.join(__dir, "../test-kit/copper-pair-demo");
  const invoiceText = fs.readFileSync(
    path.join(__dir, "../test-kit/harbor-hearth-full-test/part-4-week1-inputs/invoice-southern-glazers-0701.txt"),
    "utf8"
  );

  const { browser, context, page, jsErrors } = await browserContext();
  try {
    await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
    await page.selectOption("#welcomeAiProvider", "claude");
    await page.fill("#welcomeApiKey", "sk-ant-test-release-qa-mock-key");
    await page.click("#btnWelcomeSaveAi");
    await page.waitForSelector('[data-step="name_bar"]:not(.hidden)', { timeout: 10000 });

    const state = await api("GET", "/api/state");
    assert(state.data?.config?.api_connection_status === "connected", "welcome AI connect saves");
    assert(state.data?.config?.ai_api_key_set === true, "ai_api_key_set true");

    // Fast-forward to butterfly with copper rail data
    const walk = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/walk.txt"), "utf8");
    const count1 = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/count-week-1.txt"), "utf8");
    const spec = {
      name: "The Copper Rail",
      stations: [
        mkStation("Well One Primary", "well", 0),
        mkStation("Well Two Service", "well", 1),
        mkStation("Back Bar Main", "back-bar", 2),
        mkStation("Liquor Room Backup", "storage", 3),
      ],
    };
    const parsed = runBarTest(spec, walk, count1, null);
    assert(parsed.pass2_golden.golden, "copper rail parser golden");

    const LEVELS = parsed.pass2_golden.matched_items?.length
      ? null
      : null; // use hardcoded from sandbox
    const LEVELS_W1 = [
      ["Well One Primary", "Tito's", 1.0], ["Well One Primary", "Ketel One", 1.5], ["Well One Primary", "Grey Goose", 1.0],
      ["Well One Primary", "Tanqueray", 0.8], ["Well One Primary", "Bacardi", 1.0], ["Well One Primary", "Patron Silver", 1.0],
      ["Well One Primary", "Hendricks", 1.0], ["Well One Primary", "Bombay Sapphire", 0.6],
      ["Well Two Service", "Jack Daniels", 0.6], ["Well Two Service", "Jameson", 1.0], ["Well Two Service", "Makers Mark", 1.0],
      ["Well Two Service", "Bulleit Bourbon", 0.7], ["Well Two Service", "Woodford", 1.0], ["Well Two Service", "Buffalo Trace", 0.9],
      ["Well Two Service", "Four Roses", 1.0], ["Well Two Service", "Wild Turkey", 0.5],
      ["Back Bar Main", "Macallan 12", 1.0], ["Back Bar Main", "Glenfiddich", 0.8], ["Back Bar Main", "Johnnie Walker Black", 1.0],
      ["Back Bar Main", "Don Julio", 0.7], ["Back Bar Main", "Casamigos", 1.0], ["Back Bar Main", "Espolon Blanco", 0.4],
      ["Liquor Room Backup", "Tito's Case", 6.0], ["Liquor Room Backup", "Ketel One Case", 6.0],
      ["Liquor Room Backup", "Grey Goose Spare", 1.0], ["Liquor Room Backup", "Patron Silver Spare", 1.0],
    ];

    function buildBar(levels) {
      const stations = [
        { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
        { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
        { id: "st_2", name: "Back Bar Main", type: "back-bar", order: 2, bottles: [] },
        { id: "st_3", name: "Liquor Room Backup", type: "storage", order: 3, bottles: [] },
      ];
      levels.forEach(([stName, name, level], i) => {
        stations.find((s) => s.name === stName).bottles.push({
          id: `b${i}`,
          name,
          category: "spirits",
          size: "750ml",
          par_level: /case/i.test(name) ? 6 : 1,
          current_level: level,
          cost: 28,
          count_matched: true,
        });
      });
      return { name: "The Copper Rail", stations, stations_reviewed: true, map_approved: true };
    }

    await api("POST", "/api/config", { bar_name: "The Copper Rail" });
    await api("POST", "/api/bar", buildBar(LEVELS_W1));
    await api("POST", "/api/setup/approve-map", {});
    await api("POST", "/api/phase/advance", { phase: "first_count" });
    await api("POST", "/api/setup/count-notes", { text: count1 });
    const proc = await api("POST", "/api/count/process-cycle", {});
    assert(proc.ok && proc.data.analytics?.bottle_count === 26, "copper rail cycle 1: 26 SKUs");

    await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });

    // Settings — optional AI panel
    await page.click('.sidebar-link[data-view="settings"]');
    await page.waitForSelector(".settings-ai-panel", { timeout: 8000 });
    const settingsText = await page.locator(".settings-ai-panel").innerText();
    assert(settingsText.includes("does not need AI"), "settings explains AI optional");
    const badge = await page.locator("#apiStatusBadge").innerText();
    assert(/On|invoice photos/i.test(badge), `API badge shows connected: ${badge}`);

    // Spreadsheets tabs
    await page.click('.sidebar-link[data-view="spreadsheets"]');
    await page.waitForSelector("#workbookTabs", { timeout: 8000 });
    for (const tab of ["variance", "order-generator", "week-over-week"]) {
      await page.click(`.workbook-tab[data-sheet="${tab}"]`);
      await page.waitForTimeout(400);
    }
    const sheetHtml = await page.locator("#workbookContent").innerText();
    assert(sheetHtml.length > 20, "workbook tabs render content");

    // All inputs — invoice paste (no AI needed) + POS
    await page.click('.sidebar-link[data-view="inputs"]');
    await page.waitForSelector("#invoicePaste", { timeout: 8000 });
    const invoiceStatus = await page.locator("#invoiceAiStatus").innerText();
    assert(/Optional AI on|invoice photos/i.test(invoiceStatus), "inputs shows AI on for photos");

    await page.fill("#invoicePaste", invoiceText.slice(0, 800));
    await page.fill("#invoiceLabel", "SG QA test");
    const parseRes = await api("POST", "/api/inputs/invoice/parse", {
      text: invoiceText,
      use_ai: false,
    });
    assert(parseRes.ok && (parseRes.data?.invoice?.lines?.length || 0) >= 5, "invoice text parse without AI");

    const pos = await api("POST", "/api/pos/log", {
      label: "Monday close QA",
      text: "Item,QTY\nTitos,4\nJameson,2",
    });
    assert(pos.ok, "POS paste saved");

    // Analytics + In-house
    await page.click('.sidebar-link[data-view="analytics"]');
    await page.waitForSelector("#analyticsRoot", { timeout: 10000 });
    await page.click('.sidebar-link[data-view="inhouse"]');
    await page.waitForSelector("#inhouseTable", { timeout: 10000 });

    const analytics = await api("GET", "/api/analytics");
    assert(analytics.data?.bottle_count === 26, "analytics 26 SKUs");
    assert(analytics.data?.cycles_total === 1, "analytics cycle 1");
    assert(jsErrors.length === 0, `no JS errors on admin sweep`);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ── Run 3: Twin Well — 2-week cycle, begin next count, week-over-week ───────

async function run3TwinWellTwoWeeks() {
  record("\n══ RUN 3 — Twin Well Tavern (12 SKUs · 2 weeks · begin next count) ══");
  await freshReset();

  const KIT = path.join(__dir, "../test-kit/twin-well-demo");
  const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
  const count1 = fs.readFileSync(path.join(KIT, "count-week-1.txt"), "utf8");
  const count2 = fs.readFileSync(path.join(KIT, "count-week-2.txt"), "utf8");
  const spec = {
    name: "Twin Well Tavern",
    stations: [mkStation("Well One Primary", "well", 0), mkStation("Well Two Service", "well", 1)],
  };
  const p1 = runBarTest(spec, walk, count1, null);
  const p2 = runBarTest(spec, walk, count2, null);
  assert(p1.pass2_golden.golden, "twin well week 1 golden");
  assert(p2.pass2_golden.golden, "twin well week 2 golden");

  const LEVELS_W1 = [
    ["Well One Primary", "Tito's", 1.0], ["Well One Primary", "Ketel One", 1.5], ["Well One Primary", "Grey Goose", 1.0],
    ["Well One Primary", "Tanqueray", 0.8], ["Well One Primary", "Bacardi", 1.0], ["Well One Primary", "Patron Silver", 1.0],
    ["Well Two Service", "Jack Daniels", 0.6], ["Well Two Service", "Jameson", 1.0], ["Well Two Service", "Makers Mark", 1.0],
    ["Well Two Service", "Hendricks", 1.0], ["Well Two Service", "Casamigos", 0.7], ["Well Two Service", "Don Julio", 1.0],
  ];
  const LEVELS_W2 = [
    ["Well One Primary", "Tito's", 0.4], ["Well One Primary", "Ketel One", 0.2], ["Well One Primary", "Grey Goose", 0.6],
    ["Well One Primary", "Tanqueray", 0.5], ["Well One Primary", "Bacardi", 0.7], ["Well One Primary", "Patron Silver", 0.8],
    ["Well Two Service", "Jack Daniels", 0.3], ["Well Two Service", "Jameson", 0.8], ["Well Two Service", "Makers Mark", 0.6],
    ["Well Two Service", "Hendricks", 0.9], ["Well Two Service", "Casamigos", 0.4], ["Well Two Service", "Don Julio", 0.5],
  ];

  function buildBar(levels) {
    const stations = [
      { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
      { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
    ];
    levels.forEach(([stName, name, level], i) => {
      stations.find((s) => s.name === stName).bottles.push({
        id: `b${i}`,
        name,
        category: "spirits",
        size: "750ml",
        par_level: 1,
        current_level: level,
        cost: 28,
        count_matched: true,
      });
    });
    return { name: "Twin Well Tavern", stations, stations_reviewed: true, map_approved: true };
  }

  await api("POST", "/api/setup/skip-ai", {});
  await api("POST", "/api/config", { bar_name: "Twin Well Tavern" });
  await api("POST", "/api/bar", buildBar(LEVELS_W1));
  await api("POST", "/api/setup/approve-map", {});
  await api("POST", "/api/phase/advance", { phase: "first_count" });
  await api("POST", "/api/setup/count-notes", { text: count1 });
  const c1 = await api("POST", "/api/count/process-cycle", {});
  assert(c1.ok && c1.data.analytics?.bottle_count === 12, "cycle 1: 12 SKUs");

  const { browser, context, page, jsErrors } = await browserContext();
  try {
    await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await page.click('.sidebar-link[data-view="inputs"]');
    await page.click("#btnBeginNextInventory");
    await page.waitForURL(/\/setup/, { timeout: 15000 });
    await page.waitForSelector("#countNotes", { timeout: 10000 });
    await page.fill("#countNotes", count2);
    await page.locator("#btnProcessSticky").click();
    await page.waitForURL(/\/home/, { timeout: 20000 });

    const dash = await page.locator("#dashboardHeroTitle").innerText().catch(() => "");
    assert(dash.length > 0 || (await page.locator("#metricsGrid .metric").count()) > 0, "dashboard live after week 2");

    const a = await api("GET", "/api/analytics");
    assert(a.data?.cycles_total === 2, "2 cycles complete");
    assert((a.data?.week_over_week?.length || 0) === 12, "week-over-week 12 rows");
    assert(a.data?.total_value > 0, "total value populated");
    assert(jsErrors.length === 0, "no JS errors week 2 flow");
  } finally {
    await context.close();
    await browser.close();
  }

  // Week 2 processed via browser — verify exports
  const xlsx = await fetch(`${BASE}/api/export/bottles?format=xlsx`);
  const buf = Buffer.from(await xlsx.arrayBuffer());
  assert(xlsx.ok && buf[0] === 0x50 && buf[1] === 0x4b, "live audit xlsx export");
}

async function main() {
  record("RELEASE QA — Open Source Barware 4th of July build");
  record(`Target: ${BASE}`);

  const ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Start server: cd program && python3 server.py");
    process.exit(1);
  }
  record(`Server: ${ping.data?.version || "ok"}`);

  await qaStaticCopy();
  await run1CornerPintSkipAi();
  await run2CopperRailConnectAi();
  await run3TwinWellTwoWeeks();

  const report = {
    ran_at: new Date().toISOString(),
    base: BASE,
    cache_bust: CACHE_BUST,
    failures,
    pass: failures.length === 0,
    log,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  record("\n" + "═".repeat(60));
  if (failures.length) {
    record(`RELEASE QA FAILED — ${failures.length} issue(s)`);
    failures.forEach((f) => record(`  • ${f}`));
    process.exit(1);
  }
  record("RELEASE QA PASSED — 3 bar runs, welcome AI paths, admin sweep");
  record(`Report: ${REPORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});