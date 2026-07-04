import {
  saveBar,
  saveCount,
  saveInventorySettings,
  saveWeeklyInputDraft,
  clearAll,
  hasInventoryData,
} from "@/lib/inventory-store";
import {
  createDojoBar,
  createDojoCounts,
  createDojoSettings,
  createDojoWeeklyInputs,
} from "@/lib/dojo-seed";

/** Bumped for Salle d'Armes rebrand — old Dojo welcome flag no longer suppresses the new modal. */
export const DOJO_WELCOME_KEY = "osb_salle_welcome_seen";
export const DOJO_SEEDED_KEY = "osb_dojo_seeded";

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
}