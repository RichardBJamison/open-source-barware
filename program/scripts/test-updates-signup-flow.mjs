#!/usr/bin/env node
/**
 * Simulates updates signup: API + phase advance (what the Join button should do).
 */
const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const API = `${BASE}/api/updates-subscribe`;

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

async function main() {
  await api("POST", "/api/hard-reset", {});
  let state = await api("GET", "/api/state");
  console.log("after reset phase:", state.data.phase);

  const sub = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "flow-test@example.com",
      source: "chrome-program-setup",
      programUpdates: true,
      hiddenBarTour: false,
    }),
  });
  const subData = await sub.json().catch(() => ({}));
  console.log("subscribe:", sub.status, subData);

  const adv = await api("POST", "/api/phase/advance", { phase: "name_bar" });
  console.log("advance name_bar:", adv.ok, adv.data);

  state = await api("GET", "/api/state");
  console.log("final phase:", state.data.phase);
  if (!sub.ok || !adv.ok || state.data.phase !== "name_bar") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});