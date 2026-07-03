export const UPDATES_SIGNUP_STORAGE_KEY = "osb_dojo_updates_signup";

export type UpdatesSignupStatus = "subscribed" | "skipped" | "";

export interface UpdatesSignupPayload {
  email: string;
  city: string;
  state: string;
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

  if (!email || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  if (!city || city.length < 2) return "Enter your city.";
  if (!state) return "Select your state.";
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

export async function submitUpdatesSignup(
  payload: UpdatesSignupPayload
): Promise<{ ok: boolean; message: string }> {
  const error = validateUpdatesSignup(payload);
  if (error) return { ok: false, message: error };

  try {
    const response = await fetch(getSubscribeUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        city: payload.city.trim(),
        state: payload.state.trim().toUpperCase(),
        source: "program-setup",
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
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
    return {
      ok: false,
      message: "Network error — check your connection and try again.",
    };
  }
}