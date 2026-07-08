import { dateRange, todayUtc } from "./kv.js";
import {
  emptyDownloadRollup,
  emptyVisitRollup,
  mergeDownloadRollups,
  mergeVisitRollups,
  topN,
} from "./rollup.js";
import {
  isTotalPeriod,
  kvDatesForPeriod,
  periodLabel,
} from "./periods.js";

export const SNAPSHOT_KEY = "stats:snapshot";
const MAX_DAILY_DAYS = 90;

export function emptySnapshot() {
  return {
    generated: new Date().toISOString(),
    totals: {
      visits: 0,
      uniqueVisitors: 0,
      downloads: 0,
      uniqueDownloaders: 0,
    },
    daily: {},
    visitRollups: {},
    downloadRollups: {},
  };
}

function ensureDay(snap, dateStr) {
  if (!snap.daily[dateStr]) {
    snap.daily[dateStr] = {
      visits: 0,
      unique: 0,
      downloads: 0,
      dlUnique: 0,
    };
  }
  if (!snap.visitRollups[dateStr]) {
    snap.visitRollups[dateStr] = emptyVisitRollup();
  }
  if (!snap.downloadRollups[dateStr]) {
    snap.downloadRollups[dateStr] = emptyDownloadRollup();
  }
}

function trimSnapshot(snap) {
  const dates = Object.keys(snap.daily).sort();
  if (dates.length <= MAX_DAILY_DAYS) return;
  const drop = dates.slice(0, dates.length - MAX_DAILY_DAYS);
  for (const date of drop) {
    delete snap.daily[date];
    delete snap.visitRollups[date];
    delete snap.downloadRollups[date];
  }
}

function bump(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function trimRecent(tsList, nowMs, windowMs = 5 * 60 * 1000, max = 200) {
  const cutoff = new Date(nowMs - windowMs).toISOString();
  return tsList.filter((ts) => ts >= cutoff).slice(-max);
}

export function applyVisitToSnapshot(snap, visit, { dateStr, newToday, newEver }) {
  ensureDay(snap, dateStr);
  const day = snap.daily[dateStr];
  day.visits += 1;
  snap.totals.visits += 1;
  if (newToday) {
    day.unique += 1;
    snap.totals.uniqueVisitors += 1;
  } else if (newEver) {
    snap.totals.uniqueVisitors += 1;
  }

  const rollup = snap.visitRollups[dateStr];
  const hour = new Date(visit.ts).getUTCHours();
  rollup.hours[hour] = (rollup.hours[hour] || 0) + 1;
  bump(rollup.pages, visit.path || visit.page || "/");
  bump(rollup.refDomains, visit.refDomain);
  bump(rollup.refs, visit.ref);
  bump(rollup.countries, visit.country);
  bump(rollup.cities, visit.city);
  bump(rollup.browsers, visit.browser);
  bump(rollup.os, visit.os);
  bump(rollup.devices, visit.device);
  bump(rollup.screens, visit.screen);
  bump(rollup.langs, visit.lang);
  bump(rollup.utm_source, visit.utm_source);
  bump(rollup.utm_medium, visit.utm_medium);
  bump(rollup.utm_campaign, visit.utm_campaign);
  if (visit.returning) rollup.returningVisitors += 1;
  else rollup.newVisitors += 1;
  if (visit.device === "Bot") rollup.botVisits += 1;
  else rollup.humanVisits += 1;
  if (visit.loadTime > 0) {
    rollup.loadTimeSum += visit.loadTime;
    rollup.loadTimeCount += 1;
  }
  rollup.recentTs = trimRecent([...(rollup.recentTs || []), visit.ts], Date.now());
  snap.generated = new Date().toISOString();
  trimSnapshot(snap);
}

export function applyDownloadToSnapshot(snap, download, { dateStr, newToday, newEver }) {
  ensureDay(snap, dateStr);
  const day = snap.daily[dateStr];
  day.downloads += 1;
  snap.totals.downloads += 1;
  if (newToday) {
    day.dlUnique += 1;
    snap.totals.uniqueDownloaders += 1;
  } else if (newEver) {
    snap.totals.uniqueDownloaders += 1;
  }

  const rollup = snap.downloadRollups[dateStr];
  bump(rollup.files, download.file);
  snap.generated = new Date().toISOString();
  trimSnapshot(snap);
}

export async function loadSnapshot(kv) {
  const raw = await kv.get(SNAPSHOT_KEY);
  if (!raw) return emptySnapshot();
  try {
    return { ...emptySnapshot(), ...JSON.parse(raw) };
  } catch {
    return emptySnapshot();
  }
}

export async function saveSnapshot(kv, snap) {
  snap.generated = new Date().toISOString();
  await kv.put(SNAPSHOT_KEY, JSON.stringify(snap));
}

function sumDays(snap, dates, field) {
  return dates.reduce((sum, date) => sum + (snap.daily[date]?.[field] || 0), 0);
}

export function buildStatsFromSnapshot(snap, period) {
  const today = todayUtc();
  const weekDates = dateRange(7);
  const periodDates = kvDatesForPeriod(period);
  const dates = periodDates || dateRange(30);
  const useAllTimeTotals = isTotalPeriod(period);

  const visitRollups = dates.map((date) => snap.visitRollups[date]).filter(Boolean);
  const downloadRollups = dates.map((date) => snap.downloadRollups[date]).filter(Boolean);
  const mergedVisits = mergeVisitRollups(
    visitRollups.length ? visitRollups : [emptyVisitRollup()]
  );
  const mergedDownloads = mergeDownloadRollups(
    downloadRollups.length ? downloadRollups : [emptyDownloadRollup()]
  );

  const dailyTrend = dates
    .map((date) => ({
      date,
      views: snap.daily[date]?.visits || 0,
      unique: snap.daily[date]?.unique || 0,
      downloads: snap.daily[date]?.downloads || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let periodPageviews = sumDays(snap, dates, "visits");
  let periodDownloads = sumDays(snap, dates, "downloads");
  let periodUniqueVisitors = sumDays(snap, dates, "unique");
  let periodUniqueDownloaders = sumDays(snap, dates, "dlUnique");

  if (useAllTimeTotals) {
    periodPageviews = snap.totals.visits;
    periodDownloads = snap.totals.downloads;
    periodUniqueVisitors = snap.totals.uniqueVisitors;
    periodUniqueDownloaders = snap.totals.uniqueDownloaders;
  }

  const totalPageviews = periodPageviews || mergedVisits.humanVisits + mergedVisits.botVisits;
  const avgLoadTime =
    mergedVisits.loadTimeCount > 0
      ? Math.round(mergedVisits.loadTimeSum / mergedVisits.loadTimeCount)
      : 0;

  const externalReferrers = Object.fromEntries(
    Object.entries(mergedVisits.refDomains || {}).filter(
      ([name]) => name && name !== "opensourcebarware.com"
    )
  );
  const externalRefUrls = Object.fromEntries(
    Object.entries(mergedVisits.refs || {}).filter(
      ([name]) => name && !name.includes("opensourcebarware.com")
    )
  );

  return {
    generated: snap.generated || new Date().toISOString(),
    source: "first-party-snapshot",
    period: { id: period, label: periodLabel(period), dates },
    overview: {
      totalAllTime: snap.totals.visits,
      totalPageviews,
      humanVisits: mergedVisits.humanVisits,
      botVisits: mergedVisits.botVisits,
      uniqueVisitors: periodUniqueVisitors,
      newVisitors: mergedVisits.newVisitors,
      returningVisitors: mergedVisits.returningVisitors,
      avgLoadTime,
      liveNow: mergedVisits.recentTs.length,
      uniqueVisitorsEver: snap.totals.uniqueVisitors,
      todayUniqueVisitors: snap.daily[today]?.unique || 0,
      todayVisitTotal: snap.daily[today]?.visits || 0,
      weekUniqueVisitors: sumDays(snap, weekDates, "unique"),
      weekVisitTotal: sumDays(snap, weekDates, "visits"),
      totalDownloadsAllTime: snap.totals.downloads,
      periodDownloads:
        periodDownloads ||
        Object.values(mergedDownloads.files || {}).reduce((a, b) => a + b, 0),
      periodUniqueDownloaders,
      uniqueDownloadersEver: snap.totals.uniqueDownloaders,
      todayDownloads: snap.daily[today]?.downloads || 0,
      todayUniqueDownloaders: snap.daily[today]?.dlUnique || 0,
      weekDownloads: sumDays(snap, weekDates, "downloads"),
      weekUniqueDownloaders: sumDays(snap, weekDates, "dlUnique"),
    },
    dailyTrend,
    hourlyDistribution: mergedVisits.hours,
    topPages: topN(mergedVisits.pages, 20),
    topReferrers: topN(externalReferrers, 20),
    topRefUrls: topN(externalRefUrls, 20),
    topCountries: topN(mergedVisits.countries, 30),
    topCities: topN(mergedVisits.cities, 20),
    browsers: topN(mergedVisits.browsers, 10),
    operatingSystems: topN(mergedVisits.os, 10),
    devices: topN(mergedVisits.devices, 5),
    topScreens: topN(mergedVisits.screens, 10),
    languages: topN(mergedVisits.langs, 10),
    topDownloads: topN(mergedDownloads.files, 10),
    utm: {
      sources: topN(mergedVisits.utm_source, 10),
      mediums: topN(mergedVisits.utm_medium, 10),
      campaigns: topN(mergedVisits.utm_campaign, 10),
    },
  };
}