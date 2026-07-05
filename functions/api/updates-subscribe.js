// Open Source Barware — release-list signup
// Collects an email at signup and delivers it to the owner's mailbox via
// Forward Email. No CRM / no GHL. The owner's inbox IS the list.
//
// Required Cloudflare Pages env:
//   FORWARD_EMAIL_USER  — a Forward Email alias with a generated password
//                         (e.g. richard@opensourcebarware.com)
//   FORWARD_EMAIL_PASS  — that alias's Forward Email mailbox password
// Optional:
//   NOTIFY_EMAIL        — where signups are delivered
//                         (default: richard@opensourcebarware.com)
//   FORWARD_EMAIL_FROM  — From address/label (default: FORWARD_EMAIL_USER)

const FORWARD_EMAIL_API = "https://api.forwardemail.net/v1/emails";
const DEFAULT_NOTIFY = "richard@opensourcebarware.com";

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

async function sendForwardEmail(env, { to, subject, text, replyTo }) {
  const user = env.FORWARD_EMAIL_USER;
  const pass = env.FORWARD_EMAIL_PASS;
  const auth = btoa(`${user}:${pass}`);
  const payload = {
    from: env.FORWARD_EMAIL_FROM || user,
    to,
    subject,
    text,
  };
  if (replyTo) payload.replyTo = replyTo;

  try {
    const res = await fetch(FORWARD_EMAIL_API, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail };
    }
    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}

function ownerNotifyText(details) {
  return [
    "New Open Source Barware release-list signup",
    "",
    `Email: ${details.email}`,
    details.city
      ? `City: ${details.city}, ${details.state || ""}`
      : "City: (not provided)",
    `Source: ${details.source}`,
    `Program updates: ${details.programUpdates ? "yes" : "no"}`,
    `Hidden Bar Tour: ${details.hiddenBarTour ? "yes" : "no"}`,
    `Received: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function subscriberWelcomeText(details) {
  const lines = [
    "Thanks for signing up for Open Source Barware.",
    "",
  ];
  if (details.programUpdates) {
    lines.push(
      "You're on the release list — we'll only email you when new additions ship."
    );
  }
  if (details.hiddenBarTour) {
    lines.push(
      "You're also on the World Hidden Bar Tour invite list for your city."
    );
  }
  lines.push(
    "",
    "OpenSourceBarware.com is a free, open-source bar inventory tool. No cost, no strings.",
    "",
    "— Open Source Barware",
    "https://opensourcebarware.com"
  );
  return lines.join("\n");
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Durable safety net: record every valid signup to KV before we try to email.
// Even if Forward Email is down, the address survives here and can be read back
// with `wrangler kv key list --binding OSB_SIGNUPS`. Never throws.
async function persistSignup(env, details) {
  if (!env.OSB_SIGNUPS) return { stored: false, reason: "no-kv-binding" };
  try {
    const stamp = new Date().toISOString();
    const key = `signup:${stamp}:${details.email}`;
    await env.OSB_SIGNUPS.put(
      key,
      JSON.stringify({ ...details, receivedAt: stamp }),
    );
    return { stored: true };
  } catch (error) {
    return {
      stored: false,
      reason: error instanceof Error ? error.message : "kv-put-failed",
    };
  }
}

export async function onRequestPost(context) {
  const { env } = context;

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
    return jsonResponse({ error: "Select at least one email preference." }, 400);
  }

  const details = {
    email,
    city,
    state,
    source,
    programUpdates,
    hiddenBarTour,
  };

  // 1) Durable capture FIRST — this is the record of truth. As long as this
  //    succeeds, the address is safe even if every email call below fails.
  const persisted = await persistSignup(env, details);

  const notifyTo = env.NOTIFY_EMAIL || DEFAULT_NOTIFY;

  // 2) Notify the owner by email (best-effort when we already have durable KV).
  const mailConfigured = Boolean(
    env.FORWARD_EMAIL_USER && env.FORWARD_EMAIL_PASS
  );
  const ownerResult = mailConfigured
    ? await sendForwardEmail(env, {
        to: notifyTo,
        subject: `New OSB signup: ${email}`,
        text: ownerNotifyText(details),
        replyTo: email,
      })
    : { ok: false, status: 0, detail: "mail-not-configured" };

  // Only a real failure if we captured the address NOWHERE — not KV, not email.
  // Then the client keeps it locally and retries, so nothing is ever lost.
  if (!persisted.stored && !ownerResult.ok) {
    return jsonResponse(
      {
        error: "Could not record your signup right now. Please try again shortly.",
        detail:
          ownerResult.detail ||
          persisted.reason ||
          `status ${ownerResult.status}`,
      },
      502
    );
  }

  // Confirmation to the subscriber is best-effort — the signup already counts.
  if (mailConfigured) {
    await sendForwardEmail(env, {
      to: email,
      subject: "You're on the Open Source Barware list",
      text: subscriberWelcomeText(details),
    }).catch(() => {});
  }

  let message = "You are on the list.";
  if (programUpdates && hiddenBarTour) {
    message =
      "You are on the release list and the Hidden Bar Tour invite list for your city.";
  } else if (hiddenBarTour) {
    message =
      "We will email you when World Hidden Bar Tours go online and invite you to your city's discovery run.";
  } else {
    message = "You are on the release list. We only email when new additions ship.";
  }

  return jsonResponse({ ok: true, message });
}
