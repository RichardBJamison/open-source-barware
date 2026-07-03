"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppButton, AppPanel } from "@/components/AppUI";
import SteampunkKarateGuy from "@/components/SteampunkKarateGuy";
import { Gear } from "@/components/SteampunkElements";
import { markDojoWelcomeSeen, seedDojoPlayground } from "@/lib/dojo";

interface DojoWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DojoWelcomeModal({ open, onClose }: DojoWelcomeModalProps) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  const enterDojo = useCallback(() => {
    setEntering(true);
    seedDojoPlayground();
    markDojoWelcomeSeen();
    onClose();
    router.push("/inventory/dashboard");
  }, [onClose, router]);

  if (!open) return null;

  return (
    <div
      className="dojo-welcome-overlay fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dojo-welcome-title"
    >
      <div
        className="dojo-welcome-backdrop absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="dojo-welcome-panel relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AppPanel className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
          <div className="absolute -top-6 -right-4 opacity-15 pointer-events-none">
            <Gear size={90} className="gear-spin text-copper" />
          </div>
          <div className="absolute -bottom-8 -left-6 opacity-10 pointer-events-none">
            <Gear size={70} className="gear-spin-reverse text-brass" />
          </div>

          <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
            <div className="shrink-0 w-40 sm:w-44">
              <SteampunkKarateGuy className="w-full h-auto" />
              <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-text-light">
                Totally on brand
              </p>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="dojo-welcome-badge mb-3">Sandbox Playground</p>
              <h2
                id="dojo-welcome-title"
                className="font-serif text-3xl sm:text-4xl copper-text mb-4"
              >
                Welcome to the Dojo
              </h2>
              <p className="text-text-muted leading-relaxed mb-3">
                You are stepping into a mirror of the program you download — the
                finished butterfly, not the caterpillar setup crawl. Out in the
                real world you will walk through voice notes, station maps, checks,
                and gates until your bar is built. Once it is,{" "}
                <strong className="text-cream font-normal">this</strong> is what
                it looks like.
              </p>
              <p className="text-text-muted leading-relaxed mb-3">
                Here you get to play first. Click around the dashboard, run a count,
                peek at weekly inputs, poke the settings. Break nothing that
                matters — it is demo data in your browser, free to reset anytime.
              </p>
              <p className="text-text-light text-sm leading-relaxed">
                Have fun. When you are ready for the real build path, read{" "}
                <Link href="/the-process" className="text-copper hover:text-copper-bright copper-underline">
                  the process
                </Link>{" "}
                or{" "}
                <Link href="/downloads" className="text-copper hover:text-copper-bright copper-underline">
                  download the program
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="relative mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <AppButton variant="secondary" onClick={onClose} className="sm:order-1">
              Look Around First
            </AppButton>
            <AppButton onClick={enterDojo} disabled={entering} className="sm:order-2">
              {entering ? "Warming Up..." : "Enter the Dojo"}
            </AppButton>
          </div>
        </AppPanel>
      </div>
    </div>
  );
}