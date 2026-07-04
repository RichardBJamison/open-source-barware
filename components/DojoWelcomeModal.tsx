"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AppButton } from "@/components/AppUI";


interface DojoWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

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
  const [entering, setEntering] = useState(false);

  const enterSalle = useCallback(() => {
    setEntering(true);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="salle-welcome-overlay fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salle-welcome-title"
      aria-describedby="salle-welcome-desc"
    >
      <div
        className="salle-welcome-backdrop absolute inset-0 bg-black/88 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="salle-popup relative z-10 w-full max-w-md sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="salle-sign-glow" aria-hidden="true" />
        <div className="salle-sign-glow salle-sign-glow-outer" aria-hidden="true" />

        <div className="salle-popup-frame">
          <FrameRivet className="salle-frame-rivet-tl" />
          <FrameRivet className="salle-frame-rivet-tr" />
          <FrameRivet className="salle-frame-rivet-bl" />
          <FrameRivet className="salle-frame-rivet-br" />

          <div className="salle-popup-body">
            <div className="salle-popup-inner salle-welcome-scroll">
              <div className="salle-entrance">
                <Image
                  src="/images/salle-darmes-entrance.jpg"
                  alt="Salle d'Armes entrance — clockwork fencing academy with wall sign and open doors"
                  width={834}
                  height={1024}
                  priority
                  className="salle-entrance-img"
                />
              </div>

              <div className="sr-only" id="salle-welcome-desc">
                Welcome to the Fencing Academy, a refined Salle d&apos;Armes where
                gentlemanly combat meets the clockwork arts. House Rules:{" "}
                {HOUSE_RULES.join("; ")}. Sandbox playground with demo data.
              </div>
            </div>

            <div className="salle-entrance-actions">
              <p className="salle-entrance-quip">
                Demo data only. Poke the dashboard, break nothing that matters.
              </p>
              <div className="salle-scroll-actions">
                <AppButton variant="secondary" onClick={onClose} className="salle-scroll-btn">
                  Observe from the Gallery
                </AppButton>
                <AppButton onClick={enterSalle} disabled={entering} className="salle-scroll-btn">
                  {entering ? "Winding the Automata..." : "Salute & Enter the Salle"}
                </AppButton>
              </div>
              <p className="salle-scroll-links">
                <Link href="/the-process" className="salle-scroll-link">
                  The process
                </Link>
                {" · "}
                <Link href="/downloads" className="salle-scroll-link">
                  Download the program
                </Link>
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