export const LAUNCH_MS = new Date("2026-07-04T22:00:00-04:00").getTime();
export const LAUNCH_LABEL = "July 4 at 10pm";
export const PROGRAM_DAY_ONE = "2026-07-04";

/** Days since public launch (Eastern midnight), starting at Day 1 on July 4. */
export function getProgramDay(now = Date.now()): number {
  const today = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  if (today < PROGRAM_DAY_ONE) return 0;

  const launchUtc = Date.parse(`${PROGRAM_DAY_ONE}T12:00:00Z`);
  const todayUtc = Date.parse(`${today}T12:00:00Z`);
  return Math.floor((todayUtc - launchUtc) / 86_400_000) + 1;
}

type LaunchOptions = {
  preview?: boolean;
  forceOverlay?: boolean;
  forceLaunch?: boolean;
};

export function isLaunched(now = Date.now(), opts: LaunchOptions = {}) {
  if (opts.forceLaunch || process.env.NEXT_PUBLIC_FORCE_LAUNCH === "true") {
    return true;
  }
  if (
    opts.preview &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_PREVIEW_UNLOCK_DOWNLOADS === "true"
  ) {
    return true;
  }
  return now >= LAUNCH_MS;
}

/** Pre-launch welcome overlay — show before go-live, hide after July 4 at 10pm. */
export function shouldShowPreLaunchOverlay(
  now = Date.now(),
  opts: LaunchOptions = {},
) {
  if (
    opts.preview ||
    opts.forceOverlay ||
    process.env.NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY === "true"
  ) {
    return true;
  }
  return now < LAUNCH_MS;
}

export function areDownloadsUnlocked(now = Date.now(), opts: LaunchOptions = {}) {
  return isLaunched(now, opts);
}

export function getLaunchCountdown(now = Date.now()) {
  const remaining = Math.max(LAUNCH_MS - now, 0);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    remaining,
    days,
    hours,
    minutes,
    seconds,
    finished: remaining === 0,
  };
}