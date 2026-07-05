export const LAUNCH_MS = new Date("2026-07-04T22:00:00-04:00").getTime();
export const LAUNCH_LABEL = "July 4 at 10pm";

/** Richard flips this off in env when installers are ready to ship. */
export function isManualDownloadLockOn() {
  return process.env.NEXT_PUBLIC_DOWNLOADS_MANUAL_LOCK === "true";
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
  if (isManualDownloadLockOn()) return false;
  return isLaunched(now, opts);
}

export function getDownloadLockMessage() {
  if (isManualDownloadLockOn()) {
    return "Installer downloads are not open yet — join the release list and we'll email when the build is ready.";
  }
  return `Downloads open ${LAUNCH_LABEL} Eastern.`;
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