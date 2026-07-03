"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  EMPTY_WEEKLY_INPUT_DRAFT,
  clearWeeklyInputDraft,
  generateId,
  getBar,
  getWeeklyInputDraft,
  saveWeeklyInputDraft,
  type StoredFileRecord,
  type WeeklyInputDraft,
} from "@/lib/inventory-store";

const inputCards = [
  {
    id: "count-notes",
    label: "Count",
    title: "Enter your inventory count this week",
    href: "/inventory/count",
    body: "Walk the approved bar map and enter the weekly count by well, back bar, cooler, storage shelf, liquor room, beer, wine, and mixers.",
    action: "Start Count",
  },
  {
    id: "invoice-pictures",
    label: "Invoices",
    title: "Enter your invoice pictures",
    href: "#invoice-pictures",
    body: "Stage pictures or PDFs of weekly delivery invoices so purchases can be added into the same cycle as the count.",
    action: "Stage Files",
  },
  {
    id: "pos-downloads",
    label: "POS",
    title: "Enter your POS downloads",
    href: "#pos-downloads",
    body: "Attach POS exports for the inventory period so expected usage can be compared against physical movement.",
    action: "Stage Files",
  },
];

const cycleSteps = [
  "Set the inventory period dates.",
  "Run or paste the weekly count notes.",
  "Stage invoice pictures or PDFs from the same period.",
  "Stage POS sales downloads for matching dates.",
  "Copy the AI handoff packet for review and reconciliation.",
];

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileRecords(files: FileList | null): StoredFileRecord[] {
  if (!files) return [];
  return Array.from(files).map((file) => ({
    id: generateId("file"),
    name: file.name,
    size: file.size,
    type: file.type || "unknown",
    lastModified: file.lastModified,
    addedAt: new Date().toISOString(),
  }));
}

export default function InventoryInputsPage() {
  const hydrated = useHydrated();
  const [draftOverride, setDraftOverride] = useState<WeeklyInputDraft | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const draft = draftOverride ?? (hydrated ? getWeeklyInputDraft() : EMPTY_WEEKLY_INPUT_DRAFT);
  const bar = hydrated ? getBar() : null;

  const updateDraft = (patch: Partial<WeeklyInputDraft>) => {
    const next = { ...draft, ...patch };
    setDraftOverride(next);
    saveWeeklyInputDraft(next);
  };

  const addFiles = (field: "invoiceFiles" | "posFiles", files: FileList | null) => {
    const records = fileRecords(files);
    if (records.length === 0) return;
    updateDraft({ [field]: [...draft[field], ...records] });
  };

  const removeFile = (field: "invoiceFiles" | "posFiles", id: string) => {
    updateDraft({ [field]: draft[field].filter((file) => file.id !== id) });
  };

  const resetDraft = () => {
    clearWeeklyInputDraft();
    setDraftOverride(EMPTY_WEEKLY_INPUT_DRAFT);
    setCopyStatus("Draft cleared");
  };

  const packet = useMemo(() => {
    const products = bar?.stations.flatMap((station) => station.bottles) ?? [];
    const sections = [
      "# Open Source Barware Weekly Input Packet",
      "",
      `Bar: ${bar?.name ?? "Not configured"}`,
      `Period: ${draft.periodStart || "not set"} to ${draft.periodEnd || "not set"}`,
      `Products in approved map: ${products.length}`,
      `Stations: ${bar?.stations.map((station) => station.name).join(", ") || "not configured"}`,
      "",
      "## Count Notes",
      draft.countNotes || "No pasted count notes. Use the saved count in the app if already entered.",
      "",
      "## Invoice Files Staged",
      draft.invoiceFiles.length
        ? draft.invoiceFiles.map((file) => `- ${file.name} (${formatBytes(file.size)})`).join("\n")
        : "No invoice files staged.",
      "",
      "## Invoice Notes",
      draft.invoiceNotes || "No invoice notes entered.",
      "",
      "## POS Files Staged",
      draft.posFiles.length
        ? draft.posFiles.map((file) => `- ${file.name} (${formatBytes(file.size)})`).join("\n")
        : "No POS files staged.",
      "",
      "## POS Notes",
      draft.posNotes || "No POS notes entered.",
      "",
      "Review these inputs against the approved inventory map. Ask before guessing on unreadable invoices, unclear products, bottle sizes, POS date mismatches, comps, staff drinks, breakage, or spills.",
    ];
    return sections.join("\n");
  }, [bar, draft]);

  const copyPacket = async () => {
    try {
      await navigator.clipboard.writeText(packet);
      setCopyStatus("AI handoff packet copied");
    } catch {
      setCopyStatus("Copy failed; select the packet text manually");
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading inputs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light font-medium">
              Weekly Inputs
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl copper-text mb-4">
            Count, invoices, and POS files enter here.
          </h1>
          <p className="text-text-muted leading-relaxed">
            This is the admin-panel intake area for today&apos;s trial. It keeps
            the weekly period, count notes, invoice files, and POS files together
            before reconciliation.
          </p>
        </div>
        <Link
          href="/inventory/dashboard"
          className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-5 py-2.5 text-sm tracking-wide transition-all text-center"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {inputCards.map((card) => (
          <section key={card.label} id={card.id} className="panel rounded-sm p-6 relative rivets">
            <div className="flex items-start justify-between gap-4 mb-6">
              <span className="text-[10px] tracking-[0.25em] uppercase text-copper">
                {card.label}
              </span>
              <span className="text-xs font-mono text-text-light">Input</span>
            </div>
            <h2 className="font-serif text-2xl text-cream mb-4">
              {card.title}
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-8">
              {card.body}
            </p>
            <Link
              href={card.href}
              className="block w-full bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_20px_rgba(168,120,79,0.2)]"
            >
              {card.action}
            </Link>
          </section>
        ))}
      </div>

      <section className="panel rounded-sm p-6 md:p-8 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Cycle Packet
            </p>
            <h2 className="font-serif text-3xl text-cream mb-4">
              Keep the period clean.
            </h2>
            <p className="text-text-muted leading-relaxed">
              The count, invoices, and POS report need to cover the same dates.
              These fields create the packet you can paste into the AI provider
              for review.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Period Start
              </span>
              <input
                type="date"
                value={draft.periodStart}
                onChange={(event) => updateDraft({ periodStart: event.target.value })}
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-text-light">
                Period End
              </span>
              <input
                type="date"
                value={draft.periodEnd}
                onChange={(event) => updateDraft({ periodEnd: event.target.value })}
                className="bg-bg-warm border border-gear-border px-4 py-3 text-cream focus:outline-none focus:border-copper/60"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <TextInputPanel
          title="Count Notes"
          eyebrow="Inventory Count"
          value={draft.countNotes}
          placeholder="Paste the voice-count transcript or notes from the count here..."
          onChange={(value) => updateDraft({ countNotes: value })}
        />

        <FileInputPanel
          id="invoice-pictures"
          title="Invoice Pictures"
          eyebrow="Purchases"
          files={draft.invoiceFiles}
          notes={draft.invoiceNotes}
          accept="image/*,.pdf,.csv,.xlsx,.xls"
          onFiles={(files) => addFiles("invoiceFiles", files)}
          onRemove={(id) => removeFile("invoiceFiles", id)}
          onNotes={(value) => updateDraft({ invoiceNotes: value })}
        />

        <FileInputPanel
          id="pos-downloads"
          title="POS Downloads"
          eyebrow="Sales"
          files={draft.posFiles}
          notes={draft.posNotes}
          accept=".pdf,.csv,.xlsx,.xls,.txt"
          onFiles={(files) => addFiles("posFiles", files)}
          onRemove={(id) => removeFile("posFiles", id)}
          onNotes={(value) => updateDraft({ posNotes: value })}
        />

        <section className="panel rounded-sm p-6 md:p-8">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
            AI Handoff
          </p>
          <h2 className="font-serif text-2xl text-cream mb-4">
            Copy the reconciliation packet.
          </h2>
          <textarea
            value={packet}
            readOnly
            rows={10}
            className="w-full bg-bg border border-gear-border rounded-sm px-4 py-3 text-sm text-text-muted leading-relaxed font-mono resize-y mb-4"
            aria-label="AI handoff packet"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyPacket}
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-3 text-sm tracking-wide transition-all"
            >
              Copy Packet
            </button>
            <button
              onClick={resetDraft}
              className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-6 py-3 text-sm tracking-wide transition-all"
            >
              Clear Draft
            </button>
          </div>
          {copyStatus && (
            <p className="text-xs text-patina-light mt-4">{copyStatus}</p>
          )}
        </section>
      </div>

      <section className="panel rounded-sm p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Cycle Order
            </p>
            <h2 className="font-serif text-3xl text-cream mb-4">
              Inputs update the system together.
            </h2>
            <p className="text-text-muted leading-relaxed">
              Nothing here finalizes the report by itself. It keeps the raw
              weekly inputs bundled so the AI and spreadsheet pass can reconcile
              them in the right order.
            </p>
          </div>
          <ol className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cycleSteps.map((step, i) => (
              <li key={step} className="border border-gear-border bg-bg/50 p-4">
                <span className="font-mono text-copper text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-text-muted leading-relaxed mt-3">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

function TextInputPanel({
  title,
  eyebrow,
  value,
  placeholder,
  onChange,
}: {
  title: string;
  eyebrow: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="panel rounded-sm p-6 md:p-8">
      <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
        {eyebrow}
      </p>
      <h2 className="font-serif text-2xl text-cream mb-4">{title}</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={12}
        className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-sm text-cream leading-relaxed placeholder:text-text-light/50 focus:outline-none focus:border-copper/60 resize-y"
      />
    </section>
  );
}

function FileInputPanel({
  id,
  title,
  eyebrow,
  files,
  notes,
  accept,
  onFiles,
  onRemove,
  onNotes,
}: {
  id: string;
  title: string;
  eyebrow: string;
  files: StoredFileRecord[];
  notes: string;
  accept: string;
  onFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onNotes: (value: string) => void;
}) {
  return (
    <section id={id} className="panel rounded-sm p-6 md:p-8 scroll-mt-28">
      <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
        {eyebrow}
      </p>
      <h2 className="font-serif text-2xl text-cream mb-4">{title}</h2>
      <label className="block border border-dashed border-gear-border bg-bg/40 p-5 text-center cursor-pointer hover:border-copper/50 transition-colors mb-5">
        <span className="block text-sm text-copper font-semibold tracking-wide mb-1">
          Choose files
        </span>
        <span className="block text-xs text-text-light">
          Images, PDFs, spreadsheets, or exports stay on this device.
        </span>
        <input
          type="file"
          multiple
          accept={accept}
          onChange={(event) => onFiles(event.target.files)}
          className="sr-only"
        />
      </label>

      <div className="space-y-2 mb-5">
        {files.length === 0 ? (
          <p className="text-sm text-text-light italic">No files staged yet.</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 border border-gear-border bg-bg/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-cream truncate">{file.name}</p>
                <p className="text-[10px] text-text-light">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                onClick={() => onRemove(file.id)}
                className="text-text-light hover:text-wine-glow transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <textarea
        value={notes}
        onChange={(event) => onNotes(event.target.value)}
        placeholder="Add notes about missing pages, vendor names, date ranges, or export settings..."
        rows={5}
        className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-sm text-cream leading-relaxed placeholder:text-text-light/50 focus:outline-none focus:border-copper/60 resize-y"
      />
    </section>
  );
}
