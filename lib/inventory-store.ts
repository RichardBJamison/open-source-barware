// Local, browser-only data layer for the trial inventory app.

export type StationType =
  | "well"
  | "back-bar"
  | "service"
  | "storage"
  | "walk-in"
  | "beer"
  | "wine";

export interface Bottle {
  id: string;
  name: string;
  category: string;
  currentLevel: number;
  parLevel: number;
  size: string;
  costPerBottle: number;
}

export interface Station {
  id: string;
  name: string;
  type: StationType;
  bottles: Bottle[];
}

export interface Bar {
  id: string;
  name: string;
  stations: Station[];
  lastCountDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CountEntry {
  bottleId: string;
  bottleName: string;
  stationId: string;
  previousLevel: number;
  countedLevel: number;
}

export interface InventoryCount {
  id: string;
  date: string;
  entries: CountEntry[];
  notes?: string;
  createdBy?: string;
}

export interface StoredFileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  addedAt: string;
}

export interface WeeklyInputDraft {
  periodStart: string;
  periodEnd: string;
  countNotes: string;
  invoiceNotes: string;
  posNotes: string;
  invoiceFiles: StoredFileRecord[];
  posFiles: StoredFileRecord[];
  updatedAt: string | null;
}

export interface InventorySettings {
  aiProvider: "claude" | "chatgpt" | "grok" | "other" | "";
  apiConnectionStatus: "not-started" | "needs-key" | "connected" | "blocked";
  cycleLabel: string;
  weekStartsOn: string;
  backupReminderAccepted: boolean;
  notes: string;
  updatedAt: string | null;
}

const PREFIX = "osb_";
export const STORAGE_KEYS = {
  bar: `${PREFIX}bar`,
  counts: `${PREFIX}counts`,
  weeklyInputs: `${PREFIX}weekly_inputs`,
  settings: `${PREFIX}settings`,
} as const;

export const EMPTY_WEEKLY_INPUT_DRAFT: WeeklyInputDraft = {
  periodStart: "",
  periodEnd: "",
  countNotes: "",
  invoiceNotes: "",
  posNotes: "",
  invoiceFiles: [],
  posFiles: [],
  updatedAt: null,
};

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  aiProvider: "",
  apiConnectionStatus: "not-started",
  cycleLabel: "Weekly beverage inventory",
  weekStartsOn: "Monday",
  backupReminderAccepted: false,
  notes: "",
  updatedAt: null,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStationType(type: unknown, name = ""): StationType {
  const value = String(type || "").toLowerCase();
  const stationName = name.toLowerCase();

  if (value === "backbar" || value === "back-bar" || stationName.includes("back bar")) {
    return "back-bar";
  }
  if (value === "walk-in" || value === "walkin" || stationName.includes("cooler")) {
    return "walk-in";
  }
  if (value === "beer" || stationName.includes("beer")) return "beer";
  if (value === "wine" || stationName.includes("wine")) return "wine";
  if (value === "service" || stationName.includes("service")) return "service";
  if (value === "storage" || stationName.includes("storage") || stationName.includes("room")) {
    return "storage";
  }
  return "well";
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBottle(raw: Record<string, unknown>, fallbackId: string): Bottle {
  return {
    id: String(raw.id || fallbackId),
    name: String(raw.name || raw.productName || "Unnamed product"),
    category: String(raw.category || "spirits"),
    currentLevel: asNumber(raw.currentLevel ?? raw.level, 1),
    parLevel: asNumber(raw.parLevel, 0.5),
    size: String(raw.size || "750ml"),
    costPerBottle: asNumber(raw.costPerBottle, 0),
  };
}

function normalizeStation(
  raw: Record<string, unknown>,
  index: number,
  topLevelBottles: Record<string, unknown>[] = []
): Station {
  const id = String(raw.id || `station-${index + 1}`);
  const name = String(raw.name || `Station ${index + 1}`);
  const stationBottles = Array.isArray(raw.bottles)
    ? (raw.bottles as Record<string, unknown>[])
    : topLevelBottles.filter((bottle) => String(bottle.stationId || "") === id);

  return {
    id,
    name,
    type: normalizeStationType(raw.type, name),
    bottles: stationBottles.map((bottle, bottleIndex) =>
      normalizeBottle(bottle, `${id}-bottle-${bottleIndex + 1}`)
    ),
  };
}

export function normalizeBar(raw: unknown): Bar | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const rawStations = Array.isArray(source.stations)
    ? (source.stations as Record<string, unknown>[])
    : [];
  const topLevelBottles = Array.isArray(source.bottles)
    ? (source.bottles as Record<string, unknown>[])
    : [];

  return {
    id: String(source.id || `bar-${Date.now()}`),
    name: String(source.name || "Main Bar"),
    stations: rawStations.map((station, index) =>
      normalizeStation(station, index, topLevelBottles)
    ),
    lastCountDate:
      typeof source.lastCountDate === "string" ? source.lastCountDate : null,
    createdAt:
      typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export function getBar(): Bar | null {
  return normalizeBar(readJson<unknown>(STORAGE_KEYS.bar));
}

export function saveBar(bar: Bar): void {
  const normalized = normalizeBar({
    ...bar,
    updatedAt: new Date().toISOString(),
  });
  if (normalized) writeJson(STORAGE_KEYS.bar, normalized);
}

export function getCounts(): InventoryCount[] {
  const counts = readJson<InventoryCount[]>(STORAGE_KEYS.counts);
  return Array.isArray(counts) ? counts : [];
}

export function saveCount(count: InventoryCount): void {
  const existing = getCounts();
  const next = [count, ...existing.filter((item) => item.id !== count.id)];
  writeJson(STORAGE_KEYS.counts, next);
}

export function getWeeklyInputDraft(): WeeklyInputDraft {
  return {
    ...EMPTY_WEEKLY_INPUT_DRAFT,
    ...readJson<Partial<WeeklyInputDraft>>(STORAGE_KEYS.weeklyInputs),
  };
}

export function saveWeeklyInputDraft(draft: WeeklyInputDraft): void {
  writeJson(STORAGE_KEYS.weeklyInputs, {
    ...draft,
    updatedAt: new Date().toISOString(),
  });
}

export function clearWeeklyInputDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.weeklyInputs);
}

export function getInventorySettings(): InventorySettings {
  return {
    ...DEFAULT_INVENTORY_SETTINGS,
    ...readJson<Partial<InventorySettings>>(STORAGE_KEYS.settings),
  };
}

export function saveInventorySettings(settings: InventorySettings): void {
  writeJson(STORAGE_KEYS.settings, {
    ...settings,
    updatedAt: new Date().toISOString(),
  });
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function hasInventoryData(): boolean {
  const bar = getBar();
  return Boolean(bar && bar.stations.length > 0);
}

export function generateId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
