// Open Source Barware — release-list signup
// Collects an email at signup and delivers it to the owner's mailbox via
// Forward Email. No CRM / no GHL. The owner's inbox IS the list.
//
// Required Cloudflare Pages env:
//   FORWARD_EMAIL_USER  — a Forward Email alias with a generated password
//                         (e.g. richard@opensourcebarware.com)
//   FORWARD_EMAIL_PASS  — that alias's Forward Email mailbox password
// Optional:
//   NOTIFY_EMAIL        — where signup alerts are delivered (use Gmail, not Yahoo)
//   FORWARD_EMAIL_FROM  — From address (default: branded noreply@opensourcebarware.com)

const FORWARD_EMAIL_API = "https://api.forwardemail.net/v1/emails";
const SITE_URL = "https://opensourcebarware.com";
// Gmail inbox avoids Yahoo spam-folder issues for owner alerts.
const DEFAULT_NOTIFY = "rbjpholdings@gmail.com";

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
  const address =
    env.FORWARD_EMAIL_FROM ||
    env.FORWARD_EMAIL_USER ||
    "noreply@opensourcebarware.com";
  return `Open Source Barware <${address}>`;
}

async function sendForwardEmail(env, { to, subject, text, html, replyTo }) {
  const user = env.FORWARD_EMAIL_USER;
  const pass = env.FORWARD_EMAIL_PASS;
  if (!user || !pass) {
    return { ok: false, status: 0, detail: "mail-not-configured" };
  }

  const auth = btoa(`${user}:${pass}`);
  const fromAddress = env.FORWARD_EMAIL_FROM || user;
  const payload = {
    from: brandedFrom(env),
    to,
    subject,
    text,
    replyTo: replyTo || fromAddress,
    headers: {
      "X-Auto-Response-Suppress": "All",
      "List-Id": "Open Source Barware <opensourcebarware.com>",
    },
  };
  if (html) payload.html = html;

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

function subscriberWelcomeContent(details) {
  const lines = ["Thanks for signing up for Open Source Barware.", ""];
  if (details.programUpdates) {
    lines.push(
      "You are on the release list. We only email when a new build ships."
    );
  }
  if (details.hiddenBarTour) {
    lines.push(
      "You are also on the Hidden Bar Tour invite list for your city."
    );
  }
  lines.push(
    "",
    "Open Source Barware is free, open-source bar inventory software.",
    "No subscription. No cloud lock-in.",
    "",
    SITE_URL,
    "",
    "— Open Source Barware"
  );

  const text = lines.join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#1c1815;max-width:560px;line-height:1.6">
      <p style="margin:0 0 16px;font-size:20px;color:#a8784f">You are on the list.</p>
      ${
        details.programUpdates
          ? "<p>We will email you when a new Open Source Barware build ships.</p>"
          : ""
      }
      ${
        details.hiddenBarTour
          ? "<p>We will also invite you to Hidden Bar Tour discovery runs in your city.</p>"
          : ""
      }
      <p>Open Source Barware is free, open-source bar inventory software. No subscription. No cloud lock-in.</p>
      <p><a href="${SITE_URL}" style="color:#a8784f">${SITE_URL}</a></p>
      <p style="margin-top:24px;font-size:13px;color:#7a6e62">— Open Source Barware</p>
    </div>
  `.trim();

  return { text, html };
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
  const welcomeContent = subscriberWelcomeContent(details);

  const mailConfigured = Boolean(
    env.FORWARD_EMAIL_USER && env.FORWARD_EMAIL_PASS
  );
  const ownerResult = mailConfigured
    ? await sendForwardEmail(env, {
        to: notifyTo,
        subject: "[Open Source Barware] New release-list signup",
        text: ownerContent.text,
        html: ownerContent.html,
        replyTo: email,
      })
    : { ok: false, status: 0, detail: "mail-not-configured" };

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

  if (mailConfigured) {
    await sendForwardEmail(env, {
      to: email,
      subject: "You're on the Open Source Barware release list",
      text: welcomeContent.text,
      html: welcomeContent.html,
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