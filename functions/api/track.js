import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";

// POST /api/track — records a detailed pageview
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const kv = getVisitorKv(env);

    const cf = request.cf || {};
    const country = cf.country || request.headers.get("cf-ipcountry") || "";
    const city = cf.city || "";
    const region = cf.region || "";
    const regionCode = cf.regionCode || "";
    const timezone = cf.timezone || "";
    const continent = cf.continent || "";

    let body = {};
    try {
      body = await request.json();
    } catch {
      // bare beacon with no body — still record the hit
    }

    const ua = request.headers.get("user-agent") || "";
    const serverRef = request.headers.get("referer") || "";

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hourStr = String(now.getUTCHours()).padStart(2, "0");
    const vid = String(body.vid || "").slice(0, 64);

    const visit = {
      ts: now.toISOString(),
      page: body.page || "/",
      path: body.path || "/",
      title: body.title || "",
      ref: body.referrer || serverRef,
      refDomain: extractDomain(body.referrer || serverRef),
      ua: ua.slice(0, 300),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      device: parseDeviceType(ua),
      country,
      city,
      region,
      regionCode,
      timezone,
      continent,
      screen: body.screen || "",
      viewport: body.viewport || "",
      lang: body.lang || "",
      connection: body.connection || "",
      loadTime: body.loadTime || 0,
      vid,
      returning: body.returning || false,
      sessionPageviews: body.sessionPageviews || 1,
      utm_source: body.utm_source || "",
      utm_medium: body.utm_medium || "",
      utm_campaign: body.utm_campaign || "",
      utm_term: body.utm_term || "",
      utm_content: body.utm_content || "",
    };

    const rand = crypto.randomUUID().slice(0, 8);
    const pvKey = `pv:${dateStr}:${hourStr}:${rand}`;

    const totalRaw = await kv.get("total_visits");
    const total = parseInt(totalRaw || "0", 10) + 1;

    const dayVisitsRaw = (await kv.get(`visits_day:${dateStr}`)) || "0";
    const dayVisits = parseInt(dayVisitsRaw, 10) + 1;

    const writes = [
      kv.put(pvKey, JSON.stringify(visit), { expirationTtl: 2592000 }),
      kv.put("total_visits", String(total)),
      kv.put(`visits_day:${dateStr}`, String(dayVisits), {
        expirationTtl: 2592000,
      }),
    ];

    if (vid) {
      writes.push(
        kv.put(`uv:${dateStr}:${vid}`, "1", { expirationTtl: 2592000 })
      );
      const everKey = `uv:ever:${vid}`;
      const seenBefore = await kv.get(everKey);
      if (!seenBefore) {
        writes.push(kv.put(everKey, "1"));
        const uniqueEver =
          parseInt((await kv.get("unique_visitors_ever")) || "0", 10) + 1;
        writes.push(kv.put("unique_visitors_ever", String(uniqueEver)));
      }
    }

    await Promise.all(writes);

    return new Response(JSON.stringify({ ok: true, count: total }), {
      headers: cors("GET, POST, OPTIONS"),
    });
  } catch (err) {
    return jsonError(err.message || "pageview tracking failed");
  }
}

// GET /api/track — simple count (backward compat)
export async function onRequestGet({ env }) {
  try {
    const kv = getVisitorKv(env);
    const count = parseInt((await kv.get("total_visits")) || "0", 10);
    return new Response(JSON.stringify({ count }), { headers: cors("GET, POST, OPTIONS") });
  } catch (err) {
    return jsonError(err.message || "pageview count failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: cors("GET, POST, OPTIONS"),
  });
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