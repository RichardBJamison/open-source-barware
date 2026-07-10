export const LAUNCH_MS = new Date("2026-07-04T22:00:00-04:00").getTime();
/** v1.5 announcement overlay — keep welcome through next weekend */
export const LAUNCH_OVERLAY_END_MS = new Date("2026-07-18T23:59:59-04:00").getTime();
export const LAUNCH_LABEL = "July 4 at 10pm";

/** v1.5 public release — live as of July 10, 2026 */
export const NEXT_DROP_MS = new Date("2026-07-10T12:00:00-04:00").getTime();
export const NEXT_DROP_LABEL = "Live now · July 10, 2026";

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

/** Post-launch announcement overlay — through next-drop weekend. */
export function shouldShowPostLaunchOverlay(
  now = Date.now(),
  opts: LaunchOptions = {},
) {
  if (
    opts.preview ||
    opts.forceOverlay ||
    process.env.NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY === "true"
  ) {
    return isLaunched(now, opts);
  }
  return isLaunched(now, opts) && now <= LAUNCH_OVERLAY_END_MS;
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

function countdownParts(targetMs: number, now = Date.now()) {
  const remaining = Math.max(targetMs - now, 0);
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

/** Legacy July 4 launch countdown (pre-launch only). */
export function getLaunchCountdown(now = Date.now()) {
  return countdownParts(LAUNCH_MS, now);
}

/** Countdown to v1.5 drop — finished = live. */
export function getNextDropCountdown(now = Date.now()) {
  return countdownParts(NEXT_DROP_MS, now);
}
