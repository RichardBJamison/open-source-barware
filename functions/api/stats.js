import {
  cors,
  dateRange,
  getVisitorKv,
  jsonError,
  todayUtc,
} from "../_shared/kv.js";
import {
  emptyDownloadRollup,
  emptyVisitRollup,
  mergeDownloadRollups,
  mergeVisitRollups,
  topN,
} from "../_shared/rollup.js";

const CACHE_TTL_SECONDS = 120;

function parseIntValue(raw) {
  return parseInt(raw || "0", 10);
}

function parseJsonValue(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function fetchKvMap(kv, keys) {
  const values = await Promise.all(keys.map((key) => kv.get(key)));
  const map = new Map();
  keys.forEach((key, index) => {
    map.set(key, values[index]);
  });
  return map;
}

function readInt(map, key) {
  return parseIntValue(map.get(key));
}

function readJson(map, key, fallback) {
  return parseJsonValue(map.get(key), fallback);
}

function isKvLimitError(message) {
  return /kv get\(\) limit exceeded/i.test(message || "");
}

function buildDegradedStats(days, dates, warning) {
  const emptyVisits = emptyVisitRollup();
  return {
    generated: new Date().toISOString(),
    degraded: true,
    warning,
    period: { days, dates },
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

// GET /api/stats — aggregated analytics dashboard data (get-only; no KV list())
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7", 10), 30);
  const drillDate = url.searchParams.get("date") || null;
  const dates = drillDate ? [drillDate] : dateRange(days);

  try {
    const kv = getVisitorKv(env);

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
    const today = todayUtc();
    const weekDates = dateRange(7);
    const allDates = [...new Set([...dates, ...weekDates, today])];

    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}${url.pathname}?days=${days}${drillDate ? `&date=${drillDate}` : ""}`,
      { method: "GET" }
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const keys = [
      "total_visits",
      "unique_visitors_ever",
      "total_downloads",
      "unique_downloaders_ever",
    ];

    for (const date of allDates) {
      keys.push(
        `visits_day:${date}`,
        `downloads_day:${date}`,
        `uv_day_count:${date}`,
        `dl_uv_day_count:${date}`
      );
    }

    for (const date of dates) {
      keys.push(`rollup:pv:${date}`, `rollup:dl:${date}`);
    }

    const kvMap = await fetchKvMap(kv, keys);

    const visitRollups = [];
    const downloadRollups = [];
    const dailyTrend = [];

    let periodPageviews = 0;
    let periodDownloads = 0;
    let periodUniqueVisitors = 0;
    let periodUniqueDownloaders = 0;

    for (const date of dates) {
      const dayViews = readInt(kvMap, `visits_day:${date}`);
      const dayDownloads = readInt(kvMap, `downloads_day:${date}`);
      const dayUnique = readInt(kvMap, `uv_day_count:${date}`);
      const dayDlUnique = readInt(kvMap, `dl_uv_day_count:${date}`);
      const visitRollup = readJson(kvMap, `rollup:pv:${date}`, null);
      const downloadRollup = readJson(kvMap, `rollup:dl:${date}`, null);

      periodPageviews += dayViews;
      periodDownloads += dayDownloads;
      periodUniqueVisitors += dayUnique;
      periodUniqueDownloaders += dayDlUnique;

      dailyTrend.push({
        date,
        views: dayViews,
        unique: dayUnique,
        downloads: dayDownloads,
      });

      if (visitRollup) visitRollups.push(visitRollup);
      if (downloadRollup) downloadRollups.push(downloadRollup);
    }

    dailyTrend.sort((a, b) => a.date.localeCompare(b.date));

    const mergedVisits = mergeVisitRollups(
      visitRollups.length ? visitRollups : [emptyVisitRollup()]
    );
    const mergedDownloads = mergeDownloadRollups(
      downloadRollups.length ? downloadRollups : [emptyDownloadRollup()]
    );

    const totalAllTime = readInt(kvMap, "total_visits");
    const uniqueVisitorsEver = readInt(kvMap, "unique_visitors_ever");
    const totalDownloadsAllTime = readInt(kvMap, "total_downloads");
    const uniqueDownloadersEver = readInt(kvMap, "unique_downloaders_ever");
    const todayUniqueVisitors = readInt(kvMap, `uv_day_count:${today}`);
    const todayVisitTotal = readInt(kvMap, `visits_day:${today}`);
    const todayDownloads = readInt(kvMap, `downloads_day:${today}`);
    const todayUniqueDownloaders = readInt(kvMap, `dl_uv_day_count:${today}`);

    let weekVisitTotal = 0;
    let weekDownloadTotal = 0;
    let weekUniqueVisitors = 0;
    let weekUniqueDownloaders = 0;

    for (const date of weekDates) {
      weekVisitTotal += readInt(kvMap, `visits_day:${date}`);
      weekDownloadTotal += readInt(kvMap, `downloads_day:${date}`);
      weekUniqueVisitors += readInt(kvMap, `uv_day_count:${date}`);
      weekUniqueDownloaders += readInt(kvMap, `dl_uv_day_count:${date}`);
    }

    const totalPageviews = periodPageviews || mergedVisits.humanVisits + mergedVisits.botVisits;
    const avgLoadTime =
      mergedVisits.loadTimeCount > 0
        ? Math.round(mergedVisits.loadTimeSum / mergedVisits.loadTimeCount)
        : 0;

    const externalReferrers = Object.fromEntries(
      Object.entries(mergedVisits.refDomains || {}).filter(
        ([name]) => name && name !== "opensourcebarware.com"
      )
    );
    const externalRefUrls = Object.fromEntries(
      Object.entries(mergedVisits.refs || {}).filter(
        ([name]) => name && !name.includes("opensourcebarware.com")
      )
    );

    const headers = {
      ...cors(),
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
    };

    const response = new Response(
      JSON.stringify({
        generated: new Date().toISOString(),
        period: { days, dates },
        overview: {
          totalAllTime,
          totalPageviews,
          humanVisits: mergedVisits.humanVisits,
          botVisits: mergedVisits.botVisits,
          uniqueVisitors: periodUniqueVisitors,
          newVisitors: mergedVisits.newVisitors,
          returningVisitors: mergedVisits.returningVisitors,
          avgLoadTime,
          liveNow: mergedVisits.recentTs.length,
          uniqueVisitorsEver,
          todayUniqueVisitors,
          todayVisitTotal,
          weekUniqueVisitors,
          weekVisitTotal,
          totalDownloadsAllTime,
          periodDownloads:
            periodDownloads ||
            Object.values(mergedDownloads.files || {}).reduce((a, b) => a + b, 0),
          periodUniqueDownloaders,
          uniqueDownloadersEver,
          todayDownloads,
          todayUniqueDownloaders,
          weekDownloads: weekDownloadTotal,
          weekUniqueDownloaders,
        },
        dailyTrend,
        hourlyDistribution: mergedVisits.hours,
        topPages: topN(mergedVisits.pages, 20),
        topReferrers: topN(externalReferrers, 20),
        topRefUrls: topN(externalRefUrls, 20),
        topCountries: topN(mergedVisits.countries, 30),
        topCities: topN(mergedVisits.cities, 20),
        browsers: topN(mergedVisits.browsers, 10),
        operatingSystems: topN(mergedVisits.os, 10),
        devices: topN(mergedVisits.devices, 5),
        topScreens: topN(mergedVisits.screens, 10),
        languages: topN(mergedVisits.langs, 10),
        topDownloads: topN(mergedDownloads.files, 10),
        utm: {
          sources: topN(mergedVisits.utm_source, 10),
          mediums: topN(mergedVisits.utm_medium, 10),
          campaigns: topN(mergedVisits.utm_campaign, 10),
        },
      }),
      { headers }
    );

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    const message = err.message || "stats aggregation failed";
    if (isKvLimitError(message)) {
      const headers = {
        ...cors(),
        "Cache-Control": "public, max-age=60, s-maxage=60",
      };
      return new Response(
        JSON.stringify(
          buildDegradedStats(
            days,
            dates,
            "First-party counters paused for today — Cloudflare KV daily read limit reached. Resets at midnight UTC."
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