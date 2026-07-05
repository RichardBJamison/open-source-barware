import type {
  Bar,
  Bottle,
  InventoryCount,
  InventorySettings,
  PosReportEntry,
} from "@/lib/inventory-store";

export type MetricsWindow =
  | "current_cycle"
  | "last_7_days"
  | "last_30_days"
  | "all_time"
  | "custom";

export const METRICS_WINDOWS: { value: MetricsWindow; label: string }[] = [
  { value: "current_cycle", label: "Current cycle" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "all_time", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export type InHouseCategory = "all" | "liquor" | "beer" | "wine" | "mixers";

const LIQUOR_CATEGORIES = new Set([
  "vodka",
  "gin",
  "rum",
  "tequila",
  "bourbon",
  "whiskey",
  "whisky",
  "liqueur",
  "spirits",
  "brandy",
  "cognac",
]);

const BEER_CATEGORIES = new Set(["beer", "cider", "seltzer"]);
const WINE_CATEGORIES = new Set(["wine", "champagne", "prosecco"]);
const MIXER_CATEGORIES = new Set(["mixer", "mixers", "soda", "juice", "syrup"]);

export function mapBottleCategory(category: string): InHouseCategory {
  const key = category.toLowerCase().trim();
  if (BEER_CATEGORIES.has(key)) return "beer";
  if (WINE_CATEGORIES.has(key)) return "wine";
  if (MIXER_CATEGORIES.has(key)) return "mixers";
  if (LIQUOR_CATEGORIES.has(key)) return "liquor";
  return "liquor";
}

export function displayLevel(level: number, showTenths: boolean): string {
  return showTenths ? level.toFixed(1) : String(Math.ceil(level));
}

export function wholeBottleUnits(level: number): number {
  return Math.ceil(Math.max(level, 0));
}

function allBottles(bar: Bar | null): { bottle: Bottle; stationId: string; stationName: string }[] {
  if (!bar) return [];
  return bar.stations.flatMap((station) =>
    station.bottles.map((bottle) => ({
      bottle,
      stationId: station.id,
      stationName: station.name,
    }))
  );
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cycleBounds(settings: InventorySettings): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  const days = settings.cycleDays ?? 7;
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inWindow(
  dateIso: string,
  window: MetricsWindow,
  settings: InventorySettings,
  customFrom?: string,
  customTo?: string
): boolean {
  const date = parseDate(dateIso);
  if (!date) return false;

  if (window === "all_time") return true;

  if (window === "custom") {
    const from = parseDate(customFrom || "");
    const to = parseDate(customTo || "");
    if (from && date < from) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  }

  const now = new Date();
  if (window === "last_7_days") {
    const start = new Date();
    start.setDate(now.getDate() - 6);
    return date >= start;
  }
  if (window === "last_30_days") {
    const start = new Date();
    start.setDate(now.getDate() - 29);
    return date >= start;
  }

  const { start, end } = cycleBounds(settings);
  return date >= start && date <= end;
}

export interface DojoMetrics {
  summary: {
    bottle_count: number;
    station_count: number;
    total_units: number;
    items_below_par: number;
    pos_uploads: number;
    notes: string;
  };
  bounds: { period_start: string; period_end: string };
  cycles_in_window: number;
  cycles_total: number;
  last_inventory_at: string | null;
  first_week: FirstWeekBaseline | null;
}

export interface FirstWeekBaseline {
  cycle_number: number;
  completed_at: string;
  period_start: string;
  period_end: string;
  summary: {
    bottles: number;
    stations: number;
    below_par: number;
  };
  categories: {
    liquor?: { sku_count: number };
    beer?: { sku_count: number };
    wine?: { sku_count: number };
    mixers?: { sku_count: number };
  };
}

export function computeMetrics(
  bar: Bar | null,
  counts: InventoryCount[],
  posReports: PosReportEntry[],
  settings: InventorySettings,
  window: MetricsWindow = "current_cycle",
  customFrom = "",
  customTo = ""
): DojoMetrics {
  const bottles = allBottles(bar);
  const showTenths = settings.showOpenBottleTenths;
  const totalUnits = bottles.reduce(
    (sum, item) =>
      sum + (showTenths ? item.bottle.currentLevel : wholeBottleUnits(item.bottle.currentLevel)),
    0
  );
  const belowPar = bottles.filter((item) => item.bottle.currentLevel < item.bottle.parLevel).length;

  const cyclesInWindow = counts.filter((count) =>
    inWindow(count.date, window, settings, customFrom, customTo)
  ).length;

  const posInWindow = posReports.filter((report) =>
    inWindow(report.reportDate || report.addedAt, window, settings, customFrom, customTo)
  ).length;

  const { start, end } =
    window === "custom" && (customFrom || customTo)
      ? {
          start: parseDate(customFrom) || cycleBounds(settings).start,
          end: parseDate(customTo) || new Date(),
        }
      : window === "last_7_days"
        ? (() => {
            const e = new Date();
            const s = new Date();
            s.setDate(e.getDate() - 6);
            return { start: s, end: e };
          })()
        : window === "last_30_days"
          ? (() => {
              const e = new Date();
              const s = new Date();
              s.setDate(e.getDate() - 29);
              return { start: s, end: e };
            })()
          : window === "all_time"
            ? {
                start: parseDate(counts[counts.length - 1]?.date) || cycleBounds(settings).start,
                end: new Date(),
              }
            : cycleBounds(settings);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const oldestCount = counts.length > 0 ? counts[counts.length - 1] : null;

  return {
    summary: {
      bottle_count: bottles.length,
      station_count: bar?.stations.length ?? 0,
      total_units: Math.round(totalUnits * 10) / 10,
      items_below_par: belowPar,
      pos_uploads: posInWindow,
      notes:
        belowPar > 0
          ? `${belowPar} product${belowPar === 1 ? "" : "s"} below par — check In-house inventory or Order Generator.`
          : "All mapped products are at or above par for this window.",
    },
    bounds: {
      period_start: formatDate(start),
      period_end: formatDate(end),
    },
    cycles_in_window: cyclesInWindow,
    cycles_total: counts.length,
    last_inventory_at: bar?.lastCountDate ?? counts[0]?.date ?? null,
    first_week: oldestCount ? buildFirstWeek(bar, oldestCount) : null,
  };
}

function buildFirstWeek(bar: Bar | null, count: InventoryCount): FirstWeekBaseline {
  const bottles = allBottles(bar);
  const categoryCounts: FirstWeekBaseline["categories"] = {};

  for (const item of bottles) {
    const room = mapBottleCategory(item.bottle.category);
    if (room === "all") continue;
    const bucket = categoryCounts[room] ?? { sku_count: 0 };
    bucket.sku_count += 1;
    categoryCounts[room] = bucket;
  }

  const belowPar = bottles.filter((item) => item.bottle.currentLevel < item.bottle.parLevel).length;
  const end = parseDate(count.date) || new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return {
    cycle_number: 1,
    completed_at: count.date,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    summary: {
      bottles: bottles.length,
      stations: bar?.stations.length ?? 0,
      below_par: belowPar,
    },
    categories: categoryCounts,
  };
}

export interface InHouseItem {
  id: string;
  name: string;
  size: string;
  station_name: string;
  category: string;
  current_level: string;
  par_level: string;
  below_par: boolean;
}

export interface InHouseData {
  note: string;
  item_count: number;
  totals: {
    bottles: number;
    total_units: number;
    below_par: number;
  };
  items: InHouseItem[];
}

export function computeInHouse(
  bar: Bar | null,
  settings: InventorySettings,
  category: InHouseCategory = "all"
): InHouseData {
  const showTenths = settings.showOpenBottleTenths;
  let items = allBottles(bar).map(({ bottle, stationName }) => ({
    id: bottle.id,
    name: bottle.name,
    size: bottle.size,
    station_name: stationName,
    category: bottle.category,
    current_level: displayLevel(bottle.currentLevel, showTenths),
    par_level: displayLevel(bottle.parLevel, showTenths),
    below_par: bottle.currentLevel < bottle.parLevel,
    room: mapBottleCategory(bottle.category),
  }));

  if (category !== "all") {
    items = items.filter((item) => item.room === category);
  }

  const totalUnits = items.reduce((sum, item) => {
    const bottle = allBottles(bar).find((b) => b.bottle.id === item.id)?.bottle;
    if (!bottle) return sum;
    return sum + (showTenths ? bottle.currentLevel : wholeBottleUnits(bottle.currentLevel));
  }, 0);

  const note =
    category === "all"
      ? "What is on hand after your last count — grouped by category."
      : `Showing ${category} room only. Levels respect your tenths display preference in Settings.`;

  return {
    note,
    item_count: items.length,
    totals: {
      bottles: items.length,
      total_units: Math.round(totalUnits * 10) / 10,
      below_par: items.filter((item) => item.below_par).length,
    },
    items: items.map(({ room: _room, ...rest }) => rest),
  };
}

export interface DojoAnalytics {
  bottle_count: number;
  station_count: number;
  total_value: number;
  below_par: number;
  cycles_total: number;
  cycle_label: string;
  last_count_at: string | null;
  bar_name: string;
  beverage_cost_pct: number;
  category_values: { name: string; value: number }[];
  category_distribution: { name: string; value: number }[];
  variance_alerts: {
    name: string;
    category: string;
    current: number;
    par: number;
    deficit: number;
  }[];
  trend_data: { date: string; items: number; avg_level: number }[];
  velocity: { name: string; change: number; direction: "up" | "down" | "flat" }[];
  product_rows: {
    name: string;
    category: string;
    station: string;
    size: string;
    cost: number;
    pour_cost: number;
    cost_pct: number;
    current_level: number;
    par_level: number;
  }[];
}

export function computeAnalytics(
  bar: Bar | null,
  counts: InventoryCount[],
  settings: InventorySettings
): DojoAnalytics {
  const bottles = allBottles(bar);
  const productRows = bottles.map(({ bottle, stationName }) => {
    const poursPerBottle = bottle.size === "1L" ? 22 : bottle.size === "1.75L" ? 39 : 17;
    const pourCost = bottle.costPerBottle / poursPerBottle;
    const avgDrinkPrice = 12;
    const costPct = avgDrinkPrice > 0 ? (pourCost / avgDrinkPrice) * 100 : 0;
    return {
      name: bottle.name,
      category: bottle.category,
      station: stationName,
      size: bottle.size,
      cost: bottle.costPerBottle,
      pour_cost: pourCost,
      cost_pct: costPct,
      current_level: bottle.currentLevel,
      par_level: bottle.parLevel,
    };
  });

  const totalValue = productRows.reduce(
    (sum, row) => sum + row.cost * row.current_level,
    0
  );

  const categoryValueMap = new Map<string, number>();
  const categoryCountMap = new Map<string, number>();
  for (const row of productRows) {
    categoryValueMap.set(row.category, (categoryValueMap.get(row.category) || 0) + row.cost * row.current_level);
    categoryCountMap.set(row.category, (categoryCountMap.get(row.category) || 0) + 1);
  }

  const varianceAlerts = bottles
    .filter((item) => item.bottle.currentLevel < item.bottle.parLevel)
    .map((item) => ({
      name: item.bottle.name,
      category: item.bottle.category,
      current: item.bottle.currentLevel,
      par: item.bottle.parLevel,
      deficit: item.bottle.parLevel - item.bottle.currentLevel,
    }))
    .sort((a, b) => b.deficit - a.deficit);

  const trendData = [...counts]
    .reverse()
    .slice(0, 12)
    .map((count) => ({
      date: new Date(count.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      items: count.entries.length,
      avg_level:
        count.entries.length > 0
          ? Math.round(
              (count.entries.reduce((sum, entry) => sum + entry.countedLevel, 0) /
                count.entries.length) *
                100
            ) / 100
          : 0,
    }));

  let velocity: DojoAnalytics["velocity"] = [];
  if (counts.length >= 2) {
    const latest = counts[0];
    const previous = counts[1];
    const prevMap = new Map(previous.entries.map((entry) => [entry.bottleId, entry.countedLevel]));
    velocity = latest.entries
      .filter((entry) => prevMap.has(entry.bottleId))
      .map((entry) => {
        const prevLevel = prevMap.get(entry.bottleId) || 0;
        const change = entry.countedLevel - prevLevel;
        const direction: "up" | "down" | "flat" =
          change > 0 ? "up" : change < 0 ? "down" : "flat";
        return {
          name: entry.bottleName,
          change: Math.round(change * 100) / 100,
          direction,
        };
      })
      .filter((item): item is { name: string; change: number; direction: "up" | "down" } =>
        item.direction !== "flat"
      )
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  }

  const withPrice = productRows.filter((row) => row.cost > 0);
  const totalCost = withPrice.reduce((sum, row) => sum + row.cost * row.current_level, 0);
  const estimatedRevenue = totalCost * 4;
  const beverageCostPct = estimatedRevenue > 0 ? (totalCost / estimatedRevenue) * 100 : 0;

  return {
    bottle_count: productRows.length,
    station_count: bar?.stations.length ?? 0,
    total_value: totalValue,
    below_par: varianceAlerts.length,
    cycles_total: counts.length,
    cycle_label: settings.cycleLabel,
    last_count_at: bar?.lastCountDate ?? counts[0]?.date ?? null,
    bar_name: bar?.name ?? "Not configured",
    beverage_cost_pct: beverageCostPct,
    category_values: Array.from(categoryValueMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value),
    category_distribution: Array.from(categoryCountMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    variance_alerts: varianceAlerts,
    trend_data: trendData,
    velocity,
    product_rows: productRows,
  };
}

export function cycleLabelText(settings: InventorySettings): string {
  const days = settings.cycleDays ?? 7;
  const label = settings.cycleLabel || "Inventory cycle";
  return `${label} · every ${days} day${days === 1 ? "" : "s"}`;
}