import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";
import { loadSnapshot } from "../_shared/snapshot.js";

// GET /api/download-count — public total for the download page gauge
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const kv = getVisitorKv(env);
    const snap = await loadSnapshot(kv);
    const total = snap.totals.downloads || 0;

    return new Response(JSON.stringify({ total }), {
      headers: {
        ...cors(),
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return jsonError(err.message || "download count failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}