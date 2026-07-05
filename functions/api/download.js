import {
  cors,
  getVisitorKv,
  jsonError,
  todayUtc,
} from "../_shared/kv.js";

// POST /api/download — records a program/file download
export async function onRequestPost(context) {
  const { request, env } = context;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const file = String(body.file || body.href || "").slice(0, 300);
  if (!file) {
    return jsonError("file is required", 400);
  }

  try {
    const kv = getVisitorKv(env);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hourStr = String(now.getUTCHours()).padStart(2, "0");
    const vid = String(body.vid || "").slice(0, 64);

    const download = {
      ts: now.toISOString(),
      file,
      label: String(body.label || "").slice(0, 120),
      path: String(body.path || "").slice(0, 200),
      vid,
    };

    const rand = crypto.randomUUID().slice(0, 8);
    const dlKey = `dl:${dateStr}:${hourStr}:${rand}`;

    const totalRaw = (await kv.get("total_downloads")) || "0";
    const total = parseInt(totalRaw, 10) + 1;

    const writes = [
      kv.put(dlKey, JSON.stringify(download), { expirationTtl: 2592000 }),
      kv.put("total_downloads", String(total)),
    ];

    if (vid) {
      writes.push(
        kv.put(`dl_uv:${dateStr}:${vid}`, "1", { expirationTtl: 2592000 })
      );
      const everKey = `dl_uv:ever:${vid}`;
      const seenBefore = await kv.get(everKey);
      if (!seenBefore) {
        writes.push(kv.put(everKey, "1"));
        const uniqueEver =
          parseInt((await kv.get("unique_downloaders_ever")) || "0", 10) + 1;
        writes.push(kv.put("unique_downloaders_ever", String(uniqueEver)));
      }
    }

    await Promise.all(writes);

    return new Response(JSON.stringify({ ok: true, count: total }), {
      headers: cors("GET, POST, OPTIONS"),
    });
  } catch (err) {
    return jsonError(err.message || "download tracking failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: cors("GET, POST, OPTIONS"),
  });
}