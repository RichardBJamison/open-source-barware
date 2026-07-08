"use client";

import { useState } from "react";
import { useHydrated } from "@/components/dojo/useHydrated";
import { METRICS_WINDOWS } from "@/lib/dojo-admin";
import { resetDojoPlayground, showDojoWelcomeAgain } from "@/lib/dojo";
import {
  getBar,
  getCounts,
  getInventorySettings,
  getPosReports,
  getWeeklyInputDraft,
  saveBar,
  saveInventorySettings,
  type InventorySettings,
} from "@/lib/inventory-store";

const providerOptions: { value: InventorySettings["aiProvider"]; label: string }[] = [
  { value: "", label: "Not selected" },
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "grok", label: "Grok" },
  { value: "other", label: "Other" },
];

const weekDays = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

function apiBadgeClass(status: InventorySettings["apiConnectionStatus"]) {
  if (status === "connected") return "connected";
  if (status === "needs-key") return "needs-key";
  return "not-started";
}

function apiBadgeLabel(status: InventorySettings["apiConnectionStatus"]) {
  if (status === "connected") return "Connected";
  if (status === "needs-key") return "Needs key";
  if (status === "blocked") return "Blocked";
  return "Not started";
}

export default function InventorySettingsPage() {
  const hydrated = useHydrated();
  const bar = hydrated ? getBar() : null;
  const [settingsOverride, setSettingsOverride] = useState<InventorySettings | null>(null);
  const [barName, setBarName] = useState<string | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [status, setStatus] = useState("");

  const settings = settingsOverride ?? (hydrated ? getInventorySettings() : null);
  const displayBarName = barName ?? bar?.name ?? "";

  const updateSettings = (patch: Partial<InventorySettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettingsOverride(next);
    saveInventorySettings(next);
  };

  const saveCustomizations = () => {
    if (bar && displayBarName.trim()) {
      saveBar({ ...bar, name: displayBarName.trim() });
    }
    setStatus("Customizations saved.");
  };

  const saveApi = () => {
    if (!settings?.aiProvider || !apiKeyDraft.trim()) {
      setStatus("Select a provider and paste an API key.");
      return;
    }
    updateSettings({ apiConnectionStatus: "connected" });
    setApiKeyDraft("");
    setStatus("API connection saved in this sandbox (key not stored — demo only).");
  };

  const clearApi = () => {
    updateSettings({ aiProvider: "", apiConnectionStatus: "not-started" });
    setApiKeyDraft("");
    setStatus("API key removed.");
  };

  const downloadBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      bar: getBar(),
      counts: getCounts(),
      weeklyInputs: getWeeklyInputDraft(),
      posReports: getPosReports(),
      settings: getInventorySettings(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `open-source-barware-salle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Backup exported.");
  };

  const resetPlayground = () => {
    if (
      !window.confirm(
        "Reset the Salle d'Armes playground? Demo bar data will be restored fresh in this browser."
      )
    ) {
      return;
    }
    resetDojoPlayground();
    setSettingsOverride(getInventorySettings());
    setBarName(null);
    setStatus("Salle playground reset with fresh demo data.");
  };

  if (!hydrated || !settings) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="view-header">
        <h1>Settings</h1>
        <p>Customizations for your operation and API management for your AI provider.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="panel panel--glass">
          <h2 className="font-serif text-lg text-cream mb-2">Your bars</h2>
          <p className="dojo-field-hint mt-0 mb-4">
            Each bar has its own station map and inventory. Switch active bar in the sidebar, or add a new one.
          </p>
          <div className="border border-gear-border bg-bg/40 px-4 py-3 mb-4">
            <p className="text-cream text-sm">{bar?.name ?? "No bar loaded"}</p>
            <p className="dojo-field-hint mt-1">
              {bar?.stations.length ?? 0} stations · sandbox demo
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              window.alert(
                "In the downloaded program, + Add another bar starts caterpillar setup. Download the program to build additional bars."
              )
            }
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
          >
            + Add another bar
          </button>
        </section>

        <section className="panel panel--glass space-y-4">
          <h2 className="font-serif text-lg text-cream">Customizations</h2>
          <p className="dojo-field-hint mt-0">
            Bar identity and inventory rhythm. Changes apply to the next cycle window.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">Bar name</span>
            <input
              value={displayBarName}
              onChange={(event) => setBarName(event.target.value)}
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">Cycle label</span>
            <input
              value={settings.cycleLabel}
              onChange={(event) => updateSettings({ cycleLabel: event.target.value })}
              placeholder="e.g. Weekly beverage inventory"
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Cycle length (days)
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={settings.cycleDays ?? 7}
                onChange={(event) =>
                  updateSettings({ cycleDays: parseInt(event.target.value || "7", 10) })
                }
                className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Week starts on
              </span>
              <select
                value={settings.weekStartsOn.toLowerCase()}
                onChange={(event) => updateSettings({ weekStartsOn: event.target.value })}
                className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
              >
                {weekDays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">Timezone</span>
            <input
              value={settings.timezone ?? "America/New_York"}
              onChange={(event) => updateSettings({ timezone: event.target.value })}
              placeholder="e.g. America/New_York or Europe/Berlin"
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">
              Default metrics window
            </span>
            <select
              value={settings.metricsDefaultWindow ?? "current_cycle"}
              onChange={(event) => updateSettings({ metricsDefaultWindow: event.target.value })}
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            >
              {METRICS_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 border border-gear-border bg-bg/50 p-4">
            <input
              type="checkbox"
              checked={settings.showOpenBottleTenths}
              onChange={(event) => updateSettings({ showOpenBottleTenths: event.target.checked })}
              className="mt-1"
            />
            <span className="text-sm text-text-muted leading-relaxed">
              Show open-bottle tenths on in-house inventory (e.g. 2.4). Turn off for whole-bottle counts.
            </span>
          </label>

          <button
            type="button"
            onClick={saveCustomizations}
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
          >
            Save customizations
          </button>
        </section>

        <section className="panel panel--glass space-y-4 lg:col-span-2">
          <h2 className="font-serif text-lg text-cream">API management</h2>
          <p className="dojo-field-hint mt-0">
            Connect or update the AI provider that powers reconciliation and reports.
          </p>

          <div className="flex items-center justify-between gap-4 border border-gear-border bg-bg/40 px-4 py-3">
            <span className="text-sm text-text-light">Status</span>
            <span className={`dojo-status-badge ${apiBadgeClass(settings.apiConnectionStatus)}`}>
              {apiBadgeLabel(settings.apiConnectionStatus)}
            </span>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">AI provider</span>
            <select
              value={settings.aiProvider}
              onChange={(event) =>
                updateSettings({
                  aiProvider: event.target.value as InventorySettings["aiProvider"],
                  apiConnectionStatus:
                    event.target.value && settings.apiConnectionStatus === "not-started"
                      ? "needs-key"
                      : settings.apiConnectionStatus,
                })
              }
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            >
              {providerOptions.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-text-light">API key</span>
            <input
              type="password"
              value={apiKeyDraft}
              onChange={(event) => setApiKeyDraft(event.target.value)}
              placeholder="Paste new key to connect or replace"
              autoComplete="off"
              className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveApi}
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Save API connection
            </button>
            <a
              href="/help/api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gear-border text-text-muted hover:text-copper px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Where to find it
            </a>
            <button
              type="button"
              onClick={clearApi}
              className="border border-gear-border text-text-muted hover:text-copper px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Remove key
            </button>
          </div>
        </section>

        <section className="panel panel--glass lg:col-span-2">
          <h2 className="font-serif text-lg text-cream mb-2">Salle sandbox tools</h2>
          <p className="dojo-field-hint mt-0 mb-4">
            Export experiments or reset to the demo bar. The downloaded program stores data on your machine the same way.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadBackup}
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Export backup
            </button>
            <button
              type="button"
              onClick={resetPlayground}
              className="border border-wine/40 text-wine-glow hover:bg-wine/10 px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Reset Salle playground
            </button>
            <button
              type="button"
              onClick={() => {
                showDojoWelcomeAgain();
                setStatus("Welcome screen will show next time you open the Salle.");
              }}
              className="border border-copper/30 text-copper hover:bg-copper/10 px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Show Salle welcome again
            </button>
          </div>
          {status ? <p className="text-sm text-patina-light mt-4">{status}</p> : null}
        </section>
      </div>
    </div>
  );
}