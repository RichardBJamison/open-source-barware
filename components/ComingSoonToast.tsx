"use client";

import { useEffect, useState } from "react";
import { Gear } from "@/components/SteampunkElements";

const STORAGE_KEY = "osb-welcome-v6";

export default function ComingSoonToast() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setDismissed(true);
    setTimeout(() => setVisible(false), 400);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${dismissed ? "opacity-0" : "opacity-100"}`}
        onClick={dismiss}
      />

      {/* Centered modal — must sit above mockup pages and inventory chrome */}
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none"
      >
      <div
        className={`panel rivets pointer-events-auto w-full max-w-[520px] transition-opacity duration-500 ease-out ${dismissed ? "opacity-0" : "opacity-100"}`}
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 2px rgba(168,120,79,0.4)" }}
      >
        {/* Top copper accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-copper to-transparent" />

        <div className="px-8 py-8">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="text-copper shrink-0">
                <Gear size={20} className="gear-spin-slow" />
              </div>
              <span className="text-[10px] tracking-[0.35em] uppercase text-text-light">
                The doors are open
              </span>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="text-text-light hover:text-copper transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Headline */}
          <p className="font-serif italic text-3xl text-cream leading-snug mb-1">
            Welcome in.
          </p>
          <p className="text-[11px] tracking-[0.2em] uppercase text-copper mb-5">
            Free to the world &mdash; Independence Day 2026
          </p>

          {/* Divider */}
          <div className="h-[1px] w-12 bg-copper/40 mb-5" />

          {/* Body */}
          <p className="text-base text-text-muted leading-relaxed mb-4">
            Everything you see is built, and it&rsquo;s yours to explore.
            Inventory sheets, pour-cost calculators, variance trackers,
            community resources &mdash; poke around, try things out, make
            yourself at home.
          </p>
          <p className="text-sm text-cream/80 leading-relaxed mb-6">
            The official launch is{" "}
            <span className="text-copper font-semibold">July 4th at 6pm</span>{" "}
            &mdash; because a free program for every bar in America felt right on
            Independence Day. Until then, the workshop is open and
            we&rsquo;d love your feedback.
          </p>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full bg-copper hover:bg-copper-bright text-bg font-semibold py-3.5 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(168,120,79,0.25)]"
          >
            Come on in
          </button>

          <p className="text-[10px] text-text-light mt-4 text-center tracking-wide">
            opensourcebarware.com &mdash; Free &amp; open source, forever
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
