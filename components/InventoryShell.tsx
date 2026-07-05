"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import DojoWelcomeModal from "@/components/DojoWelcomeModal";
import { Gear, Rivet, CocktailIcon } from "@/components/SteampunkElements";
import { cycleLabelText } from "@/lib/dojo-admin";
import {
  hasSeenDojoWelcome,
  markDojoWelcomeSeen,
  seedDojoPlayground,
  subscribeDojoWelcome,
} from "@/lib/dojo";
import { getBar, getInventorySettings } from "@/lib/inventory-store";

const NAV_ITEMS = [
  { href: "/inventory/dashboard", label: "Dashboard" },
  { href: "/inventory/spreadsheets", label: "Spreadsheets" },
  { href: "/inventory/analytics", label: "Analytics" },
  { href: "/inventory/inhouse", label: "In-house inventory" },
  { href: "/inventory/inputs", label: "Weekly inputs" },
  { href: "/inventory/settings", label: "Settings" },
];

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

function useNeedsWelcome() {
  return useSyncExternalStore(
    subscribeDojoWelcome,
    () => !hasSeenDojoWelcome(),
    () => true
  );
}

export default function InventoryShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const needsWelcome = useNeedsWelcome();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bar = hydrated ? getBar() : null;
  const settings = hydrated ? getInventorySettings() : null;
  const cycleText = settings ? cycleLabelText(settings) : "Inventory cycle";

  const finishWelcome = useCallback(() => {
    seedDojoPlayground();
    markDojoWelcomeSeen();
    if (pathname === "/inventory") {
      router.push("/inventory/dashboard");
    }
  }, [pathname, router]);

  const handleAddBar = () => {
    window.alert(
      "In the downloaded program, + Add another bar starts caterpillar setup for a new bar map. This sandbox keeps one demo bar — download the program to build your own."
    );
  };

  return (
    <div className="salle-shell flex min-h-[calc(100vh-73px)] flex-col">
      <DojoWelcomeModal open={hydrated && needsWelcome} onClose={finishWelcome} />

      <div className="dojo-demo-ribbon">
        The Open Source Bar Program · Salle d&apos;Armes sandbox — field-tested at Agave &amp; Rye
      </div>

      <div className="flex flex-1 min-h-0">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
          fixed lg:sticky top-[73px] lg:top-0 left-0 z-50 lg:z-auto
          w-64 h-[calc(100vh-73px)] lg:h-auto lg:min-h-[calc(100vh-73px-2rem)]
          bg-bg-panel border-r border-gear-border
          flex flex-col shrink-0
          transition-transform duration-300 lg:transition-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <div className="relative px-5 pt-5 pb-4 border-b border-gear-border salle-shell-brand">
            <div className="absolute top-2 left-2">
              <Rivet />
            </div>
            <div className="absolute top-2 right-2">
              <Rivet />
            </div>

            <label htmlFor="dojoBarSwitcher" className="text-[9px] text-text-light uppercase tracking-[0.18em]">
              Active bar
            </label>
            <select
              id="dojoBarSwitcher"
              className="dojo-bar-switcher mt-1"
              value={bar?.id ?? ""}
              onChange={() => undefined}
            >
              {bar ? (
                <option value={bar.id}>{bar.name}</option>
              ) : (
                <option value="">No bar loaded</option>
              )}
            </select>
            <p className="dojo-cycle-label">{cycleText}</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                  block px-3 py-2.5 text-sm tracking-wide transition-all border-l-2
                  ${
                    isActive
                      ? "text-copper bg-copper/10 border-copper"
                      : "text-text-muted hover:text-copper hover:bg-copper/5 border-transparent"
                  }
                `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-3 border-t border-gear-border">
            <button
              type="button"
              onClick={handleAddBar}
              className="w-full text-left text-xs text-copper hover:text-copper-bright tracking-wide transition-colors"
            >
              + Add another bar
            </button>
            <p className="text-[9px] text-text-light uppercase tracking-[0.18em] mt-4">
              Home base
            </p>
          </div>

          <div className="relative px-5 py-4 border-t border-gear-border">
            <div className="absolute bottom-2 left-2">
              <Rivet />
            </div>
            <div className="absolute bottom-2 right-2">
              <Rivet />
            </div>
            <div className="flex justify-center opacity-30">
              <Gear size={40} className="gear-spin-slow text-copper" />
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-[73px] z-30 bg-bg-warm/95 backdrop-blur-sm border-b border-gear-border px-4 lg:px-6 py-3 flex items-center gap-4 salle-shell-topbar">
            <button
              className="lg:hidden text-copper p-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 6h16M3 11h16M3 16h16" />
              </svg>
            </button>

            <h1 className="font-serif text-base lg:text-lg copper-text truncate flex items-center gap-2.5 min-w-0">
              <CocktailIcon size={24} className="shrink-0" />
              <span className="truncate">Your Sparring Court</span>
              <span className="salle-sandbox-pill shrink-0 hidden sm:inline-flex">
                Sandbox
              </span>
            </h1>
          </div>

          <div className="flex-1 p-4 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}