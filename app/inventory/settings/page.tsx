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

  const toggleFeature = (key: keyof InventorySettings, value: boolean) => {
    updateSettings({ [key]: value } as Partial<InventorySettings>);
    setStatus("Preference saved in this sandbox. Full behavior ships in the downloadable program.");
  };

  const FeatureToggle = ({
    label,
    hint,
    flag,
    badge,
  }: {
    label: string;
    hint: string;
    flag: keyof InventorySettings;
    badge?: string;
  }) => {
    const on = Boolean(settings[flag]);
    return (
      <label className="flex items-start gap-3 border border-gear-border bg-bg/40 p-3 rounded-sm cursor-pointer hover:border-copper/40 transition-colors">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => toggleFeature(flag, e.target.checked)}
          className="mt-1 shrink-0"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-cream font-medium">{label}</span>
            {badge ? (
              <span className="text-[10px] uppercase tracking-wider text-copper border border-copper/30 px-1.5 py-0.5">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="block text-xs text-text-muted mt-1 leading-relaxed">{hint}</span>
        </span>
      </label>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="view-header">
        <h1>Settings</h1>
        <p>
          Venues, people, cycle rhythm, and every V1.5 tool — toggles here mirror the downloadable
          program so you can see what&apos;s available. Some are preview-only in this browser sandbox.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="panel panel--glass lg:col-span-2">
          <h2 className="font-serif text-lg text-cream mb-2">Your venues</h2>
          <p className="dojo-field-hint mt-0 mb-4">
            Multi-venue is first-class in the real program: each outlet has its own map, counts, and
            manager logins. This sandbox shows one demo venue — download to add more and transfer stock between them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="border border-copper/40 bg-copper/5 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-copper mb-1">Active</p>
              <p className="text-cream text-base font-medium">{bar?.name ?? "No bar loaded"}</p>
              <p className="dojo-field-hint mt-1">
                {bar?.stations.length ?? 0} stations · sandbox demo
              </p>
            </div>
            <div className="border border-dashed border-gear-border bg-bg/30 px-4 py-4 opacity-80">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-light mb-1">Venue 2</p>
              <p className="text-text-muted text-sm">Patio / satellite</p>
              <p className="dojo-field-hint mt-1">Add in the downloaded program</p>
            </div>
            <div className="border border-dashed border-gear-border bg-bg/30 px-4 py-4 opacity-80">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-light mb-1">Venue 3</p>
              <p className="text-text-muted text-sm">Banquet / event bar</p>
              <p className="dojo-field-hint mt-1">Add in the downloaded program</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "In the downloaded program, + Add another venue starts caterpillar setup for that outlet. Download the program to build additional bars."
                )
              }
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              + Add another venue
            </button>
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Stock transfers (Main → Patio) are live in the Chrome program under Multi-venue transfer. This sandbox is single-venue demo data."
                )
              }
              className="border border-copper/40 text-copper hover:bg-copper/10 px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              ⇄ Transfer stock between venues
            </button>
          </div>
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

        {/* V1.5 feature rack — show every option even when sandbox is preview-only */}
        <section className="panel panel--glass lg:col-span-2 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-copper mb-1">V1.5 program tools</p>
            <h2 className="font-serif text-lg text-cream m-0">Counting, intelligence &amp; automation</h2>
            <p className="dojo-field-hint mt-2 mb-0">
              These match the downloadable program. Flip them on so you know they exist — full workflows
              (camera, multi-venue transfer, PIN logins) run in the installed app.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureToggle
              label="Weighing mode (scale / bottle weights)"
              hint="Optional weight entry instead of tenths. Default off so classic counts stay simple."
              flag="weighEnabled"
              badge="Optional"
            />
            <FeatureToggle
              label="Mobile count — shelf-to-sheet"
              hint="Large-tap walk count for phones. Same data as the count pipeline."
              flag="mobileCountEnabled"
            />
            <FeatureToggle
              label="Barcode / camera scan"
              hint="Point at a label to increment that bottle on mobile count."
              flag="barcodeScanEnabled"
            />
            <FeatureToggle
              label="Visual par alerts"
              hint="Green / watch / order colors so low stock is obvious at a glance."
              flag="visualParAlerts"
            />
            <FeatureToggle
              label="Blueprint walk order"
              hint="Save shelf order so the next count follows the same path."
              flag="blueprintWalkOrder"
            />
            <FeatureToggle
              label="Recipes & menu costing"
              hint="Build recipes, cost per serve, cost %, profit from your bottle costs."
              flag="recipesCosting"
            />
            <FeatureToggle
              label="Smart orders → purchase order"
              hint="PAR − on hand + sales → copy / email / CSV PO, then receive."
              flag="smartOrders"
            />
            <FeatureToggle
              label="Structured POS import"
              hint="Toast / Square / CSV parse, review matches, feed variance."
              flag="posStructuredImport"
            />
            <FeatureToggle
              label="Receiving workflow"
              hint="Load from smart orders, log what arrived, flag discrepancies."
              flag="receivingWorkflow"
            />
            <FeatureToggle
              label="Advanced shift reports"
              hint="Plain-English story first, full depth tabs, CSV export."
              flag="advancedReports"
            />
          </div>
        </section>

        <section className="panel panel--glass lg:col-span-2 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-copper mb-1">Team &amp; multi-venue</p>
            <h2 className="font-serif text-lg text-cream m-0">People, PINs &amp; communications</h2>
            <p className="dojo-field-hint mt-2 mb-0">
              Admin creates 6-digit PINs for bar managers locked to one outlet. Employee communications
              is the staff board for handoffs. Full login UI lives in the installed program.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureToggle
              label="Multi-venue switching"
              hint="Several bars under one business; company roll-up in reports."
              flag="multiVenue"
            />
            <FeatureToggle
              label="Stock transfers between venues"
              hint="Move bottles Main → Patio; both inventories update; transfer log."
              flag="stockTransfers"
            />
            <FeatureToggle
              label="People & access (6-digit PIN)"
              hint="Admin logins + bar managers. Admin can reset any PIN without the old one."
              flag="peopleAccessPin"
              badge="Admin"
            />
            <FeatureToggle
              label="Employee communications / staff board"
              hint="Sidebar handoffs. Open Employee communications in the left menu to try the sandbox board."
              flag="staffBoard"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "People & access (create manager, assign venue, permission checkboxes, reset PIN) is fully wired in the downloadable program under Settings. This Salle sandbox is open-mode so you can explore without a PIN."
                )
              }
              className="border border-copper/40 text-copper hover:bg-copper/10 px-5 py-2.5 text-sm tracking-wide transition-all"
            >
              Preview People &amp; access…
            </button>
            <a
              href="/inventory/staff"
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all inline-flex items-center"
            >
              Open Employee communications →
            </a>
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