"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DojoWelcomeModal from "@/components/DojoWelcomeModal";
import { Gear } from "@/components/SteampunkElements";
import {
  hasSeenDojoWelcome,
  markDojoWelcomeSeen,
  seedDojoPlayground,
} from "@/lib/dojo";
import { hasInventoryData } from "@/lib/inventory-store";

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

function useNeedsWelcome() {
  return useSyncExternalStore(
    () => () => undefined,
    () => !hasSeenDojoWelcome(),
    () => true
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const needsWelcome = useNeedsWelcome();
  const hasData = hydrated ? hasInventoryData() : null;

  const finishEntry = useCallback(() => {
    seedDojoPlayground();
    markDojoWelcomeSeen();
    router.push("/inventory/dashboard");
  }, [router]);

  useEffect(() => {
    if (!hydrated || needsWelcome) return;
    seedDojoPlayground();
    if (hasData) {
      router.replace("/inventory/dashboard");
    }
  }, [hasData, hydrated, needsWelcome, router]);

  if (!hydrated || hasData === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Gear size={48} className="gear-spin text-copper" />
      </div>
    );
  }

  return (
    <>
      <DojoWelcomeModal open={needsWelcome} onClose={finishEntry} />

      {!needsWelcome && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Gear size={48} className="gear-spin text-copper mx-auto mb-4" />
            <p className="text-text-muted">Opening the Salle...</p>
          </div>
        </div>
      )}
    </>
  );
}