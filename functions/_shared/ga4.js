const GA4_DATA_BASE = "https://analyticsdata.googleapis.com/v1beta/properties";
const GA4_TOKEN_URL = "https://oauth2.googleapis.com/token";

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

export async function ga4Report(accessToken, propertyId, body) {
  const response = await fetch(`${GA4_DATA_BASE}/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GA4 report failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
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

function periodDates(days) {
  if (days <= 1) {
    return { startDate: "today", endDate: "today" };
  }
  return { startDate: `${days}daysAgo`, endDate: "today" };
}

export async function collectSiteMetrics(accessToken, site, days) {
  const range = periodDates(days);

  const [core, channels, pages] = await Promise.all([
    ga4Report(accessToken, site.propertyId, {
      dateRanges: [range],
      metrics: [
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
    }),
    ga4Report(accessToken, site.propertyId, {
      dateRanges: [range],
      metrics: [{ name: "sessions" }],
      dimensions: [{ name: "sessionDefaultChannelGrouping" }],
      limit: 6,
    }),
    ga4Report(accessToken, site.propertyId, {
      dateRanges: [range],
      metrics: [{ name: "screenPageViews" }],
      dimensions: [{ name: "pageTitle" }],
      limit: 5,
    }),
  ]);

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