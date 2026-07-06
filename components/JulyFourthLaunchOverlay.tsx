"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FireworksCanvas from "@/components/FireworksCanvas";
import {
  LAUNCH_LABEL,
  getLaunchCountdown,
  shouldShowPostLaunchOverlay,
  shouldShowPreLaunchOverlay,
} from "@/lib/launch-gate";

// Bumped to v6 for week-one copy (first week, not "tonight").
const STORAGE_KEY = "osb-july4-launch-v6-first-week";

const PARTY_SHOTS = [
  { src: "/images/hero.png", alt: "Bartender behind the bar" },
  { src: "/images/hands.png", alt: "Hands on the pour" },
  { src: "/images/bartop.png", alt: "The bar top" },
  { src: "/images/workshop.jpg", alt: "The workshop" },
];

const GITHUB = "https://github.com/RichardBJamison/open-source-barware";

export default function JulyFourthLaunchOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() =>
    typeof window !== "undefined" ? Date.now() : 0,
  );

  const forceOverlay = process.env.NEXT_PUBLIC_FORCE_LAUNCH_OVERLAY === "true";
  const previewParam =
    searchParams.get("preview") === "july4" ||
    searchParams.get("july4") === "1";
  // Manual preview of the post-launch thank-you before 10pm: ?thankyou=1
  const forceThankYou = searchParams.get("thankyou") === "1";

  const dismiss = useCallback(
    (options?: { goHome?: boolean }) => {
      setDismissed(true);
      setTimeout(() => setVisible(false), 500);
      if (!previewParam && !forceOverlay && !forceThankYou) {
        localStorage.setItem(STORAGE_KEY, "1");
      }
      if (options?.goHome && pathname && pathname !== "/") {
        router.push("/");
      }
    },
    [pathname, previewParam, forceOverlay, forceThankYou, router],
  );

  const dismissToHome = useCallback(() => dismiss({ goHome: true }), [dismiss]);

  // Tick every second so the countdown updates and flips to the thank-you at 10pm.
  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [visible, dismissed]);

  useEffect(() => {
    if (pathname?.startsWith("/inventory")) return;
    const now = Date.now();
    const eligible =
      previewParam ||
      forceOverlay ||
      forceThankYou ||
      shouldShowPreLaunchOverlay(now, { preview: previewParam, forceOverlay }) ||
      shouldShowPostLaunchOverlay(now, { preview: previewParam, forceOverlay });
    if (!eligible) return;
    if (
      !previewParam &&
      !forceOverlay &&
      !forceThankYou &&
      localStorage.getItem(STORAGE_KEY)
    ) {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [pathname, forceOverlay, previewParam, forceThankYou]);

  useEffect(() => {
    if (!visible || dismissed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissToHome();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, dismissed, dismissToHome]);

  if (!visible) return null;

  const countdown = getLaunchCountdown(now);
  const launched = forceThankYou || countdown.finished;

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
        onClick={dismissToHome}
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
        {launched ? (
          <LaunchThankYou onDismiss={dismiss} onDismissToHome={dismissToHome} />
        ) : (
          <PreLaunchCountdown countdown={countdown} onDismissToHome={dismissToHome} />
        )}

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

function PartyStrip() {
  return (
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
  );
}

function PreLaunchCountdown({
  countdown,
  onDismissToHome,
}: {
  countdown: ReturnType<typeof getLaunchCountdown>;
  onDismissToHome: () => void;
}) {
  return (
    <>
      <p className="july4-badge mb-6">🎆 You&rsquo;re early! 🎆</p>

      <PartyStrip />

      <h1
        id="july4-headline"
        className="july4-headline font-serif text-5xl leading-[0.95] sm:text-6xl md:text-7xl"
      >
        Almost there.
      </h1>

      <p className="mt-4 text-sm uppercase tracking-[0.3em] text-white/70">
        Thanks for stopping by early &mdash; go enjoy the fireworks
      </p>

      <div className="july4-party-card panel rivets mx-auto mt-8 w-full max-w-lg px-6 py-8 sm:px-10 sm:py-9">
        <p className="font-serif text-2xl italic leading-snug text-cream sm:text-3xl">
          Thank you. Go enjoy the fireworks.
        </p>

        <p className="mt-5 text-base leading-relaxed text-text-muted sm:text-lg">
          The site is open now so you can click around, explore the pages, and
          see how the program works. Wander the workshop, read the process, and
          try the inventory sandbox.
        </p>

        <p className="mt-4 text-base leading-relaxed text-cream/90">
          We open the doors for downloads at {LAUNCH_LABEL} Eastern. Program
          files stay locked until the timer hits zero.
        </p>

        <div className="mt-6 rounded-sm border border-white/10 bg-black/25 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-copper-bright">
            Launch timer
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <TimeBlock value={countdown.days} label="Days" />
            <TimeBlock value={countdown.hours} label="Hours" />
            <TimeBlock value={countdown.minutes} label="Mins" />
            <TimeBlock value={countdown.seconds} label="Secs" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-light">
            10pm Eastern. Then the doors open.
          </p>
        </div>

        <p className="mt-6 font-serif text-xl italic text-copper-bright">
          Come back at 10pm to grab the program. ✨
        </p>

        <button
          onClick={onDismissToHome}
          className="july4-cta-primary mt-8 w-full py-4 text-sm font-black uppercase tracking-[0.18em]"
        >
          Okay, let me explore
        </button>

        <button
          onClick={onDismissToHome}
          className="mt-3 w-full py-2 text-xs uppercase tracking-[0.22em] text-text-light transition-colors hover:text-copper"
        >
          or click anywhere &middot; we&rsquo;re not keeping you
        </button>
      </div>
    </>
  );
}

function LaunchThankYou({
  onDismiss,
  onDismissToHome,
}: {
  onDismiss: () => void;
  onDismissToHome: () => void;
}) {
  return (
    <>
      <p className="july4-badge mb-6">🎆 Week one &middot; we shipped July 4th 🎆</p>

      <PartyStrip />

      <h1
        id="july4-headline"
        className="july4-headline font-serif text-5xl leading-[0.95] sm:text-6xl md:text-7xl"
      >
        The doors are open.
      </h1>

      <p className="mt-4 text-sm uppercase tracking-[0.3em] text-white/70">
        Free bar inventory for the whole world &mdash; our first week
      </p>

      <div className="july4-party-card panel rivets mx-auto mt-8 w-full max-w-xl px-6 py-8 sm:px-10 sm:py-9">
        <p className="font-serif text-2xl italic leading-snug text-cream sm:text-3xl">
          Thank you for being here in our first week.
        </p>

        <div className="mt-5 space-y-4 text-base leading-relaxed text-text-muted sm:text-lg">
          <p>
            If you&rsquo;re a first-timer reading this: hey, and welcome. We
            released Open Source Barware on July 4th &mdash; a free,
            self-contained bar inventory program that runs on your laptop. No
            subscription, no cloud, no AI required. We&rsquo;re in week one now.
          </p>
          <p>
            It took roughly <strong className="text-cream">a hundred hours</strong>{" "}
            of coffee, late nights, and carefully brain-numbing work to get this
            thing off the ground &mdash; and I am immensely proud of it. I expect
            a few tiny glitches in the first week; that&rsquo;s just me being
            honest. Nothing major &mdash; everything works fine. So go kick it
            around and have fun. I&rsquo;m on the fast fixes.
          </p>
          <p className="text-cream/90">
            Keep in touch for updates &mdash; we push new builds every few days.
            Come build it with us: star the repo and open issues on{" "}
            <strong className="text-cream">GitHub</strong>, and a{" "}
            <strong className="text-cream">Discord</strong> is on the way.
            There&rsquo;s a lot more coming.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href="/download"
            onClick={onDismiss}
            prefetch={false}
            className="july4-cta-primary w-full py-4 text-sm font-black uppercase tracking-[0.18em]"
          >
            Download Program &mdash; grab the program 🍹
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDismiss}
              className="flex-1 border border-white/20 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cream/90 transition-colors hover:border-copper hover:text-copper"
            >
              Join us on GitHub
            </a>
            <Link
              href="/the-process"
              onClick={onDismiss}
              prefetch={false}
              className="flex-1 border border-white/20 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cream/90 transition-colors hover:border-copper hover:text-copper"
            >
              See how it works
            </Link>
          </div>
        </div>

        <p className="mt-6 font-serif text-xl italic text-copper-bright">
          This one&rsquo;s our gift to the industry. Go count something. ✨
        </p>

        <button
          onClick={onDismissToHome}
          className="mt-4 w-full py-2 text-xs uppercase tracking-[0.22em] text-text-light transition-colors hover:text-copper"
        >
          or click anywhere to come in
        </button>
      </div>
    </>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-sm border border-white/8 bg-white/5 px-2 py-3">
      <div className="font-serif text-2xl leading-none text-cream">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-text-light">
        {label}
      </div>
    </div>
  );
}
