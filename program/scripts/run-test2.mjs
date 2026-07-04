#!/usr/bin/env node
/**
 * Test 2 — Multi-bar, wine wall, expanded back bar, mis-order dictation
 * Bar A: Main Dining (84 bottles) | Bar B: Patio (12 bottles)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(__dir, "../data/test2-report.json");

const WELL_ROLES = ["primary", "service", "point", "patio", "secondary", "rear", "front", "large", "small"];
const WALK_WORD_NUMS = { one: "1", two: "2", too: "2", to: "2", three: "3", four: "4", for: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
const COUNT_LEVEL_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, full: 1, zero: 0, none: 0, out: 0, half: 0.5 };
const CASE_QTY_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const COUNT_MATCH_MIN_SCORE = 85;

function mkStation(name, type, order) {
  return { id: `st_${order}`, name, type, order, bottles: [] };
}

const BAR_MAIN = {
  name: "Main Dining",
  stations: [
    mkStation("Well 1 Primary", "well", 0),
    mkStation("Well 2 Primary", "well", 1),
    mkStation("Well 3 Service", "well", 2),
    mkStation("Well 4 Point", "well", 3),
    mkStation("Speed Rail", "well", 4),
    mkStation("Back Bar Main", "back-bar", 5),
    mkStation("Back Bar Top Shelf", "back-bar", 6),
    mkStation("Wine Wall", "walk-in", 7),
    mkStation("Beer Cooler", "walk-in", 8),
    mkStation("Liquor Room", "storage", 9),
  ],
  expectedCount: 86, // 84 planned + 2 merged-line artifacts (Spicy Tequila, extra Patron Silver)
};

const BAR_PATIO = {
  name: "Patio",
  stations: [mkStation("Well 1 Patio", "well", 0), mkStation("Patio Cooler", "walk-in", 1)],
  expectedCount: 12,
};

const WALK_MAIN = `
Wine wall. Caymus Cabernet 750. Decoy Pinot Noir 750. Kendall Jackson Chardonnay 750. La Marca Prosecco 750. Oyster Bay Sauvignon Blanc 750. Meomi Pinot Noir 750. Josh Cellars Cabernet 750. Apothic Red 750. Bogle Merlot 750. Coppola Pinot Grigio 750. Nobilo Sauvignon Blanc 750. Matua Sauvignon Blanc 750.
Well three service row one. Tito's 750. Ketel One 750. Grey Goose 750. Absolut 750. Stoli 750. Smirnoff 750. Skyy 750.
Well one primary row one. Tanqueray 750. Bombay Sapphire 750. Hendricks 750. Beefeater 750. Seagrams Gin 750. Plymouth Gin 750. New Amsterdam 750. Svedka 750.
Well four point. Patron Silver 750. Espolon Blanco leader. Hornitos 750. Casamigos 750. Don Julio 750. Jose Cuervo 750.
Speed rail. Well Vodka 750. Well Gin 750. Well Rum 750. Well Tequila 750. Well Whiskey 750.
Well two primary. Bacardi 750. Captain Morgan 750. Malibu 750. Myers Dark 750. Kraken 750. Appleton 750. Don Q 750. Mount Gay 750.
Back bar main. Jack Daniels 750. Jameson 750. Makers Mark 750. Bulleit Bourbon 750. Woodford 750. Buffalo Trace 750. Four Roses 750. Wild Turkey 750. Knob Creek 750. Elijah Craig 750. Rittenhouse Rye 750. Michters Bourbon 750. Basil Haydens 750. Old Forester 750. Eagle Rare 750.
Back bar top shelf. Macallan 12 750. Glenfiddich 750. Glenlivet 750. Johnnie Walker Black 750. Crown Royal 750. Bulleit Rye 750. Angels Envy 750. Blantons 750.
Beer cooler. Corona 12oz. Modelo 12oz. Heineken 12oz. Miller Lite 12oz. Coors Light 12oz. Bud Light 12oz. Stella 12oz. White Claw 12oz.
Liquor room. Case of Tito's 750 six bottles. Case of Ketel One 750 eight bottles. Case of Macallan 12 750 six bottles. Spare Grey Goose 750. Spare Patron 750. Spare Buffalo Trace 750. Spare Jameson 750.
Two bottles spicy tequila 750 Patron Silver 750.
`.trim();

const WALK_PATIO = `
Patio cooler. Corona 12oz. Modelo 12oz. Pacifico 12oz. Dos Equis 12oz. Heineken 12oz. Bud Light 12oz.
Well one patio. Tito's 750. Bacardi 750. Patron Silver 750. Corona Beer 750. Modelo Beer 750. Hendricks 750.
`.trim();

// Golden count — every bottle, all stations
const COUNT_MAIN_GOLDEN = `
Wine wall. Caymus one. Decoy one. Kendall Jackson one. La Marca one. Oyster Bay one. Meomi one. Josh Cellars one. Apothic one. Bogle one. Coppola one. Nobilo one. Matua one.
Well three service. Tito's one. Ketel One point five. Grey Goose one. Absolut one. Stoli one. Smirnoff one. Skyy one.
Well one primary. Tanqueray one. Bombay Sapphire one. Hendricks one. Beefeater one. Seagrams Gin one. Plymouth Gin one. New Amsterdam one. Svedka one.
Well four point. Patron Silver one. Espolon Blanco one. Hornitos one. Casamigos one. Don Julio one. Jose Cuervo one.
Speed rail. Well Vodka one. Well Gin one. Well Rum one. Well Tequila one. Well Whiskey one.
Well two primary. Bacardi one. Captain Morgan one. Malibu one. Myers Dark one. Kraken one. Appleton one. Don Q one. Mount Gay one.
Back bar main. Jack Daniels one. Jameson one. Makers Mark one. Bulleit Bourbon one. Woodford one. Buffalo Trace one. Four Roses one. Wild Turkey one. Knob Creek one. Elijah Craig one. Rittenhouse Rye one. Michters Bourbon one. Basil Haydens one. Old Forester one. Eagle Rare one.
Back bar top shelf. Macallan 12 one. Glenfiddich one. Glenlivet one. Johnnie Walker Black one. Crown Royal one. Bulleit Rye one. Angels Envy one. Blantons one.
Beer cooler. Corona one. Modelo one. Heineken one. Miller Lite one. Coors Light one. Bud Light one. Stella one. White Claw one.
Liquor room. Spicy Tequila one. Patron Silver one. Tito's case six full. Ketel One case eight full. Macallan case six full. Grey Goose spare one. Patron spare one. Buffalo Trace spare one. Jameson spare one.
`.trim();

const COUNT_MAIN_HARD = COUNT_MAIN_GOLDEN.replace(
  "Beefeater one.",
  ""
).replace(
  "Eagle Rare one.",
  ""
) + "\nSpeed rail. Campari one.";

const COUNT_PATIO_GOLDEN = `
Well one patio. Tito's one. Bacardi one. Patron Silver one. Corona Beer one. Modelo Beer one. Hendricks one.
Patio cooler. Corona one. Modelo one. Pacifico one. Dos Equis one. Heineken one. Bud Light one.
`.trim();

// ── Parsers (synced with osb-app.js) ───────────────────────────────────────

function walkNormalizeText(text) {
  let t = " " + String(text).replace(/\r/g, "\n") + " ";
  t = t.toLowerCase().replace(/\bleader\b/g, "liter").replace(/\blitre\b/g, "liter").replace(/\bseven\s+fifty\b/g, "750");
  t = t.replace(/\brow\s+(\d)\/(\d)\b/g, "row $1").replace(/\b(\d)\/(\d+)\b/g, " $1/$2 ");
  return t;
}

const WALK_SIZE_PATTERNS = [
  [/^1\.75\s*l?$/, "1.75L"], [/^handle$/, "1.75L"], [/^24\s*oz$/, "24oz"], [/^16\s*oz$/, "16oz"], [/^12\s*oz$/, "12oz"], [/^12oz$/, "12oz"],
  [/^750(?:ml)?$/, "750ml"], [/^375(?:ml)?$/, "375ml"], [/^liter$/, "1L"], [/^1l$/, "1L"],
];

function walkSizeOf(token) {
  const t = token.replace(/[.,;:!?]+$/, "");
  for (const [re, sz] of WALK_SIZE_PATTERNS) if (re.test(t)) return sz;
  return null;
}

const WALK_STATION_RES = [
  /^(well)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})(\s+(primary|secondary|service|point|patio|rear|front|large|small))?(\s+(row|bro)\s+(one|two|too|three|four|five|\d{1,2}))?(\s+(top|bottom|back|front)\s+(left|right|center)(\s+corner)?)?/,
  /^(row|bro)\s+(one|two|too|three|four|five|six|seven|\d{1,2})/,
  /^(next)\s+(row|shelf)/,
  /^(wine)\s+(wall|cooler|rack|cellar)/,
  /^(back\s+bar)(\s+(main|top\s+shelf|shelf|wall|point|service))?/,
  /^(patio)\s+cooler/,
  /^(beer)\s+cooler/,
  /^(speed\s*rail|rail)\b/,
  /^(cooler|walk[\s-]?in|liquor\s+room|store\s*room|storage)\b/,
];

function walkTitleCase(s) {
  return s.replace(/(^|[\s-])(\S)/g, (m, pre, c) => pre + c.toUpperCase());
}

const WALK_STATION_WORD_NUMS = {
  one: 1, two: 2, too: 2, to: 2, three: 3, four: 4, for: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function normalizeWalkStationLabel(label) {
  if (!label) return label;
  const parts = label.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "well") return label;
  const numRaw = parts[1];
  const numWord = WALK_STATION_WORD_NUMS[numRaw?.toLowerCase?.() ?? numRaw];
  const num = numWord ?? (/^\d+$/.test(String(numRaw)) ? parseInt(numRaw, 10) : null);
  if (!num) return label;
  let role = "Primary";
  for (let i = 2; i < parts.length; i++) {
    const low = parts[i].toLowerCase();
    if (low === "row" || low === "bro") break;
    if (WELL_ROLES.includes(low)) {
      role = low.charAt(0).toUpperCase() + low.slice(1);
      break;
    }
  }
  return `Well ${num} ${role}`;
}

function wellsByOrder(stations) {
  return stations.filter((s) => s.type === "well");
}

function parseWalkStationIntent(label) {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  const wellM = lower.match(
    /^well\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})\b(?:\s+(\w+))?/
  );
  if (wellM) {
    const idx = WALK_STATION_WORD_NUMS[wellM[1]] ?? parseInt(wellM[1], 10);
    let role = null;
    const tail = lower.slice(wellM[0].length).trim();
    const roleInTail = tail.match(/^(primary|secondary|service|point|patio|rear|front|large|small)\b/);
    if (roleInTail) role = roleInTail[1];
    else if (wellM[2] && WELL_ROLES.includes(wellM[2])) role = wellM[2];
    return { kind: "well", wellIndex: idx, role };
  }
  if (/^back\s+bar/.test(lower)) {
    const qual = lower.replace(/^back\s+bar\s*/, "").split(/\s+/).filter((w) => w !== "row")[0] || "";
    return { kind: "back-bar", qualifier: qual };
  }
  if (/beer\s+cooler/.test(lower)) return { kind: "beer-cooler" };
  if (/patio\s+cooler/.test(lower)) return { kind: "patio-cooler" };
  if (/wine\s+(wall|cooler|rack|cellar)/.test(lower)) return { kind: "wine" };
  if (/liquor\s+room/.test(lower)) return { kind: "liquor-room" };
  if (/speed\s*rail|\brail\b/.test(lower)) return { kind: "speed-rail" };
  return { kind: "unknown" };
}

function resolveWalkStation(label, stations) {
  if (!label) return null;
  const ordered = [...stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const normLabel = normalizeWalkStationLabel(label).toLowerCase();
  const key = label.trim().toLowerCase();
  const exactNorm = ordered.find((s) => normalizeWalkStationLabel(s.name).toLowerCase() === normLabel);
  if (exactNorm) return exactNorm;
  const exactName = ordered.find((s) => s.name.toLowerCase() === key);
  if (exactName) return exactName;
  const intent = parseWalkStationIntent(label);
  if (!intent) return null;
  if (intent.kind === "well" && intent.wellIndex) {
    if (intent.role) {
      const roleTarget = `well ${intent.wellIndex} ${intent.role}`;
      const byRole = ordered.find((s) => {
        const sn = normalizeWalkStationLabel(s.name).toLowerCase();
        return sn === roleTarget || sn.startsWith(`${roleTarget} `);
      });
      if (byRole) return byRole;
    }
    return wellsByOrder(ordered)[intent.wellIndex - 1] ?? null;
  }
  if (intent.kind === "back-bar") {
    const backBars = ordered.filter((s) => s.type === "back-bar");
    if (!backBars.length) return null;
    const qual = (intent.qualifier || "").toLowerCase();
    if (qual) {
      const match = backBars.find((s) => {
        const n = s.name.toLowerCase();
        if (qual === "main" && n.includes("main")) return true;
        if ((qual === "top" || qual === "shelf") && (n.includes("top") || n.includes("shelf"))) return true;
        return n.includes(qual);
      });
      if (match) return match;
    }
    return backBars[0];
  }
  if (intent.kind === "beer-cooler") {
    return ordered.find((s) => s.type === "walk-in" && /beer|cooler/i.test(s.name) && !/wine|patio/i.test(s.name));
  }
  if (intent.kind === "patio-cooler") {
    return ordered.find((s) => /patio/i.test(s.name) && /cooler/i.test(s.name));
  }
  if (intent.kind === "wine") {
    return ordered.find((s) => s.type === "walk-in" && /wine/i.test(s.name));
  }
  if (intent.kind === "liquor-room") {
    return ordered.find((s) => s.type === "storage" || /liquor\s*room/i.test(s.name));
  }
  if (intent.kind === "speed-rail") {
    return ordered.find((s) => /speed|rail/i.test(s.name));
  }
  return null;
}

function walkMatchStation(words, i) {
  const windowText = words.slice(i, i + 12).join(" ");
  for (let ri = 0; ri < WALK_STATION_RES.length; ri++) {
    const re = WALK_STATION_RES[ri];
    const m = windowText.match(re);
    if (m && windowText.startsWith(m[0])) {
      let label = m[0].trim().split(/\s+/).map((w) => (w === "bro" ? "row" : (WALK_WORD_NUMS[w] ?? w))).join(" ");
      if (ri === 3) label = "Wine Wall";
      else if (ri === 5) label = "Patio Cooler";
      else if (ri === 7) label = "Speed Rail";
      else label = normalizeWalkStationLabel(walkTitleCase(label));
      return { label, consumed: m[0].trim().split(/\s+/).length };
    }
  }
  return null;
}

function walkMatchQuantity(words, i) {
  const w = words[i];
  const next = (words[i + 1] || "").replace(/[.,]/g, "");
  const num = WALK_WORD_NUMS[w] ?? (/^\d{1,2}$/.test(w) ? w : null);
  if (num && (next === "bottles" || next === "bottle")) return { qty: parseInt(num, 10), consumed: 2 };
  return null;
}

function walkCleanName(s) {
  return s.replace(/\b(the|a|an|of|and)\b/g, " ").replace(/[.,]+/g, " ").replace(/\s+/g, " ").trim();
}

function countCleanName(s) {
  return walkCleanName(s).replace(/^(?:bottle|bottles)\s+/i, "").replace(/\s+(?:bottle|bottles)$/i, "").trim();
}

function normalizeCaseCountEntry(rawName, level) {
  const lower = (rawName || "").toLowerCase().trim();
  const mQty = lower.match(/^(.+?)\s+case\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})$/);
  if (mQty) {
    const qty = CASE_QTY_WORDS[mQty[2]] ?? parseInt(mQty[2], 10);
    return { name: `Case ${walkTitleCase(walkCleanName(mQty[1]))}`, level: qty || level };
  }
  const mCase = lower.match(/^(.+?)\s+case$/);
  if (mCase) return { name: `Case ${walkTitleCase(walkCleanName(mCase[1]))}`, level };
  return { name: rawName, level };
}

function parseWalkText(rawText) {
  const words = walkNormalizeText(rawText).split(/\s+/).map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, "")).filter(Boolean);
  const entries = [];
  const stationsSeen = [];
  let currentStation = null;
  let buf = [];
  let qty = 1;

  function mkEntry(name, size, sizeVerified, flags = []) {
    return { name: walkTitleCase(name), size, size_verified: sizeVerified, station: currentStation, qty, raw_heard: name, flags };
  }

  function flushUnsized() {
    const name = walkCleanName(buf.join(" "));
    if (name && name.length > 1) {
      const isBeerStation = /beer\s+cooler/i.test(currentStation || "");
      const defaultSize = isBeerStation ? "12oz" : "750ml";
      entries.push(mkEntry(name, defaultSize, false, ["no size heard"]));
    }
    buf = [];
    qty = 1;
  }

  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushUnsized();
      currentStation = st.label;
      if (!stationsSeen.includes(st.label)) stationsSeen.push(st.label);
      i += st.consumed;
      continue;
    }
    const q = walkMatchQuantity(words, i);
    if (q) {
      qty = q.qty;
      i += q.consumed;
      continue;
    }
    const size = walkSizeOf(words[i]);
    if (size) {
      const name = walkCleanName(buf.join(" "));
      if (name) {
        const entry = mkEntry(name, size, true, []);
        const after = words.slice(i + 1);
        const packQty = after.length >= 2 ? walkMatchQuantity(after, 0) : null;
        if (packQty && packQty.qty >= 2 && packQty.qty <= 24) {
          entry.qty = packQty.qty;
          i += 1 + packQty.consumed;
        } else i += 1;
        entries.push(entry);
      } else i += 1;
      buf = [];
      qty = 1;
      continue;
    }
    buf.push(words[i]);
    i += 1;
  }
  if (buf.length) flushUnsized();
  return { entries, stations: stationsSeen };
}

function countLevelOf(token) {
  const t = (token || "").replace(/[.,;:!?]+$/, "").toLowerCase();
  if (!t) return null;
  if (t === "half" || t === "0.5" || t === ".5") return 0.5;
  if (COUNT_LEVEL_WORDS[t] !== undefined) {
    const v = COUNT_LEVEL_WORDS[t];
    if (v > 2) return null;
    return v;
  }
  const num = t.match(/^(\d+(?:\.\d+)?)$/);
  if (num) {
    const v = parseFloat(num[1]);
    if (v > 2) return null;
    return Math.min(2, v);
  }
  return null;
}

function countMatchQuantity(words, i) {
  const w = words[i];
  const next = (words[i + 1] || "").replace(/[.,]/g, "");
  const num = CASE_QTY_WORDS[w] ?? (/^\d{1,2}$/.test(w) ? parseInt(w, 10) : null);
  if (num && num <= 12 && (next === "bottles" || next === "bottle")) return { qty: num, consumed: 2 };
  return null;
}

function countLevelAt(words, i) {
  const w = words[i]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  const w2 = words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  if (w === "point" && w2) return { level: parseInt(w2, 10) / 10, consumed: 2 };
  const single = countLevelOf(w);
  if (single !== null) return { level: single, consumed: 1 };
  return null;
}

function normalizeCountName(s) {
  return (s || "").toLowerCase().replace(/[''`´]/g, "'").trim();
}

function parseCountText(rawText) {
  const words = walkNormalizeText(rawText).split(/\s+/).map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, "")).filter(Boolean);
  const entries = [];
  let currentStation = null;
  let buf = [];
  let pendingQty = 1;
  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) entries.push({ name: countCleanName(buf.join(" ")), station: currentStation, level: null });
      currentStation = st.label;
      pendingQty = 1;
      buf = [];
      i += st.consumed;
      continue;
    }
    const q = countMatchQuantity(words, i);
    if (q) {
      pendingQty = q.qty;
      i += q.consumed;
      continue;
    }
    const w = words[i];
    const isOneInName = w === "one" && buf.length >= 1 && words[i + 1] && !walkMatchStation(words, i + 1) && countLevelOf(words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase()) === null;
    if (isOneInName) {
      buf.push(words[i]);
      i += 1;
      continue;
    }
    const lv = countLevelAt(words, i);
    if (lv) {
      let name = countCleanName(buf.join(" "));
      if (name && name.length > 1) {
        let level = lv.level;
        if (/\bcase\b/i.test(name)) {
          const n = normalizeCaseCountEntry(name, level);
          name = n.name;
          level = n.level;
        } else if (/\bspare\b/i.test(name)) {
          const spareM = name.match(/^(.+?)\s+spare$/i);
          if (spareM) name = `Spare ${walkTitleCase(walkCleanName(spareM[1]))}`;
        }
        const isCase = /\bcase\b/i.test(name);
        const copies = isCase ? 1 : Math.max(1, Math.min(pendingQty, 12));
        if (isCase && pendingQty > 1 && level === 1) level = pendingQty;
        for (let c = 0; c < copies; c++) entries.push({ name, station: currentStation, level });
      }
      buf = [];
      pendingQty = 1;
      i += lv.consumed;
      continue;
    }
    buf.push(words[i]);
    i += 1;
  }
  return entries;
}

function scoreCountBottleMatch(spokenName, bottle) {
  const spoken = normalizeCountName(spokenName);
  const name = normalizeCountName(bottle.name);
  if (!spoken || !name) return 0;
  if (/\bcase\b/.test(spoken) && !/\bcase\b/.test(name)) return 0;
  if (/\bspare\b/.test(spoken) && !/\bspare\b/.test(name)) return 0;
  if (!/\bcase\b/.test(spoken) && /\bcase\b/.test(name)) return 0;
  if (spoken === name) return 200;
  const spokenTokens = spoken.split(/\s+/).filter((t) => t.length > 2);
  if (spokenTokens.length >= 2 && spokenTokens.every((t) => name.includes(t))) return 130 + spokenTokens.length * 12;
  if (spoken.includes(name) || name.includes(spoken)) return 150 + name.length;
  const hits = name.split(/\s+/).filter((t) => t.length > 2 && spoken.includes(t)).length;
  if (hits < 1) return 0;
  return 60 + hits * 10;
}

// ── Bar test runner ──────────────────────────────────────────────────────────

function runBarTest(groundTruth, walkText, countGolden, countHard) {
  const bar = { ...groundTruth, stations: groundTruth.stations.map((s) => ({ ...s, bottles: [] })) };

  function sortedStations() {
    return [...bar.stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function stationIdByName(name) {
    const key = (name || "").trim().toLowerCase();
    if (!key) return null;
    const resolved = resolveWalkStation(name, bar.stations);
    if (resolved) return resolved.id;
    const normalized = normalizeWalkStationLabel(name).toLowerCase();
    const exact = sortedStations().find((s) => s.name.toLowerCase() === key || s.name.toLowerCase() === normalized);
    if (exact) return exact.id;
    const norm = key.replace(/[^a-z0-9]/g, "");
    if (norm.length < 4) return null;
    const fuzzy = sortedStations().find((s) => {
      const sk = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const sn = normalizeWalkStationLabel(s.name).toLowerCase().replace(/[^a-z0-9]/g, "");
      return sk === norm || sn === norm;
    });
    return fuzzy?.id ?? null;
  }

  function stationIdsInCountScope(stationLabel) {
    const ids = new Set();
    const normalized = normalizeWalkStationLabel(stationLabel);
    for (const s of sortedStations()) {
      if (normalizeWalkStationLabel(s.name) === normalized) ids.add(s.id);
      if (s.name.toLowerCase() === (stationLabel || "").trim().toLowerCase()) ids.add(s.id);
    }
    const direct = stationIdByName(stationLabel);
    if (direct) ids.add(direct);
    return [...ids];
  }

  function walkFindOrCreateStation(label) {
    if (!label) return sortedStations()[0] ?? null;
    const resolved = resolveWalkStation(label, bar.stations);
    if (resolved) return resolved;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key.length >= 4) {
      const exact = bar.stations.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === key);
      if (exact) return exact;
    }
    const intent = parseWalkStationIntent(label);
    let type = "well";
    if (intent?.kind === "back-bar") type = "back-bar";
    else if (intent?.kind === "beer-cooler" || intent?.kind === "patio-cooler" || intent?.kind === "wine") type = "walk-in";
    else if (intent?.kind === "liquor-room") type = "storage";
    const found = { id: `st_auto_${bar.stations.length}`, name: label, type, order: bar.stations.length, bottles: [] };
    bar.stations.push(found);
    return found;
  }

  function applyWalk(entries) {
    let added = 0;
    for (const e of entries) {
      const station = walkFindOrCreateStation(e.station);
      if (!station.bottles) station.bottles = [];
      const par = Math.max(1, Math.min(e.qty || 1, 48));
      station.bottles.push({
        id: `b_${station.id}_${station.bottles.length}`,
        name: e.name,
        size: e.size,
        size_verified: e.size_verified,
        par_level: par,
        parse_flags: e.flags || [],
      });
      added += 1;
    }
    return added;
  }

  function allBottles() {
    return sortedStations().flatMap((s) => (s.bottles || []).map((b) => ({ ...b, stationId: s.id, stationName: s.name })));
  }

  function findCountBottleMatchScored(spokenName, stationLabel) {
    const clean = walkCleanName(spokenName);
    if (!clean || clean.length < 2) return null;
    const stationId = stationLabel ? stationIdByName(stationLabel) : null;
    let best = null, bestScore = 0, bestInStation = null, bestInStationScore = 0;
    for (const b of allBottles()) {
      const score = scoreCountBottleMatch(clean, b);
      if (stationId && b.stationId === stationId && score > bestInStationScore) {
        bestInStationScore = score;
        bestInStation = b;
      }
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (bestInStation && bestInStationScore >= COUNT_MATCH_MIN_SCORE) return { bottle: bestInStation, inStation: true };
    if (best && bestScore >= COUNT_MATCH_MIN_SCORE) return { bottle: best, inStation: false };
    return null;
  }

  function reconcileCountToMap(parsedEntries) {
    const matched = [];
    const notInCount = [];
    const surprises = [];
    const mapUsed = new Map();
    const countedStationIds = new Set();
    for (const entry of parsedEntries) {
      if (entry.station) for (const sid of stationIdsInCountScope(entry.station)) countedStationIds.add(sid);
      if (entry.level === null) {
        surprises.push({ entry, reason: "no_level" });
        continue;
      }
      const scored = findCountBottleMatchScored(entry.name, entry.station);
      if (!scored) {
        surprises.push({ entry, reason: "not_on_map" });
        continue;
      }
      const hit = scored.bottle;
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
      if (mapUsed.has(key)) continue;
      if (countedStationIds.size && !countedStationIds.has(b.stationId)) continue;
      notInCount.push({ bottle: b });
    }
    return { matched, notInCount, surprises, hasIssues: surprises.length > 0 || notInCount.length > 0 };
  }

  const walkResult = parseWalkText(walkText);
  const applied = applyWalk(walkResult.entries);
  const autoStations = bar.stations.filter((s) => !groundTruth.stations.find((g) => g.name === s.name));
  const walkIssues = [];
  if (applied < groundTruth.expectedCount - 2) walkIssues.push({ code: "WALK_UNDERCOUNT", detail: `${applied} vs ${groundTruth.expectedCount} expected` });
  if (applied > groundTruth.expectedCount + 2) walkIssues.push({ code: "WALK_OVERCOUNT", detail: `${applied} vs ${groundTruth.expectedCount} expected` });
  if (autoStations.length) walkIssues.push({ code: "AUTO_STATION", detail: autoStations.map((s) => s.name).join(", ") });
  const unsized = walkResult.entries.filter((e) => !e.size_verified);
  if (unsized.length) walkIssues.push({ code: "UNSIZED", detail: unsized.map((e) => e.name).join(", ") });
  const merged = walkResult.entries.filter((e) => /spicy tequila/i.test(e.name));
  if (merged.length) walkIssues.push({ code: "MERGED_LINE", detail: merged.map((e) => `${e.name} @ ${e.station}`).join("; ") });

  const goldenParsed = parseCountText(countGolden);
  const goldenReport = reconcileCountToMap(goldenParsed);
  const hardParsed = countHard ? parseCountText(countHard) : null;
  const hardReport = hardParsed ? reconcileCountToMap(hardParsed) : null;

  return {
    bar: groundTruth.name,
    pass1: {
      stations_heard: walkResult.stations,
      entries: walkResult.entries.length,
      applied,
      expected: groundTruth.expectedCount,
      issues: walkIssues,
      by_station: Object.fromEntries(
        walkResult.stations.map((st) => [st, walkResult.entries.filter((e) => e.station === st).length])
      ),
    },
    pass2_golden: {
      parsed: goldenParsed.length,
      matched: goldenReport.matched.length,
      surprises: goldenReport.surprises.length,
      missing: goldenReport.notInCount.length,
      golden: !goldenReport.hasIssues,
      surprise_items: goldenReport.surprises.map((s) => ({ reason: s.reason, heard: s.entry.name, station: s.entry.station })),
      missing_items: goldenReport.notInCount.map((m) => `${m.bottle.stationName}: ${m.bottle.name}`),
    },
    pass2_hard: hardReport
      ? {
          parsed: hardParsed.length,
          matched: hardReport.matched.length,
          surprises: hardReport.surprises.length,
          missing: hardReport.notInCount.length,
          golden: !hardReport.hasIssues,
          surprise_items: hardReport.surprises.map((s) => ({ reason: s.reason, heard: s.entry.name, station: s.entry.station })),
          missing_items: hardReport.notInCount.map((m) => `${m.bottle.stationName}: ${m.bottle.name}`),
        }
      : null,
  };
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log("=".repeat(72));
console.log("TEST 2 — Multi-Bar, Wine Wall, Mis-Order Dictation, Golden + Hard Count");
console.log("=".repeat(72));

const mainResult = runBarTest(BAR_MAIN, WALK_MAIN, COUNT_MAIN_GOLDEN, COUNT_MAIN_HARD);
const patioResult = runBarTest(BAR_PATIO, WALK_PATIO, COUNT_PATIO_GOLDEN, null);

function printBar(r) {
  console.log(`\n### ${r.bar}`);
  console.log("── Pass 1 Walk ──");
  console.log(`  Stations: ${r.pass1.stations_heard.join(" | ")}`);
  console.log(`  Bottles: ${r.pass1.applied} / ${r.pass1.expected} expected`);
  for (const [st, n] of Object.entries(r.pass1.by_station)) console.log(`    ${st}: ${n}`);
  console.log(`  Walk issues (${r.pass1.issues.length}):`);
  r.pass1.issues.forEach((i) => console.log(`    [${i.code}] ${i.detail}`));
  console.log("── Pass 2 Golden Count ──");
  console.log(`  Matched: ${r.pass2_golden.matched} | Missing: ${r.pass2_golden.missing} | Surprises: ${r.pass2_golden.surprises}`);
  console.log(`  GOLDEN: ${r.pass2_golden.golden ? "YES ✓" : "NO"}`);
  if (!r.pass2_golden.golden) {
    if (r.pass2_golden.missing_items.length) console.log(`  Missing: ${r.pass2_golden.missing_items.slice(0, 8).join("; ")}`);
    if (r.pass2_golden.surprise_items.length) console.log(`  Surprises: ${JSON.stringify(r.pass2_golden.surprise_items.slice(0, 5))}`);
  }
  if (r.pass2_hard) {
    console.log("── Pass 2 Hard Count ──");
    console.log(`  Matched: ${r.pass2_hard.matched} | Missing: ${r.pass2_hard.missing} | Surprises: ${r.pass2_hard.surprises}`);
    console.log(`  GOLDEN: ${r.pass2_hard.golden ? "YES" : "NO (expected)"}`);
    if (r.pass2_hard.surprise_items.length) console.log(`  Surprises: ${r.pass2_hard.surprise_items.map((s) => s.heard).join(", ")}`);
  }
}

printBar(mainResult);
printBar(patioResult);

const report = {
  test: "test2",
  timestamp: new Date().toISOString(),
  main: mainResult,
  patio: patioResult,
  summary: {
    main_walk_ok: mainResult.pass1.issues.filter((i) => i.code === "WALK_UNDERCOUNT" || i.code === "AUTO_STATION").length === 0,
    main_golden: mainResult.pass2_golden.golden,
    patio_walk_ok: patioResult.pass1.issues.filter((i) => i.code === "WALK_UNDERCOUNT" || i.code === "AUTO_STATION").length === 0,
    patio_golden: patioResult.pass2_golden.golden,
  },
};

try {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
} catch {
  fs.writeFileSync(path.join(__dir, "test2-report.json"), JSON.stringify(report, null, 2));
  console.log("\nReport: scripts/test2-report.json");
}