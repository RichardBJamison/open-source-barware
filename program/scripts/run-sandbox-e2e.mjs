#!/usr/bin/env node
/**
 * Full sandbox E2E — Twin Well walk → count → process → admin data → week 2.
 * Requires Flask on localhost:5052.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/twin-well-demo");

const failures = [];
const log = (msg) => console.log(msg);
const fail = (msg) => {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
};
const assert = (cond, msg) => (cond ? log(`  ✓ ${msg}`) : fail(msg));

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

const spec = {
  name: "Twin Well Tavern",
  stations: [mkStation("Well One Primary", "well", 0), mkStation("Well Two Service", "well", 1)],
};

const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
const count1 = fs.readFileSync(path.join(KIT, "count-week-1.txt"), "utf8");
const count2 = fs.readFileSync(path.join(KIT, "count-week-2.txt"), "utf8");

const parsed1 = runBarTest(spec, walk, count1, null);
const parsed2 = runBarTest(spec, walk, count2, null);

assert(parsed1.pass2_golden.golden, "week 1 parser golden");
assert(parsed2.pass2_golden.golden, "week 2 parser golden");

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

const LEVELS_W2 = [
  ["Well One Primary", "Tito's", 0.4],
  ["Well One Primary", "Ketel One", 0.2],
  ["Well One Primary", "Grey Goose", 0.6],
  ["Well One Primary", "Tanqueray", 0.5],
  ["Well One Primary", "Bacardi", 0.7],
  ["Well One Primary", "Patron Silver", 0.8],
  ["Well Two Service", "Jack Daniels", 0.3],
  ["Well Two Service", "Jameson", 0.8],
  ["Well Two Service", "Makers Mark", 0.6],
  ["Well Two Service", "Hendricks", 0.9],
  ["Well Two Service", "Casamigos", 0.4],
  ["Well Two Service", "Don Julio", 0.5],
];

function buildBar(levels) {
  const stations = [
    { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
    { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
  ];
  levels.forEach(([stName, name, level], i) => {
    const st = stations.find((s) => s.name === stName);
    st.bottles.push({
      id: `b${i}`,
      name,
      category: "spirits",
      size: "750ml",
      par_level: 1,
      current_level: level,
      cost: 25,
      count_matched: true,
    });
  });
  return { name: "Twin Well Tavern", stations, stations_reviewed: true };
}

async function main() {
  log("Sandbox E2E — Twin Well full pipeline\n");

  const ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Server not running on", BASE);
    process.exit(1);
  }

  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "Twin Well Tavern" });
  await api("POST", "/api/phase/advance", { phase: "first_count" });

  await api("POST", "/api/setup/count-notes", { text: count1 });
  await api("POST", "/api/bar", buildBar(LEVELS_W1));

  const p1 = await api("POST", "/api/count/process-cycle", {});
  assert(p1.ok && p1.data.cycle_number === 1, "cycle 1 process-cycle 200");
  assert(p1.data.analytics?.bottle_count === 12, "cycle 1 analytics 12 SKUs");
  assert(p1.data.in_house_count === 12, "cycle 1 in-house 12");

  const state1 = await api("GET", "/api/state");
  assert(state1.data?.phase === "butterfly", "phase butterfly after cycle 1");
  assert(state1.data?.config?.first_count_complete === true, "first_count_complete true");

  const metrics1 = await api("GET", "/api/metrics?window=current_cycle");
  assert(metrics1.ok && metrics1.data?.summary?.bottle_count === 12, "metrics populated cycle 1");

  const analytics1 = await api("GET", "/api/analytics");
  assert(analytics1.ok && analytics1.data?.product_rows?.length === 12, "analytics product_rows 12");
  assert(analytics1.data?.total_value > 0, "analytics total_value > 0");

  const inhouse1 = await api("GET", "/api/in-house?category=all");
  assert(inhouse1.ok && inhouse1.data?.items?.length === 12, "in-house 12 items");

  // Week 2
  await api("POST", "/api/bar", buildBar(LEVELS_W2));
  const p2 = await api("POST", "/api/count/process-cycle", {});
  assert(p2.ok && p2.data.cycle_number === 2, "cycle 2 process-cycle 200");
  assert((p2.data.week_over_week?.length || 0) === 12, "week-over-week 12 rows");
  assert((p2.data.velocity?.length || 0) > 0, "velocity populated");

  const analytics2 = await api("GET", "/api/analytics");
  assert((analytics2.data?.week_over_week?.length || 0) === 12, "analytics week_over_week 12");
  assert(analytics2.data?.cycles_total === 2, "analytics cycles_total 2");

  // Static pages load
  for (const route of ["/setup", "/home"]) {
    const page = await fetch(`${BASE}${route}`);
    assert(page.ok, `${route} returns 200`);
    const html = await page.text();
    assert(
      html.includes("20260705-positioning") ||
        html.includes("20260705-inputs-v2") ||
        html.includes("20260705-inventory-system"),
      `${route} has cache bust`
    );
  }

  if (failures.length) {
    log(`\nFAILED — ${failures.length} assertion(s)`);
    process.exit(1);
  }
  log("\nPASS — Sandbox E2E: Process pipeline + admin data + week-over-week");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});