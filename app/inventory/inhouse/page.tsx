"use client";

import { useMemo, useState } from "react";
import MetricGrid from "@/components/dojo/MetricGrid";
import { useHydrated } from "@/components/dojo/useHydrated";
import {
  computeInHouse,
  type InHouseCategory,
} from "@/lib/dojo-admin";
import { getBar, getInventorySettings } from "@/lib/inventory-store";

const CATEGORIES: { value: InHouseCategory; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "liquor", label: "Liquor" },
  { value: "beer", label: "Beer" },
  { value: "wine", label: "Wine" },
  { value: "mixers", label: "Mixers" },
];

export default function InHousePage() {
  const hydrated = useHydrated();
  const bar = hydrated ? getBar() : null;
  const settings = hydrated ? getInventorySettings() : null;
  const [category, setCategory] = useState<InHouseCategory>("all");

  const data = useMemo(() => {
    if (!settings) return null;
    return computeInHouse(bar, settings, category);
  }, [bar, category, settings]);

  if (!hydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading in-house inventory...</div>
      </div>
    );
  }

  if (!bar || !data) {
    return (
      <div className="max-w-2xl mx-auto text-center panel rounded-sm p-8 rivets">
        <p className="text-text-muted">Load the demo bar from Home base first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="dojo-view-header">
        <h1>In-house inventory</h1>
        <p>{data.note}</p>
      </header>

      <section className="panel rounded-sm p-5 sm:p-6 rivets">
        <label className="flex flex-col gap-2 max-w-xs">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">
            Category room
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as InHouseCategory)}
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <MetricGrid
          items={[
            { value: data.item_count, label: "Products shown" },
            { value: data.totals.bottles, label: "Total SKUs" },
            { value: data.totals.total_units, label: "Units on hand" },
            {
              value: data.totals.below_par,
              label: "Below par",
              accent: data.totals.below_par > 0 ? "warning" : "default",
            },
          ]}
        />

        <div className="dojo-review-table-wrap mt-4">
          {data.items.length === 0 ? (
            <p className="dojo-field-hint">No inventory lines in this category.</p>
          ) : (
            <table className="dojo-review-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Station</th>
                  <th>Category</th>
                  <th>Level</th>
                  <th>Par</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className={item.below_par ? "dojo-row-flag" : ""}>
                    <td>
                      <span className="text-cream">{item.name}</span>
                      {item.size ? (
                        <span className="dojo-field-hint block text-[0.72rem]">{item.size}</span>
                      ) : null}
                    </td>
                    <td>{item.station_name}</td>
                    <td>{item.category}</td>
                    <td>{item.current_level}</td>
                    <td>{item.par_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}