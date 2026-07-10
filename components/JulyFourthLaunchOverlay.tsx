"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  NEXT_DROP_LABEL,
  getNextDropCountdown,
  shouldShowPostLaunchOverlay,
  shouldShowPreLaunchOverlay,
} from "@/lib/launch-gate";

// Bumped when timer/copy changes so returning visitors see the update.
const STORAGE_KEY = "osb-announce-v12-v15-tonight-7pm";

const V15_FEATURES = [
  "Spanish + English inventory notes",
  "Mobile counting experience",
  "Barcode scanning via camera",
  "Visual par alerts (green/yellow/red)",
  "Recipe & cocktail costing",
  "POS import (Toast, Square, CSV)",
  "Smart order suggestions",
  "Multi-venue + receiving workflow",
];

const GITHUB_URL = "https://github.com/RichardBJamison/open-source-barware";

export default function JulyFourthLaunchOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() =>
    typeof window !== "undefined" ? Date.now() : 0,
  );

  // Manual preview only. Auto-popup disabled — it locked body scroll and
  // blocked the site. Re-enable later by flipping AUTO_ANNOUNCE_POPUP.
  const AUTO_ANNOUNCE_POPUP = false;
  const previewParam =
    searchParams.get("preview") === "july4" ||
    searchParams.get("july4") === "1" ||
    searchParams.get("preview") === "v15" ||
    searchParams.get("announce") === "1";

  const enterSite = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [visible, dismissed]);

  useEffect(() => {
    if (pathname?.startsWith("/inventory")) return;
    // Hard gate: nothing shows unless preview query (or AUTO re-enabled).
    const forceEnv = process.env.NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY === "true";
    const eligible =
      previewParam ||
      (AUTO_ANNOUNCE_POPUP &&
        (forceEnv ||
          shouldShowPreLaunchOverlay(Date.now(), {
            preview: previewParam,
            forceOverlay: forceEnv,
          }) ||
          shouldShowPostLaunchOverlay(Date.now(), {
            preview: previewParam,
            forceOverlay: forceEnv,
          })));
    if (!eligible) {
      setVisible(false);
      if (typeof document !== "undefined") document.body.style.overflow = "";
      return;
    }
    if (!previewParam && localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, [pathname, previewParam]);

  useEffect(() => {
    if (!visible || dismissed) {
      if (typeof document !== "undefined") document.body.style.overflow = "";
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") enterSite();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismissed, enterSite]);

  if (!visible || dismissed) return null;

  const countdown = getNextDropCountdown(now);
  const dropLive = countdown.finished;

  return (
    <div
      className={`announce-overlay fixed inset-0 z-[200] transition-opacity duration-300 ${
        dismissed ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announce-headline"
    >
      {/* Dim only — home site stays visible underneath */}
      <div
        className="announce-backdrop absolute inset-0"
        onClick={enterSite}
        aria-hidden="true"
      />

      <div className="relative z-[205] flex h-full max-h-screen w-full items-start justify-center overflow-y-auto overscroll-contain px-4 py-8 sm:items-center sm:px-6 sm:py-10">
        <div
          className="announce-card panel rivets relative w-full max-w-lg px-6 py-7 text-center sm:max-w-xl sm:px-9 sm:py-9"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close X */}
          <button
            type="button"
            onClick={enterSite}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-text-light transition-colors hover:border-copper/50 hover:text-copper"
            aria-label="Close and enter the site"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <p className="announce-badge mb-4">
            {dropLive ? "v1.5 · live" : "v1.5 · not yet — timer below"}
          </p>

          <h1
            id="announce-headline"
            className="font-serif text-3xl leading-[1.1] text-cream sm:text-4xl"
          >
            Welcome in.
          </h1>

          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-text-light">
            Free bar inventory &mdash; open to the world
          </p>

          <div className="mt-6 space-y-4 text-left text-[0.95rem] leading-relaxed text-text-muted sm:text-base">
            <p>
              If this is your first time:{" "}
              <strong className="text-cream">welcome</strong>. We released Open
              Source Barware to the world on{" "}
              <strong className="text-cream">July 4th</strong>
              {" "}&mdash; free, local, no subscription, no cloud tax.
            </p>
            <p>
              The response has been wonderful. We saw{" "}
              <strong className="text-cream">over 3,000 impressions</strong> on
              the site in the last week alone. Thank you for showing up, starring
              the repo, and putting the program on real bars.
            </p>
            <p>
              <strong className="text-cream">v1.5 is not out yet.</strong>{" "}
              The free program you can download today is the open launch build.
              Version 1.5 drops on the timer below &mdash; Spanish-ready notes,
              mobile counting, POS, multi-venue, and the rest of the feature set
              we promised after the Fourth.
            </p>
          </div>

          <div className="mt-4 rounded-sm border border-copper/35 bg-copper/10 px-4 py-4 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-copper-bright">
              v1.5 drop &mdash; {NEXT_DROP_LABEL}
            </p>
            {!dropLive ? (
              <>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <TimeBlock value={countdown.days} label="Days" />
                  <TimeBlock value={countdown.hours} label="Hours" />
                  <TimeBlock value={countdown.minutes} label="Mins" />
                  <TimeBlock value={countdown.seconds} label="Secs" />
                </div>
                <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-text-light">
                  Drops at 7pm Eastern
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-cream">
                v1.5 is live &mdash; grab it on the Download page.
              </p>
            )}
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-copper-bright">
              What lands in v1.5
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {V15_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-1.5 text-[0.8rem] leading-snug text-cream"
                >
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-copper/40 bg-copper/20 text-[10px] text-copper-bright">
                    &#x2713;
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.85rem] leading-relaxed text-cream">
              Also in the drop: first look at{" "}
              <strong>Intelligent Hospitality Systems</strong>
              {" "}&mdash; full restaurant inventory for houses that outgrow
              bar-only.
            </p>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-text-muted">
            Join us on social media and on{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-copper underline-offset-2 transition-colors hover:text-copper-bright hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              GitHub
            </a>
            . Star the repo, open issues, tell a bar manager. We build in public.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/download"
              onClick={() => {
                try {
                  localStorage.setItem(STORAGE_KEY, "1");
                } catch {
                  /* private mode */
                }
                setDismissed(true);
                setVisible(false);
                if (typeof document !== "undefined") {
                  document.body.style.overflow = "";
                }
              }}
              className="announce-cta-primary block w-full py-3.5 text-center text-sm font-black uppercase tracking-[0.16em]"
            >
              {dropLive ? "Download the program" : "Download free program (not v1.5 yet)"}
            </Link>
            <button
              type="button"
              onClick={enterSite}
              className="w-full border border-white/15 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cream/90 transition-colors hover:border-copper hover:text-copper"
            >
              Enter the site
            </button>
          </div>

          <p className="mt-4 font-serif text-lg italic text-copper-bright">
            Gracias &mdash; go count something.
          </p>
          <p className="mt-2 text-[11px] tracking-[0.2em] text-text-light/70 uppercase">
            opensourcebarware.com
          </p>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/35 px-2 py-2.5">
      <div className="font-serif text-2xl leading-none text-cream tabular-nums">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-text-light">
        {label}
      </div>
    </div>
  );
}
