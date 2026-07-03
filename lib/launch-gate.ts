export const LAUNCH_MS = new Date("2026-07-04T00:00:00-04:00").getTime();
export const LAUNCH_LABEL = "July 4";

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

/** Pre-launch welcome overlay — show before go-live, hide after July 4. */
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