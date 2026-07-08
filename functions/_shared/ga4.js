import { ga4DateRange } from "./periods.js";

const GA4_DATA_BASE = "https://analyticsdata.googleapis.com/v1beta/properties";
const GA4_TOKEN_URL = "https://oauth2.googleapis.com/token";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedToken = null;
let cachedTokenExpiresAt = 0;

export async function getGa4AccessToken(env) {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = env.GA_CLIENT_ID;
  const clientSecret = env.GA_CLIENT_SECRET;
  const refreshToken = env.GA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GA4 credentials missing. Set GA_CLIENT_ID, GA_CLIENT_SECRET, and GA_REFRESH_TOKEN in Cloudflare Pages secrets."
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GA4_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GA4 token refresh failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export async function ga4Report(accessToken, propertyId, body, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${GA4_DATA_BASE}/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < retries) {
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GA4 report failed (${response.status}): ${text.slice(0, 200)}`);
    }

    return response.json();
  }

  throw new Error("GA4 report failed (429): rate limit exceeded after retries");
}

export async function ga4Realtime(accessToken, propertyId) {
  const response = await fetch(`${GA4_DATA_BASE}/${propertyId}:runRealtimeReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
  });

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  const rows = data.rows || [];
  if (!rows.length) return 0;
  return parseInt(rows[0].metricValues?.[0]?.value || "0", 10);
}

function firstMetric(result, index = 0) {
  try {
    return parseInt(result.rows[0].metricValues[index].value, 10);
  } catch {
    return 0;
  }
}

function mapRows(result, { dimIndex = 0, metricIndex = 0 } = {}) {
  return (result.rows || []).map((row) => ({
    name: row.dimensionValues?.[dimIndex]?.value || "(not set)",
    count: parseInt(row.metricValues?.[metricIndex]?.value || "0", 10),
  }));
}

function formatGaDate(raw) {
  if (!raw || raw.length !== 8) return raw;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export async function collectOsbGa4Detail(accessToken, site, periodId) {
  const range = ga4DateRange(periodId);

  const core = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [
      { name: "activeUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "engagementRate" },
    ],
  });

  const daily = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  const hourly = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    dimensions: [{ name: "hour" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ dimension: { dimensionName: "hour" } }],
  });

  const pages = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "screenPageViews" }],
    dimensions: [{ name: "pagePath" }],
    limit: 20,
  });

  const channels = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "sessions" }],
    dimensions: [{ name: "sessionDefaultChannelGrouping" }],
    limit: 12,
  });

  const countries = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "screenPageViews" }],
    dimensions: [{ name: "country" }],
    limit: 20,
  });

  const cities = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "screenPageViews" }],
    dimensions: [{ name: "city" }],
    limit: 15,
  });

  const tech = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "screenPageViews" }],
    dimensions: [
      { name: "browser" },
      { name: "operatingSystem" },
      { name: "deviceCategory" },
    ],
    limit: 50,
  });

  const activeNow = await ga4Realtime(accessToken, site.propertyId);

  const hours = Array(24).fill(0);
  for (const row of hourly.rows || []) {
    const hour = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
    const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
    if (hour >= 0 && hour < 24) hours[hour] = views;
  }

  const browsers = {};
  const operatingSystems = {};
  const devices = {};
  for (const row of tech.rows || []) {
    const browser = row.dimensionValues?.[0]?.value;
    const os = row.dimensionValues?.[1]?.value;
    const device = row.dimensionValues?.[2]?.value;
    const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
    if (browser) browsers[browser] = (browsers[browser] || 0) + views;
    if (os) operatingSystems[os] = (operatingSystems[os] || 0) + views;
    if (device) devices[device] = (devices[device] || 0) + views;
  }

  const topList = (map) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

  return {
    source: "ga4",
    propertyId: site.propertyId,
    measurementId: site.measurementId,
    activeNow,
    activeUsers: firstMetric(core, 0),
    newUsers: firstMetric(core, 1),
    sessions: firstMetric(core, 2),
    pageViews: firstMetric(core, 3),
    avgSessionSeconds: firstMetric(core, 4),
    engagementRate: firstMetric(core, 5),
    dailyTrend: (daily.rows || []).map((row) => ({
      date: formatGaDate(row.dimensionValues?.[0]?.value || ""),
      views: parseInt(row.metricValues?.[0]?.value || "0", 10),
      unique: parseInt(row.metricValues?.[1]?.value || "0", 10),
      downloads: 0,
    })),
    hourlyDistribution: hours,
    topPages: mapRows(pages),
    topReferrers: mapRows(channels),
    topCountries: mapRows(countries),
    topCities: mapRows(cities),
    browsers: topList(browsers).slice(0, 10),
    operatingSystems: topList(operatingSystems).slice(0, 10),
    devices: topList(devices).slice(0, 5),
    topScreens: [],
    languages: [],
    topRefUrls: [],
    utm: { sources: [], mediums: [], campaigns: [] },
  };
}

export async function collectSiteMetrics(accessToken, site, periodId) {
  const range = ga4DateRange(periodId);

  const core = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [
      { name: "activeUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  });

  const channels = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "sessions" }],
    dimensions: [{ name: "sessionDefaultChannelGrouping" }],
    limit: 6,
  });

  const pages = await ga4Report(accessToken, site.propertyId, {
    dateRanges: [range],
    metrics: [{ name: "screenPageViews" }],
    dimensions: [{ name: "pageTitle" }],
    limit: 5,
  });

  const activeNow = await ga4Realtime(accessToken, site.propertyId);

  return {
    id: site.id,
    name: site.name,
    domain: site.domain,
    url: site.url,
    measurementId: site.measurementId,
    propertyId: site.propertyId,
    activeNow,
    activeUsers: firstMetric(core, 0),
    newUsers: firstMetric(core, 1),
    sessions: firstMetric(core, 2),
    pageViews: firstMetric(core, 3),
    events: firstMetric(core, 4),
    topChannels: (channels.rows || []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value || "(not set)",
      sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
    })),
    topPages: (pages.rows || []).map((row) => ({
      title: row.dimensionValues?.[0]?.value || "(not set)",
      views: parseInt(row.metricValues?.[0]?.value || "0", 10),
    })),
  };
}