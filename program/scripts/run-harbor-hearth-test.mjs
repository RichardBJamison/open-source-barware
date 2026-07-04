#!/usr/bin/env node
/**
 * Validate Harbor & Hearth test-kit walk + golden count files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/harbor-hearth-full-test");

const BARS = [
  {
    name: "River Room",
    stations: [
      mkStation("Main Bar", "well", 0),
      mkStation("Service Bar", "well", 1),
      mkStation("Point", "well", 2),
      mkStation("Back Bar Main", "back-bar", 3),
      mkStation("Back Bar Top Shelf", "back-bar", 4),
      mkStation("Beer Cooler", "walk-in", 5),
      mkStation("Wine Cooler", "walk-in", 6),
      mkStation("Liquor Room", "storage", 7),
    ],
    walk: "part-1-walk/bar-1-river-room-walk.txt",
    count1: "part-2-first-count/bar-1-river-room-count-1.txt",
    count2: "part-3-second-count/bar-1-river-room-count-2.txt",
  },
  {
    name: "Garden Terrace",
    stations: [
      mkStation("Patio Well", "well", 0),
      mkStation("Patio Beer Cooler", "walk-in", 1),
      mkStation("Patio Wine Cooler", "walk-in", 2),
    ],
    walk: "part-1-walk/bar-2-garden-terrace-walk.txt",
    count1: "part-2-first-count/bar-2-garden-terrace-count-1.txt",
  },
  {
    name: "The Cellar",
    stations: [
      mkStation("Cellar Well Primary", "well", 0),
      mkStation("Cellar Well Service", "well", 1),
      mkStation("Wine Wall", "walk-in", 2),
      mkStation("Beer Cooler", "walk-in", 3),
      mkStation("Spirit Library", "back-bar", 4),
      mkStation("Dry Storage", "storage", 5),
    ],
    walk: "part-1-walk/bar-3-cellar-library-walk.txt",
    count1: "part-2-first-count/bar-3-cellar-library-count-1.txt",
  },
];

function read(rel) {
  return fs.readFileSync(path.join(KIT, rel), "utf8");
}

let allPass = true;

console.log("Harbor & Hearth test-kit parser validation\n");

for (const spec of BARS) {
  const r = runBarTest(
    { name: spec.name, stations: spec.stations, expectedCount: 9999 },
    read(spec.walk),
    read(spec.count1),
    null
  );
  const golden = r.pass2_golden.golden;
  const autoSt = r.pass1.issues.some((i) => i.code === "AUTO_STATION");
  const ok = golden && !autoSt;
  if (!ok) allPass = false;
  console.log(`${spec.name}: walk=${r.pass1.applied} bottles | count golden=${golden ? "PASS" : "FAIL"}${autoSt ? " | AUTO_STATION" : ""}`);
  if (!golden) {
    console.log(`  missing: ${r.pass2_golden.missing_items.slice(0, 8).join("; ")}`);
    console.log(`  surprises: ${JSON.stringify(r.pass2_golden.surprise_items.slice(0, 6))}`);
  }
}

const river = BARS[0];
const r2 = runBarTest(
  { name: river.name, stations: river.stations, expectedCount: 9999 },
  read(river.walk),
  read(river.count2),
  null
);
const c2ok = r2.pass2_golden.golden;
if (!c2ok) allPass = false;
console.log(`\nRiver Room cycle-2: golden=${c2ok ? "PASS" : "FAIL"}`);
if (!c2ok) {
  console.log(`  missing: ${r2.pass2_golden.missing_items.slice(0, 8).join("; ")}`);
  console.log(`  surprises: ${JSON.stringify(r2.pass2_golden.surprise_items.slice(0, 6))}`);
}

process.exit(allPass ? 0 : 1);