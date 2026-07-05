import { cors, jsonError } from "../_shared/kv.js";
import { getGa4AccessToken, collectSiteMetrics } from "../_shared/ga4.js";
import { MARKETING_SITES } from "../_shared/marketing-sites.js";

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

    const days = Math.min(parseInt(url.searchParams.get("days") || "1", 10), 30);
    const accessToken = await getGa4AccessToken(env);

    const results = await Promise.all(
      MARKETING_SITES.map(async (site) => {
        try {
          return await collectSiteMetrics(accessToken, site, days);
        } catch (err) {
          return {
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
          };
        }
      })
    );

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

    return new Response(
      JSON.stringify({
        generated: new Date().toISOString(),
        period: { days },
        totals,
        sites: results,
      }),
      { headers: cors() }
    );
  } catch (err) {
    return jsonError(err.message || "marketing stats failed");
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}