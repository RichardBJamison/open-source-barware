// POST /api/track — records a detailed pageview
export async function onRequestPost(context) {
  const { request, env } = context;

  // Cloudflare-provided geo/network data
  const cf = request.cf || {};
  const country = cf.country || request.headers.get("cf-ipcountry") || "";
  const city = cf.city || "";
  const region = cf.region || "";
  const regionCode = cf.regionCode || "";
  const timezone = cf.timezone || "";
  const continent = cf.continent || "";

  // Parse client-sent JSON body
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    // bare beacon with no body — still record the hit
  }

  const ua = request.headers.get("user-agent") || "";
  const serverRef = request.headers.get("referer") || "";

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hourStr = String(now.getUTCHours()).padStart(2, "0");

  const visit = {
    ts: now.toISOString(),
    // Page info
    page: body.page || "/",
    path: body.path || "/",
    title: body.title || "",
    // Referrer
    ref: body.referrer || serverRef,
    refDomain: extractDomain(body.referrer || serverRef),
    // Device / UA
    ua: ua.slice(0, 300),
    browser: parseBrowser(ua),
    os: parseOS(ua),
    device: parseDeviceType(ua),
    // Geo (from Cloudflare edge)
    country,
    city,
    region,
    regionCode,
    timezone,
    continent,
    // Client-reported
    screen: body.screen || "",
    viewport: body.viewport || "",
    lang: body.lang || "",
    connection: body.connection || "",
    loadTime: body.loadTime || 0,
    // Visitor identity
    vid: body.vid || "",
    returning: body.returning || false,
    sessionPageviews: body.sessionPageviews || 1,
    // UTM / campaign
    utm_source: body.utm_source || "",
    utm_medium: body.utm_medium || "",
    utm_campaign: body.utm_campaign || "",
    utm_term: body.utm_term || "",
    utm_content: body.utm_content || "",
  };

  // Generate a short unique key
  const rand = crypto.randomUUID().slice(0, 8);
  const pvKey = `pv:${dateStr}:${hourStr}:${rand}`;

  // Write visit record (30-day TTL) + bump total counter
  // 2 KV writes per pageview keeps us within free-tier limits
  const totalRaw = await env.VISITOR_COUNTER.get("total_visits");
  const total = parseInt(totalRaw || "0", 10) + 1;

  await Promise.all([
    env.VISITOR_COUNTER.put(pvKey, JSON.stringify(visit), {
      expirationTtl: 2592000,
    }),
    env.VISITOR_COUNTER.put("total_visits", String(total)),
  ]);

  return new Response(JSON.stringify({ ok: true, count: total }), {
    headers: cors(),
  });
}

// GET /api/track — simple count (backward compat for local dashboard)
export async function onRequestGet({ env }) {
  const count = parseInt(
    (await env.VISITOR_COUNTER.get("total_visits")) || "0",
    10
  );
  return new Response(JSON.stringify({ count }), { headers: cors() });
}

// OPTIONS — CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: cors(),
  });
}

// ── helpers ──────────────────────────────────────────────────────────

function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function extractDomain(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseBrowser(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("MSIE") || ua.includes("Trident/")) return "IE";
  return "Other";
}

function parseOS(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "macOS";
  if (ua.includes("CrOS")) return "ChromeOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Other";
}

function parseDeviceType(ua) {
  if (!ua) return "Unknown";
  if (
    ua.includes("Mobile") ||
    ua.includes("Android") ||
    ua.includes("iPhone")
  )
    return "Mobile";
  if (ua.includes("iPad") || ua.includes("Tablet")) return "Tablet";
  if (
    ua.includes("bot") ||
    ua.includes("Bot") ||
    ua.includes("crawl") ||
    ua.includes("spider") ||
    ua.includes("Crawl")
  )
    return "Bot";
  return "Desktop";
}
