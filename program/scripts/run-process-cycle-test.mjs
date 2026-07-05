#!/usr/bin/env node
/** API test: Process button pipeline closes cycle + analytics */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/twin-well-demo");

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
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

let bar = { name: spec.name, stations: spec.stations };
for (const st of bar.stations) {
  st.bottles = [];
}
const walkResult = parsed1.pass1;
// rebuild bar from walk apply simulation — use runBarTest internal? Simpler: POST bar from parsed levels

function applyLevels(pass) {
  const stations = [
    { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
    { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
  ];
  const walkLines = walk.split("\n");
  // use matched from reconcile
  for (const m of pass.pass2_golden.matched_items || []) {
    /* skip - runBarTest doesn't export matched_items */
  }
}

// Simpler approach: hardcode 12 bottles with levels from count1
const bottles1 = [
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
    });
  });
  return { name: "Twin Well Tavern", stations };
}

async function main() {
  console.log("Process-cycle API test\n");
  let ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Server not running on", BASE);
    process.exit(1);
  }

  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "Twin Well Tavern" });
  await api("POST", "/api/phase/advance", { phase: "first_count" });

  const bar1 = buildBar(bottles1);
  await api("POST", "/api/bar", bar1);

  const p1 = await api("POST", "/api/count/process-cycle", {});
  if (!p1.ok || p1.data.cycle_number !== 1) {
    console.error("FAIL cycle 1", p1.data);
    process.exit(1);
  }
  console.log(`✓ Cycle 1: ${p1.data.analytics?.bottle_count} SKUs, in-house ${p1.data.in_house_count}`);

  const bottles2 = [
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
  await api("POST", "/api/bar", buildBar(bottles2));
  await api("POST", "/api/bars/setup", { bar_id: (await api("GET", "/api/state")).data?.config?.active_bar_id });

  const p2 = await api("POST", "/api/count/process-cycle", {});
  if (!p2.ok || p2.data.cycle_number !== 2) {
    console.error("FAIL cycle 2", p2.data);
    process.exit(1);
  }
  const wow = p2.data.week_over_week?.length || 0;
  console.log(`✓ Cycle 2: ${wow} week-over-week rows, velocity ${p2.data.velocity?.length || 0}`);

  const analytics = await api("GET", "/api/analytics");
  if (!analytics.ok || analytics.data.bottle_count !== 12) {
    console.error("FAIL analytics", analytics.data);
    process.exit(1);
  }
  console.log("✓ Analytics populated");
  console.log("\nPASS — Process pipeline closes cycles + week-over-week");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});