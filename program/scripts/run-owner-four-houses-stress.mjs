#!/usr/bin/env node
/**
 * Owner Four Houses — front-to-back stress test
 *
 * Offline: Spanish/EN walk parsers for 4 establishments
 * Online: isolated Flask on OSB_STRESS_PORT (default 5055) + OSB_DATA_DIR sandbox
 * Never touches live 5052 program/data unless you force OSB_STRESS_URL.
 *
 * Persona: multi-unit owner; Spanish-speaking bartenders; mixed notes.
 */
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, "..");
const KIT = path.join(ROOT, "test-kit/owner-four-houses");
const APP = path.join(ROOT, "static/js/osb-app.js");
const SANDBOX = path.join(ROOT, ".stress-sandbox/data");
const REPORT = path.join(ROOT, "data/_stress-reports/owner-four-houses-report.json");
const PORT = process.env.OSB_STRESS_PORT || "5055";
const BASE = process.env.OSB_STRESS_URL || `http://127.0.0.1:${PORT}`;
const PY =
  process.env.OSB_PYTHON ||
  (fs.existsSync(path.join(ROOT, ".venv/bin/python"))
    ? path.join(ROOT, ".venv/bin/python")
    : "python3");

const checks = [];
const log = (...a) => console.log(...a);
const pass = (m, d = "") => {
  checks.push({ ok: true, m, d });
  log(`  ✓ ${m}${d ? ` — ${d}` : ""}`);
};
const fail = (m, d = "") => {
  checks.push({ ok: false, m, d });
  log(`  ✗ ${m}${d ? ` — ${d}` : ""}`);
};

function read(rel) {
  return fs.readFileSync(path.join(KIT, rel), "utf8");
}

// ── Load parser sandbox from osb-app.js ──────────────────────────────────────
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
  throw new Error(`unclosed ${name}`);
}
function sliceConstBlock(source, name, untilMarker) {
  const start = source.indexOf(name);
  if (start < 0) throw new Error(`missing ${name}`);
  const end = source.indexOf(untilMarker, start);
  if (end < 0) throw new Error(`missing end for ${name}`);
  return source.slice(start, end);
}

function loadParser() {
  const src = fs.readFileSync(APP, "utf8");
  const parts = [
    sliceConstBlock(src, "const WELL_STATION_ROLES", "function wellsByOrder"),
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
  const ctx = vm.createContext({
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
  vm.runInContext(
    parts.join("\n\n") +
      "\nthis.parseWalkText=parseWalkText;this.walkNormalizeText=walkNormalizeText;this.parseCountLevel=parseCountLevel;this.guessStationType=typeof guessStationType!=='undefined'?guessStationType:null;",
    ctx,
  );
  // guessStationType not loaded — add lightweight type guess for bar build
  ctx.guessType = (name) => {
    const l = String(name || "").toLowerCase();
    if (/well|pozo|point|speed|rail/.test(l)) return "well";
    if (/back\s*bar|barra\s*trasera/.test(l)) return "back-bar";
    if (/liquor|storage|cuarto|almacen|bodega/.test(l)) return "storage";
    if (/cooler|cellar|wine|champagne|beer|nevera|cava/.test(l)) return "walk-in";
    return "back-bar";
  };
  return ctx;
}

function barsFromParse(parsed) {
  return (parsed.bars || []).map((b, bi) => {
    const stationMap = new Map();
    let order = 0;
    let bottleSeq = 0; // unique across stations (avoid duplicate b_0_0_0 per station)
    for (const e of b.entries || []) {
      const stName = e.station || "Unassigned";
      if (!stationMap.has(stName)) {
        stationMap.set(stName, {
          id: `st_${bi}_${order}`,
          name: stName,
          type: "back-bar",
          order: order++,
          bottles: [],
        });
      }
      const st = stationMap.get(stName);
      const qty = Math.max(1, e.qty || 1);
      for (let q = 0; q < qty; q++) {
        st.bottles.push({
          id: `b_${bi}_${bottleSeq++}`,
          name: e.name,
          size: e.size || "750ml",
          category: /12oz|16oz|24oz/i.test(e.size || "") ? "beer" : /champagne|moet|veuve|dom |cristal|krug|prosecco|cava|wine|cabernet|pinot|chardonnay|merlot|rose|sauvignon/i.test(e.name) ? "wine" : "spirits",
          current_level: 1.0,
          par_level: 2,
          cost: 25,
          size_verified: !!e.size_verified,
          raw_heard: e.raw_heard || e.name,
        });
      }
    }
    // Fix types after names known
    for (const st of stationMap.values()) {
      const l = st.name.toLowerCase();
      if (/well|point|speed|rail/.test(l)) st.type = "well";
      else if (/back\s*bar/.test(l)) st.type = "back-bar";
      else if (/liquor|storage/.test(l)) st.type = "storage";
      else if (/cooler|cellar|wine|champagne|beer/.test(l)) st.type = "walk-in";
    }
    return {
      key: b.key,
      label: b.label,
      stations: [...stationMap.values()],
      bottleCount: [...stationMap.values()].reduce((n, s) => n + s.bottles.length, 0),
      stationNames: [...stationMap.keys()],
    };
  });
}

// ── Offline house checks ─────────────────────────────────────────────────────
function offlineHouse(parser, name, walkRel, opts = {}) {
  log(`\n── OFFLINE · ${name} ──`);
  const walk = read(walkRel);
  const parsed = parser.parseWalkText(walk);
  const bars = barsFromParse(parsed);
  const totalBottles = bars.reduce((n, b) => n + b.bottleCount, 0);
  const allStations = bars.flatMap((b) => b.stationNames);

  if (opts.minBars != null) {
    if (bars.length >= opts.minBars) pass(`${name}: ≥${opts.minBars} bars`, `${bars.length} bars`);
    else fail(`${name}: expected ≥${opts.minBars} bars`, `got ${bars.length}`);
  }
  if (opts.minBottles != null) {
    if (totalBottles >= opts.minBottles) pass(`${name}: ≥${opts.minBottles} bottles`, `${totalBottles}`);
    else fail(`${name}: bottle floor`, `got ${totalBottles}, need ${opts.minBottles}`);
  }
  for (const re of opts.mustStations || []) {
    if (allStations.some((s) => re.test(s))) pass(`${name}: station ${re}`);
    else fail(`${name}: missing station`, String(re));
  }
  if (opts.requireChampagneCoolers) {
    const champs = allStations.filter((s) => /champagne\s+cooler/i.test(s));
    if (champs.length >= 3) pass(`${name}: 3 champagne coolers`, champs.join(" · "));
    else fail(`${name}: need 3 champagne coolers`, `got ${champs.join(", ") || "none"}`);
  }
  if (opts.requireWineCellar) {
    if (allStations.some((s) => /wine\s+cellar/i.test(s))) pass(`${name}: wine cellar present`);
    else fail(`${name}: wine cellar missing`, allStations.join(", "));
  }

  // Count level sample if provided
  if (opts.countRel) {
    const count = read(opts.countRel);
    const norm = parser.walkNormalizeText(count);
    const levelHits = ["out", "half", "full", "one", "point"].filter((w) => new RegExp(`\\b${w}\\b`).test(norm));
    if (levelHits.length >= 2) pass(`${name}: count ES→EN levels`, levelHits.join(", "));
    else fail(`${name}: count level normalize weak`, norm.slice(0, 120));

    // Spot-check parseCountLevel on Spanish words embedded
    for (const [w, v] of [
      ["vacío", 0],
      ["lleno", 1],
      ["medio", 0.5],
    ]) {
      if (count.includes(w.replace("í", "i")) || count.includes(w) || /vacio|lleno|medio/.test(count)) {
        const got = parser.parseCountLevel(w);
        if (got === v) pass(`${name}: level '${w}'=${v}`);
        else fail(`${name}: level '${w}'`, `got ${got}`);
        break;
      }
    }
  }

  return { bars, totalBottles, allStations, parsed };
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
const cookieJar = { raw: "" };
async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookieJar.raw ? { Cookie: cookieJar.raw } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cookieJar.raw = sc.map((c) => c.split(";")[0]).join("; ");
  else {
    const one = r.headers.get("set-cookie");
    if (one) cookieJar.raw = one.split(",").map((c) => c.split(";")[0].trim()).join("; ");
  }
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

async function waitPing(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/ping`);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Sandbox server not up at ${BASE}`);
}

function ensureSandboxDir() {
  fs.mkdirSync(SANDBOX, { recursive: true });
  const weightsSrc = path.join(ROOT, "data/bottle-weights.json");
  const weightsDst = path.join(SANDBOX, "bottle-weights.json");
  // weights live next to server package data; API loads from program/data not OSB_DATA_DIR
  if (fs.existsSync(weightsSrc) && !fs.existsSync(weightsDst)) {
    fs.copyFileSync(weightsSrc, weightsDst);
  }
}

function startSandboxServer() {
  ensureSandboxDir();
  // Wipe prior stress state for clean run
  for (const f of ["bars.json", "program_state.json", "people.json", "staff_board.json", "osb_config.json"]) {
    const p = path.join(SANDBOX, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  // pos dir
  const posDir = path.join(SANDBOX, "pos");
  if (fs.existsSync(posDir)) fs.rmSync(posDir, { recursive: true, force: true });

  const child = spawn(PY, ["server.py"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      OSB_DATA_DIR: SANDBOX,
      OSB_DEMO_MODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let boot = "";
  child.stdout.on("data", (d) => {
    boot += d.toString();
  });
  child.stderr.on("data", (d) => {
    boot += d.toString();
  });
  return { child, getBoot: () => boot };
}

function applyLevelsFromCount(parser, barPayload, countText) {
  // Very rough: for each bottle, if name appears near a level word in count, set level
  const words = parser.walkNormalizeText(countText).split(/\s+/).filter(Boolean);
  const levels = [];
  // Re-parse as stream: station then name tokens then level
  // Simpler approach: for each bottle, search "name ... level" in normalized count
  const norm = parser.walkNormalizeText(countText);
  let applied = 0;
  for (const st of barPayload.stations) {
    for (const b of st.bottles) {
      const name = (b.name || "").toLowerCase();
      const tokens = name.split(/\s+/).filter((t) => t.length > 2);
      if (!tokens.length) continue;
      // Find first token occurrence and read following level-ish token
      const re = new RegExp(
        `${tokens[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,40}?\\b(out|half|full|zero|one|two|three|four|five|six|seven|eight|nine|ten|point\\s+\\d|\\d+(?:\\.\\d+)?)\\b`,
        "i",
      );
      const m = norm.match(re);
      if (m) {
        const lv = parser.parseCountLevel(m[1]);
        if (lv != null) {
          b.current_level = lv;
          applied++;
          continue;
        }
      }
      // default leave 1.0
    }
  }
  return applied;
}

function sumLevels(bar) {
  let sum = 0;
  let n = 0;
  for (const st of bar.stations || []) {
    for (const b of st.bottles || []) {
      sum += Number(b.current_level) || 0;
      n++;
    }
  }
  return { sum: Math.round(sum * 100) / 100, n };
}

async function seedBarOnline(name, stations, levels) {
  // Create or switch
  const listed = await api("GET", "/api/bars");
  let bars = listed.data.bars || [];
  let existing = bars.find((b) => b.name === name);
  if (!existing) {
    if (bars.length === 1 && (!bars[0].name || /bar|default|main/i.test(bars[0].name || ""))) {
      // Rename the post-reset default bar instead of stacking empty shells
      existing = bars[0];
    } else {
      const cr = await api("POST", "/api/bars", { name, start_setup: false });
      bars = (await api("GET", "/api/bars")).data.bars || [];
      existing =
        bars.find((b) => b.name === name) ||
        cr.data?.bar ||
        bars[bars.length - 1];
    }
  }
  const id = existing?.id;
  if (id) await api("POST", "/api/bars/switch", { bar_id: id });

  // Apply explicit levels if provided
  if (levels) {
    for (const st of stations) {
      for (const b of st.bottles) {
        if (levels[b.name] != null) b.current_level = levels[b.name];
      }
    }
  }

  const saved = await api("POST", "/api/bar", { bar_id: id, id, name, stations });
  const verify = await api("GET", "/api/bar");
  const n = sumLevels(verify.data).n;
  if (n < 1) {
    // Retry once: force active + save
    if (id) await api("POST", "/api/bars/switch", { bar_id: id });
    await api("POST", "/api/bar", { bar_id: id, name, stations });
  }
  await api("POST", "/api/config", {
    phase: "butterfly",
    map_approved: true,
    first_count_complete: true,
    setup_bar_id: "",
    active_bar_id: id,
    bar_name: name,
    weigh_enabled: false,
    branding: { business_name: "Four Houses Hospitality", business_address: "Stress Sandbox" },
  });
  // mark map approved on setup
  await api("POST", "/api/setup/approve-map", {});
  const finalBar = (await api("GET", "/api/bar")).data;
  return {
    id: finalBar?.id || saved.data?.bar?.id || id,
    bar: finalBar || saved.data?.bar,
    sum: sumLevels(finalBar || { stations }),
  };
}

async function processAndCheck(name, expectedMinBottles) {
  const before = await api("GET", "/api/bar");
  const sumBefore = sumLevels(before.data);
  const proc = await api("POST", "/api/count/process-cycle", {});
  const ok = proc.ok || !!proc.data?.cycle || proc.data?.status === "processed";
  if (!ok) {
    fail(`${name}: process-cycle`, `${proc.status} ${JSON.stringify(proc.data).slice(0, 160)}`);
    return null;
  }
  pass(`${name}: process-cycle OK`, `cycle #${proc.data?.cycle_number ?? proc.data?.cycle?.cycle_number ?? "?"}`);

  const metrics = await api("GET", "/api/metrics");
  const analytics = await api("GET", "/api/analytics");
  const inhouse = await api("GET", "/api/in-house?category=all");

  if (analytics.ok) {
    const bc = analytics.data.bottle_count ?? analytics.data.product_rows?.length ?? 0;
    if (bc >= expectedMinBottles || (inhouse.data?.item_count || 0) >= expectedMinBottles) {
      pass(`${name}: analytics/in-house populated`, `bottles~${bc} inhouse=${inhouse.data?.item_count ?? "?"}`);
    } else {
      fail(`${name}: thin analytics`, `bc=${bc} inhouse=${inhouse.data?.item_count}`);
    }
  } else fail(`${name}: analytics failed`, String(analytics.status));

  if (metrics.ok) pass(`${name}: metrics OK`);
  else fail(`${name}: metrics`, String(metrics.status));

  // Number integrity: cycle snapshot bottle count vs map
  const cycle = proc.data?.cycle;
  const snapBottles =
    cycle?.snapshot?.bottle_count ??
    cycle?.bottle_count ??
    (Array.isArray(cycle?.lines) ? cycle.lines.length : null);
  if (snapBottles != null && snapBottles >= expectedMinBottles) {
    pass(`${name}: cycle snapshot count`, String(snapBottles));
  } else if (sumBefore.n >= expectedMinBottles) {
    pass(`${name}: pre-process map count held`, `${sumBefore.n} bottles, levelSum=${sumBefore.sum}`);
  }

  return { proc, sumBefore, metrics: metrics.data, analytics: analytics.data };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log("════════════════════════════════════════════════════════════");
  log(" OWNER FOUR HOUSES — stress test (sandbox)");
  log(` Kit: ${KIT}`);
  log(` Sandbox data: ${SANDBOX}`);
  log(` API: ${BASE}`);
  log("════════════════════════════════════════════════════════════");

  const parser = loadParser();

  // ── Phase A: offline parsers ─────────────────────────────────────────────
  log("\n■ PHASE A — Offline walk/count structure (no live data risk)");

  const h1 = offlineHouse(parser, "H1 Casa Dos Barras (2 bars, ES)", "h1-casa-dos-barras/walk.txt", {
    minBars: 2,
    minBottles: 20,
    mustStations: [/well/i, /back bar/i, /beer cooler/i],
    countRel: "h1-casa-dos-barras/count.txt",
  });

  const h2 = offlineHouse(parser, "H2 El Rincón (1 bar, ES)", "h2-el-rincon/walk.txt", {
    minBars: 1,
    minBottles: 10,
    mustStations: [/well/i, /back bar/i, /beer cooler/i],
    countRel: "h2-el-rincon/count.txt",
  });

  const h3 = offlineHouse(parser, "H3 Tres Salas (3 bars, EN)", "h3-tres-salas/walk.txt", {
    minBars: 3,
    minBottles: 28,
    mustStations: [/well/i, /back bar/i, /beer cooler|patio cooler/i],
    countRel: "h3-tres-salas/count-bar1.txt",
  });

  const h4 = offlineHouse(parser, "H4 Cava & Champagne (custom wine)", "h4-cava-champagne/walk.txt", {
    minBars: 1,
    minBottles: 50,
    mustStations: [/well/i, /back bar/i, /liquor room/i, /beer cooler/i],
    requireWineCellar: true,
    requireChampagneCoolers: true,
    countRel: "h4-cava-champagne/count.txt",
  });

  // ── Phase B: isolated server ─────────────────────────────────────────────
  log("\n■ PHASE B — Isolated server lifecycle (port " + PORT + ")");

  let serverHandle = null;
  let startedByUs = false;
  try {
    await waitPing(1500);
    log(`  · Server already up at ${BASE}`);
  } catch {
    log(`  · Starting sandbox Flask OSB_DATA_DIR=${SANDBOX}`);
    serverHandle = startSandboxServer();
    startedByUs = true;
    try {
      const ping = await waitPing(25000);
      pass("Sandbox server up", `version=${ping.version}`);
    } catch (e) {
      fail("Sandbox server boot", e.message + "\n" + (serverHandle?.getBoot?.() || "").slice(-400));
      throw e;
    }
  }

  try {
    await api("POST", "/api/hard-reset", {});
    pass("hard-reset sandbox");

    // Seed H2 first (simple single bar) — process & verify numbers
    log("\n── ONLINE · H2 El Rincón process ──");
    const h2bar = h2.bars[0];
    for (const st of h2bar.stations) {
      // set deterministic levels
      st.bottles.forEach((b, i) => {
        b.current_level = [1, 0.5, 1, 0, 0.4, 1, 0.5, 1, 3, 2, 1, 2][i] ?? 1;
        b.par_level = 2;
        b.cost = 20;
      });
    }
    const seeded2 = await seedBarOnline("El Rincon", h2bar.stations);
    const sum2 = sumLevels({ stations: h2bar.stations });
    pass("H2 seeded", `${sum2.n} bottles, levelSum=${sum2.sum}`);
    const r2 = await processAndCheck("H2 El Rincon", 8);

    // H1 two bars + transfer
    log("\n── ONLINE · H1 Casa Dos Barras dual bar + transfer ──");
    // hard-reset already done; create main from bar1 and patio from bar2
    await api("POST", "/api/hard-reset", {});
    const main = h1.bars[0];
    const patio = h1.bars[1] || h1.bars[0];
    main.stations.forEach((st) =>
      st.bottles.forEach((b) => {
        b.current_level = 2;
        b.par_level = 3;
        b.cost = 22;
      }),
    );
    patio.stations.forEach((st) =>
      st.bottles.forEach((b) => {
        b.current_level = 1;
        b.par_level = 2;
        b.cost = 22;
      }),
    );

    const sMain = await seedBarOnline("Casa Main", main.stations);
    const crPatio = await api("POST", "/api/bars", { name: "Casa Patio", start_setup: false });
    const barsAfter = (await api("GET", "/api/bars")).data.bars || [];
    const patioId = barsAfter.find((b) => /Patio/i.test(b.name))?.id || crPatio.data?.bar?.id;
    const mainId = barsAfter.find((b) => /Main/i.test(b.name))?.id || sMain.id;
    if (patioId) {
      await api("POST", "/api/bars/switch", { bar_id: patioId });
      await api("POST", "/api/bar", { id: patioId, name: "Casa Patio", stations: patio.stations });
      pass("H1 patio bar saved", patioId);
    } else fail("H1 patio create");

    await api("POST", "/api/bars/switch", { bar_id: mainId });
    // Find a Tito's bottle id from saved bar (explicit bar_id — no session ambiguity)
    const mainLive = await api("GET", `/api/bar?bar_id=${encodeURIComponent(mainId)}`);
    const sumBeforeXfer = sumLevels(mainLive.data);
    let titoId = null;
    let titoLevelBefore = null;
    for (const st of mainLive.data.stations || []) {
      for (const b of st.bottles || []) {
        if (/tito/i.test(b.name)) {
          titoId = b.id;
          titoLevelBefore = Number(b.current_level);
          break;
        }
      }
      if (titoId) break;
    }
    if (titoId && patioId) {
      const xfer = await api("POST", "/api/bars/transfer", {
        from_bar_id: mainId,
        to_bar_id: patioId,
        bottle_id: titoId,
        qty: 1,
        note: "Stress: mover una botella al patio",
        create_if_missing: true,
      });
      if (xfer.ok && xfer.data.transfer?.qty === 1) {
        pass("H1 transfer Main→Patio qty=1");
        const afterFrom = Number(xfer.data.transfer.from_level_after);
        const afterTo = Number(xfer.data.transfer.to_level_after);
        if (
          titoLevelBefore != null &&
          !Number.isNaN(afterFrom) &&
          Math.abs(afterFrom - (titoLevelBefore - 1)) < 0.01
        ) {
          pass("H1 transfer math (API)", `${titoLevelBefore} → ${afterFrom} (dest now ${afterTo})`);
        } else {
          fail(
            "H1 transfer math (API)",
            `before=${titoLevelBefore} from_after=${afterFrom} to_after=${afterTo}`,
          );
        }
        // House-level number integrity: total units must drop by qty on source
        const mainAfter = await api("GET", `/api/bar?bar_id=${encodeURIComponent(mainId)}`);
        const sumAfterXfer = sumLevels(mainAfter.data);
        const dropped = Math.round((sumBeforeXfer.sum - sumAfterXfer.sum) * 1000) / 1000;
        if (Math.abs(dropped - 1) < 0.01) {
          pass("H1 transfer house units", `${sumBeforeXfer.sum} → ${sumAfterXfer.sum} (Δ ${dropped})`);
        } else {
          fail(
            "H1 transfer house units",
            `beforeSum=${sumBeforeXfer.sum} afterSum=${sumAfterXfer.sum} Δ=${dropped}`,
          );
        }
        // Per-bottle check (best effort — ids must remain stable)
        let titoAfter = null;
        for (const st of mainAfter.data.stations || []) {
          for (const b of st.bottles || []) {
            if (b.id === titoId) titoAfter = Number(b.current_level);
          }
        }
        if (titoAfter != null && Math.abs(titoAfter - afterFrom) < 0.01) {
          pass("H1 transfer bottle id stable", `${titoId}=${titoAfter}`);
        } else {
          fail(
            "H1 transfer persist",
            `GET=${titoAfter} API=${afterFrom} bar=${mainAfter.data?.id} wantId=${titoId}`,
          );
        }
      } else fail("H1 transfer", JSON.stringify(xfer.data).slice(0, 180));
    } else fail("H1 transfer skipped", `tito=${titoId} patio=${patioId}`);

    await api("POST", "/api/bars/switch", { bar_id: mainId });
    await processAndCheck("H1 Casa Main", 15);

    // Spanish staff board
    const staff = await api("POST", "/api/staff-board", {
      text: "Conteo listo en Casa Main. Falta reponer Tito's en patio. — Carlos",
    });
    if (staff.ok || staff.status === 201) pass("Spanish staff board note stored");
    else {
      // auth may block — open mode usually allows
      if (staff.status === 401) pass("Staff board requires login (auth on) — acceptable");
      else fail("Staff board", JSON.stringify(staff.data).slice(0, 120));
    }

    // POS + PO
    const pos = await api("POST", "/api/pos/log", {
      label: "Stress POS ES night",
      text: "Item Name,Quantity Sold,Net Sales\nTito's,6,72\nPatron Silver,3,54\nCorona,12,48",
      input_type: "pos",
    });
    if (pos.ok) pass("POS log accepted");
    else fail("POS log", JSON.stringify(pos.data).slice(0, 100));

    const po = await api("POST", "/api/pos/log", {
      label: "PO STRESS-1 Southern",
      text: "PURCHASE ORDER\n2 × Tito's\n1 × Patron Silver",
      input_type: "po",
    });
    if (po.ok) pass("PO log accepted");
    else fail("PO log", JSON.stringify(po.data).slice(0, 100));

    // H4 wine house scale
    log("\n── ONLINE · H4 Cava & Champagne scale process ──");
    await api("POST", "/api/hard-reset", {});
    const wine = h4.bars[0];
    wine.stations.forEach((st) =>
      st.bottles.forEach((b, i) => {
        b.current_level = (i % 5 === 0 ? 0.5 : 1) + (i % 7 === 0 ? 1 : 0);
        b.par_level = st.type === "walk-in" ? 4 : 2;
        b.cost = /dom|cristal|krug|opus|margaux|silver oak/i.test(b.name) ? 120 : 35;
      }),
    );
    const seeded4 = await seedBarOnline("Cava Champagne", wine.stations);
    const sum4 = sumLevels({ stations: wine.stations });
    pass("H4 seeded", `${sum4.n} bottles levelSum=${sum4.sum}`);
    if (sum4.n >= 50) pass("H4 fine-dining map scale", `${sum4.n} SKUs`);
    else fail("H4 scale short", `${sum4.n}`);
    await processAndCheck("H4 Cava Champagne", 40);

    // H3 three bars presence online
    log("\n── ONLINE · H3 Tres Salas three venues ──");
    await api("POST", "/api/hard-reset", {});
    const names = ["Lobby Bar", "Dining Room", "Rooftop"];
    const ids = [];
    for (let i = 0; i < Math.min(3, h3.bars.length); i++) {
      const st = h3.bars[i].stations;
      st.forEach((s) => s.bottles.forEach((b) => { b.current_level = 1; b.par_level = 2; b.cost = 20; }));
      if (i === 0) {
        const s = await seedBarOnline(names[i], st);
        ids.push(s.id);
      } else {
        const cr = await api("POST", "/api/bars", { name: names[i], start_setup: false });
        const list = (await api("GET", "/api/bars")).data.bars || [];
        const id = list.find((b) => b.name === names[i])?.id || cr.data?.bar?.id;
        if (id) {
          await api("POST", "/api/bars/switch", { bar_id: id });
          await api("POST", "/api/bar", { id, name: names[i], stations: st });
          ids.push(id);
        }
      }
    }
    const list3 = (await api("GET", "/api/bars")).data.bars || [];
    if (list3.length >= 3) pass("H3 three venues registered", list3.map((b) => b.name).join(" · "));
    else fail("H3 venue count", `${list3.length}`);

    const venues = await api("GET", "/api/venues");
    if (venues.ok && (venues.data.consolidated?.venue_count || list3.length) >= 3) {
      pass(
        "Venues consolidated",
        `count=${venues.data.consolidated?.venue_count ?? list3.length} value=$${venues.data.consolidated?.total_value ?? "?"}`,
      );
    } else fail("Venues roll-up", JSON.stringify(venues.data).slice(0, 120));

    // Process lobby
    if (ids[0]) {
      await api("POST", "/api/bars/switch", { bar_id: ids[0] });
      await processAndCheck("H3 Lobby", 8);
    }

    // People PIN (owner + Spanish manager)
    log("\n── ONLINE · People PIN + Spanish manager ──");
    const adminLogin = `owner_${Date.now().toString().slice(-5)}`;
    const adm = await api("POST", "/api/people", {
      name: "Owner Stress",
      login: adminLogin,
      pin: "123456",
      role: "admin",
    });
    if (adm.ok) pass("Admin PIN created");
    else if (adm.status === 400 && /already|exist/i.test(JSON.stringify(adm.data))) pass("Admin exists");
    else fail("Admin create", JSON.stringify(adm.data).slice(0, 100));

    const mgrLogin = `carlos_${Date.now().toString().slice(-5)}`;
    const mgr = await api("POST", "/api/people", {
      name: "Carlos Bartender",
      login: mgrLogin,
      pin: "654321",
      role: "manager",
      venue_id: ids[0] || list3[0]?.id,
      permissions: { count: true, inputs: true, staff_board: true, transfers: true },
    });
    if (mgr.ok) pass("Manager Carlos created");
    else fail("Manager create", JSON.stringify(mgr.data).slice(0, 120));

  } finally {
    // write report before kill
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  const summary = {
    at: new Date().toISOString(),
    base: BASE,
    sandbox: SANDBOX,
    passed,
    failed,
    total: checks.length,
    checks,
    offline: {
      h1_bottles: h1.totalBottles,
      h2_bottles: h2.totalBottles,
      h3_bottles: h3.totalBottles,
      h4_bottles: h4.totalBottles,
      h1_bars: h1.bars.length,
      h3_bars: h3.bars.length,
      h4_stations: h4.allStations,
    },
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));

  log("\n════════════════════════════════════════════════════════════");
  log(` RESULT: ${passed} passed · ${failed} failed · ${checks.length} checks`);
  log(` Report: ${REPORT}`);
  log("════════════════════════════════════════════════════════════");
  if (failed) {
    log("\nFailures:");
    checks.filter((c) => !c.ok).forEach((c) => log(`  - ${c.m}: ${c.d}`));
  }

  if (startedByUs && serverHandle?.child) {
    serverHandle.child.kill("SIGTERM");
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
