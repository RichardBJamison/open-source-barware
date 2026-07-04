#!/usr/bin/env node
/**
 * Walk-first setup — stations created from initial walk, not pre-built.
 */
const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";

const failures = [];
const log = (msg) => {
  console.log(msg);
};

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
  else log(`  ✓ ${msg}`);
}

async function api(method, route, body) {
  const opts = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${BASE}${route}`, opts);
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: r.ok, status: r.status, data };
}

async function main() {
  log("Walk-first setup flow test");

  await api("POST", "/api/hard-reset", {});
  await api("POST", "/api/config", { bar_name: "Walk First Bar" });
  await api("POST", "/api/phase/advance", { phase: "name_bar" });

  let adv = await api("POST", "/api/phase/advance", { phase: "voice_walk" });
  assert(adv.ok, "name_bar → voice_walk without pre-built stations");

  let bar = await api("GET", "/api/bar");
  assert(bar.data?.stations?.length === 0, "bar starts with zero stations at walk step");

  const walked = await api("POST", "/api/bar", {
    bar_name: "Walk First Bar",
    stations: [
      {
        id: "st_w1",
        name: "Well 1",
        type: "well",
        order: 0,
        bottles: [
          { id: "b1", name: "Tito's", category: "vodka", size: "750ml", par_level: 1, current_level: 1 },
        ],
      },
      {
        id: "st_w2",
        name: "Well 2",
        type: "well",
        order: 1,
        bottles: [
          { id: "b2", name: "Tanqueray", category: "gin", size: "750ml", par_level: 1, current_level: 1 },
        ],
      },
      {
        id: "st_bb",
        name: "Back bar",
        type: "back-bar",
        order: 2,
        bottles: [
          { id: "b3", name: "Patron Silver", category: "tequila", size: "750ml", par_level: 1, current_level: 1 },
        ],
      },
    ],
  });
  assert(walked.ok, "save walk-created stations");

  await api("POST", "/api/setup/voice-notes", {
    text: "Well one. Titos 750. Well two. Tanqueray 750. Back bar. Patron Silver 750.",
  });

  adv = await api("POST", "/api/phase/advance", { phase: "reconcile" });
  assert(adv.ok, "voice_walk → reconcile after walk");

  const recon = await api("POST", "/api/setup/reconcile", {});
  assert(recon.ok, "reconcile builds draft map");

  adv = await api("POST", "/api/phase/advance", { phase: "build_bar" });
  assert(adv.ok, "reconcile → build_bar after draft map");

  bar = await api("GET", "/api/bar");
  assert(bar.data?.stations?.length === 3, "build_bar shows 3 walk-created stations");
  assert(
    bar.data.stations.some((s) => /well 1/i.test(s.name)),
    "Well 1 station present"
  );

  await api("POST", "/api/bar", { stations_reviewed: true, stations: bar.data.stations });
  adv = await api("POST", "/api/phase/advance", { phase: "map_review" });
  assert(adv.ok, "build_bar → map_review after stations reviewed");

  const state = await api("GET", "/api/state");
  const phases = state.data?.phases?.map((p) => p.id) || [];
  const walkIdx = phases.indexOf("voice_walk");
  const buildIdx = phases.indexOf("build_bar");
  assert(walkIdx >= 0 && buildIdx > walkIdx, "phase rail: walk before build_bar review");

  if (failures.length) {
    log(`FAILED — ${failures.length} assertion(s)`);
    process.exit(1);
  }
  log("WALK-FIRST TEST PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});