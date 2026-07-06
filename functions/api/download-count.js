import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";

// GET /api/download-count — public total for the download page gauge
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const kv = getVisitorKv(env);
    const total = parseInt((await kv.get("total_downloads")) || "0", 10);

    return new Response(JSON.stringify({ total }), {
      headers: {
        ...cors(),
        "Cache-Control": "public, max-age=15",
      },
    });
  } catch (err) {
    return jsonError(err.message || "download count failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}