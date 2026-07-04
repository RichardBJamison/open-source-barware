"use client";

import { useCallback, useState } from "react";
import Image from "next/image";

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
        className="salle-welcome-backdrop absolute inset-0 bg-black/90 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        className="salle-sign-popup relative z-10 w-full max-w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="salle-sign-glow" aria-hidden="true" />

        <div className="salle-sign-popup-body">
          <div className="salle-sign-popup-scroll">
            <Image
              src="/images/salle-darmes-sign.jpg"
              alt="Salle d'Armes — Clockwork Gymnasium fencing academy sign"
              width={332}
              height={1024}
              priority
              className="salle-sign-popup-img"
            />
          </div>

          <div className="sr-only" id="salle-welcome-desc">
            Welcome to the Fencing Academy, a refined Salle d&apos;Armes where
            gentlemanly combat meets the clockwork arts. House Rules:{" "}
            {HOUSE_RULES.join("; ")}. Sandbox playground with demo data only.
          </div>

          <div className="salle-sign-popup-actions">
            <p className="salle-sign-popup-quip" id="salle-welcome-title">
              Sandbox only — demo bottles, demo counts, zero consequences.
            </p>
            <AppButton
              onClick={enterSalle}
              disabled={entering}
              className="salle-sign-popup-btn w-full"
            >
              {entering ? "Opening the doors..." : "Salute & Enter the Salle"}
            </AppButton>
            <button
              type="button"
              onClick={onClose}
              className="salle-sign-popup-dismiss"
            >
              Observe from the gallery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}