// Minimal SMTP client for Pages Functions. Sends through Migadu
// (smtp.migadu.com:465, implicit TLS) so mail is DKIM-signed for
// opensourcebarware.com and passes its DMARC p=reject policy.
//
// Required Cloudflare Pages secret:
//   SMTP_PASS  — password of the sending mailbox
// Optional:
//   SMTP_USER (default yourfriends@opensourcebarware.com)
//   SMTP_HOST (default smtp.migadu.com), SMTP_PORT (default 465)

import { connect } from "cloudflare:sockets";

const DEFAULT_USER = "yourfriends@opensourcebarware.com";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64(value) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrap76(value) {
  return value.replace(/.{1,76}/g, "$&\r\n");
}

function encodeHeader(value) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`;
}

function cleanHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function addressOnly(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : String(value)).trim();
}

export function buildMessage({ from, to, subject, text, html, replyTo, headers = {} }) {
  const domain = addressOnly(from).split("@")[1] || "localhost";
  const boundary = `osbw-${crypto.randomUUID()}`;
  const lines = [
    `From: ${cleanHeader(from)}`,
    `To: ${[].concat(to).map(cleanHeader).join(", ")}`,
    `Subject: ${encodeHeader(cleanHeader(subject))}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
  ];
  if (replyTo) lines.push(`Reply-To: ${cleanHeader(replyTo)}`);
  for (const [name, value] of Object.entries(headers)) lines.push(`${name}: ${cleanHeader(value)}`);

  const textPart = wrap76(b64(text || ""));
  if (!html) {
    lines.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", textPart);
    return lines.join("\r\n");
  }
  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    textPart,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(html)),
    `--${boundary}--`,
    "",
  );
  return lines.join("\r\n");
}

export async function sendMail(env, { from, to, subject, text, html, replyTo, headers }) {
  const user = env.SMTP_USER || DEFAULT_USER;
  const pass = env.SMTP_PASS;
  if (!pass) return { ok: false, status: 0, detail: "mail-not-configured" };

  const recipients = [].concat(to).map(addressOnly);
  const message = buildMessage({ from: from || user, to, subject, text, html, replyTo, headers });
  const socket = connect(
    { hostname: env.SMTP_HOST || "smtp.migadu.com", port: Number(env.SMTP_PORT || 465) },
    { secureTransport: "on" },
  );
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  let buffer = "";

  // Reads one (possibly multi-line) SMTP reply and checks its code.
  async function expect(code) {
    for (;;) {
      const lines = buffer.split("\r\n");
      const done = lines.findIndex((line) => /^\d{3} /.test(line));
      if (done !== -1) {
        const reply = lines.slice(0, done + 1).join("\n");
        buffer = lines.slice(done + 1).join("\r\n");
        if (!reply.startsWith(String(code))) throw new Error(`SMTP: expected ${code}, got ${reply.slice(0, 200)}`);
        return reply;
      }
      const { value, done: closed } = await reader.read();
      if (closed) throw new Error("SMTP: connection closed");
      buffer += decoder.decode(value, { stream: true });
    }
  }

  async function command(line, code) {
    await writer.write(encoder.encode(`${line}\r\n`));
    return expect(code);
  }

  try {
    await expect(220);
    await command(`EHLO ${addressOnly(user).split("@")[1]}`, 250);
    await command(`AUTH PLAIN ${b64(`\0${user}\0${pass}`)}`, 235);
    await command(`MAIL FROM:<${addressOnly(user)}>`, 250);
    for (const rcpt of recipients) await command(`RCPT TO:<${rcpt}>`, 250);
    await command("DATA", 354);
    // Dot-stuff lines that begin with "." per RFC 5321.
    const body = message.replace(/\r\n\./g, "\r\n..");
    await command(`${body}\r\n.`, 250);
    await command("QUIT", 221).catch(() => {});
    return { ok: true, status: 250 };
  } catch (error) {
    return { ok: false, status: 0, detail: error instanceof Error ? error.message : "smtp-failed" };
  } finally {
    try {
      await socket.close();
    } catch {
      // already closed
    }
  }
}
