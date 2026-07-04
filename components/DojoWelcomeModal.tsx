"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/AppUI";
import { markDojoWelcomeSeen, seedDojoPlayground } from "@/lib/dojo";

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

function ScrollRivet({ className = "" }: { className?: string }) {
  return (
    <span className={`salle-scroll-rivet ${className}`} aria-hidden="true">
      <span className="salle-scroll-rivet-head" />
    </span>
  );
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
        className="salle-scroll-popup relative z-10 w-full max-w-2xl max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="salle-scroll-header shrink-0">
          <h2 id="salle-welcome-title" className="salle-scroll-header-title">
            Salle d&apos;Armes
          </h2>
        </header>

        <div className="salle-scroll-parchment salle-welcome-scroll min-h-0 flex-1 overflow-y-auto">
          <ScrollRivet className="salle-scroll-rivet-tl" />
          <ScrollRivet className="salle-scroll-rivet-tr" />
          <ScrollRivet className="salle-scroll-rivet-bl" />
          <ScrollRivet className="salle-scroll-rivet-br" />

          <div className="salle-scroll-body">
            <p className="salle-scroll-lead">
              Welcome to the Fencing Academy, a refined Salle d&apos;Armes where
              gentlemanly combat meets the arts. Master the timing of the machine
              within our Clockwork Gymnasium. Train with fancy steampunk weapons,
              rapier-like shock-batons, clockwork-assisted gauntlets, and
              spring-loaded wrist blasters against rhythmic opponents.
            </p>

            <div className="salle-scroll-armory" aria-label="Training equipment">
              {ARMORY.map((item) => (
                <span key={item} className="salle-scroll-chip">
                  {item}
                </span>
              ))}
            </div>

            <div className="salle-scroll-grid">
              <div className="salle-scroll-copy">
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

              <aside className="salle-scroll-rules">
                <p className="salle-scroll-rules-title">House Rules</p>
                <ul className="salle-scroll-rules-list">
                  <li>No live steel in the well</li>
                  <li>Counts are practice lunges</li>
                  <li>Agave &amp; Rye is the sparring partner</li>
                  <li>Salute before you pour</li>
                </ul>
              </aside>
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
        </div>

        <footer className="salle-scroll-footer shrink-0">
          Clockwork Gymnasium · Sandbox Playground
        </footer>
      </div>
    </div>
  );
}