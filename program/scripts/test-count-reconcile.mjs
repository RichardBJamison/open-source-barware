#!/usr/bin/env node
/** One-off harness: run count parse + reconcile against data/bars.json */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dir, "../data/bars.json"), "utf8"));
const bar = data.bars[0];

const WALK_WORD_NUMS = {
  one: 1, two: 2, too: 2, to: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const COUNT_LEVEL_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  full: 1, zero: 0, none: 0, out: 0, half: 0.5,
};

function sortedStations() {
  return [...bar.stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function allBottles() {
  const out = [];
  for (const s of sortedStations()) {
    for (const b of s.bottles || []) {
      out.push({ ...b, stationId: s.id, stationName: s.name });
    }
  }
  return out;
}

function stationIdByName(name) {
  const key = (name || "").trim().toLowerCase();
  if (!key) return null;
  const exact = sortedStations().find((s) => s.name.toLowerCase() === key);
  if (exact) return exact.id;
  const norm = key.replace(/[^a-z0-9]/g, "");
  const fuzzy = sortedStations().find((s) => {
    const sk = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return sk === norm || sk.includes(norm) || norm.includes(sk);
  });
  return fuzzy?.id ?? null;
}

function walkNormalizeText(text) {
  let t = " " + String(text).replace(/\r/g, "\n") + " ";
  t = t.toLowerCase();
  t = t.replace(/\bleader\b/g, "liter");
  t = t.replace(/\blitre\b/g, "liter");
  t = t.replace(/\bseven\s+fifty\b/g, "750");
  t = t.replace(/\brow\s+(\d)\/(\d)\b/g, "row $1");
  t = t.replace(/\b(\d)\/(\d+)\b/g, " $1/$2 ");
  return t;
}

const WALK_STATION_RES = [
  /^(well)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})(\s+(primary|secondary|rear|front|large|small))?(\s+(row|bro)\s+(one|two|too|three|four|five|\d{1,2}))?(\s+(top|bottom|back|front)\s+(left|right|center)(\s+corner)?)?/,
  /^(row|bro)\s+(one|two|too|three|four|five|six|seven|\d{1,2})/,
  /^(next)\s+(row|shelf)/,
  /^(back\s+bar)(\s+(shelf|wall))?/,
  /^(front|back)\s+wall(\s+(left|right|center)\s+side)?/,
  /^(bar)\s+(left|right)\s+side(\s+top\s+shelf)?/,
  /^(top|bottom|glass)\s+shelf/,
  /^(center|middle)\s+bar(\s+front\s+section)?/,
  /^(rear|front)\s+row(\s+(one|two|three|\d{1,2}))?/,
  /^(speed\s*rail|rail)\b/,
];

function walkTitleCase(s) {
  return s.replace(/(^|[\s-])(\S)/g, (m, pre, c) => pre + c.toUpperCase());
}

function walkMatchStation(words, i) {
  const windowText = words.slice(i, i + 10).join(" ");
  for (const re of WALK_STATION_RES) {
    const m = windowText.match(re);
    if (m && windowText.startsWith(m[0])) {
      let label = m[0].trim().split(/\s+/).map((w) => (w === "bro" ? "row" : (WALK_WORD_NUMS[w] ?? w))).join(" ");
      return { label: walkTitleCase(label), consumed: m[0].trim().split(/\s+/).length };
    }
  }
  return null;
}

function walkCleanName(s) {
  return s.replace(/\b(the|a|an|of|and)\b/g, " ").replace(/[.,]+/g, " ").replace(/\s+/g, " ").trim();
}

function countCleanName(s) {
  return walkCleanName(s).replace(/^(?:bottle|bottles)\s+/i, "").replace(/\s+(?:bottle|bottles)$/i, "").replace(/\beach\s+one\b/gi, "").trim();
}

function countLevelOf(token) {
  const t = (token || "").replace(/[.,;:!?]+$/, "").toLowerCase();
  if (!t) return null;
  if (t === "half" || t === "0.5" || t === ".5") return 0.5;
  const dotTenth = t.match(/^\.(\d+)$/);
  if (dotTenth) {
    const n = dotTenth[1];
    if (n.length === 1) return parseInt(n, 10) / 10;
    if (n.length === 2) return parseInt(n, 10) / 100;
    return parseInt(n.slice(0, 1), 10) / 10;
  }
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const den = parseInt(frac[2], 10);
    if (den > 0) return Math.min(99, parseInt(frac[1], 10) / den);
  }
  if (COUNT_LEVEL_WORDS[t] !== undefined) return COUNT_LEVEL_WORDS[t];
  const num = t.match(/^(\d+(?:\.\d+)?)$/);
  if (num) return Math.min(99, parseFloat(num[1]));
  return null;
}

function countLevelAt(words, i) {
  const w = words[i]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  const w2 = words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  if (w === "point" && w2) {
    const combined = countLevelOf(`point${w2}`) ?? (parseInt(w2, 10) / 10);
    if (combined !== null) return { level: combined, consumed: 2 };
  }
  const single = countLevelOf(w);
  if (single !== null) return { level: single, consumed: 1 };
  return null;
}

function normalizeCountName(s) {
  return (s || "").toLowerCase().replace(/[''`´]/g, "'").trim();
}

function scoreCountBottleMatch(spokenName, bottle) {
  const spoken = normalizeCountName(spokenName);
  const name = normalizeCountName(bottle.name);
  if (!spoken || !name) return 0;
  if (spoken === name) return 200;
  if (spoken.includes(name) || name.includes(spoken)) return 150 + name.length;
  const spokenTokens = spoken.split(/\s+/).filter((tok) => tok.length > 1);
  const nameTokens = name.split(/\s+/).filter((tok) => tok.length > 2);
  if (spokenTokens.length === 1 && nameTokens.length) {
    const head = spokenTokens[0].replace(/['']s$/, "");
    if (name.startsWith(head) || nameTokens[0] === head || nameTokens[0].startsWith(head)) {
      return 120 + head.length;
    }
  }
  if (!nameTokens.length) return spoken.includes(name.split(" ")[0]) ? 80 : 0;
  const hits = nameTokens.filter((tok) => spoken.includes(tok)).length;
  const spokenHits = spokenTokens.filter((tok) => name.includes(tok)).length;
  const bestHits = Math.max(hits, spokenHits);
  if (bestHits < 1) return 0;
  if (spokenTokens.length <= 2 && bestHits >= 1) return 70 + bestHits * 15;
  if (bestHits < Math.ceil(nameTokens.length * 0.55)) return 0;
  return 60 + bestHits * 10;
}

function findCountBottleMatch(spokenName, stationLabel) {
  const clean = walkCleanName(spokenName);
  if (!clean || clean.length < 2) return null;
  const stationId = stationLabel ? stationIdByName(stationLabel) : null;
  let best = null;
  let bestScore = 0;
  for (const b of allBottles()) {
    if (stationId && b.stationId !== stationId) continue;
    const score = scoreCountBottleMatch(clean, b);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  if (best) return best;
  for (const b of allBottles()) {
    const score = scoreCountBottleMatch(clean, b);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return bestScore > 0 ? best : null;
}

function parseCountText(rawText) {
  const words = walkNormalizeText(rawText).split(/\s+/).map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, "")).filter(Boolean);
  const entries = [];
  let currentStation = null;
  let buf = [];
  function flushEntry(level) {
    const name = countCleanName(buf.join(" "));
    if (name && name.length > 1) entries.push({ name, station: currentStation, level: level ?? null });
    buf = [];
  }
  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushEntry(null);
      currentStation = st.label;
      i += st.consumed;
      continue;
    }
    const lv = countLevelAt(words, i);
    if (lv) {
      flushEntry(lv.level);
      i += lv.consumed;
      continue;
    }
    buf.push(words[i]);
    i += 1;
  }
  if (buf.length) flushEntry(null);
  return entries;
}

function reconcileCountToMap(parsedEntries) {
  const matched = [];
  const notInCount = [];
  const surprises = [];
  const mapUsed = new Map();
  for (const entry of parsedEntries) {
    if (entry.level === null) {
      surprises.push({ entry, reason: "no_level" });
      continue;
    }
    const hit = findCountBottleMatch(entry.name, entry.station);
    if (!hit) {
      surprises.push({ entry, reason: "not_on_map" });
      continue;
    }
    const key = `${hit.stationId}:${hit.id}`;
    if (mapUsed.has(key)) {
      surprises.push({ entry, reason: "extra_on_shelf", similarTo: hit });
      continue;
    }
    mapUsed.set(key, entry.level);
    matched.push({ entry, bottle: hit, level: entry.level });
  }
  for (const b of allBottles()) {
    const key = `${b.stationId}:${b.id}`;
    if (!mapUsed.has(key)) notInCount.push({ bottle: b });
  }
  return { matched, notInCount, surprises };
}

const text = process.argv[2] || "";
const parsed = parseCountText(text);
const report = reconcileCountToMap(parsed);

console.log("=== PARSED ENTRIES:", parsed.length, "===");
const byStation = {};
for (const e of parsed) {
  const k = e.station || "(no station)";
  if (!byStation[k]) byStation[k] = [];
  byStation[k].push(e);
}
for (const [st, entries] of Object.entries(byStation)) {
  console.log(`\n${st} (${entries.length} heard)`);
  for (const e of entries) console.log(`  "${e.name}" → ${e.level ?? "?"}`);
}

console.log("\n=== RECONCILE SUMMARY ===");
console.log(`Matched: ${report.matched.length}`);
console.log(`Surprises: ${report.surprises.length}`);
console.log(`On map, not counted: ${report.notInCount.length}`);
console.log(`Map total: ${allBottles().length}`);

const byReason = {};
for (const s of report.surprises) {
  byReason[s.reason] = (byReason[s.reason] || 0) + 1;
}
console.log("Surprise breakdown:", byReason);

console.log("\n=== MATCHED (first 25) ===");
report.matched.slice(0, 25).forEach((m) => {
  console.log(`  ✓ ${m.bottle.stationName} | ${m.bottle.name} ← "${m.entry.name}" @ ${m.level}`);
});
if (report.matched.length > 25) console.log(`  ... +${report.matched.length - 25} more`);

console.log("\n=== SURPRISES — NOT ON MAP (first 30) ===");
report.surprises.filter((s) => s.reason === "not_on_map").slice(0, 30).forEach((s) => {
  console.log(`  ? [${s.entry.station || "?"}] "${s.entry.name}" @ ${s.entry.level}`);
});

console.log("\n=== SURPRISES — EXTRA ON SHELF ===");
report.surprises.filter((s) => s.reason === "extra_on_shelf").forEach((s) => {
  console.log(`  + "${s.entry.name}" @ ${s.entry.level} (map has one ${s.similarTo.name})`);
});

console.log("\n=== SURPRISES — NO LEVEL ===");
report.surprises.filter((s) => s.reason === "no_level").forEach((s) => {
  console.log(`  ! [${s.entry.station || "?"}] "${s.entry.name}"`);
});

console.log("\n=== MISSING FROM COUNT BY STATION (top gaps) ===");
const missBySt = {};
for (const m of report.notInCount) {
  missBySt[m.bottle.stationName] = (missBySt[m.bottle.stationName] || 0) + 1;
}
Object.entries(missBySt).sort((a, b) => b[1] - a[1]).forEach(([st, n]) => console.log(`  ${st}: ${n} not counted`));