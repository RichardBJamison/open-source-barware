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

async function getJson(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function getInt(kv, key) {
  return parseInt((await kv.get(key)) || "0", 10);
}

// GET /api/stats — aggregated analytics dashboard data (get-only; no KV list())
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const kv = getVisitorKv(env);
    const url = new URL(request.url);

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

    const days = Math.min(parseInt(url.searchParams.get("days") || "7", 10), 30);
    const drillDate = url.searchParams.get("date") || null;
    const dates = drillDate ? [drillDate] : dateRange(days);
    const today = todayUtc();
    const weekDates = dateRange(7);

    const visitRollups = [];
    const downloadRollups = [];
    const dailyTrend = [];

    let periodPageviews = 0;
    let periodDownloads = 0;
    let periodUniqueVisitors = 0;
    let periodUniqueDownloaders = 0;

    for (const date of dates) {
      const [dayViews, dayDownloads, dayUnique, dayDlUnique, visitRollup, downloadRollup] =
        await Promise.all([
          getInt(kv, `visits_day:${date}`),
          getInt(kv, `downloads_day:${date}`),
          getInt(kv, `uv_day_count:${date}`),
          getInt(kv, `dl_uv_day_count:${date}`),
          getJson(kv, `rollup:pv:${date}`, null),
          getJson(kv, `rollup:dl:${date}`, null),
        ]);

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

    const [
      totalAllTime,
      uniqueVisitorsEver,
      totalDownloadsAllTime,
      uniqueDownloadersEver,
      todayUniqueVisitors,
      todayVisitTotal,
      todayDownloads,
      todayUniqueDownloaders,
    ] = await Promise.all([
      getInt(kv, "total_visits"),
      getInt(kv, "unique_visitors_ever"),
      getInt(kv, "total_downloads"),
      getInt(kv, "unique_downloaders_ever"),
      getInt(kv, `uv_day_count:${today}`),
      getInt(kv, `visits_day:${today}`),
      getInt(kv, `downloads_day:${today}`),
      getInt(kv, `dl_uv_day_count:${today}`),
    ]);

    let weekVisitTotal = 0;
    let weekDownloadTotal = 0;
    let weekUniqueVisitors = 0;
    let weekUniqueDownloaders = 0;

    for (const date of weekDates) {
      weekVisitTotal += await getInt(kv, `visits_day:${date}`);
      weekDownloadTotal += await getInt(kv, `downloads_day:${date}`);
      weekUniqueVisitors += await getInt(kv, `uv_day_count:${date}`);
      weekUniqueDownloaders += await getInt(kv, `dl_uv_day_count:${date}`);
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

    return new Response(
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
          periodDownloads: periodDownloads || Object.values(mergedDownloads.files || {}).reduce((a, b) => a + b, 0),
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
      { headers: cors() }
    );
  } catch (err) {
    return jsonError(err.message || "stats aggregation failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}