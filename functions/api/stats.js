// GET /api/stats — aggregated analytics dashboard data
// Query params:
//   days=7        number of days to include (default 7, max 30)
//   date=YYYY-MM-DD  specific date to drill into
//   key=SECRET    optional access key (set ANALYTICS_KEY in env to require it)
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Optional access control
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

  // Build date list to query
  const dates = [];
  if (drillDate) {
    dates.push(drillDate);
  } else {
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  // Collect all visit records for the date range
  const visits = [];
  for (const date of dates) {
    const prefix = `pv:${date}:`;
    let cursor = null;
    // Page through KV list results
    do {
      const listOpts = { prefix, limit: 1000 };
      if (cursor) listOpts.cursor = cursor;
      const list = await env.VISITOR_COUNTER.list(listOpts);
      // Fetch each value
      const batch = await Promise.all(
        list.keys.map(async (k) => {
          const raw = await env.VISITOR_COUNTER.get(k.name);
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })
      );
      visits.push(...batch.filter(Boolean));
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  }

  // Total visit counter
  const totalAllTime = parseInt(
    (await env.VISITOR_COUNTER.get("total_visits")) || "0",
    10
  );

  // ── Aggregate ──────────────────────────────────────────────────────

  const totalPageviews = visits.length;
  const uniqueVids = new Set(visits.filter((v) => v.vid).map((v) => v.vid));
  const uniqueVisitors = uniqueVids.size;
  const botVisits = visits.filter((v) => v.device === "Bot").length;
  const humanVisits = totalPageviews - botVisits;

  // By day
  const byDay = {};
  for (const v of visits) {
    const d = v.ts.slice(0, 10);
    if (!byDay[d]) byDay[d] = { views: 0, visitors: new Set() };
    byDay[d].views++;
    if (v.vid) byDay[d].visitors.add(v.vid);
  }
  const dailyTrend = Object.entries(byDay)
    .map(([date, data]) => ({
      date,
      views: data.views,
      unique: data.visitors.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // By hour (aggregate across all days)
  const byHour = Array(24).fill(0);
  for (const v of visits) {
    const h = new Date(v.ts).getUTCHours();
    byHour[h]++;
  }

  // Top pages
  const pageCounts = countBy(visits, "path");
  const topPages = topN(pageCounts, 20);

  // Referrer domains
  const refCounts = countBy(
    visits.filter((v) => v.refDomain && v.refDomain !== "opensourcebarware.com"),
    "refDomain"
  );
  const topReferrers = topN(refCounts, 20);

  // Full referrer URLs (top 20)
  const fullRefCounts = countBy(
    visits.filter((v) => v.ref && !v.ref.includes("opensourcebarware.com")),
    "ref"
  );
  const topRefUrls = topN(fullRefCounts, 20);

  // Countries
  const countryCounts = countBy(
    visits.filter((v) => v.country),
    "country"
  );
  const topCountries = topN(countryCounts, 30);

  // Cities
  const cityCounts = countBy(
    visits.filter((v) => v.city),
    "city"
  );
  const topCities = topN(cityCounts, 20);

  // Browsers
  const browserCounts = countBy(visits, "browser");
  const browsers = topN(browserCounts, 10);

  // OS
  const osCounts = countBy(visits, "os");
  const operatingSystems = topN(osCounts, 10);

  // Devices
  const deviceCounts = countBy(visits, "device");
  const devices = topN(deviceCounts, 5);

  // Screen sizes
  const screenCounts = countBy(
    visits.filter((v) => v.screen),
    "screen"
  );
  const topScreens = topN(screenCounts, 10);

  // UTM campaigns
  const campaignVisits = visits.filter((v) => v.utm_source);
  const utmSources = topN(countBy(campaignVisits, "utm_source"), 10);
  const utmMediums = topN(countBy(campaignVisits, "utm_medium"), 10);
  const utmCampaigns = topN(countBy(campaignVisits, "utm_campaign"), 10);

  // Languages
  const langCounts = countBy(
    visits.filter((v) => v.lang),
    "lang"
  );
  const languages = topN(langCounts, 10);

  // New vs returning
  const newVisitors = visits.filter((v) => !v.returning).length;
  const returningVisitors = visits.filter((v) => v.returning).length;

  // Average load time (exclude zeros)
  const loadTimes = visits.map((v) => v.loadTime).filter((t) => t > 0);
  const avgLoadTime =
    loadTimes.length > 0
      ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
      : 0;

  // Current live visitors (last 5 minutes)
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
      utm: { sources: utmSources, mediums: utmMediums, campaigns: utmCampaigns },
    }),
    { headers: cors() }
  );
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

// ── helpers ──────────────────────────────────────────────────────────

function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
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
