# OSB Handoff — Mail + Signup (2026-07-04)

*From: Cowork/Reeve session | For: GROK (continue OSB build)*
*Companion to `HANDOFF.md` — do not treat as a replacement; merge when convenient.*

## TL;DR for Grok
The release-list signup no longer uses GHL. It now emails signups to the owner's
mailbox via Forward Email. Code is done; it's gated on Cloudflare Pages secrets
+ Forward Email outbound approval. Don't re-add GHL.

## What changed this session

### 1. `functions/api/updates-subscribe.js` — rewritten, GHL removed
- Validates the signup, then emails it to the owner via the Forward Email API
  (`https://api.forwardemail.net/v1/emails`, HTTP Basic auth), and sends a
  best-effort welcome to the subscriber.
- The **owner inbox is the list** — no CRM, no datastore, no GHL contact/notes/tasks.
- Frontend contract is unchanged: still returns `{ ok, message }`, still reads
  the same POST body (`email, city, state, source, programUpdates, hiddenBarTour`).
  `lib/updates-signup.ts` needs no changes.
- Owner-notify is treated as the record of truth: if it fails, the endpoint
  returns 502 ("try again shortly") instead of falsely confirming. Subscriber
  welcome is best-effort.

### 2. Required Cloudflare Pages env (owner action)
- `FORWARD_EMAIL_USER = richard@opensourcebarware.com`
- `FORWARD_EMAIL_PASS = ` <the Forward Email mailbox password for that alias>
- Optional: `NOTIFY_EMAIL` (default `richard@opensourcebarware.com`),
  `FORWARD_EMAIL_FROM` (default = `FORWARD_EMAIL_USER`).
- **Delete `GHL_API_TOKEN`** — no longer used.
- Then deploy latest `main`.

### 3. BLOCKER — Forward Email outbound approval (pending)
- `opensourcebarware.com` outbound SMTP is **verified but pending Forward Email
  admin approval** (their anti-abuse review; approval email goes to
  `rbjpholdings@gmail.com`).
- Until approved, ALL sending from the domain fails — both this endpoint and
  Thunderbird direct-send. No code change needed once approved; it just starts
  working.

## Supporting state (context, not code)

### OSBW mailbox
- Forward Email alias `richard@opensourcebarware.com` now exists WITH IMAP
  storage + a mailbox password (previously it was only a Gmail-backed
  Thunderbird identity). Catch-all `*@opensourcebarware.com` still forwards to
  `rbjpholdings@gmail.com` as a transition safety net.
- Thunderbird on MacMe has it as a dedicated FE account
  (`imap.forwardemail.net:993` SSL / `smtp.forwardemail.net:465` SSL). Inbound
  receive is live; outbound blocked pending FE approval. Gmail identity `id5`
  kept as send fallback. Profile backed up to
  `~/thunderbird-backup-20260703-171019`.

### Press launch (not a repo task, but relevant)
- 32 press-release drafts are staged in `rbjpholdings@gmail.com` Drafts,
  sending FROM `rbjpholdings@gmail.com` (NOT the OSB alias) because
  `opensourcebarware.com` DMARC is `p=reject` and Gmail can't authenticate as
  that domain. Richard sends them manually.

## Open items for Grok
1. After owner adds the Pages secrets + FE approves outbound: verify a live test
   signup delivers to `richard@opensourcebarware.com` and the API returns 200.
2. Optional: add a durable subscriber store (Cloudflare KV or Google Sheet
   append) if an exportable list is wanted later — currently the only record is
   the owner's inbox.
3. Known-issue carryover from `HANDOFF.md`: production Cloudflare Pages deploy
   was stale — confirm the deploy pipeline actually rebuilds on push before
   relying on the live endpoint.

## Do NOT
- Re-add GoHighLevel / `GHL_API_TOKEN` to the signup path.
- Send launch/press or signup mail *as* `richard@opensourcebarware.com` through
  Gmail — DMARC `p=reject` will get it blocked. Use Forward Email for the
  domain, or `rbjpholdings@gmail.com` for Gmail sends.
