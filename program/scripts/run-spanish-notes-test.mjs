#!/usr/bin/env node
/**
 * Spanish walk/count structure smoke — Mexican Spanish synonyms in osb-app.js
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(__dir, "../static/js/osb-app.js");
const KIT = path.join(__dir, "../test-kit/spanish-notes-smoke");

const src = fs.readFileSync(APP, "utf8");

function sliceFunction(source, name) {
  const fnStart = source.indexOf(`function ${name}`);
  if (fnStart < 0) throw new Error(`missing function ${name}`);
  let i = source.indexOf("{", fnStart);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(fnStart, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

function sliceConstBlock(source, name, untilMarker) {
  const start = source.indexOf(name);
  if (start < 0) throw new Error(`missing ${name}`);
  const end = source.indexOf(untilMarker, start);
  if (end < 0) throw new Error(`missing end marker for ${name}`);
  return source.slice(start, end);
}

// Build a minimal sandbox with only what parseWalkText + parseCountLevel need
const parts = [
  sliceConstBlock(src, "const WELL_STATION_ROLES", "function wellsByOrder"),
  // WALK_STATION_WORD_NUMS + normalizeWalkStationLabel live between WELL_STATION and wellsByOrder — already included
  sliceFunction(src, "stripAccents"),
  sliceFunction(src, "applySpanishStructureSynonyms"),
  sliceConstBlock(src, "const WALK_WORD_NUMS", "function walkNormalizeText"),
  sliceFunction(src, "walkNormalizeText"),
  sliceConstBlock(src, "const WALK_SIZE_PATTERNS", "function walkSizeOf"),
  sliceFunction(src, "walkSizeOf"),
  sliceConstBlock(src, "const WALK_BAR_RES", "function walkMatchBar"),
  sliceFunction(src, "walkMatchBar"),
  sliceConstBlock(src, "const WALK_STATION_RES", "function walkTitleCase"),
  sliceFunction(src, "walkTitleCase"),
  sliceFunction(src, "walkMatchStation"),
  sliceFunction(src, "walkMatchQuantity"),
  sliceFunction(src, "walkCleanName"),
  sliceFunction(src, "countCleanName"),
  sliceConstBlock(src, "const CASE_QTY_WORDS", "function normalizeCaseCountEntry"),
  sliceFunction(src, "normalizeCaseCountEntry"),
  sliceFunction(src, "parseWalkText"),
  sliceConstBlock(src, "const COUNT_LEVEL_WORDS", "function parseCountLevel"),
  sliceFunction(src, "parseCountLevel"),
  sliceFunction(src, "countLevelOf"),
];

const code = parts.join("\n\n") + `
this.parseWalkText = parseWalkText;
this.walkNormalizeText = walkNormalizeText;
this.parseCountLevel = parseCountLevel;
`;

const context = vm.createContext({
  console,
  Math,
  Date,
  JSON,
  String,
  Number,
  Array,
  Object,
  RegExp,
  parseInt,
  parseFloat,
  isNaN,
  Map,
  Set,
});

try {
  vm.runInContext(code, context);
} catch (e) {
  console.error("Sandbox load failed:", e.message);
  process.exit(1);
}

const walk = fs.readFileSync(path.join(KIT, "walk.txt"), "utf8");
const count = fs.readFileSync(path.join(KIT, "count.txt"), "utf8");
const result = context.parseWalkText(walk);
const bars = result.bars || [];
const allStations = bars.flatMap((b) => b.stations || []);
const allEntries = bars.flatMap((b) => b.entries || []);

console.log("Spanish walk parse");
console.log(`  bars: ${bars.length}`);
for (const b of bars) {
  console.log(`  ${b.label}: ${b.entries?.length || 0} bottles · stations: ${(b.stations || []).join(", ")}`);
}

const fails = [];
if (bars.length < 2) fails.push("expected ≥2 bars (Barra uno / Barra dos)");
if (!allStations.some((s) => /well/i.test(s))) fails.push("missing well from pozo");
if (!allStations.some((s) => /back bar/i.test(s))) fails.push("missing back bar from barra trasera");
if (!allStations.some((s) => /beer cooler/i.test(s))) fails.push("missing beer cooler from nevera de cerveza");
if (allEntries.length < 8) fails.push(`too few bottles: ${allEntries.length}`);
if (!allEntries.some((e) => /ketel/i.test(e.name) && /1L|liter/i.test(String(e.size)))) {
  fails.push("Ketel One litro should parse as 1L");
}
if (!allEntries.some((e) => /corona/i.test(e.name) && e.size === "12oz")) {
  fails.push("Corona 12oz miss");
}

// Level synonyms
const levelCases = [
  ["vacío", 0],
  ["lleno", 1],
  ["medio", 0.5],
  ["punto cinco", 0.5],
  ["cero", 0],
  ["uno", 1],
  ["out", 0],
  ["half", 0.5],
];
for (const [word, expect] of levelCases) {
  const got = context.parseCountLevel(word);
  if (got !== expect) fails.push(`parseCountLevel(${word})=${got} expected ${expect}`);
}

// English regression
const en = context.parseWalkText(
  "Bar one. Well one. Tito's 750. Back bar. Patron 750. Beer cooler. Corona 12oz.",
);
if ((en.bars?.[0]?.entries?.length || 0) < 3) fails.push("English walk regression");

// Count file normalizes structure words
const countNorm = context.walkNormalizeText(count);
if (!/\bwell\b/.test(countNorm)) fails.push("count: pozo→well failed");
if (!/\bout\b/.test(countNorm)) fails.push("count: vacío→out failed");
if (!/\bhalf\b/.test(countNorm) && !/\bpoint\b/.test(countNorm)) {
  fails.push("count: medio/punto not normalized");
}

if (fails.length) {
  console.error("\nFAIL:");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log("\nPASS — Spanish structure synonyms + EN regression");
process.exit(0);
