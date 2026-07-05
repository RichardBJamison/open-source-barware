"use client";

import { useMemo, useState } from "react";
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading home base...</div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="panel rounded-sm p-8 sm:p-12 rivets">
          <p className="text-text-muted mb-4">
            The Salle is empty. Load the demo bar to start sparring.
          </p>
          <button
            type="button"
            onClick={() => {
              seedDojoPlayground(true);
              window.location.reload();
            }}
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
          >
            Load the Sparring Bar
          </button>
        </div>
      </div>
    );
  }

  const firstWeek = metrics?.first_week;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="dojo-view-header">
        <h1>Home base</h1>
        <p>
          Metrics respect your cycle length — 7 days, 9 days, or whatever you set in Settings.
        </p>
      </header>

      <section className="panel rounded-sm p-5 sm:p-6 rivets">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">
              Metrics timeframe
            </span>
            <select
              value={metricsWindow}
              onChange={(event) => setMetricsWindow(event.target.value as MetricsWindow)}
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            >
              {METRICS_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">
              Custom from (optional)
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">
              Custom to (optional)
            </span>
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>
        </div>

        {metrics && (
          <>
            <p className="dojo-field-hint mt-3">
              Window: {metrics.bounds.period_start} → {metrics.bounds.period_end}
              {metrics.last_inventory_at
                ? ` · Last count ${metrics.last_inventory_at.slice(0, 10)}`
                : ""}
            </p>
            <MetricGrid
              items={[
                { value: metrics.summary.bottle_count, label: "Bottles on map" },
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
                },
                { value: metrics.summary.pos_uploads, label: "POS drops" },
              ]}
            />
            <p className="dojo-field-hint mt-3">{metrics.summary.notes}</p>
          </>
        )}
      </section>

      <section className="panel rounded-sm p-5 sm:p-6 rivets">
        <h2 className="font-serif text-xl text-cream mb-2">First week baseline</h2>
        {!firstWeek ? (
          <p className="dojo-field-hint mt-0">
            Loads after your first completed count.
          </p>
        ) : (
          <>
            <p className="dojo-field-hint mt-0 mb-1">
              Cycle {firstWeek.cycle_number} locked {firstWeek.completed_at.slice(0, 10)} ·{" "}
              {firstWeek.period_start} → {firstWeek.period_end}
            </p>
            <MetricGrid
              items={[
                { value: firstWeek.summary.bottles, label: "Bottles counted" },
                { value: firstWeek.summary.stations, label: "Stations" },
                { value: firstWeek.categories.liquor?.sku_count ?? "—", label: "Liquor SKUs" },
                { value: firstWeek.categories.beer?.sku_count ?? "—", label: "Beer SKUs" },
                { value: firstWeek.categories.wine?.sku_count ?? "—", label: "Wine SKUs" },
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

      <section className="panel rounded-sm p-5 sm:p-6 rivets">
        <h2 className="font-serif text-xl text-cream mb-4">Quick links</h2>
        <QuickLinks />
      </section>
    </div>
  );
}