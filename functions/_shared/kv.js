export function getVisitorKv(env) {
  const kv = env?.VISITOR_COUNTER;
  if (!kv) {
    throw new Error(
      "VISITOR_COUNTER KV binding is missing. Bind namespace ea495eafc1904a36b558bcb2117bebe6 in wrangler.toml or Cloudflare Pages settings."
    );
  }
  return kv;
}

export function cors(methods = "GET, OPTIONS") {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

export function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: cors(),
  });
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function dateRange(days, end = new Date()) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function listByPrefix(kv, prefix) {
  const items = [];
  let cursor = null;
  do {
    const listOpts = { prefix, limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);
    const batch = await Promise.all(
      list.keys.map(async (k) => {
        const raw = await kv.get(k.name);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return { key: k.name, value: raw };
        }
      })
    );
    items.push(...batch.filter(Boolean));
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return items;
}

export async function countKeysByPrefix(kv, prefix) {
  let count = 0;
  let cursor = null;
  do {
    const listOpts = { prefix, limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);
    count += list.keys.length;
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return count;
}