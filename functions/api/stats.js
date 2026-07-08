import { cors, getVisitorKv, jsonError } from "../_shared/kv.js";
import { parsePeriodParam, periodLabel } from "../_shared/periods.js";
import { emptyVisitRollup } from "../_shared/rollup.js";
import {
  buildStatsFromSnapshot,
  loadSnapshot,
} from "../_shared/snapshot.js";

const CACHE_TTL_SECONDS = 600;

function isKvLimitError(message) {
  return /kv get\(\) limit exceeded/i.test(message || "");
}

function buildDegradedStats(period, warning) {
  const emptyVisits = emptyVisitRollup();
  return {
    generated: new Date().toISOString(),
    degraded: true,
    warning,
    source: "first-party-snapshot",
    period: { id: period, label: periodLabel(period), dates: [] },
    overview: {
      totalAllTime: 0,
      totalPageviews: 0,
      humanVisits: 0,
      botVisits: 0,
      uniqueVisitors: 0,
      newVisitors: 0,
      returningVisitors: 0,
      avgLoadTime: 0,
      liveNow: 0,
      uniqueVisitorsEver: 0,
      todayUniqueVisitors: 0,
      todayVisitTotal: 0,
      weekUniqueVisitors: 0,
      weekVisitTotal: 0,
      totalDownloadsAllTime: 0,
      periodDownloads: 0,
      periodUniqueDownloaders: 0,
      uniqueDownloadersEver: 0,
      todayDownloads: 0,
      todayUniqueDownloaders: 0,
      weekDownloads: 0,
      weekUniqueDownloaders: 0,
    },
    dailyTrend: [],
    hourlyDistribution: emptyVisits.hours,
    topPages: [],
    topReferrers: [],
    topRefUrls: [],
    topCountries: [],
    topCities: [],
    browsers: [],
    operatingSystems: [],
    devices: [],
    topScreens: [],
    languages: [],
    topDownloads: [],
    utm: {
      sources: [],
      mediums: [],
      campaigns: [],
    },
  };
}

// GET /api/stats — first-party dashboard (1 KV read via snapshot)
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const period = parsePeriodParam(url);

  try {
    const requiredKey = env.ANALYTICS_KEY;
    if (requiredKey) {
      const provided = url.searchParams.get("key") || "";
      if (provided !== requiredKey) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: cors(),
        });
      }
    }

    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}${url.pathname}?period=${period}`,
      { method: "GET" }
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const kv = getVisitorKv(env);
    const snap = await loadSnapshot(kv);
    const payload = buildStatsFromSnapshot(snap, period);

    const headers = {
      ...cors(),
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
    };

    const response = new Response(JSON.stringify(payload), { headers });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    const message = err.message || "stats aggregation failed";
    if (isKvLimitError(message)) {
      const headers = {
        ...cors(),
        "Cache-Control": "public, max-age=120, s-maxage=120",
      };
      return new Response(
        JSON.stringify(
          buildDegradedStats(
            period,
            "First-party snapshot paused — Cloudflare KV daily limit reached. GA4 data below still works. Resets at midnight UTC."
          )
        ),
        { headers }
      );
    }
    return jsonError(message);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}