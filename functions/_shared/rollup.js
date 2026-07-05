const ROLLUP_TTL = 2592000;

export function emptyVisitRollup() {
  return {
    hours: Array(24).fill(0),
    pages: {},
    refDomains: {},
    refs: {},
    countries: {},
    cities: {},
    browsers: {},
    os: {},
    devices: {},
    screens: {},
    langs: {},
    utm_source: {},
    utm_medium: {},
    utm_campaign: {},
    newVisitors: 0,
    returningVisitors: 0,
    humanVisits: 0,
    botVisits: 0,
    loadTimeSum: 0,
    loadTimeCount: 0,
    recentTs: [],
  };
}

export function emptyDownloadRollup() {
  return {
    files: {},
  };
}

function bump(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function trimRecent(tsList, nowMs, windowMs = 5 * 60 * 1000, max = 200) {
  const cutoff = new Date(nowMs - windowMs).toISOString();
  return tsList.filter((ts) => ts >= cutoff).slice(-max);
}

export async function updateVisitRollup(kv, dateStr, visit) {
  const key = `rollup:pv:${dateStr}`;
  const raw = await kv.get(key);
  const rollup = raw ? JSON.parse(raw) : emptyVisitRollup();

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

  if (visit.returning) rollup.returningVisitors++;
  else rollup.newVisitors++;

  if (visit.device === "Bot") rollup.botVisits++;
  else rollup.humanVisits++;

  if (visit.loadTime > 0) {
    rollup.loadTimeSum += visit.loadTime;
    rollup.loadTimeCount++;
  }

  rollup.recentTs = trimRecent(
    [...(rollup.recentTs || []), visit.ts],
    Date.now()
  );

  await kv.put(key, JSON.stringify(rollup), { expirationTtl: ROLLUP_TTL });
}

export async function updateDownloadRollup(kv, dateStr, download) {
  const key = `rollup:dl:${dateStr}`;
  const raw = await kv.get(key);
  const rollup = raw ? JSON.parse(raw) : emptyDownloadRollup();
  bump(rollup.files, download.file);
  await kv.put(key, JSON.stringify(rollup), { expirationTtl: ROLLUP_TTL });
}

export async function incrementCounter(kv, key, ttl = ROLLUP_TTL) {
  const next = parseInt((await kv.get(key)) || "0", 10) + 1;
  await kv.put(key, String(next), { expirationTtl: ttl });
  return next;
}

function mergeCountMaps(target, source) {
  for (const [name, count] of Object.entries(source || {})) {
    target[name] = (target[name] || 0) + count;
  }
}

export function mergeVisitRollups(rollups) {
  const merged = emptyVisitRollup();
  for (const rollup of rollups) {
    if (!rollup) continue;
    for (let h = 0; h < 24; h++) {
      merged.hours[h] += rollup.hours?.[h] || 0;
    }
    mergeCountMaps(merged.pages, rollup.pages);
    mergeCountMaps(merged.refDomains, rollup.refDomains);
    mergeCountMaps(merged.refs, rollup.refs);
    mergeCountMaps(merged.countries, rollup.countries);
    mergeCountMaps(merged.cities, rollup.cities);
    mergeCountMaps(merged.browsers, rollup.browsers);
    mergeCountMaps(merged.os, rollup.os);
    mergeCountMaps(merged.devices, rollup.devices);
    mergeCountMaps(merged.screens, rollup.screens);
    mergeCountMaps(merged.langs, rollup.langs);
    mergeCountMaps(merged.utm_source, rollup.utm_source);
    mergeCountMaps(merged.utm_medium, rollup.utm_medium);
    mergeCountMaps(merged.utm_campaign, rollup.utm_campaign);
    merged.newVisitors += rollup.newVisitors || 0;
    merged.returningVisitors += rollup.returningVisitors || 0;
    merged.humanVisits += rollup.humanVisits || 0;
    merged.botVisits += rollup.botVisits || 0;
    merged.loadTimeSum += rollup.loadTimeSum || 0;
    merged.loadTimeCount += rollup.loadTimeCount || 0;
    merged.recentTs.push(...(rollup.recentTs || []));
  }
  merged.recentTs = trimRecent(merged.recentTs, Date.now());
  return merged;
}

export function mergeDownloadRollups(rollups) {
  const merged = emptyDownloadRollup();
  for (const rollup of rollups) {
    if (rollup) mergeCountMaps(merged.files, rollup.files);
  }
  return merged;
}

export function topN(map, n) {
  return Object.entries(map || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}