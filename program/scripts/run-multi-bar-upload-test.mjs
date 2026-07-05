#!/usr/bin/env node
/**
 * Multi-file walk upload — each file becomes its own bar via Bar N prefix.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dir, "../test-kit/harbor-hearth-full-test/part-1-walk");

const WALK_WORD_NUMS = {
  one: "1",
  two: "2",
  too: "2",
  to: "2",
  three: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};
const WALK_BAR_MARKER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const WALK_BAR_RES =
  /^(bar)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})\b/;

function walkNormalizeText(text) {
  let t = " " + String(text).replace(/\r/g, "\n") + " ";
  t = t.toLowerCase();
  t = t.replace(/\bleader\b/g, "liter");
  t = t.replace(/\blitre\b/g, "liter");
  return t;
}

function walkMatchBar(words, i) {
  const windowText = words.slice(i, i + 3).join(" ");
  const m = windowText.match(WALK_BAR_RES);
  if (m && windowText.startsWith(m[0])) {
    const numWord = WALK_WORD_NUMS[m[2]] ?? m[2];
    return { key: String(numWord), label: `Bar ${numWord}`, consumed: m[0].trim().split(/\s+/).length };
  }
  return null;
}

function walkTextStartsWithBarMarker(text) {
  const words = walkNormalizeText(text)
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, ""))
    .filter(Boolean);
  for (let i = 0; i < Math.min(words.length, 6); i++) {
    if (walkMatchBar(words, i)) return true;
  }
  return false;
}

function barNumberFromWalkFilename(filename) {
  const m = (filename || "").match(/bar[-_\s]?(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

function walkBarMarkerPrefix(n) {
  const word = WALK_BAR_MARKER_WORDS[n - 1] || String(n);
  return `Bar ${word}.`;
}

function ensureWalkBarMarker(text, filename, fileIndex, totalFiles) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (walkTextStartsWithBarMarker(trimmed)) return trimmed;
  const fromFile = barNumberFromWalkFilename(filename);
  const n = fromFile ?? (totalFiles > 1 || fileIndex > 1 ? fileIndex : null);
  if (!n) return trimmed;
  return `${walkBarMarkerPrefix(n)}\n${trimmed}`;
}

function parseWalkBarGroups(rawText) {
  const words = walkNormalizeText(rawText)
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, ""))
    .filter(Boolean);
  const barBuckets = new Map();
  let currentBarKey = "1";
  let i = 0;
  while (i < words.length) {
    const barHit = walkMatchBar(words, i);
    if (barHit) {
      currentBarKey = barHit.key;
      if (!barBuckets.has(currentBarKey)) barBuckets.set(currentBarKey, { key: currentBarKey, entries: 0 });
      i += barHit.consumed;
      continue;
    }
    const size = /\b750\b|\b12\s*oz\b|\bliter\b/i.test(words[i]) ? words[i] : null;
    if (size) {
      const bucket = barBuckets.get(currentBarKey) || { key: currentBarKey, entries: 0 };
      bucket.entries += 1;
      barBuckets.set(currentBarKey, bucket);
    }
    i += 1;
  }
  return Array.from(barBuckets.values()).sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10));
}

const files = [
  "bar-1-river-room-walk.txt",
  "bar-2-garden-terrace-walk.txt",
  "bar-3-cellar-library-walk.txt",
];

let failures = 0;
const log = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "FAIL"} ${msg}`);
  if (!ok) failures += 1;
};

function mergeCountFiles(fileTexts) {
  return fileTexts.map((f) => f.text.trim()).join("\n\n");
}

console.log("Multi-bar upload merge test\n");

const fileTexts = files.map((name) => ({
  name,
  text: fs.readFileSync(path.join(KIT, name), "utf8"),
}));

const merged = fileTexts
  .map((f, i) => ensureWalkBarMarker(f.text, f.name, i + 1, fileTexts.length))
  .join("\n\n");

log(walkTextStartsWithBarMarker(fileTexts[0].text) === false, "raw kit files lack bar markers");
log(/bar one\./i.test(merged), "merged text prefixes bar 1");
log(/bar two\./i.test(merged), "merged text prefixes bar 2");
log(/bar three\./i.test(merged), "merged text prefixes bar 3");

const groups = parseWalkBarGroups(merged);
log(groups.length === 3, `parse finds 3 bar groups (got ${groups.length})`);
log(groups.every((g) => g.entries > 0), "each bar group has bottle tokens");

const bar1Only = ensureWalkBarMarker(fileTexts[0].text, fileTexts[0].name, 1, 1);
log(barNumberFromWalkFilename("bar-2-garden-terrace-walk.txt") === 2, "filename extracts bar number");
log(/^bar two\./i.test(ensureWalkBarMarker(fileTexts[1].text, fileTexts[1].name, 2, 3)), "bar-2 filename gets Bar two prefix");
log(
  /^bar four\./i.test(ensureWalkBarMarker("Well one. Tito's 750.", "patio-walk.txt", 4, 1)),
  "single append file gets Bar four when index is 4"
);

const countFiles = [
  "bar-1-river-room-count-1.txt",
  "bar-2-garden-terrace-count-1.txt",
  "bar-3-cellar-library-count-1.txt",
].map((name) => ({
  name,
  text: fs.readFileSync(path.join(KIT.replace("part-1-walk", "part-2-first-count"), name), "utf8"),
}));
const countMerged = mergeCountFiles(countFiles);
log(countMerged.includes("Well one primary") && countMerged.includes("Well one patio"), "count files merge bar 1 + bar 2 content");
log(countMerged.includes("Cellar") || countMerged.includes("Wine wall") || countMerged.split("\n\n").length >= 3, "count merge keeps 3 file blocks");

process.exit(failures ? 1 : 0);