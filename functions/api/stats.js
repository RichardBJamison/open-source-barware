import {
  cors,
  countKeysByPrefix,
  dateRange,
  getVisitorKv,
  jsonError,
  listByPrefix,
  todayUtc,
} from "../_shared/kv.js";

// GET /api/stats — aggregated analytics dashboard data
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

    const visits = [];
    const downloads = [];

    for (const date of dates) {
      const dayVisits = await listByPrefix(kv, `pv:${date}:`);
      visits.push(...dayVisits);
      const dayDownloads = await listByPrefix(kv, `dl:${date}:`);
      downloads.push(...dayDownloads);
    }

    const today = todayUtc();
    const weekDates = dateRange(7);

    const totalAllTime = parseInt((await kv.get("total_visits")) || "0", 10);
    const uniqueVisitorsEver = parseInt(
      (await kv.get("unique_visitors_ever")) || "0",
      10
    );
    const totalDownloadsAllTime = parseInt(
      (await kv.get("total_downloads")) || "0",
      10
    );
    const uniqueDownloadersEver = parseInt(
      (await kv.get("unique_downloaders_ever")) || "0",
      10
    );

    const todayUniqueVisitors = await countKeysByPrefix(kv, `uv:${today}:`);
    const todayUniqueDownloaders = await countKeysByPrefix(kv, `dl_uv:${today}:`);

    let weekUniqueVisitors = 0;
    let weekUniqueDownloaders = 0;
    const weekVisitorIds = new Set();
    const weekDownloaderIds = new Set();

    for (const date of weekDates) {
      const uvCount = await countKeysByPrefix(kv, `uv:${date}:`);
      weekUniqueVisitors += uvCount;
      const dlUvCount = await countKeysByPrefix(kv, `dl_uv:${date}:`);
      weekUniqueDownloaders += dlUvCount;
    }

    for (const v of visits) {
      if (v.vid && weekDates.includes(v.ts?.slice(0, 10))) {
        weekVisitorIds.add(v.vid);
      }
    }
    for (const d of downloads) {
      if (d.vid && weekDates.includes(d.ts?.slice(0, 10))) {
        weekDownloaderIds.add(d.vid);
      }
    }

    const todayDownloads = downloads.filter((d) => d.ts?.startsWith(today));
    const weekDownloads = downloads.filter((d) =>
      weekDates.includes(d.ts?.slice(0, 10))
    );

    const totalPageviews = visits.length;
    const uniqueVids = new Set(visits.filter((v) => v.vid).map((v) => v.vid));
    const uniqueVisitors = uniqueVids.size;
    const botVisits = visits.filter((v) => v.device === "Bot").length;
    const humanVisits = totalPageviews - botVisits;

    const uniqueDownloadVids = new Set(
      downloads.filter((d) => d.vid).map((d) => d.vid)
    );

    const byDay = {};
    for (const v of visits) {
      const d = v.ts.slice(0, 10);
      if (!byDay[d]) byDay[d] = { views: 0, visitors: new Set(), downloads: 0 };
      byDay[d].views++;
      if (v.vid) byDay[d].visitors.add(v.vid);
    }
    for (const dl of downloads) {
      const d = dl.ts.slice(0, 10);
      if (!byDay[d]) byDay[d] = { views: 0, visitors: new Set(), downloads: 0 };
      byDay[d].downloads++;
    }

    const dailyTrend = Object.entries(byDay)
      .map(([date, data]) => ({
        date,
        views: data.views,
        unique: data.visitors.size,
        downloads: data.downloads,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byHour = Array(24).fill(0);
    for (const v of visits) {
      const h = new Date(v.ts).getUTCHours();
      byHour[h]++;
    }

    const pageCounts = countBy(visits, "path");
    const topPages = topN(pageCounts, 20);

    const refCounts = countBy(
      visits.filter((v) => v.refDomain && v.refDomain !== "opensourcebarware.com"),
      "refDomain"
    );
    const topReferrers = topN(refCounts, 20);

    const fullRefCounts = countBy(
      visits.filter((v) => v.ref && !v.ref.includes("opensourcebarware.com")),
      "ref"
    );
    const topRefUrls = topN(fullRefCounts, 20);

    const countryCounts = countBy(
      visits.filter((v) => v.country),
      "country"
    );
    const topCountries = topN(countryCounts, 30);

    const cityCounts = countBy(
      visits.filter((v) => v.city),
      "city"
    );
    const topCities = topN(cityCounts, 20);

    const browserCounts = countBy(visits, "browser");
    const browsers = topN(browserCounts, 10);

    const osCounts = countBy(visits, "os");
    const operatingSystems = topN(osCounts, 10);

    const deviceCounts = countBy(visits, "device");
    const devices = topN(deviceCounts, 5);

    const screenCounts = countBy(
      visits.filter((v) => v.screen),
      "screen"
    );
    const topScreens = topN(screenCounts, 10);

    const campaignVisits = visits.filter((v) => v.utm_source);
    const utmSources = topN(countBy(campaignVisits, "utm_source"), 10);
    const utmMediums = topN(countBy(campaignVisits, "utm_medium"), 10);
    const utmCampaigns = topN(countBy(campaignVisits, "utm_campaign"), 10);

    const langCounts = countBy(
      visits.filter((v) => v.lang),
      "lang"
    );
    const languages = topN(langCounts, 10);

    const downloadFileCounts = countBy(downloads, "file");
    const topDownloads = topN(downloadFileCounts, 10);

    const newVisitors = visits.filter((v) => !v.returning).length;
    const returningVisitors = visits.filter((v) => v.returning).length;

    const loadTimes = visits.map((v) => v.loadTime).filter((t) => t > 0);
    const avgLoadTime =
      loadTimes.length > 0
        ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
        : 0;

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const liveNow = visits.filter((v) => v.ts > fiveMinAgo).length;

    return new Response(
      JSON.stringify({
        generated: new Date().toISOString(),
        period: { days, dates },
        overview: {
          totalAllTime,
          totalPageviews,
          humanVisits,
          botVisits,
          uniqueVisitors,
          newVisitors,
          returningVisitors,
          avgLoadTime,
          liveNow,
          uniqueVisitorsEver,
          todayUniqueVisitors,
          weekUniqueVisitors: Math.max(weekUniqueVisitors, weekVisitorIds.size),
          totalDownloadsAllTime,
          periodDownloads: downloads.length,
          periodUniqueDownloaders: uniqueDownloadVids.size,
          uniqueDownloadersEver,
          todayDownloads: todayDownloads.length,
          todayUniqueDownloaders,
          weekDownloads: weekDownloads.length,
          weekUniqueDownloaders: Math.max(
            weekUniqueDownloaders,
            weekDownloaderIds.size
          ),
        },
        dailyTrend,
        hourlyDistribution: byHour,
        topPages,
        topReferrers,
        topRefUrls,
        topCountries,
        topCities,
        browsers,
        operatingSystems,
        devices,
        topScreens,
        languages,
        topDownloads,
        utm: { sources: utmSources, mediums: utmMediums, campaigns: utmCampaigns },
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

function countBy(arr, key) {
  const map = {};
  for (const item of arr) {
    const val = item[key] || "(unknown)";
    map[val] = (map[val] || 0) + 1;
  }
  return map;
}

function topN(map, n) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}