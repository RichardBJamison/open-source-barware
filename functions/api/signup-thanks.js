// Sends the release-list thank-you after a signup.
// On opensourcebarware.com, /api/updates-subscribe is answered by the
// comms-lead-router Worker (GHL + owner alert), not this Pages project. The
// router writes signup:<iso>:<email> into the same KV namespace, so this
// endpoint only mails an address that signed up in the last two hours, and
// sendWelcomeOnce never mails the same address twice.

import { sendWelcomeOnce } from "../_shared/welcome.js";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

async function recentlySignedUp(kv, email) {
  const now = Date.now();
  for (const offset of [0, 1, 2]) {
    const hour = new Date(now - offset * 3600000).toISOString().slice(0, 13);
    let cursor;
    do {
      const page = await kv.list({ prefix: `signup:${hour}`, cursor });
      if (page.keys.some((key) => key.name.endsWith(`:${email}`))) return true;
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  return false;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestPost(context) {
  const { env } = context;
  if (!env.OSB_SIGNUPS) return jsonResponse({ ok: false, error: "storage-unavailable" }, 503);

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }
  const email = String(payload.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "A valid email is required." }, 400);
  }
  if (!(await recentlySignedUp(env.OSB_SIGNUPS, email))) {
    return jsonResponse({ ok: false, error: "no-recent-signup" }, 404);
  }

  const result = await sendWelcomeOnce(env, email);
  if (!result.ok) return jsonResponse({ ok: false, error: "send-failed" }, 502);
  return jsonResponse({ ok: true, sent: !result.skipped });
}
