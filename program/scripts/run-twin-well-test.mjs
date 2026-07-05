#!/usr/bin/env node
/**
 * Twin Well Demo — 2 wells × 6 bottles, golden week 1 + week 2 counts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/twin-well-demo");

const spec = {
  name: "Twin Well Tavern",
  stations: [mkStation("Well One Primary", "well", 0), mkStation("Well Two Service", "well", 1)],
  expectedCount: 12,
};

const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
const count1 = fs.readFileSync(path.join(KIT, "count-week-1.txt"), "utf8");
const count2 = fs.readFileSync(path.join(KIT, "count-week-2.txt"), "utf8");

function check(label, r) {
  const golden = r.pass2_golden.golden;
  const ok =
    r.pass1.applied === 12 &&
    golden &&
    r.pass2_golden.missing === 0 &&
    r.pass2_golden.surprises === 0 &&
    r.pass2_golden.matched === 12;
  console.log(
    `${label}: walk=${r.pass1.applied} | matched=${r.pass2_golden.matched} | missing=${r.pass2_golden.missing} | surprises=${r.pass2_golden.surprises} | golden=${golden ? "PASS" : "FAIL"}`
  );
  return ok;
}

console.log("Twin Well Demo parser validation\n");
const w1 = runBarTest(spec, walk, count1, null);
const w2 = runBarTest(spec, walk, count2, null);
const ok = check("Week 1 count", w1) && check("Week 2 count", w2);

if (!ok) process.exit(1);
console.log("\nPASS — 12-bottle golden both weeks");
process.exit(0);