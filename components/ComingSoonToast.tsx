"use client";

import { useEffect, useState } from "react";
import { Gear } from "@/components/SteampunkElements";

const STORAGE_KEY = "osb-coming-soon-v2";

export default function ComingSoonToast() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 2200);
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
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${dismissed ? "opacity-0" : "opacity-100"}`}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className={`
          fixed z-50 w-[min(480px,90vw)]
          left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          panel rivets
          transition-all duration-500 ease-out
          ${dismissed ? "opacity-0 scale-95" : "opacity-100 scale-100"}
        `}
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 2px rgba(205,127,50,0.4)" }}
      >
        {/* Top copper accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-copper to-transparent" />

        <div className="px-8 py-8">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-copper shrink-0">
                <Gear size={20} className="gear-spin-slow" />
              </div>
              <span className="text-[10px] tracking-[0.35em] uppercase text-text-light">
                In the Workshop
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
          <p className="font-serif italic text-3xl text-cream leading-snug mb-4">
            Three weeks out.
          </p>

          {/* Divider */}
          <div className="h-[1px] w-12 bg-copper/40 mb-4" />

          {/* Body */}
          <p className="text-base text-text-muted leading-relaxed mb-6">
            The full toolkit is nearly finished — inventory sheets, pour-cost
            calculator, variance tracker, and AI bottle counter. Built by
            bartenders, tested in a real restaurant. Free forever.
          </p>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
          >
            Got it — I&rsquo;ll check back soon
          </button>

          <p className="text-[10px] text-text-light mt-4 text-center tracking-wide">
            opensourcebarware.com &mdash; Est. 2026
          </p>
        </div>
      </div>
    </>
  );
}
