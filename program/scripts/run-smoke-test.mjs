#!/usr/bin/env node
/**
 * Corner Pint smoke test — 10 bottles, 2 intentional gaps.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/corner-pint-smoke-test");

const spec = {
  name: "Corner Pint",
  stations: [mkStation("Well One Patio", "well", 0), mkStation("Patio Cooler", "walk-in", 1)],
  expectedCount: 10,
};

const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
const count = fs.readFileSync(path.join(KIT, "count.txt"), "utf8");

const r = runBarTest(spec, walk, count, null);

console.log("Corner Pint smoke test\n");
console.log(`Walk applied: ${r.pass1.applied} bottles (expect 10)`);
console.log(`Count matched: ${r.pass2_golden.matched}`);
console.log(`Missing from count: ${r.pass2_golden.missing} (expect 1 — Hendricks)`);
console.log(`Surprises: ${r.pass2_golden.surprises} (expect 1 — Campari)`);

const ok =
  r.pass1.applied === 10 &&
  r.pass2_golden.missing === 1 &&
  r.pass2_golden.surprises === 1 &&
  r.pass2_golden.matched === 9;

if (!ok) {
  console.error("\nFAIL — smoke kit out of spec");
  if (r.pass2_golden.missing_items?.length) console.error("  missing:", r.pass2_golden.missing_items.join("; "));
  if (r.pass2_golden.surprise_items?.length) console.error("  surprises:", JSON.stringify(r.pass2_golden.surprise_items));
  process.exit(1);
}

console.log("\nPASS — 2 intentional gaps, ready for Kelhen field test");
process.exit(0);