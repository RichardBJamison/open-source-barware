// Open Source Barware — release-list signup
// Collects emails for the release list (stored in KV under OSB_SIGNUPS),
// emails the owner a notification, and sends the subscriber one short
// thank-you from yourfriends@ (once per address).
//
// Mail goes out through Migadu SMTP as yourfriends@ — see
// functions/_shared/smtp.js (needs the SMTP_PASS Pages secret).
// Optional:
//   NOTIFY_EMAIL — owner alert destination (default rjamison@opensourcebarware.com)

import { sendMail } from "../_shared/smtp.js";

const SITE_URL = "https://opensourcebarware.com";
const DEFAULT_NOTIFY = "rjamison@opensourcebarware.com";
const OWNER_REPLY_TO = "Richard Jamison <rjamison@opensourcebarware.com>";

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandedFrom(env) {
  return `Open Source Barware <${env.SMTP_USER || "yourfriends@opensourcebarware.com"}>`;
}

function ownerNotifyContent(details) {
  const cityLine = details.city
    ? `${details.city}, ${details.state || ""}`
    : "(not provided)";
  const text = [
    "New release-list signup — Open Source Barware",
    "",
    `Subscriber: ${details.email}`,
    `City: ${cityLine}`,
    `Source: ${details.source}`,
    `Program updates: ${details.programUpdates ? "yes" : "no"}`,
    `Hidden Bar Tour: ${details.hiddenBarTour ? "yes" : "no"}`,
    `Received: ${new Date().toISOString()}`,
    "",
    SITE_URL,
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;color:#1c1815;max-width:560px;line-height:1.5">
      <p style="margin:0 0 12px;font-size:18px;color:#a8784f">New release-list signup</p>
      <p style="margin:0 0 8px"><strong>Subscriber:</strong> ${escapeHtml(details.email)}</p>
      <p style="margin:0 0 8px"><strong>City:</strong> ${escapeHtml(cityLine)}</p>
      <p style="margin:0 0 8px"><strong>Source:</strong> ${escapeHtml(details.source)}</p>
      <p style="margin:0 0 8px"><strong>Program updates:</strong> ${details.programUpdates ? "yes" : "no"}</p>
      <p style="margin:0 0 8px"><strong>Hidden Bar Tour:</strong> ${details.hiddenBarTour ? "yes" : "no"}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#7a6e62">${escapeHtml(new Date().toISOString())}</p>
    </div>
  `.trim();

  return { text, html };
}

function subscriberWelcomeContent() {
  const inventoryUrl = `${SITE_URL}/free-bar-inventory-software`;
  const reservationsUrl = "https://www.reservationrelief.com";
  const text = [
    "Hi there,",
    "",
    "Thank you for signing up and giving Open Source Barware a try. It genuinely means a lot to us.",
    "",
    "When you have a minute, we'd love for you to check out our free bar inventory software and our reservation software:",
    "",
    `Free bar inventory software: ${inventoryUrl}`,
    `Reservation software: ${reservationsUrl}`,
    "",
    "If you have a question or something isn't working right, just reply to this email. A real person reads every one.",
    "",
    "Cheers,",
    "Richard Jamison",
    "Open Source Barware",
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;color:#1c1815;max-width:560px;line-height:1.6;font-size:16px">
      <p style="margin:0 0 14px">Hi there,</p>
      <p style="margin:0 0 14px">Thank you for signing up and giving Open Source Barware a try. It genuinely means a lot to us.</p>
      <p style="margin:0 0 14px">When you have a minute, we'd love for you to check out our
        <a href="${inventoryUrl}" style="color:#a8784f">free bar inventory software</a> and our
        <a href="${reservationsUrl}" style="color:#a8784f">reservation software</a>.</p>
      <p style="margin:0 0 14px">If you have a question or something isn't working right, just reply to this email. A real person reads every one.</p>
      <p style="margin:0">Cheers,<br>Richard Jamison<br>Open Source Barware</p>
    </div>
  `.trim();

  return { text, html };
}

// Sends the thank-you once per address; retried signups and repeat
// downloads do not send it again.
async function sendWelcomeOnce(env, email) {
  const key = `thanked:${email}`;
  if (env.OSB_SIGNUPS && (await env.OSB_SIGNUPS.get(key))) return { ok: true, skipped: true };
  const content = subscriberWelcomeContent();
  const result = await sendMail(env, {
    from: brandedFrom(env),
    to: email,
    subject: "Thank you from Open Source Barware",
    text: content.text,
    html: content.html,
    replyTo: OWNER_REPLY_TO,
    headers: {
      "List-Unsubscribe": "<mailto:rjamison@opensourcebarware.com?subject=unsubscribe>",
    },
  });
  if (result.ok && env.OSB_SIGNUPS) await env.OSB_SIGNUPS.put(key, new Date().toISOString());
  if (!result.ok) console.error("welcome mail failed", result.detail);
  return result;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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

  const persisted = await persistSignup(env, details);
  const notifyTo = env.NOTIFY_EMAIL || DEFAULT_NOTIFY;
  const ownerContent = ownerNotifyContent(details);

  const ownerResult = await sendMail(env, {
    from: brandedFrom(env),
    to: notifyTo,
    subject: "[Open Source Barware] New release-list signup",
    text: ownerContent.text,
    html: ownerContent.html,
    replyTo: email,
  });
  if (!ownerResult.ok) console.error("owner notify failed", ownerResult.detail);

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

  context.waitUntil(sendWelcomeOnce(env, email));

  let message = "Thanks — you're on the release list. We'll email you when a release is ready.";
  if (programUpdates && hiddenBarTour) {
    message =
      "You're on the release list and the Hidden Bar Tour invite list for your city. We'll email when ready.";
  } else if (hiddenBarTour) {
    message = "You're on the Hidden Bar Tour invite list for your city. We'll email when ready.";
  } else {
    message = "You're on the release list. We'll email you when the next build ships.";
  }

  return jsonResponse({ ok: true, message });
}