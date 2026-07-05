export const UPDATES_SIGNUP_STORAGE_KEY = "osb_dojo_updates_signup";

export type UpdatesSignupStatus = "subscribed" | "skipped" | "";

export interface UpdatesSignupPayload {
  email: string;
  city: string;
  state: string;
  programUpdates?: boolean;
  hiddenBarTour?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

export function getUpdatesSignupStatus(): UpdatesSignupStatus {
  if (typeof window === "undefined") return "";
  const value = localStorage.getItem(UPDATES_SIGNUP_STORAGE_KEY);
  return value === "subscribed" || value === "skipped" ? value : "";
}

export function setUpdatesSignupStatus(status: UpdatesSignupStatus): void {
  if (typeof window === "undefined") return;
  if (!status) {
    localStorage.removeItem(UPDATES_SIGNUP_STORAGE_KEY);
    return;
  }
  localStorage.setItem(UPDATES_SIGNUP_STORAGE_KEY, status);
}

export function validateUpdatesSignup(payload: UpdatesSignupPayload): string | null {
  const email = payload.email.trim();
  const city = payload.city.trim();
  const state = payload.state.trim();
  const tour = Boolean(payload.hiddenBarTour);

  if (!email || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  if (tour) {
    if (!city || city.length < 2) return "Enter your city for Hidden Bar Tour invites.";
    if (!state) return "Select your state for Hidden Bar Tour invites.";
  }
  return null;
}

function getSubscribeUrl(): string {
  if (typeof window === "undefined") return "/api/updates-subscribe";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "https://opensourcebarware.com/api/updates-subscribe";
  }
  return "/api/updates-subscribe";
}

const PENDING_KEY = "osb_pending_signups";

type PendingSignup = {
  email: string;
  city: string;
  state: string;
  source: string;
  programUpdates: boolean;
  hiddenBarTour: boolean;
};

function readPending(): PendingSignup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writePending(list: PendingSignup[]): void {
  if (typeof window === "undefined") return;
  try {
    if (list.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* storage full or blocked — nothing else we can do client-side */
  }
}

function enqueuePending(entry: PendingSignup): void {
  const list = readPending();
  if (list.some((e) => e.email === entry.email)) return;
  list.push(entry);
  writePending(list);
}

async function postSignup(body: PendingSignup): Promise<boolean> {
  try {
    const res = await fetch(getSubscribeUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Re-send any signups that failed earlier. Safe to call on every page load. */
export async function flushPendingSignups(): Promise<void> {
  const list = readPending();
  if (list.length === 0) return;
  const stillPending: PendingSignup[] = [];
  for (const entry of list) {
    const ok = await postSignup(entry);
    if (!ok) stillPending.push(entry);
  }
  writePending(stillPending);
}

export async function submitUpdatesSignup(
  payload: UpdatesSignupPayload,
  source = "program-setup"
): Promise<{ ok: boolean; message: string }> {
  const error = validateUpdatesSignup(payload);
  if (error) return { ok: false, message: error };

  const body: PendingSignup = {
    email: payload.email.trim().toLowerCase(),
    city: payload.city.trim(),
    state: payload.state.trim().toUpperCase(),
    source,
    programUpdates: payload.programUpdates ?? true,
    hiddenBarTour: payload.hiddenBarTour ?? false,
  };

  // Opportunistically retry anything stuck from a prior outage.
  void flushPendingSignups();

  try {
    const response = await fetch(getSubscribeUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      // Server-side trouble (5xx): keep the address in the browser and retry
      // later so it is never lost. Client input errors (4xx) are not queued.
      if (response.status >= 500) enqueuePending(body);
      return {
        ok: false,
        message: data.error || data.message || "Could not save your signup. Try again in a moment.",
      };
    }

    setUpdatesSignupStatus("subscribed");
    return {
      ok: true,
      message: data.message || "You are on the list. We only email when new releases ship.",
    };
  } catch {
    // Could not even reach the endpoint — stash it and retry on the next visit.
    enqueuePending(body);
    return {
      ok: false,
      message: "Network hiccup — we saved your email and will finish signing you up automatically. Feel free to try again.",
    };
  }
}