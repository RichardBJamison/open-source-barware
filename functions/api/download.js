import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";
import {
  applyDownloadToSnapshot,
  loadSnapshot,
  saveSnapshot,
} from "../_shared/snapshot.js";

// POST /api/download — records a program/file download (snapshot model)
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
    const vid = String(body.vid || "").slice(0, 64);

    const download = {
      ts: now.toISOString(),
      file,
      label: String(body.label || "").slice(0, 120),
      path: String(body.path || "").slice(0, 200),
      vid,
    };

    let newToday = false;
    let newEver = false;

    if (vid) {
      const dayUvKey = `dl_uv:${dateStr}:${vid}`;
      const seenToday = await kv.get(dayUvKey);
      if (!seenToday) {
        newToday = true;
        await kv.put(dayUvKey, "1", { expirationTtl: 2592000 });
      }

      const everKey = `dl_uv:ever:${vid}`;
      const seenBefore = await kv.get(everKey);
      if (!seenBefore) {
        newEver = true;
        await kv.put(everKey, "1");
      }
    }

    const snap = await loadSnapshot(kv);
    applyDownloadToSnapshot(snap, download, { dateStr, newToday, newEver });
    await saveSnapshot(kv, snap);

    return new Response(JSON.stringify({ ok: true, count: snap.totals.downloads }), {
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