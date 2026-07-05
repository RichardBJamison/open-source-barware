"use client";

import { useState } from "react";
import { useHydrated } from "@/components/dojo/useHydrated";
import {
  deletePosReport,
  generateId,
  getPosReports,
  savePosReport,
  type PosReportEntry,
  type StoredFileRecord,
} from "@/lib/inventory-store";

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
  const [reports, setReports] = useState<PosReportEntry[] | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");
  const [files, setFiles] = useState<StoredFileRecord[]>([]);
  const [status, setStatus] = useState("");

  const posReports = reports ?? (hydrated ? getPosReports() : []);

  const refresh = () => setReports(getPosReports());

  const saveDrop = () => {
    if (!files.length && !paste.trim()) {
      setStatus("Choose a POS file or paste receipt text.");
      return;
    }

    const entry: PosReportEntry = {
      id: generateId("pos"),
      label: label.trim() || "POS drop",
      reportDate: new Date().toISOString().slice(0, 10),
      note: note.trim() || paste.trim().slice(0, 120),
      files: files.length
        ? files
        : [
            {
              id: generateId("paste"),
              name: "pasted-receipt.txt",
              size: paste.length,
              type: "text/plain",
              lastModified: Date.now(),
              addedAt: new Date().toISOString(),
            },
          ],
      addedAt: new Date().toISOString(),
    };

    savePosReport(entry);
    setLabel("");
    setNote("");
    setPaste("");
    setFiles([]);
    setStatus("POS drop saved.");
    refresh();
  };

  const removeDrop = (id: string) => {
    if (!window.confirm("Remove this POS drop?")) return;
    deletePosReport(id);
    setStatus("POS drop removed.");
    refresh();
  };

  if (!hydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading weekly inputs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="dojo-view-header">
        <h1>Weekly inputs</h1>
        <p>
          Drop POS terminal receipts through the week — dated, labeled, kept until the next count.
        </p>
      </header>

      <section className="panel rounded-sm p-5 sm:p-6 rivets space-y-4">
        <h2 className="font-serif text-lg text-cream">Add POS report</h2>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">Label</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Tuesday close"
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">Note (optional)</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Toast export, Square, etc."
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">
            POS file (.csv, .txt, .tsv)
          </span>
          <input
            type="file"
            accept=".csv,.txt,.tsv,.json,text/csv,text/plain"
            onChange={(event) => {
              const staged = fileRecords(event.target.files);
              if (staged.length) setFiles((prev) => [...prev, ...staged]);
              event.target.value = "";
            }}
            className="text-sm text-text-muted file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-copper file:text-bg file:text-xs file:uppercase file:tracking-wide"
          />
        </label>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 border border-gear-border bg-bg/50 px-3 py-2 text-sm"
              >
                <span className="text-cream truncate">
                  {file.name} <span className="text-text-light">({formatBytes(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
                  className="text-xs text-text-light hover:text-wine-glow"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">
            Or paste receipt text
          </span>
          <textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            rows={4}
            placeholder="Paste POS export text if you do not have a file"
            className="bg-bg-warm border border-gear-border rounded-sm px-3 py-2.5 text-sm text-cream leading-relaxed focus:outline-none focus:border-copper/60 resize-y"
          />
        </label>

        <button
          type="button"
          onClick={saveDrop}
          className="bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
        >
          Save POS drop
        </button>
        {status ? <p className="text-sm text-patina-light">{status}</p> : null}
      </section>

      <section className="panel rounded-sm p-5 sm:p-6 rivets">
        <h2 className="font-serif text-lg text-cream mb-2">Mid-week POS log</h2>
        <p className="dojo-field-hint mt-0 mb-4">
          Multiple uploads stack here until your next physical count closes the cycle.
        </p>

        {posReports.length === 0 ? (
          <p className="dojo-field-hint">No POS drops yet — upload a terminal receipt above.</p>
        ) : (
          <ul className="space-y-3">
            {posReports.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-4 border border-gear-border bg-bg/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-cream font-medium">{entry.label || "POS drop"}</p>
                  <p className="dojo-field-hint mt-1">
                    {entry.addedAt.slice(0, 16).replace("T", " ")} ·{" "}
                    {entry.files[0]?.name ?? "pasted text"}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeDrop(entry.id)}
                  className="text-xs text-text-light hover:text-wine-glow shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}