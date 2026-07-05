#!/usr/bin/env node
/**
 * Browser E2E — click Process, must land on /home with analytics.
 * Run: node scripts/run-browser-process-e2e.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(__dir, "../../node_modules/playwright"));

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const KIT = path.join(__dir, "../test-kit/twin-well-demo");

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

const LEVELS = [
  ["Well One Primary", "Tito's", 1.0],
  ["Well One Primary", "Ketel One", 1.5],
  ["Well One Primary", "Grey Goose", 1.0],
  ["Well One Primary", "Tanqueray", 0.8],
  ["Well One Primary", "Bacardi", 1.0],
  ["Well One Primary", "Patron Silver", 1.0],
  ["Well Two Service", "Jack Daniels", 0.6],
  ["Well Two Service", "Jameson", 1.0],
  ["Well Two Service", "Makers Mark", 1.0],
  ["Well Two Service", "Hendricks", 1.0],
  ["Well Two Service", "Casamigos", 0.7],
  ["Well Two Service", "Don Julio", 1.0],
];

function buildBar() {
  const stations = [
    { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
    { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
  ];
  LEVELS.forEach(([stName, name, level], i) => {
    stations.find((s) => s.name === stName).bottles.push({
      id: `b${i}`,
      name,
      category: "spirits",
      size: "750ml",
      par_level: 1,
      current_level: level,
      cost: 28,
    });
  });
  return { name: "Twin Well Tavern", stations, stations_reviewed: true, map_approved: true };
}

async function seedServer() {
  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "Twin Well Tavern" });
  await api("POST", "/api/bar", buildBar());
  const approve = await api("POST", "/api/setup/approve-map", {});
  if (!approve.ok) throw new Error(`approve-map failed: ${JSON.stringify(approve.data)}`);
  const adv = await api("POST", "/api/phase/advance", { phase: "first_count" });
  if (!adv.ok) throw new Error(`advance first_count failed: ${JSON.stringify(adv.data)}`);
}

async function runOnce(browser, label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (d) => {
    if (d.type() === "alert") await d.accept();
  });

  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
  const count = fs.readFileSync(path.join(KIT, "count-week-1.txt"), "utf8");

  await page.waitForSelector("#countNotes", { timeout: 15000 });
  await page.fill("#countNotes", count);

  const btn = page.locator("#btnProcessSticky");
  await btn.waitFor({ state: "visible", timeout: 5000 });
  await btn.click();

  await page.waitForURL(/\/home/, { timeout: 15000 });
  await page.waitForSelector("#dashboardHero, #metricsGrid .metric", { timeout: 10000 });

  const url = page.url();
  const hasHero = (await page.locator("#dashboardHero").count()) > 0;
  const metrics = await page.locator("#metricsGrid .metric .num").first().textContent();

  await context.close();

  if (!url.includes("/home")) throw new Error(`${label}: did not reach /home`);
  if (errors.length) throw new Error(`${label}: JS errors: ${errors.join("; ")}`);
  return { metrics: metrics?.trim(), hasHero };
}

async function main() {
  const ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Start server: python3 server.py");
    process.exit(1);
  }

  await seedServer();

  const browser = await chromium.launch({ headless: true });
  const runs = Number(process.env.OSB_PROCESS_RUNS || 10);
  console.log(`Browser Process E2E — ${runs} consecutive clicks\n`);

  for (let i = 1; i <= runs; i++) {
    await seedServer();
    const r = await runOnce(browser, `run ${i}`);
    console.log(`  ✓ run ${i}: /home OK, metrics=${r.metrics}`);
  }

  await browser.close();
  console.log(`\nPASS — Process button opened admin ${runs}/${runs} times`);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});