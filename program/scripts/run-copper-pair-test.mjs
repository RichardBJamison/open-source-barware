#!/usr/bin/env node
/** Parser golden test — Copper Pair two-bar demo */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkStation, runBarTest } from "./run-test2.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/copper-pair-demo");

const BAR1 = {
  name: "The Copper Rail",
  stations: [
    mkStation("Well One Primary", "well", 0),
    mkStation("Well Two Service", "well", 1),
    mkStation("Back Bar Main", "back-bar", 2),
    mkStation("Liquor Room Backup", "storage", 3),
  ],
};

const BAR2 = {
  name: "Garden Terrace",
  stations: [
    mkStation("Patio Well", "well", 0),
    mkStation("Terrace Back", "back-bar", 1),
    mkStation("Beer Cooler", "walk-in", 2),
  ],
};

function check(label, spec, walk, c1, c2) {
  const w1 = runBarTest(spec, walk, c1, null);
  const w2 = runBarTest(spec, walk, c2, null);
  const ok1 = w1.pass2_golden.golden && w1.pass1.applied >= 20;
  const ok2 = w2.pass2_golden.golden;
  console.log(
    `${label} W1: walk=${w1.pass1.applied} matched=${w1.pass2_golden.matched} missing=${w1.pass2_golden.missing} golden=${ok1 ? "PASS" : "FAIL"}`
  );
  console.log(
    `${label} W2: matched=${w2.pass2_golden.matched} missing=${w2.pass2_golden.missing} golden=${ok2 ? "PASS" : "FAIL"}`
  );
  if (!ok1 || !ok2) {
    if (w1.pass2_golden.missing_items?.length)
      console.log("  missing:", w1.pass2_golden.missing_items.slice(0, 6).join("; "));
    if (w1.pass2_golden.surprise_items?.length)
      console.log("  surprises:", JSON.stringify(w1.pass2_golden.surprise_items.slice(0, 4)));
  }
  return ok1 && ok2;
}

const b1walk = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/walk.txt"), "utf8");
const b1c1 = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/count-week-1.txt"), "utf8");
const b1c2 = fs.readFileSync(path.join(KIT, "bar-1-copper-rail/count-week-2.txt"), "utf8");
const b2walk = fs.readFileSync(path.join(KIT, "bar-2-garden-terrace/walk.txt"), "utf8");
const b2c1 = fs.readFileSync(path.join(KIT, "bar-2-garden-terrace/count-week-1.txt"), "utf8");
const b2c2 = fs.readFileSync(path.join(KIT, "bar-2-garden-terrace/count-week-2.txt"), "utf8");

console.log("Copper Pair Demo — parser validation\n");
const ok = check("Copper Rail", BAR1, b1walk, b1c1, b1c2) && check("Garden Terrace", BAR2, b2walk, b2c1, b2c2);
process.exit(ok ? 0 : 1);