#!/usr/bin/env node
/**
 * Test 3 — E2E API: setup seam → butterfly admin data layer
 * Requires Flask on localhost:5052. Uses hard-reset (archives prior data).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const __dir = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(__dir, "../data/test3-report.json");

const failures = [];
const log = [];

function record(msg) {
  log.push(msg);
  console.log(msg);
}

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

async function api(method, route, body, isForm = false) {
  const opts = { method };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const r = await fetch(`${BASE}${route}`, opts);
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: r.ok, status: r.status, data };
}

function assert(cond, msg) {
  if (!cond) fail(msg);
  else record(`  ✓ ${msg}`);
}

const MINI_BAR = {
  bar_name: "Test 3 Bar",
  stations: [
    {
      id: "st_well",
      name: "Well 1 Primary",
      type: "well",
      order: 0,
      bottles: [
        { id: "b1", name: "Tito's", category: "spirits", size: "750ml", par_level: 2, current_level: 1.5 },
        { id: "b2", name: "Tanqueray", category: "spirits", size: "750ml", par_level: 1, current_level: 1 },
      ],
    },
    {
      id: "st_beer",
      name: "Beer Cooler",
      type: "walk-in",
      order: 1,
      bottles: [
        { id: "b3", name: "Corona", category: "beer", size: "12oz", par_level: 6, current_level: 4 },
      ],
    },
    {
      id: "st_wine",
      name: "Wine Wall",
      type: "walk-in",
      order: 2,
      bottles: [
        { id: "b4", name: "Caymus Cabernet", category: "wine", size: "750ml", par_level: 2, current_level: 2 },
      ],
    },
  ],
};

async function main() {
  record("=".repeat(72));
  record("TEST 3 — E2E butterfly (API)");
  record("=".repeat(72));

  let ping = await api("GET", "/ping");
  assert(ping.ok, `ping ${ping.data?.version || ""}`);

  record("\n── Reset + seed bar ──");
  const reset = await api("POST", "/api/hard-reset", {});
  assert(reset.ok, "hard-reset");

  await api("POST", "/api/config", { bar_name: MINI_BAR.bar_name });
  await api("POST", "/api/phase/advance", { phase: "name_bar" });
  await api("POST", "/api/phase/advance", { phase: "build_bar" });
  await api("POST", "/api/phase/advance", { phase: "voice_walk" });

  const saveBar = await api("POST", "/api/bar", MINI_BAR);
  assert(saveBar.ok, "save bar with levels");

  await api("POST", "/api/setup/voice-notes", { text: "Well one. Titos 750. Tanqueray 750." });
  const recon = await api("POST", "/api/setup/reconcile", {});
  assert(recon.ok, "reconcile");

  const approve = await api("POST", "/api/setup/approve-map", {});
  assert(approve.ok, "approve map");

  await api("POST", "/api/phase/advance", { phase: "first_count" });

  const finish = await api("POST", "/api/config", { first_count_complete: true });
  assert(finish.ok, "first_count_complete");
  assert(finish.data?.cycle?.id, "cycle closed on finish");
  const state = await api("GET", "/api/state");
  assert(state.data?.phase === "butterfly", "phase butterfly");
  assert(
    !state.data?.config?.setup_bar_id,
    "setup_bar_id empty at butterfly (no active_bar_id fallback)"
  );

  record("\n── Butterfly APIs ──");
  const cycles = await api("GET", "/api/cycles");
  assert(cycles.ok && cycles.data?.cycles?.length >= 1, "cycles non-empty");

  const metrics = await api("GET", "/api/metrics?window=current_cycle");
  assert(metrics.ok, "metrics 200");
  assert(metrics.data?.summary?.bottle_count === 4, "metrics bottle_count=4");
  assert(metrics.data?.first_week?.summary?.bottles === 4, "first_week baseline");
  assert(metrics.data?.categories?.liquor?.sku_count === 2, "liquor SKUs");

  const inhouse = await api("GET", "/api/in-house");
  assert(inhouse.ok && inhouse.data?.items?.length === 4, "in-house 4 items");

  const analytics = await api("GET", "/api/analytics");
  assert(analytics.ok, "analytics 200");
  assert(analytics.data?.bottle_count === 4, "analytics bottle_count=4");
  assert(Array.isArray(analytics.data?.product_rows), "analytics product_rows");
  assert(analytics.data?.variance_alerts?.length >= 0, "analytics variance_alerts");

  const report = await api("GET", "/api/reports/first-week");
  assert(report.ok && report.data?.cycle?.id, "first-week report");

  const pos = await api("POST", "/api/pos/log", {
    label: "Tuesday close",
    note: "Test POS paste",
    text: "Item,QTY\nTitos,3\nTanqueray,1",
  });
  assert(pos.ok, "POS log paste");

  const metrics2 = await api("GET", "/api/metrics?window=current_cycle");
  assert(metrics2.data?.summary?.pos_uploads >= 1, "pos_uploads counted");

  const homeR = await fetch(`${BASE}/home`);
  const homeHtml = await homeR.text();
  assert(homeR.status === 200, "home page 200");
  assert(!homeHtml.includes("Building next."), "home spreadsheets not placeholder");
  assert(!homeHtml.includes("Weekly packet staging"), "home inputs not placeholder");
  assert(homeHtml.includes('data-view="analytics"'), "home analytics nav");
  assert(homeHtml.includes("workbook-tabs"), "home spreadsheet tabs");
  assert(homeHtml.includes("Bar-Inventory-Master.xlsx"), "home workbook download link");

  const wbR = await fetch(`${BASE}/downloads/Bar-Inventory-Master.xlsx`);
  const wbBuf = Buffer.from(await wbR.arrayBuffer());
  assert(wbR.status === 200, "workbook xlsx 200");
  assert(wbBuf[0] === 0x50 && wbBuf[1] === 0x4b, "workbook xlsx PK header");

  const xlsxR = await fetch(`${BASE}/api/export/bottles?format=xlsx`);
  const xlsxBuf = Buffer.from(await xlsxR.arrayBuffer());
  assert(xlsxR.status === 200, "bottle audit xlsx 200");
  assert(xlsxBuf[0] === 0x50 && xlsxBuf[1] === 0x4b, "xlsx zip magic PK header");

  const reportOut = {
    ran_at: new Date().toISOString(),
    base: BASE,
    failures,
    log,
    cycle_id: finish.data?.cycle?.id,
    metrics: metrics.data?.summary,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(reportOut, null, 2));

  record("\n" + "=".repeat(72));
  if (failures.length) {
    record(`TEST 3 FAILED — ${failures.length} assertion(s)`);
    failures.forEach((f) => record(`  • ${f}`));
    process.exit(1);
  }
  record("TEST 3 PASSED — butterfly data layer OK");
  record(`Report: ${REPORT_PATH}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});