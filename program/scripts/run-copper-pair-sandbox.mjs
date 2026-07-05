#!/usr/bin/env node
/** Sandbox seed — Copper Rail 26 bottles, 2 cycles, full admin numbers */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runBarTest, mkStation } from "./run-test2.mjs";

const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/copper-pair-demo");

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

const spec = {
  name: "The Copper Rail",
  stations: [
    mkStation("Well One Primary", "well", 0),
    mkStation("Well Two Service", "well", 1),
    mkStation("Back Bar Main", "back-bar", 2),
    mkStation("Liquor Room Backup", "storage", 3),
  ],
};

const walk = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/walk.txt"), "utf8");
const c1 = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/count-week-1.txt"), "utf8");
const c2 = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/count-week-2.txt"), "utf8");

const parsed = runBarTest(spec, walk, c1, null);
if (!parsed.pass2_golden.golden) {
  console.error("Parser not golden");
  process.exit(1);
}

function levelsFromCount(text) {
  const map = [];
  let station = "";
  for (const line of text.split("\n")) {
    const st = line.match(/^([A-Za-z][^.]+)\./);
    if (st) station = st[1].trim();
    const levelMatch = line.match(/(one|two|three|four|five|six|seven|eight|nine|ten|point\s+\w+|\d+\.?\d*)\s*$/i);
    const names = line.match(/([A-Z][a-z]+(?:\s+[A-Z0-9][a-z]*)*)/g);
    if (!names) continue;
    for (const raw of names) {
      if (/^(Well|Back|Liquor|Patio|Terrace|Beer|Case|Spare|full)$/i.test(raw)) continue;
    }
  }
  return map;
}

// Hardcoded from golden count-week-1 (26 SKUs)
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

const LEVELS_W2 = [
  ["Well One Primary", "Tito's", 0.4], ["Well One Primary", "Ketel One", 0.2], ["Well One Primary", "Grey Goose", 0.6],
  ["Well One Primary", "Tanqueray", 0.5], ["Well One Primary", "Bacardi", 0.7], ["Well One Primary", "Patron Silver", 0.8],
  ["Well One Primary", "Hendricks", 0.9], ["Well One Primary", "Bombay Sapphire", 0.3],
  ["Well Two Service", "Jack Daniels", 0.3], ["Well Two Service", "Jameson", 0.8], ["Well Two Service", "Makers Mark", 0.6],
  ["Well Two Service", "Bulleit Bourbon", 0.4], ["Well Two Service", "Woodford", 0.7], ["Well Two Service", "Buffalo Trace", 0.5],
  ["Well Two Service", "Four Roses", 0.6], ["Well Two Service", "Wild Turkey", 0.2],
  ["Back Bar Main", "Macallan 12", 0.9], ["Back Bar Main", "Glenfiddich", 0.5], ["Back Bar Main", "Johnnie Walker Black", 0.8],
  ["Back Bar Main", "Don Julio", 0.4], ["Back Bar Main", "Casamigos", 0.6], ["Back Bar Main", "Espolon Blanco", 0.2],
  ["Liquor Room Backup", "Tito's Case", 5.0], ["Liquor Room Backup", "Ketel One Case", 4.0],
  ["Liquor Room Backup", "Grey Goose Spare", 0.8], ["Liquor Room Backup", "Patron Silver Spare", 1.0],
];

function buildBar(levels) {
  const stations = [
    { id: "st_0", name: "Well One Primary", type: "well", order: 0, bottles: [] },
    { id: "st_1", name: "Well Two Service", type: "well", order: 1, bottles: [] },
    { id: "st_2", name: "Back Bar Main", type: "back-bar", order: 2, bottles: [] },
    { id: "st_3", name: "Liquor Room Backup", type: "storage", order: 3, bottles: [] },
  ];
  levels.forEach(([stName, name, level], i) => {
    const st = stations.find((s) => s.name === stName);
    st.bottles.push({
      id: `b${i}`,
      name,
      category: /case|spare/i.test(name) ? "spirits" : "spirits",
      size: "750ml",
      par_level: /case/i.test(name) ? 6 : 1,
      current_level: level,
      cost: /Macallan|Johnnie|Don Julio/i.test(name) ? 45 : 28,
      count_matched: true,
    });
  });
  return { name: "The Copper Rail", stations, stations_reviewed: true };
}

async function main() {
  const ping = await api("GET", "/ping");
  if (!ping.ok) {
    console.error("Start server first: python3 server.py");
    process.exit(1);
  }

  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "The Copper Rail" });
  await api("POST", "/api/phase/advance", { phase: "first_count" });
  await api("POST", "/api/bar", buildBar(LEVELS_W1));

  const p1 = await api("POST", "/api/count/process-cycle", {});
  console.log(`Cycle 1: ${p1.data.analytics?.bottle_count} SKUs, value $${p1.data.analytics?.total_value?.toFixed(0)}`);

  await api("POST", "/api/bar", buildBar(LEVELS_W2));
  const p2 = await api("POST", "/api/count/process-cycle", {});
  const wow = p2.data.week_over_week?.length || 0;
  const top = (p2.data.week_over_week || []).slice(0, 3).map((r) => `${r.name} ${r.change.toFixed(2)}`).join(", ");
  console.log(`Cycle 2: ${wow} week-over-week rows`);
  console.log(`Top movers: ${top}`);
  console.log(`Velocity: ${p2.data.velocity?.length || 0} items`);

  const a = await api("GET", "/api/analytics");
  console.log(`\nAdmin preview numbers:`);
  console.log(`  SKUs: ${a.data.bottle_count}`);
  console.log(`  Est. value: $${a.data.total_value?.toFixed(2)}`);
  console.log(`  Below par: ${a.data.below_par}`);
  console.log(`  Beverage cost %: ${a.data.beverage_cost_pct?.toFixed(1)}%`);
  console.log(`  Cycles: ${a.data.cycles_total}`);

  if (p1.ok && p2.ok && wow === 26) {
    console.log("\nPASS — Copper Rail sandbox seeded for admin paint preview");
  } else {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});