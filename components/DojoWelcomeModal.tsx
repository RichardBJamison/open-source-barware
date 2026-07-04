"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppButton, AppPanel } from "@/components/AppUI";
import { Gear, Rivet } from "@/components/SteampunkElements";
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
        className="salle-welcome-backdrop absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="salle-welcome-panel relative z-10 w-full max-w-3xl max-h-[94vh] overflow-y-auto salle-welcome-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <AppPanel className="relative overflow-hidden px-0 py-0 sm:px-0 sm:py-0" withRivets={false}>
          <div className="absolute top-3 right-3 opacity-20 pointer-events-none z-0">
            <Gear size={72} className="gear-spin text-copper" />
          </div>
          <div className="absolute bottom-6 left-4 opacity-12 pointer-events-none z-0">
            <Gear size={56} className="gear-spin-reverse text-brass" />
          </div>

          <div className="relative salle-welcome-hero-frame">
            <div className="salle-welcome-hero-inner">
              <Image
                src="/images/salle-darmes-welcome.jpg"
                alt="Steampunk fencing academy emblem — gauntlet, rapier, and clockwork gears above Salle d'Armes"
                width={1200}
                height={900}
                priority
                className="salle-welcome-hero-img"
              />
            </div>
            <div className="salle-welcome-hero-rivets" aria-hidden="true">
              <Rivet />
              <Rivet />
              <Rivet />
              <Rivet />
            </div>
          </div>

          <div className="relative px-6 sm:px-10 pt-6 pb-8 sm:pb-10">
            <p className="salle-welcome-badge mb-4 text-center sm:text-left">
              Clockwork Gymnasium &middot; Sandbox Playground
            </p>

            <div className="salle-welcome-parchment mb-6">
              <p className="salle-welcome-parchment-kicker">Fencing Academy</p>
              <h2 id="salle-welcome-title" className="salle-welcome-title mb-4">
                Salle d&apos;Armes
              </h2>
              <p className="salle-welcome-lead">
                Welcome to the Fencing Academy, a refined Salle d&apos;Armes where
                gentlemanly combat meets the arts. Master the timing of the machine
                within our Clockwork Gymnasium. Train with fancy steampunk weapons,
                rapier-like shock-batons, clockwork-assisted gauntlets, and
                spring-loaded wrist blasters against rhythmic opponents.
              </p>
            </div>

            <div className="salle-welcome-armory mb-6" aria-label="Training equipment">
              {ARMORY.map((item) => (
                <span key={item} className="salle-welcome-chip">
                  {item}
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:gap-6 items-start mb-8">
              <div className="text-text-muted leading-relaxed space-y-3 text-sm sm:text-base">
                <p>
                  Beneath the brass and theatrics, this is still the finished
                  butterfly — not the caterpillar setup crawl. Out in the wild you
                  walk voice notes, station maps, checks, and gates until your bar
                  is built. <strong className="text-cream font-normal">Here</strong>{" "}
                  is what it looks like when the automata stop arguing.
                </p>
                <p>
                  Click the dashboard. Run a count. Poke weekly inputs. Adjust
                  settings like a duelist who has never heard of &ldquo;read-only.&rdquo;
                  Break nothing that matters — demo data only, reset anytime from
                  settings.
                </p>
                <p className="text-text-light text-sm italic">
                  En garde. Or don&apos;t. The bottles aren&apos;t fighting back.
                </p>
              </div>

              <div className="salle-welcome-rules hidden sm:block shrink-0 w-44">
                <p className="salle-welcome-rules-title">House Rules</p>
                <ul className="salle-welcome-rules-list">
                  <li>No live steel in the well</li>
                  <li>Counts are practice lunges</li>
                  <li>Agave &amp; Rye is the sparring partner</li>
                  <li>Salute before you pour</li>
                </ul>
              </div>
            </div>

            <p className="text-text-light text-xs sm:text-sm mb-6 text-center sm:text-left">
              Ready for the real build path? Read{" "}
              <Link href="/the-process" className="text-copper hover:text-copper-bright copper-underline">
                the process
              </Link>{" "}
              or{" "}
              <Link href="/downloads" className="text-copper hover:text-copper-bright copper-underline">
                download the program
              </Link>
              . The gauntlets stay fancier in your imagination either way.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <AppButton variant="secondary" onClick={onClose} className="sm:order-1">
                Observe from the Gallery
              </AppButton>
              <AppButton onClick={enterSalle} disabled={entering} className="sm:order-2">
                {entering ? "Winding the Automata..." : "Salute & Enter the Salle"}
              </AppButton>
            </div>

            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.22em] text-text-light/70">
              No rapiers were harmed &middot; demo data only &middot; parry responsibly
            </p>
          </div>
        </AppPanel>
      </div>
    </div>
  );
}