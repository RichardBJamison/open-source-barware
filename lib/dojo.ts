import {
  saveBar,
  saveCount,
  saveInventorySettings,
  savePosReport,
  saveWeeklyInputDraft,
  clearAll,
  hasInventoryData,
} from "@/lib/inventory-store";
import {
  createDojoBar,
  createDojoCounts,
  createDojoPosReports,
  createDojoSettings,
  createDojoWeeklyInputs,
} from "@/lib/dojo-seed";

/** Bumped when guild sign art became the welcome popup. */
export const DOJO_WELCOME_KEY = "osb_salle_sign_welcome_seen";
export const DOJO_SEEDED_KEY = "osb_dojo_seeded";

const WELCOME_CHANGE_EVENT = "osb-salle-welcome-change";

function notifyWelcomeChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WELCOME_CHANGE_EVENT));
}

/** Subscribe for useSyncExternalStore — re-renders when welcome flag changes. */
export function subscribeDojoWelcome(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener(WELCOME_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(WELCOME_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, "1");
}

export function hasSeenDojoWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(DOJO_WELCOME_KEY) === "1";
}

export function markDojoWelcomeSeen(): void {
  writeFlag(DOJO_WELCOME_KEY);
  notifyWelcomeChange();
}

export function isDojoSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DOJO_SEEDED_KEY) === "1";
}

export function seedDojoPlayground(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && isDojoSeeded() && hasInventoryData()) return;

  const bar = createDojoBar();
  saveBar(bar);
  createDojoCounts(bar).forEach(saveCount);
  createDojoPosReports().forEach(savePosReport);
  saveWeeklyInputDraft(createDojoWeeklyInputs());
  saveInventorySettings(createDojoSettings());
  writeFlag(DOJO_SEEDED_KEY);
}

export function resetDojoPlayground(): void {
  if (typeof window === "undefined") return;
  clearAll();
  localStorage.removeItem(DOJO_SEEDED_KEY);
  seedDojoPlayground(true);
}

export function showDojoWelcomeAgain(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DOJO_WELCOME_KEY);
  notifyWelcomeChange();
}