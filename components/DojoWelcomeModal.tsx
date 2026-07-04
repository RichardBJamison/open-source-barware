"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Caveat } from "next/font/google";
import { AppButton } from "@/components/AppUI";
import { markDojoWelcomeSeen, seedDojoPlayground } from "@/lib/dojo";

const penHand = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
});

interface DojoWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const ARMORY = [
  "Rapier-like shock-batons",
  "Clockwork gauntlets",
  "Spring-loaded wrist blasters",
  "Rhythmic opponents",
] as const;

const HOUSE_RULES = [
  "No live steel in the well",
  "No glass in the well",
  "Salute before you pour",
  "Bro's before ego's",
  "Leave your nonsense at the door",
] as const;

function FrameRivet({ className = "" }: { className?: string }) {
  return <span className={`salle-frame-rivet ${className}`} aria-hidden="true" />;
}

export default function DojoWelcomeModal({ open, onClose }: DojoWelcomeModalProps) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  const enterSalle = useCallback(() => {
    setEntering(true);
    seedDojoPlayground();
    markDojoWelcomeSeen();
    onClose();
    router.push("/inventory/dashboard");
  }, [onClose, router]);

  if (!open) return null;

  return (
    <div
      className="salle-welcome-overlay fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salle-welcome-title"
    >
      <div
        className="salle-welcome-backdrop absolute inset-0 bg-black/82 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="salle-popup relative z-10 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="salle-sign-glow" aria-hidden="true" />
        <div className="salle-sign-glow salle-sign-glow-outer" aria-hidden="true" />
        <div className="salle-popup-frame">
          <FrameRivet className="salle-frame-rivet-tl" />
          <FrameRivet className="salle-frame-rivet-tr" />
          <FrameRivet className="salle-frame-rivet-bl" />
          <FrameRivet className="salle-frame-rivet-br" />

          <div className="salle-popup-inner salle-welcome-scroll">
            <div className="salle-popup-art">
              <Image
                src="/images/salle-darmes-popup.jpg"
                alt="Salle d'Armes — steampunk fencing academy with clockwork gauntlet and rapier"
                width={832}
                height={1248}
                priority
                className="salle-popup-img"
              />
              <div
                className={`salle-sign-rules ${penHand.className}`}
                aria-labelledby="salle-house-rules-title"
              >
                <p id="salle-house-rules-title" className="salle-sign-rules-title">
                  House Rules
                </p>
                <ul className="salle-sign-rules-list">
                  {HOUSE_RULES.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="salle-popup-body">
              <div className="salle-scroll-armory" aria-label="Training equipment">
                {ARMORY.map((item) => (
                  <span key={item} className="salle-scroll-chip">
                    {item}
                  </span>
                ))}
              </div>

              <div className="salle-scroll-copy salle-popup-copy">
                <p>
                  Beneath the brass and theatrics, this is still the finished
                  butterfly — not the caterpillar setup crawl. Out in the wild you
                  walk voice notes, station maps, checks, and gates until your bar
                  is built. <strong>Here</strong> is what it looks like when the
                  automata stop arguing.
                </p>
                <p>
                  Click the dashboard. Run a count. Poke weekly inputs. Adjust
                  settings like a duelist who has never heard of &ldquo;read-only.&rdquo;
                  Break nothing that matters — demo data only, reset anytime from
                  settings.
                </p>
                <p className="salle-scroll-quip">
                  En garde. Or don&apos;t. The bottles aren&apos;t fighting back.
                </p>
              </div>

              <p className="salle-scroll-links">
                Ready for the real build path? Read{" "}
                <Link href="/the-process" className="salle-scroll-link">
                  the process
                </Link>{" "}
                or{" "}
                <Link href="/downloads" className="salle-scroll-link">
                  download the program
                </Link>
                . The gauntlets stay fancier in your imagination either way.
              </p>

              <div className="salle-scroll-actions">
                <AppButton variant="secondary" onClick={onClose} className="salle-scroll-btn">
                  Observe from the Gallery
                </AppButton>
                <AppButton onClick={enterSalle} disabled={entering} className="salle-scroll-btn">
                  {entering ? "Winding the Automata..." : "Salute & Enter the Salle"}
                </AppButton>
              </div>

              <p className="salle-scroll-fine">
                No rapiers were harmed · demo data only · parry responsibly
              </p>
            </div>

            <footer className="salle-scroll-footer">
              <span id="salle-welcome-title">Clockwork Gymnasium · Sandbox Playground</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}