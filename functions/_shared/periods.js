export const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "total", label: "Total" },
];

const PERIOD_ALIASES = {
  today: "today",
  "1": "today",
  "1d": "today",
  yesterday: "yesterday",
  "3": "3d",
  "3d": "3d",
  "7": "7d",
  "7d": "7d",
  "30": "30d",
  "30d": "30d",
  total: "total",
  all: "total",
  "0": "total",
};

export function normalizePeriod(raw) {
  const key = String(raw || "today").toLowerCase().trim();
  return PERIOD_ALIASES[key] || "today";
}

export function parsePeriodParam(url) {
  const period = url.searchParams.get("period");
  if (period) return normalizePeriod(period);

  const days = parseInt(url.searchParams.get("days") || "1", 10);
  if (days <= 1) return "today";
  if (days === 3) return "3d";
  if (days === 7) return "7d";
  if (days === 30) return "30d";
  return "today";
}

export function periodLabel(periodId) {
  const found = PERIOD_OPTIONS.find((entry) => entry.id === periodId);
  return found ? found.label : periodId;
}

/** GA4 date ranges — calendar days reset at property-local midnight. */
export function ga4DateRange(periodId) {
  switch (periodId) {
    case "today":
      return { startDate: "today", endDate: "today" };
    case "yesterday":
      return { startDate: "yesterday", endDate: "yesterday" };
    case "3d":
      return { startDate: "2daysAgo", endDate: "today" };
    case "7d":
      return { startDate: "6daysAgo", endDate: "today" };
    case "30d":
      return { startDate: "29daysAgo", endDate: "today" };
    case "total":
      return { startDate: "2020-01-01", endDate: "today" };
    default:
      return { startDate: "today", endDate: "today" };
  }
}

function utcDateOffset(daysAgo, end = new Date()) {
  const d = new Date(end);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** UTC midnight buckets for first-party KV counters. */
export function kvDatesForPeriod(periodId, end = new Date()) {
  switch (periodId) {
    case "today":
      return [utcDateOffset(0, end)];
    case "yesterday":
      return [utcDateOffset(1, end)];
    case "3d":
      return [utcDateOffset(0, end), utcDateOffset(1, end), utcDateOffset(2, end)];
    case "7d": {
      const dates = [];
      for (let i = 0; i < 7; i++) dates.push(utcDateOffset(i, end));
      return dates;
    }
    case "30d": {
      const dates = [];
      for (let i = 0; i < 30; i++) dates.push(utcDateOffset(i, end));
      return dates;
    }
    case "total":
      return null;
    default:
      return [utcDateOffset(0, end)];
  }
}

export function isTotalPeriod(periodId) {
  return periodId === "total";
}