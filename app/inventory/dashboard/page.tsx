"use client";

import { useMemo, useState } from "react";
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