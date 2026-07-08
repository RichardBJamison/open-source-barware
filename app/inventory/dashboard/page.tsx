"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import DashboardHero from "@/components/dojo/DashboardHero";
import MetricGrid from "@/components/dojo/MetricGrid";
import QuickLinks from "@/components/dojo/QuickLinks";
import { useHydrated } from "@/components/dojo/useHydrated";
import {
  METRICS_WINDOWS,
  computeMetrics,
  type MetricsWindow,
} from "@/lib/dojo-admin";
import { seedDojoPlayground } from "@/lib/dojo";
import {
  getBar,
  getCounts,
  getInventorySettings,
  getPosReports,
} from "@/lib/inventory-store";

export default function DashboardPage() {
  const hydrated = useHydrated();
  const bar = hydrated ? getBar() : null;
  const counts = hydrated ? getCounts() : [];
  const posReports = hydrated ? getPosReports() : [];
  const settings = hydrated ? getInventorySettings() : null;

  const [metricsWindow, setMetricsWindow] = useState<MetricsWindow>("current_cycle");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // First-time instructional (playful, one-time)
  const [showInstruction, setShowInstruction] = useState(false);
  useEffect(() => {
    if (!hydrated) return;
    const seen = typeof window !== 'undefined' && localStorage.getItem('salle_instruction_seen') === '1';
    if (!seen) {
      const t = setTimeout(() => setShowInstruction(true), 650);
      return () => clearTimeout(t);
    }
  }, [hydrated]);

  const dismissInstruction = () => {
    setShowInstruction(false);
    try { localStorage.setItem('salle_instruction_seen', '1'); } catch {}
  };

  const metrics = useMemo(() => {
    if (!settings) return null;
    return computeMetrics(
      bar,
      counts,
      posReports,
      settings,
      metricsWindow,
      customFrom,
      customTo
    );
  }, [bar, counts, customFrom, customTo, metricsWindow, posReports, settings]);

  if (!hydrated) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-pulse">Loading home base…</div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="admin-empty-state">
        <div className="panel panel--glass admin-empty-card">
          <p className="view-eyebrow">Sparring Court</p>
          <h1>Load the demo bar</h1>
          <p className="dojo-field-hint">
            Same home base as the download — metrics, spreadsheets, and analytics ready after your first Process.
          </p>
          <button
            type="button"
            onClick={() => {
              seedDojoPlayground(true);
              window.location.reload();
            }}
            className="admin-cta-btn"
          >
            Load the Sparring Bar
          </button>
        </div>
      </div>
    );
  }

  const firstWeek = metrics?.first_week;
  const cycleNum = firstWeek?.cycle_number ?? metrics?.cycles_total ?? 1;

  return (
    <div className="admin-view active">
      <header className="view-header view-header--dash">
        <div>
          <p className="view-eyebrow">Operations</p>
          <h1>Home base</h1>
          <p>Your cycle metrics, baseline, and quick paths — all live after Process.</p>
        </div>
      </header>

      {showInstruction && (
        <div className="mb-4 rounded border border-[#a8784f]/40 bg-[#16202e]/60 p-4 text-sm flex gap-3 items-start">
          <div className="mt-0.5 text-[#b88958]">
            <span className="text-lg leading-none">👋</span>
          </div>
          <div className="flex-1">
            <div className="font-medium text-cream">Hey — set up your first bar and have it set up easy.</div>
            <div className="text-text-muted mt-1">
              In the real program this home base appears after a quick voice walk (you name the wells and rows out loud, it builds the map). 
              Here the demo bar (Your Bar 1) is already loaded so you can play immediately. Click the quick links, tweak a few numbers, watch the totals and below-par move. 
              All the whistles (barcode, mobile count, smart orders, receiving, recipes...) are in <Link href="/inventory/settings" className="underline hover:text-copper">Settings</Link> or just click around.
            </div>
          </div>
          <button onClick={dismissInstruction} className="text-xs px-3 py-1 border border-white/20 rounded hover:bg-white/5 self-start mt-0.5">Got it</button>
        </div>
      )}

      {metrics && (
        <DashboardHero
          badge={`Cycle ${cycleNum}`}
          title="Inventory mapped and sparring"
          sub={
            metrics.last_inventory_at
              ? `Last count ${metrics.last_inventory_at.slice(0, 10)} · Spreadsheets, analytics, and in-house inventory are live.`
              : `${metrics.summary.bottle_count} SKUs on your map — spreadsheets and analytics ready.`
          }
          stats={[
            { value: metrics.summary.bottle_count, label: "SKUs tracked" },
            { value: metrics.summary.station_count, label: "Stations" },
            {
              value: metrics.summary.items_below_par,
              label: "Below par",
            },
            {
              value: metrics.cycles_total ?? metrics.cycles_in_window,
              label: "Cycles logged",
            },
          ]}
        />
      )}

      <section className="panel panel--glass">
        <div className="panel-head-row">
          <h2>Cycle metrics</h2>
          {metrics && (
            <p className="dojo-field-hint panel-head-meta">
              {metrics.bounds.period_start} → {metrics.bounds.period_end}
            </p>
          )}
        </div>

        <div className="metrics-filters">
          <label className="metrics-filter">
            <span>Timeframe</span>
            <select
              value={metricsWindow}
              onChange={(event) => setMetricsWindow(event.target.value as MetricsWindow)}
              className="dojo-bar-switcher"
            >
              {METRICS_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="metrics-filter">
            <span>From</span>
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="dojo-bar-switcher"
            />
          </label>
          <label className="metrics-filter">
            <span>To</span>
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="dojo-bar-switcher"
            />
          </label>
        </div>

        {metrics && (
          <>
            <MetricGrid
              items={[
                {
                  value: metrics.summary.bottle_count,
                  label: "Bottles on map",
                  accent: "hero",
                },
                { value: metrics.summary.station_count, label: "Stations" },
                { value: metrics.summary.total_units, label: "Total units" },
                {
                  value: metrics.summary.items_below_par,
                  label: "Below par",
                  accent: metrics.summary.items_below_par > 0 ? "warning" : "default",
                },
                {
                  value: metrics.cycles_total ?? metrics.cycles_in_window,
                  label: "Cycles logged",
                  accent: "patina",
                },
                { value: metrics.summary.pos_uploads, label: "POS drops" },
              ]}
            />
            <p className="dojo-field-hint metrics-notes">{metrics.summary.notes}</p>

            {/* Fun, low-pressure play actions right on the main panel — no overwhelming options */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  // Playful demo action: simulate a fast count adjustment (in real app this would come from the count screen)
                  const msg = "Demo: you just tapped a few bottles down on the back bar. Below-par updated + variance would recalc on Process. (Try the In-house or Weekly inputs links to play for real.)";
                  alert(msg);
                }}
                className="text-xs px-3 py-1.5 rounded border border-[#a8784f]/40 hover:bg-[#a8784f]/10 text-[#b88958]"
              >
                Quick count tap (demo)
              </button>
              <button
                onClick={() => {
                  alert("Demo: pasted a sample POS night. Smart orders and variance now reflect real movement. In the real program this is one paste from Toast/Square/CSV.");
                }}
                className="text-xs px-3 py-1.5 rounded border border-[#a8784f]/40 hover:bg-[#a8784f]/10 text-[#b88958]"
              >
                Paste sample POS (demo)
              </button>
              <button
                onClick={() => {
                  window.location.href = "/inventory/inputs";
                }}
                className="text-xs px-3 py-1.5 rounded bg-[#a8784f] text-[#080c12] hover:bg-[#b88958]"
              >
                Go play in Weekly inputs →
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel panel--glass">
        <h2>First week baseline</h2>
        {!firstWeek ? (
          <p className="dojo-field-hint panel-lead">
            Loads after your first completed count.
          </p>
        ) : (
          <>
            <p className="dojo-field-hint panel-lead">
              Cycle {firstWeek.cycle_number} locked {firstWeek.completed_at.slice(0, 10)} ·{" "}
              {firstWeek.period_start} → {firstWeek.period_end}
            </p>
            <MetricGrid
              items={[
                { value: firstWeek.summary.bottles, label: "Bottles counted" },
                { value: firstWeek.summary.stations, label: "Stations" },
                {
                  value: firstWeek.categories.liquor?.sku_count ?? "—",
                  label: "Liquor SKUs",
                },
                {
                  value: firstWeek.categories.beer?.sku_count ?? "—",
                  label: "Beer SKUs",
                },
                {
                  value: firstWeek.categories.wine?.sku_count ?? "—",
                  label: "Wine SKUs",
                },
                {
                  value: firstWeek.summary.below_par,
                  label: "Below par at lock",
                  accent: firstWeek.summary.below_par > 0 ? "warning" : "default",
                },
              ]}
            />
          </>
        )}
      </section>

      <section className="panel panel--glass">
        <h2>Jump to</h2>
        <QuickLinks />
      </section>
    </div>
  );
}