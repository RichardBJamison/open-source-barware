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