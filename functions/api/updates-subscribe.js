const DEFAULT_LOCATION_ID = "bNT4wp0nukIQdBJbQDaa";
const GHL_BASE = "https://services.leadconnectorhq.com";
const UPDATE_TAGS = ["osb-program-updates", "osb-setup-signup"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const token = context.env.GHL_API_TOKEN;
  const locationId = context.env.GHL_LOCATION_ID || DEFAULT_LOCATION_ID;

  if (!token) {
    return jsonResponse(
      {
        error:
          "Updates signup is not configured on the server yet. Set GHL_API_TOKEN in Cloudflare Pages.",
      },
      503
    );
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const city = String(payload.city || "").trim();
  const state = String(payload.state || "")
    .trim()
    .toUpperCase();
  const source = String(payload.source || "program-setup").trim();

  if (!isValidEmail(email)) {
    return jsonResponse({ error: "A valid email is required." }, 400);
  }
  if (!city || city.length < 2) {
    return jsonResponse({ error: "City is required." }, 400);
  }
  if (!state) {
    return jsonResponse({ error: "State is required." }, 400);
  }

  const body = {
    locationId,
    email,
    city,
    state,
    tags: UPDATE_TAGS,
    source,
    country: "US",
  };

  try {
    const ghlResponse = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; OpenSourceBarware/1.0; +https://opensourcebarware.com)",
      },
      body: JSON.stringify(body),
    });

    const ghlData = await ghlResponse.json().catch(() => ({}));

    if (!ghlResponse.ok) {
      const detail =
        ghlData?.message ||
        ghlData?.error ||
        ghlData?.msg ||
        "Could not save contact.";
      return jsonResponse({ error: detail }, ghlResponse.status === 401 ? 503 : 502);
    }

    return jsonResponse({
      ok: true,
      message:
        "You are on the release list. We only email when new additions ship.",
      contactId: ghlData?.contact?.id || ghlData?.id || null,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Signup service unavailable.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      502
    );
  }
}