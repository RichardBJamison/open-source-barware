#!/usr/bin/env node
/** Regression guard — parseCountNotes must not reference undefined `bottles` */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const js = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../static/js/osb-app.js"),
  "utf8"
);
const fn = js.match(/function parseCountNotes[\s\S]*?^}/m)?.[0] || "";
if (/\bfor \(const b of bottles\)/.test(fn)) {
  console.error("FAIL: parseCountNotes still references undefined `bottles`");
  process.exit(1);
}
if (!/\bfor \(const b of allBottles\(\)\)/.test(fn)) {
  console.error("FAIL: parseCountNotes missing allBottles() loop");
  process.exit(1);
}
console.log("PASS — parseCountNotes uses allBottles()");