"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getBar,
  getCounts,
  getInventorySettings,
  getWeeklyInputDraft,
  saveInventorySettings,
  type InventorySettings,
} from "@/lib/inventory-store";
import { resetDojoPlayground, showDojoWelcomeAgain } from "@/lib/dojo";

const providerOptions: { value: InventorySettings["aiProvider"]; label: string }[] = [
  { value: "", label: "Not selected" },
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "grok", label: "Grok" },
  { value: "other", label: "Other" },
];

const statusOptions: { value: InventorySettings["apiConnectionStatus"]; label: string }[] = [
  { value: "not-started", label: "Not started" },
  { value: "needs-key", label: "Needs API key" },
  { value: "connected", label: "Connected" },
  { value: "blocked", label: "Blocked" },
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

export default function InventorySettingsPage() {
  const hydrated = useHydrated();
  const [settingsOverride, setSettingsOverride] = useState<InventorySettings | null>(null);
  const [status, setStatus] = useState("");
  const settings = settingsOverride ?? (hydrated ? getInventorySettings() : null);

  const updateSettings = (patch: Partial<InventorySettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettingsOverride(next);
    saveInventorySettings(next);
    setStatus("Settings saved");
  };

  const downloadBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      bar: getBar(),
      counts: getCounts(),
      weeklyInputs: getWeeklyInputDraft(),
      settings: getInventorySettings(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `open-source-barware-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Backup exported");
  };

  const clearDeviceData = () => {
    const confirmed = window.confirm(
      "Reset the Salle d'Armes playground? Demo bar data will be restored fresh in this browser."
    );
    if (!confirmed) return;
    resetDojoPlayground();
    setSettingsOverride(getInventorySettings());
    setStatus("Salle playground reset with fresh demo data");
  };

  if (!hydrated || !settings) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="glow-dot" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light font-medium">
            Admin Settings
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl copper-text mb-4">
          Provider, cycle, and local backup controls.
        </h1>
        <p className="text-text-muted leading-relaxed max-w-2xl">
          These settings support the Chrome-side workflow without storing secret
          API keys here. Track the selected provider, connection status, count
          cadence, and local device backup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="panel rounded-sm p-6 md:p-8">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
            AI Provider
          </p>
          <h2 className="font-serif text-2xl text-cream mb-6">
            Connection waypoint
          </h2>
          <div className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Selected Provider
              </span>
              <select
                value={settings.aiProvider}
                onChange={(event) =>
                  updateSettings({
                    aiProvider: event.target.value as InventorySettings["aiProvider"],
                  })
                }
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              >
                {providerOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                API Status
              </span>
              <select
                value={settings.apiConnectionStatus}
                onChange={(event) =>
                  updateSettings({
                    apiConnectionStatus:
                      event.target.value as InventorySettings["apiConnectionStatus"],
                  })
                }
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="border border-copper/15 bg-bg/50 p-4">
              <p className="text-sm text-text-muted leading-relaxed">
                Store the actual API key only in the customer&apos;s local
                provider setup. This page tracks status, not secrets.
              </p>
            </div>
          </div>
        </section>

        <section className="panel rounded-sm p-6 md:p-8">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
            Inventory Cycle
          </p>
          <h2 className="font-serif text-2xl text-cream mb-6">
            Weekly operating rhythm
          </h2>
          <div className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Cycle Label
              </span>
              <input
                value={settings.cycleLabel}
                onChange={(event) => updateSettings({ cycleLabel: event.target.value })}
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Week Starts On
              </span>
              <select
                value={settings.weekStartsOn}
                onChange={(event) => updateSettings({ weekStartsOn: event.target.value })}
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              >
                {weekDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-start gap-3 border border-gear-border bg-bg/50 p-4">
              <input
                type="checkbox"
                checked={settings.backupReminderAccepted}
                onChange={(event) =>
                  updateSettings({ backupReminderAccepted: event.target.checked })
                }
                className="mt-1"
              />
              <span className="text-sm text-text-muted leading-relaxed">
                The first approved inventory map has been copied or backed up
                outside this browser.
              </span>
            </label>
          </div>
        </section>
      </div>

      <section className="panel rounded-sm p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Local Device
            </p>
            <h2 className="font-serif text-2xl text-cream mb-4">
              Backup before you move machines.
            </h2>
            <p className="text-text-muted leading-relaxed">
              The Salle keeps sandbox data in this browser only. Export a JSON
              backup if you want to save your experiments, or reset to reload the
              Agave &amp; Rye demo bar.
            </p>
          </div>
          <div className="lg:col-span-7">
            <textarea
              value={settings.notes}
              onChange={(event) => updateSettings({ notes: event.target.value })}
              placeholder="Operational notes, provider setup reminders, or POS export instructions..."
              rows={6}
              className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-sm text-cream leading-relaxed placeholder:text-text-light/50 focus:outline-none focus:border-copper/60 resize-y mb-4"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadBackup}
                className="bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-3 text-sm tracking-wide transition-all"
              >
                Export Backup
              </button>
              <button
                onClick={clearDeviceData}
                className="border border-wine/40 text-wine-glow hover:bg-wine/10 px-6 py-3 text-sm tracking-wide transition-all"
              >
                Reset Salle Playground
              </button>
              <button
                onClick={() => {
                  showDojoWelcomeAgain();
                  setStatus("Welcome screen will show next time you open the Salle home");
                }}
                className="border border-copper/30 text-copper hover:bg-copper/10 px-6 py-3 text-sm tracking-wide transition-all"
              >
                Show Salle Welcome Again
              </button>
            </div>
            {status && <p className="text-xs text-patina-light mt-4">{status}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
