import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";
import { loadSnapshot } from "../_shared/snapshot.js";

/**
 * Floor after 2026-07-10 reconcile: snapshot model only kept Jul 9–10
 * (7 downloads) while operator count was ~47. Real totals should only rise.
 * When KV totals exceed this, the higher value wins.
 */
const DOWNLOAD_COUNT_FLOOR = 47;

// GET /api/download-count — public total for the download page gauge
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const kv = getVisitorKv(env);
    const snap = await loadSnapshot(kv);
    const raw = Number(snap.totals?.downloads) || 0;
    const total = Math.max(raw, DOWNLOAD_COUNT_FLOOR);

    return new Response(JSON.stringify({ total, raw }), {
      headers: {
        ...cors(),
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (err) {
    return jsonError(err.message || "download count failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}