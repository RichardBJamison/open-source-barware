#!/usr/bin/env node
/**
 * E2E — cycle 1 complete → Start next count → Count step → Process week 2 → /home
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
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

const LEVELS_W1 = [
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
  LEVELS_W1.forEach(([stName, name, level], i) => {
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

async function completeCycle1() {
  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "Twin Well Tavern" });
  await api("POST", "/api/bar", buildBar());
  await api("POST", "/api/setup/approve-map", {});
  const count1 = fs.readFileSync(path.join(KIT, "count-week-1.txt"), "utf8");
  await api("POST", "/api/setup/count-notes", { text: count1 });
  const proc = await api("POST", "/api/count/process-cycle", {});
  if (!proc.ok) throw new Error(`cycle 1 failed: ${JSON.stringify(proc.data)}`);
  const state = await api("GET", "/api/state");
  if (state.data.phase !== "butterfly") throw new Error(`expected butterfly, got ${state.data.phase}`);
  return state.data;
}

async function runFlow(browser, label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (d) => {
    if (d.type() === "alert" || d.type() === "confirm") await d.accept();
  });

  await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
  await page.click('.sidebar-link[data-view="inputs"]');
  await page.waitForSelector("#btnBeginNextInventory", { timeout: 10000 });

  const begin = page.locator("#btnBeginNextInventory");
  await begin.click();

  await page.waitForURL(/\/setup/, { timeout: 15000 });
  await page.waitForSelector("#countNotes", { timeout: 10000 });
  const phase = await page.evaluate(async () => {
    const r = await fetch("/api/state");
    const d = await r.json();
    return d.phase;
  });
  if (phase !== "first_count") throw new Error(`${label}: expected first_count, got ${phase}`);

  const count2 = fs.readFileSync(path.join(KIT, "count-week-2.txt"), "utf8");
  await page.fill("#countNotes", count2);
  await page.locator("#btnProcessSticky").click();

  await page.waitForURL(/\/home/, { timeout: 20000 });

  const cycles = await page.evaluate(async () => {
    const r = await fetch("/api/analytics");
    const d = await r.json();
    return d.cycles_total;
  });

  await context.close();
  if (errors.length) throw new Error(`${label}: JS errors: ${errors.join("; ")}`);
  if (cycles < 2) throw new Error(`${label}: expected cycles_total >= 2, got ${cycles}`);
  return { cycles };
}

async function main() {
  const ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Start server: python3 server.py");
    process.exit(1);
  }

  await completeCycle1();
  console.log("Begin-next-count E2E — cycle 1 locked, testing UI flow\n");

  const browser = await chromium.launch({ headless: true });
  const runs = Number(process.env.OSB_NEXT_COUNT_RUNS || 2);

  for (let i = 1; i <= runs; i++) {
    if (i > 1) await completeCycle1();
    const r = await runFlow(browser, `run ${i}`);
    console.log(`  ✓ run ${i}: setup count step → Process → /home, cycles=${r.cycles}`);
  }

  await browser.close();
  console.log(`\nPASS — Start next count flow ${runs}/${runs}`);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});