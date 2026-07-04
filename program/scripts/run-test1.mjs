#!/usr/bin/env node
/**
 * Test 1 — One bar, 3 wells (2 rows each), back bar, cooler, liquor room cases
 * Full Pass 1 walk parse + Pass 2 count reconcile against ground truth.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PROGRAM = path.join(__dir, "..");
const REPORT_PATH = path.join(PROGRAM, "data", "test1-report.json");

// ── Ground truth bar ─────────────────────────────────────────────────────────

const BAR_NAME = "Test Bar One";

function mkStation(name, type, order) {
  return { id: `st_${order}_${name.replace(/\W+/g, "").slice(0, 8)}`, name, type, order, bottles: [] };
}

const GROUND_TRUTH = {
  name: BAR_NAME,
  stations: [
    mkStation("Well 1 Primary", "well", 0),
    mkStation("Well 2 Primary", "well", 1),
    mkStation("Well 3 Primary", "well", 2),
    mkStation("Back Bar Shelf", "back-bar", 3),
    mkStation("Beer Cooler", "walk-in", 4),
    mkStation("Liquor Room", "storage", 5),
  ],
  expectedBottles: {
    "Well 1 Primary": [
      ["Tito's", "750ml"], ["Ketel One", "750ml"], ["Grey Goose", "750ml"], ["Absolut", "750ml"], ["Stoli", "750ml"], ["Smirnoff", "750ml"],
      ["Tanqueray", "750ml"], ["Bombay Sapphire", "750ml"], ["Hendricks", "750ml"], ["Beefeater", "750ml"], ["Seagrams Gin", "750ml"],
    ],
    "Well 2 Primary": [
      ["Bacardi", "750ml"], ["Captain Morgan", "750ml"], ["Malibu", "750ml"], ["Myers Dark", "750ml"], ["Kraken", "750ml"], ["Appleton", "750ml"],
      ["Don Q", "750ml"], ["Plantation", "750ml"], ["Flor de Cana", "750ml"], ["Mount Gay", "750ml"], ["Pyrat", "750ml"],
    ],
    "Well 3 Primary": [
      ["Patron Silver", "750ml"], ["Espolon Blanco", "1L"], ["Hornitos", "750ml"], ["Casamigos", "750ml"], ["Don Julio Blanco", "750ml"], ["Jose Cuervo", "750ml"],
      ["Herradura", "750ml"], ["Milagro", "750ml"], ["Corralejo", "750ml"], ["1800 Silver", "750ml"], ["El Jimador", "750ml"],
    ],
    "Back Bar Shelf": [
      ["Jack Daniels", "750ml"], ["Jameson", "750ml"], ["Makers Mark", "750ml"], ["Bulleit Bourbon", "750ml"],
      ["Woodford", "750ml"], ["Buffalo Trace", "750ml"], ["Four Roses", "750ml"], ["Wild Turkey", "750ml"],
    ],
    "Beer Cooler": [
      ["Corona", "12oz"], ["Modelo", "12oz"], ["Heineken", "12oz"], ["Miller Lite", "12oz"], ["Coors Light", "12oz"],
    ],
    "Liquor Room": [
      ["Tito's Case", "750ml", 6], ["Ketel One Case", "750ml", 8], ["Bacardi Case", "750ml", 6],
      ["Patron Silver Spare", "750ml", 1], ["Grey Goose Spare", "750ml", 1],
    ],
  },
};

// ── Walk dictation (messy, realistic) ──────────────────────────────────────

const WALK_DICTATION = `
Well one primary row one. Tito's 750. Ketel One 750. Grey Goose 750. Absolut 750. Stoli 750. Smirnoff 750.
Well one row two. Tanqueray 750. Bombay Sapphire 750. Hendricks 750. Beefeater 750. Seagrams Gin 750.
Well two primary row one. Bacardi 750. Captain Morgan 750. Malibu 750. Myers Dark 750. Kraken 750. Appleton 750.
Well two row two. Don Q 750. Plantation 750. Flor de Cana 750. Mount Gay 750. Pyrat 750.
Well three primary row one. Patron Silver 750. Espolon Blanco liter. Hornitos 750. Casamigos 750. Don Julio Blanco 750. Jose Cuervo 750.
Well three row two. Herradura Reposado 750. Milagro 750. Corralejo 750. 1800 Silver 750. El Jimador 750.
Back bar shelf. Jack Daniels 750. Jameson 750. Makers Mark 750. Bulleit Bourbon 750. Woodford 750. Buffalo Trace 750. Four Roses 750. Wild Turkey 750.
Beer cooler. Corona 12oz. Modelo 12oz. Heineken 12oz. Miller Lite 12oz. Coors Light 12oz.
Liquor room. Case of Tito's 750 six bottles. Case of Ketel One 750 eight bottles. Case Bacardi 750 six bottles. Spare Patron Silver 750. Spare Grey Goose 750.
`.trim();

// Count dictation — hard test with gaps + one surprise
const COUNT_DICTATION_HARD = `
Well one primary. Tito's one. Ketel One point five. Grey Goose one. Absolut one. Stoli zero. Smirnoff one.
Tanqueray one. Bombay Sapphire point eight. Hendricks one.
Well two primary. Bacardi one. Captain Morgan one. Malibu point three. Myers Dark one. Kraken one. Appleton one.
Don Q one. Plantation point six. Flor de Cana one. Mount Gay one. Pyrat zero.
Well three primary. Patron Silver one. Espolon Blanco one. Hornitos point four. Casamigos one. Don Julio Blanco one. Jose Cuervo zero.
Herradura one. Milagro one. Corralejo point seven. 1800 Silver one.
Back bar shelf. Jack Daniels point two. Jameson one. Makers Mark one. Bulleit one. Woodford point nine. Buffalo Trace one. Four Roses one. Wild Turkey point five.
Beer cooler. Corona one. Modelo one. Heineken one. Miller Lite one. Coors Light one.
Liquor room. Tito's case six full. Ketel One case eight full. Bacardi case six full. Patron spare one. Grey Goose spare point five.
Row two. St Germain one.
`.trim();

// ── Parsers (synced with osb-app.js) ───────────────────────────────────────

const WALK_WORD_NUMS = {
  one: "1", two: "2", too: "2", to: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

const COUNT_LEVEL_WORDS = {
  one: 1, two: 2, too: 2, to: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, full: 1, zero: 0, none: 0, out: 0, half: 0.5,
};

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

const WALK_SIZE_PATTERNS = [
  [/^1\.75\s*l?$/, "1.75L"],
  [/^handle$/, "1.75L"],
  [/^24\s*oz$/, "24oz"],
  [/^16\s*oz$/, "16oz"],
  [/^12\s*oz$/, "12oz"],
  [/^12oz$/, "12oz"],
  [/^750(?:ml)?$/, "750ml"],
  [/^375(?:ml)?$/, "375ml"],
  [/^liter$/, "1L"],
  [/^1l$/, "1L"],
];

function walkSizeOf(token) {
  const t = token.replace(/[.,;:!?]+$/, "");
  for (const [re, sz] of WALK_SIZE_PATTERNS) {
    if (re.test(t)) return sz;
  }
  return null;
}

const WALK_STATION_RES = [
  /^(well)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})(\s+(primary|secondary|rear|front|large|small))?(\s+(row|bro)\s+(one|two|too|three|four|five|\d{1,2}))?(\s+(top|bottom|back|front)\s+(left|right|center)(\s+corner)?)?/,
  /^(row|bro)\s+(one|two|too|three|four|five|six|seven|\d{1,2})/,
  /^(next)\s+(row|shelf)/,
  /^(back\s+bar)(\s+(shelf|wall))?/,
  /^(beer)\s+cooler/,
  /^(cooler|walk[\s-]?in|liquor\s+room|store\s*room|storage)\b/,
];

function walkTitleCase(s) {
  return s.replace(/(^|[\s-])(\S)/g, (m, pre, c) => pre + c.toUpperCase());
}

const WELL_ROLES = ["primary", "service", "point", "patio", "secondary", "rear", "front", "large", "small"];
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
  if (/liquor\s+room/.test(lower)) return { kind: "liquor-room" };
  if (/wine\s+(wall|cooler|rack|cellar)/.test(lower)) return { kind: "wine" };
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
    const wells = wellsByOrder(ordered);
    return wells[intent.wellIndex - 1] ?? null;
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
    return ordered.find((s) => s.type === "walk-in" && /beer|cooler/i.test(s.name) && !/wine/i.test(s.name));
  }
  if (intent.kind === "liquor-room") {
    return ordered.find((s) => s.type === "storage" || /liquor\s*room/i.test(s.name));
  }
  return null;
}

function walkMatchStation(words, i) {
  const windowText = words.slice(i, i + 10).join(" ");
  for (const re of WALK_STATION_RES) {
    const m = windowText.match(re);
    if (m && windowText.startsWith(m[0])) {
      let label = m[0].trim().split(/\s+/).map((w) => (w === "bro" ? "row" : (WALK_WORD_NUMS[w] ?? w))).join(" ");
      label = normalizeWalkStationLabel(walkTitleCase(label));
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
  if ((w === "a" || w === "one") && next === "case") return { qty: 12, consumed: 2 };
  return null;
}

function walkCleanName(s) {
  return s.replace(/\b(the|a|an|of|and)\b/g, " ").replace(/[.,]+/g, " ").replace(/\s+/g, " ").trim();
}

function countCleanName(s) {
  return walkCleanName(s).replace(/^(?:bottle|bottles)\s+/i, "").replace(/\s+(?:bottle|bottles)$/i, "").replace(/\beach\s+one\b/gi, "").trim();
}

const CASE_QTY_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function normalizeCaseCountEntry(rawName, level) {
  const lower = (rawName || "").toLowerCase().trim();
  const mQty = lower.match(/^(.+?)\s+case\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})$/);
  if (mQty) {
    const qty = CASE_QTY_WORDS[mQty[2]] ?? parseInt(mQty[2], 10);
    return { name: `Case ${walkTitleCase(walkCleanName(mQty[1]))}`, level: qty || level };
  }
  const mCase = lower.match(/^(.+?)\s+case$/);
  if (mCase) return { name: `Case ${walkTitleCase(walkCleanName(mCase[1]))}`, level };
  if (/^case\s+/i.test(rawName)) return { name: walkTitleCase(countCleanName(rawName)), level };
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
      entries.push(mkEntry(name, defaultSize, false, ["no size heard — verify"]));
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
        } else {
          i += 1;
        }
        entries.push(entry);
      } else {
        i += 1;
      }
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

// ── Apply walk to bar model ──────────────────────────────────────────────────

let bar = structuredClone(GROUND_TRUTH);
bar.stations = GROUND_TRUTH.stations.map((s) => ({ ...s, bottles: [] }));

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
  if (!stationLabel) return [];
  const normalized = normalizeWalkStationLabel(stationLabel);
  for (const s of sortedStations()) {
    if (normalizeWalkStationLabel(s.name) === normalized) ids.add(s.id);
    if (s.name.toLowerCase() === stationLabel.trim().toLowerCase()) ids.add(s.id);
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
  else if (intent?.kind === "beer-cooler") type = "walk-in";
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
    const copies = Math.max(1, Math.min(e.qty || 1, 48));
    station.bottles.push({
      id: `b_${station.id}_${station.bottles.length}`,
      name: e.name,
      raw_heard: e.raw_heard,
      size: e.size,
      size_verified: e.size_verified,
      parse_flags: e.flags || [],
      par_level: copies > 1 ? copies : 1,
      current_level: 1,
      category: "spirits",
    });
    added += 1;
  }
  return added;
}

function allBottles() {
  return sortedStations().flatMap((s) => (s.bottles || []).map((b) => ({ ...b, stationId: s.id, stationName: s.name })));
}

// ── Count parser + reconcile (synced with osb-app.js min score 85) ───────────

const COUNT_MATCH_MIN_SCORE = 85;

function countLevelOf(token) {
  const t = (token || "").replace(/[.,;:!?]+$/, "").toLowerCase();
  if (!t) return null;
  if (t === "half" || t === "0.5" || t === ".5") return 0.5;
  const dotTenth = t.match(/^\.(\d{1,2})$/);
  if (dotTenth) return parseInt(dotTenth[1].slice(0, 1), 10) / 10;
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
  const num = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 }[w] ?? (/^\d{1,2}$/.test(w) ? parseInt(w, 10) : null);
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

function scoreCountBottleMatch(spokenName, bottle) {
  const spoken = normalizeCountName(spokenName);
  const name = normalizeCountName(bottle.name);
  if (!spoken || !name) return 0;
  if (/\bcase\b/.test(spoken) && !/\bcase\b/.test(name)) return 0;
  if (/\bspare\b/.test(spoken) && !/\bspare\b/.test(name)) return 0;
  if (!/\bcase\b/.test(spoken) && /\bcase\b/.test(name)) return 0;
  if (spoken === name) return 200;
  const spokenTokens = spoken.split(/\s+/).filter((t) => t.length > 2);
  const nameTokens = name.split(/\s+/).filter((t) => t.length > 2);
  if (spokenTokens.length >= 2 && spokenTokens.every((t) => name.includes(t))) return 130 + spokenTokens.length * 12;
  if (spoken.includes(name) || name.includes(spoken)) return 150 + name.length;
  const spokenShort = spoken.split(/\s+/).filter((tok) => tok.length > 1);
  const nameTokensLong = name.split(/\s+/).filter((tok) => tok.length > 2);
  if (spokenShort.length === 1 && nameTokensLong.length) {
    const head = spokenShort[0].replace(/['']s$/, "");
    if (name.startsWith(head) || nameTokensLong[0] === head) return 120 + head.length;
  }
  const hits = nameTokensLong.filter((tok) => spoken.includes(tok)).length;
  if (hits < Math.ceil(nameTokensLong.length * 0.55)) return 0;
  return 60 + hits * 10;
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
  if (bestInStation && bestInStationScore >= COUNT_MATCH_MIN_SCORE) return { bottle: bestInStation, score: bestInStationScore, inStation: true };
  if (best && bestScore >= COUNT_MATCH_MIN_SCORE) return { bottle: best, score: bestScore, inStation: false };
  return null;
}

function parseCountText(rawText) {
  const words = walkNormalizeText(rawText).split(/\s+/).map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, "")).filter(Boolean);
  const entries = [];
  let currentStation = null;
  let buf = [];
  let pendingQty = 1;

  function flushEntry(level) {
    const name = countCleanName(buf.join(" "));
    if (name && name.length > 1) {
      const copies = Math.max(1, Math.min(pendingQty, 12));
      for (let c = 0; c < copies; c++) entries.push({ name, station: currentStation, level: level ?? null });
    }
    buf = [];
  }

  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushEntry(null);
      currentStation = st.label;
      pendingQty = 1;
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
    const isOneInName =
      w === "one" &&
      buf.length >= 1 &&
      words[i + 1] &&
      !walkMatchStation(words, i + 1) &&
      countLevelOf(words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase()) === null;
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
  if (buf.length) flushEntry(null);
  return entries;
}

function reconcileCountToMap(parsedEntries) {
  const matched = [];
  const notInCount = [];
  const surprises = [];
  const mapUsed = new Map();
  const countedStationIds = new Set();
  for (const entry of parsedEntries) {
    if (entry.station) {
      for (const sid of stationIdsInCountScope(entry.station)) countedStationIds.add(sid);
    }
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
    matched.push({ entry, bottle: hit, level: entry.level, crossStation: !scored.inStation });
  }

  for (const b of allBottles()) {
    const key = `${b.stationId}:${b.id}`;
    if (mapUsed.has(key)) continue;
    if (countedStationIds.size && !countedStationIds.has(b.stationId)) continue;
    notInCount.push({ bottle: b });
  }

  return {
    matched,
    notInCount,
    surprises,
    countedStationIds: [...countedStationIds],
    hasIssues: surprises.length > 0 || notInCount.length > 0,
  };
}

// ── Analysis helpers ─────────────────────────────────────────────────────────

function analyzeWalk(walkResult, applied) {
  const issues = [];
  const byStation = {};
  for (const e of walkResult.entries) {
    const st = e.station || "(none)";
    if (!byStation[st]) byStation[st] = [];
    byStation[st].push(e);
  }

  // Station drift: wells said as "Well 1 Primary Row 1" vs mapped station "Well 1 Primary"
  for (const heard of Object.keys(byStation)) {
    const mapped = stationIdByName(heard);
    const predef = GROUND_TRUTH.stations.find((s) => s.name === heard);
    if (!mapped && heard !== "(none)") {
      issues.push({ severity: "high", code: "STATION_DRIFT", detail: `Heard station "${heard}" did not map to pre-built station` });
    }
  if (!predef && heard !== "(none)" && !heard.startsWith("Well ")) {
    issues.push({ severity: "medium", code: "AUTO_STATION", detail: `Parser created/fuzzy-matched station "${heard}"` });
  }
  }

  if (bar.stations.length > GROUND_TRUTH.stations.length) {
    issues.push({
      severity: "high",
      code: "STATION_BLOAT",
      detail: `${bar.stations.length} stations after walk vs ${GROUND_TRUTH.stations.length} pre-built`,
      items: bar.stations.filter((s) => !GROUND_TRUTH.stations.some((g) => g.name === s.name)).map((s) => s.name),
    });
  }

  const expectedTotal = Object.values(GROUND_TRUTH.expectedBottles).flat().length;
  if (applied < expectedTotal - 3) {
    issues.push({ severity: "high", code: "WALK_UNDERCOUNT", detail: `Only ${applied} bottles parsed vs ${expectedTotal} expected` });
  }
  if (applied > expectedTotal + 3) {
    issues.push({ severity: "medium", code: "WALK_OVERCOUNT", detail: `${applied} bottles parsed vs ${expectedTotal} expected` });
  }

  const beerEntries = byStation["Beer Cooler"] || byStation["Beer cooler"] || [];
  const badBeerSizes = beerEntries.filter((e) => e.size !== "12oz");
  if (beerEntries.length && badBeerSizes.length) {
    issues.push({
      severity: "high",
      code: "BEER_SIZE_WRONG",
      detail: `${badBeerSizes.length} beer entries not 12oz`,
      items: badBeerSizes.map((e) => `${e.name} → ${e.size}`),
    });
  }

  const unsized = walkResult.entries.filter((e) => !e.size_verified);
  if (unsized.length) {
    issues.push({ severity: "medium", code: "UNSIZED", detail: `${unsized.length} entries without verified size`, items: unsized.map((e) => e.name) });
  }

  const liquor = byStation["Liquor Room"] || byStation["Liquor room"] || [];
  const caseEntries = liquor.filter((e) => /case/i.test(e.name) || e.qty > 1);
  if (liquor.length && caseEntries.length < 3) {
    issues.push({ severity: "high", code: "CASE_PARSE_FAIL", detail: "Liquor room cases not parsed as expected", heard: liquor.map((e) => `${e.name} (qty ${e.qty})`) });
  }

  return { byStation, issues, expectedTotal, parsedTotal: walkResult.entries.length, appliedTotal: applied };
}

function analyzeCount(report) {
  const issues = [];
  const falseSurprises = report.surprises.filter((s) => s.reason === "not_on_map");
  const missing = report.notInCount;
  const extras = report.surprises.filter((s) => s.reason === "extra_on_shelf");

  // Expected intentional gaps from hard count
  const intentionalMissing = ["Beefeater", "Seagrams Gin", "Pyrat", "Jose Cuervo", "El Jimador"];
  const unexpectedMissing = missing.filter((m) => !intentionalMissing.some((n) => m.bottle.name.includes(n)));

  if (unexpectedMissing.length) {
    issues.push({
      severity: "high",
      code: "UNEXPECTED_MISSING",
      detail: `${unexpectedMissing.length} bottles flagged missing but were in count dictation`,
      items: unexpectedMissing.map((m) => `${m.bottle.stationName}: ${m.bottle.name}`),
    });
  }

  const stGermain = falseSurprises.find((s) => /st germain/i.test(s.entry.name));
  if (!stGermain) {
    issues.push({ severity: "low", code: "SURPRISE_NOT_FLAGGED", detail: "Expected St Germain surprise at Row 2 — check station marker" });
  } else {
    issues.push({ severity: "info", code: "SURPRISE_OK", detail: "St Germain correctly flagged as not_on_map" });
  }

  const wrongMatches = report.matched.filter((m) => {
    const spoken = m.entry.name.toLowerCase();
    const mapped = m.bottle.name.toLowerCase();
    return !spoken.includes(mapped.split(" ")[0]) && !mapped.includes(spoken.split(" ")[0]);
  });
  if (wrongMatches.length) {
    issues.push({
      severity: "high",
      code: "FUZZY_MISMATCH",
      detail: `${wrongMatches.length} questionable fuzzy matches`,
      items: wrongMatches.map((m) => `"${m.entry.name}" → ${m.bottle.name} (${m.bottle.stationName})`),
    });
  }

  return { issues, intentionalMissing, unexpectedMissing: unexpectedMissing.length };
}

// ── P1-4 blind-mouse binding regression ─────────────────────────────────────

const BLIND_MOUSE_STATIONS = [
  mkStation("Main Bar", "well", 0),
  mkStation("Service Bar", "well", 1),
  mkStation("Point", "well", 2),
  mkStation("Back Bar Main", "back-bar", 3),
  mkStation("Back Bar Point", "back-bar", 4),
  mkStation("Wine Cooler", "walk-in", 5),
  mkStation("Beer Cooler", "walk-in", 6),
  mkStation("Liquor Room", "storage", 7),
];

const BINDING_WALK = `
Well one primary. Tito's 750. Ketel One 750.
Well two primary. Bacardi 750. Captain Morgan 750.
Well three primary. Patron Silver 750. Hornitos 750.
Back bar main. Jack Daniels 750. Jameson 750.
Beer cooler. Corona 12oz. Modelo 12oz.
Liquor room. Spare Patron Silver 750.
`.trim();

function runBlindMouseBindingTest() {
  const saved = bar;
  bar = { stations: BLIND_MOUSE_STATIONS.map((s) => ({ ...s, bottles: [] })) };
  const startCount = bar.stations.length;
  const mini = parseWalkText(BINDING_WALK);
  applyWalk(mini.entries);
  const issues = [];
  if (bar.stations.length !== startCount) {
    issues.push(`station count grew ${startCount} → ${bar.stations.length}`);
  }
  const phantom = bar.stations.filter((s) => /^Well \d/i.test(s.name));
  if (phantom.length) {
    issues.push(`phantom wells created: ${phantom.map((s) => s.name).join(", ")}`);
  }
  const main = bar.stations.find((s) => s.name === "Main Bar");
  const service = bar.stations.find((s) => s.name === "Service Bar");
  const point = bar.stations.find((s) => s.name === "Point");
  if (!main?.bottles?.length) issues.push("Main Bar empty after Well one walk");
  if (!service?.bottles?.length) issues.push("Service Bar empty after Well two walk");
  if (!point?.bottles?.length) issues.push("Point empty after Well three walk");
  const emptyBuilt = bar.stations.filter((s) => BLIND_MOUSE_STATIONS.some((b) => b.name === s.name) && !(s.bottles || []).length);
  if (emptyBuilt.length > 3) {
    issues.push(`${emptyBuilt.length} built stations still empty: ${emptyBuilt.map((s) => s.name).join(", ")}`);
  }
  bar = saved;
  return issues;
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log("=".repeat(72));
console.log("TEST 1 — One Bar, 3 Wells, Back Bar, Cooler, Liquor Room Cases");
console.log("=".repeat(72));

const bindingIssues = runBlindMouseBindingTest();
console.log("\n── BINDING (blind-mouse wells → built stations) ──");
if (bindingIssues.length) {
  bindingIssues.forEach((i) => console.log(`  [high] BINDING_FAIL: ${i}`));
} else {
  console.log("  ✓ Well one/two/three bind to Main/Service/Point — no phantom stations");
}

const walkResult = parseWalkText(WALK_DICTATION);
const applied = applyWalk(walkResult.entries);
const walkAnalysis = analyzeWalk(walkResult, applied);

console.log("\n── PASS 1: WALK ──");
console.log(`Stations heard: ${walkResult.stations.join(" | ")}`);
console.log(`Entries parsed: ${walkResult.entries.length} → ${applied} bottles on map`);
for (const [st, entries] of Object.entries(walkAnalysis.byStation)) {
  console.log(`  ${st}: ${entries.length} entries`);
}
console.log(`\nWalk issues (${walkAnalysis.issues.length}):`);
walkAnalysis.issues.forEach((i) => console.log(`  [${i.severity}] ${i.code}: ${i.detail}`));

const parsed = parseCountText(COUNT_DICTATION_HARD);
const countReport = reconcileCountToMap(parsed);
const countAnalysis = analyzeCount(countReport);

console.log("\n── PASS 2: COUNT (hard) ──");
console.log(`Parsed count entries: ${parsed.length}`);
console.log(`Matched: ${countReport.matched.length}`);
console.log(`Surprises: ${countReport.surprises.length} (${countReport.surprises.map((s) => s.reason).join(", ")})`);
console.log(`Missing from count (scoped): ${countReport.notInCount.length}`);
console.log(`Golden: ${!countReport.hasIssues ? "YES" : "NO"}`);
console.log(`\nCount issues (${countAnalysis.issues.length}):`);
countAnalysis.issues.forEach((i) => console.log(`  [${i.severity}] ${i.code}: ${i.detail}`));

const report = {
  test: "test1",
  timestamp: new Date().toISOString(),
  bar: BAR_NAME,
  binding_issues: bindingIssues,
  stations: GROUND_TRUTH.stations.map((s) => s.name),
  pass1: {
    dictation_chars: WALK_DICTATION.length,
    stations_heard: walkResult.stations,
    entries_parsed: walkResult.entries.length,
    bottles_applied: applied,
    expected_bottles: walkAnalysis.expectedTotal,
    issues: walkAnalysis.issues,
    entries_by_station: walkAnalysis.byStation,
  },
  pass2: {
    dictation_chars: COUNT_DICTATION_HARD.length,
    entries_parsed: parsed.length,
    matched: countReport.matched.length,
    surprises: countReport.surprises.length,
    missing_scoped: countReport.notInCount.length,
    golden: !countReport.hasIssues,
    surprise_breakdown: countReport.surprises.reduce((a, s) => {
      a[s.reason] = (a[s.reason] || 0) + 1;
      return a;
    }, {}),
    issues: countAnalysis.issues,
    missing_items: countReport.notInCount.map((m) => ({ station: m.bottle.stationName, name: m.bottle.name })),
    surprise_items: countReport.surprises.map((s) => ({
      reason: s.reason,
      heard: s.entry.name,
      station: s.entry.station,
      level: s.entry.level,
      mapped_to: s.similarTo?.name,
    })),
  },
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
console.log(`\nReport written: ${REPORT_PATH}`);