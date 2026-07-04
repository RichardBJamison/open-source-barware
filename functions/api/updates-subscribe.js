const DEFAULT_LOCATION_ID = "bNT4wp0nukIQdBJbQDaa";
const GHL_BASE = "https://services.leadconnectorhq.com";
const SETUP_TAG = "osb-setup-signup";
const PROGRAM_UPDATES_TAG = "osb-program-updates";
const HIDDEN_BAR_TOUR_TAG = "osb-hidden-bar-tour";
const GHL_HEADERS = {
  Version: "2021-07-28",
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; OpenSourceBarware/1.0; +https://opensourcebarware.com)",
};

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

function ghlHeaders(token) {
  return { ...GHL_HEADERS, Authorization: `Bearer ${token}` };
}

async function notifyOwner(env, details) {
  const token = env.GHL_API_TOKEN;
  if (!token) return;

  const notifyTo = env.NOTIFY_EMAIL || "richard@opensourcebarware.com";
  const lines = [
    "New Open Source Barware release-list signup",
    "",
    `Email: ${details.email}`,
    details.city ? `City: ${details.city}, ${details.state || ""}` : "City: (not provided)",
    `Source: ${details.source}`,
    `Program updates: ${details.programUpdates ? "yes" : "no"}`,
    `Hidden Bar Tour: ${details.hiddenBarTour ? "yes" : "no"}`,
    details.contactId ? `GHL contact: ${details.contactId}` : "",
  ].filter(Boolean);

  if (details.contactId) {
    await fetch(`${GHL_BASE}/contacts/${details.contactId}/notes`, {
      method: "POST",
      headers: ghlHeaders(token),
      body: JSON.stringify({ body: lines.join("\n") }),
    }).catch(() => {});
  }

  const feUser = env.FORWARD_EMAIL_USER;
  const fePass = env.FORWARD_EMAIL_PASS;
  if (feUser && fePass) {
    const auth = btoa(`${feUser}:${fePass}`);
    await fetch("https://api.forwardemail.net/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FORWARD_EMAIL_FROM || "releases@opensourcebarware.com",
        to: notifyTo,
        subject: `OSB signup: ${details.email}`,
        text: lines.join("\n"),
      }),
    }).catch(() => {});
  }
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
  const programUpdates = payload.programUpdates !== false;
  const hiddenBarTour = Boolean(payload.hiddenBarTour);

  if (!isValidEmail(email)) {
    return jsonResponse({ error: "A valid email is required." }, 400);
  }
  if (hiddenBarTour) {
    if (!city || city.length < 2) {
      return jsonResponse(
        { error: "City is required for Hidden Bar Tour invites." },
        400
      );
    }
    if (!state) {
      return jsonResponse(
        { error: "State is required for Hidden Bar Tour invites." },
        400
      );
    }
  }
  if (!programUpdates && !hiddenBarTour) {
    return jsonResponse(
      { error: "Select at least one email preference." },
      400
    );
  }

  const tags = [SETUP_TAG];
  if (programUpdates) tags.push(PROGRAM_UPDATES_TAG);
  if (hiddenBarTour) tags.push(HIDDEN_BAR_TOUR_TAG);

  const body = {
    locationId,
    email,
    tags,
    source,
    country: "US",
  };
  if (city) body.city = city;
  if (state) body.state = state;

  try {
    const ghlResponse = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: ghlHeaders(token),
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

    let message = "You are on the list.";
    if (programUpdates && hiddenBarTour) {
      message =
        "You are on the release list and the Hidden Bar Tour invite list for your city.";
    } else if (hiddenBarTour) {
      message =
        "We will email you when World Hidden Bar Tours go online and invite you to your city's discovery run.";
    } else {
      message =
        "You are on the release list. We only email when new additions ship.";
    }

    const contactId = ghlData?.contact?.id || ghlData?.id || null;
    try {
      await notifyOwner(context.env, {
        email,
        city,
        state,
        source,
        programUpdates,
        hiddenBarTour,
        contactId,
      });
    } catch {
      // GHL save succeeded; notification is best-effort
    }

    return jsonResponse({
      ok: true,
      message,
      contactId,
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