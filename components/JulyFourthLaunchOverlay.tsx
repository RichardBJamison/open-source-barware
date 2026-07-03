"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FireworksCanvas from "@/components/FireworksCanvas";
import {
  LAUNCH_LABEL,
  shouldShowPreLaunchOverlay,
} from "@/lib/launch-gate";

const STORAGE_KEY = "osb-july4-launch-v2";

const PARTY_SHOTS = [
  { src: "/images/hero.png", alt: "Bartender behind the bar" },
  { src: "/images/hands.png", alt: "Hands on the pour" },
  { src: "/images/bartop.png", alt: "The bar top" },
  { src: "/images/workshop.jpg", alt: "The workshop" },
];

export default function JulyFourthLaunchOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const forceOverlay =
    process.env.NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY === "true";
  const previewParam =
    searchParams.get("preview") === "july4" ||
    searchParams.get("july4") === "1";

  const dismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(() => setVisible(false), 500);
    if (!previewParam && !forceOverlay) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, [previewParam, forceOverlay]);

  useEffect(() => {
    if (pathname?.startsWith("/inventory")) return;
    if (
      !shouldShowPreLaunchOverlay(Date.now(), {
        preview: previewParam,
        forceOverlay,
      })
    ) {
      return;
    }
    if (!previewParam && !forceOverlay && localStorage.getItem(STORAGE_KEY)) {
      return;
    }

    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [pathname, forceOverlay, previewParam]);

  useEffect(() => {
    if (!visible || dismissed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismissed, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`july4-overlay fixed inset-0 z-[200] transition-opacity duration-500 ${
        dismissed ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="july4-headline"
    >
      <FireworksCanvas />

      <div
        className="july4-backdrop absolute inset-0"
        onClick={dismiss}
        aria-hidden="true"
      />

      <div className="july4-stars absolute inset-0 pointer-events-none" />

      <div className="july4-confetti pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 32 }).map((_, i) => (
          <span
            key={i}
            className="july4-confetti-piece"
            style={{
              left: `${(i * 3.1) % 100}%`,
              animationDelay: `${i * 0.28}s`,
              animationDuration: `${3.5 + (i % 6)}s`,
              background:
                i % 3 === 0 ? "#bf0a30" : i % 3 === 1 ? "#ffffff" : "#002868",
            }}
          />
        ))}
      </div>

      <div
        className="july4-scroll relative z-[205] mx-auto flex h-full max-h-screen w-full max-w-4xl flex-col items-center justify-center overflow-y-auto px-5 py-20 text-center sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="july4-badge mb-6">🎆 You&rsquo;re early! 🎆</p>

        <div className="mb-8 flex justify-center gap-2 sm:gap-3">
          {PARTY_SHOTS.map((shot, i) => (
            <div
              key={shot.src}
              className="july4-photo-frame july4-photo-pop"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="relative h-16 w-12 overflow-hidden sm:h-24 sm:w-[4.5rem]">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <div className="july4-photo-stripe absolute inset-0" />
              </div>
            </div>
          ))}
        </div>

        <h1
          id="july4-headline"
          className="july4-headline font-serif text-5xl leading-[0.95] sm:text-6xl md:text-7xl"
        >
          Almost there.
        </h1>

        <p className="mt-4 text-sm uppercase tracking-[0.3em] text-white/70">
          We are almost finished &mdash; completed by the 4th as planned
        </p>

        <div className="july4-party-card panel rivets mx-auto mt-8 w-full max-w-lg px-6 py-8 sm:px-10 sm:py-9">
          <p className="font-serif text-2xl italic leading-snug text-cream sm:text-3xl">
            Thank you for stopping by early.
          </p>

          <p className="mt-5 text-base leading-relaxed text-text-muted sm:text-lg">
            We are almost finished and will be completed by the 4th as planned.
            The site is open now so you can click around, explore the pages, and
            see how the program works.
          </p>

          <p className="mt-4 text-base leading-relaxed text-cream/90">
            Downloads stay locked until {LAUNCH_LABEL}. Until then, wander the
            workshop, read the process, and try the inventory sandbox.
          </p>

          <p className="mt-6 font-serif text-xl italic text-copper-bright">
            Come back on the Fourth to grab the program. ✨
          </p>

          <button
            onClick={dismiss}
            className="july4-cta-primary mt-8 w-full py-4 text-sm font-black uppercase tracking-[0.18em]"
          >
            Okay, let me explore
          </button>

          <button
            onClick={dismiss}
            className="mt-3 w-full py-2 text-xs uppercase tracking-[0.22em] text-text-light transition-colors hover:text-copper"
          >
            or click anywhere &middot; we&rsquo;re not keeping you
          </button>
        </div>

        <div className="july4-bunting mt-10 flex justify-center gap-1 opacity-90">
          {Array.from({ length: 11 }).map((_, i) => (
            <span
              key={i}
              className="july4-bunting-flag"
              style={{
                background:
                  i % 3 === 0
                    ? "#bf0a30"
                    : i % 3 === 1
                      ? "#ffffff"
                      : "#002868",
              }}
            />
          ))}
        </div>

        <p className="mt-6 text-[11px] tracking-[0.25em] text-white/40 uppercase">
          opensourcebarware.com
        </p>
      </div>
    </div>
  );
}