// One short thank-you to a new release-list subscriber, sent once per
// address from yourfriends@ (see smtp.js). Used by /api/updates-subscribe
// and /api/signup-thanks.

import { sendMail } from "./smtp.js";

const SITE_URL = "https://opensourcebarware.com";
const OWNER_REPLY_TO = "Richard Jamison <rjamison@opensourcebarware.com>";

function brandedFrom(env) {
  return `Open Source Barware <${env.SMTP_USER || "yourfriends@opensourcebarware.com"}>`;
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
export async function sendWelcomeOnce(env, email) {
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
