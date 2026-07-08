import { cors, jsonError } from "../_shared/kv.js";
import {
  getGa4AccessToken,
  collectSiteMetrics,
  collectOsbGa4Detail,
} from "../_shared/ga4.js";
import { MARKETING_SITES } from "../_shared/marketing-sites.js";
import { parsePeriodParam, periodLabel } from "../_shared/periods.js";

const CACHE_TTL_SECONDS = 300;
const SITE_GAP_MS = 250;

// GET /api/marketing-stats — GA4 pull for all marketing sites
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
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

    const period = parsePeriodParam(url);

    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}${url.pathname}?period=${period}`,
      { method: "GET" }
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const accessToken = await getGa4AccessToken(env);

    const results = [];
    for (let i = 0; i < MARKETING_SITES.length; i++) {
      const site = MARKETING_SITES[i];
      try {
        results.push(await collectSiteMetrics(accessToken, site, period));
      } catch (err) {
        results.push({
          id: site.id,
          name: site.name,
          domain: site.domain,
          url: site.url,
          measurementId: site.measurementId,
          propertyId: site.propertyId,
          error: err.message || "GA4 fetch failed",
          activeNow: 0,
          activeUsers: 0,
          newUsers: 0,
          sessions: 0,
          pageViews: 0,
          events: 0,
          topChannels: [],
          topPages: [],
        });
      }
      if (i < MARKETING_SITES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, SITE_GAP_MS));
      }
    }

    const osbSite = MARKETING_SITES.find((site) => site.id === "osb");
    let osbGa4Detail = null;
    if (osbSite) {
      try {
        osbGa4Detail = await collectOsbGa4Detail(accessToken, osbSite, period);
      } catch (err) {
        osbGa4Detail = { error: err.message || "OSB GA4 detail failed" };
      }
    }

    const totals = results.reduce(
      (acc, site) => {
        if (site.error) {
          acc.errors += 1;
          return acc;
        }
        acc.activeNow += site.activeNow || 0;
        acc.activeUsers += site.activeUsers || 0;
        acc.newUsers += site.newUsers || 0;
        acc.sessions += site.sessions || 0;
        acc.pageViews += site.pageViews || 0;
        acc.events += site.events || 0;
        return acc;
      },
      {
        activeNow: 0,
        activeUsers: 0,
        newUsers: 0,
        sessions: 0,
        pageViews: 0,
        events: 0,
        errors: 0,
      }
    );

    const headers = {
      ...cors(),
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
    };

    const response = new Response(
      JSON.stringify({
        generated: new Date().toISOString(),
        period: { id: period, label: periodLabel(period) },
        totals,
        sites: results,
        osbGa4Detail,
      }),
      { headers }
    );

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return jsonError(err.message || "marketing stats failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}