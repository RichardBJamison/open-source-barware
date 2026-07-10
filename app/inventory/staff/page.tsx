"use client";

import { useRef, useState } from "react";
import { useHydrated } from "@/components/dojo/useHydrated";

const STORAGE_KEY = "osb_dojo_inventory_notes";

type InventoryNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  venue: string;
  source: "paste" | "file";
  fileName?: string;
};

const SEED_NOTES: InventoryNote[] = [
  {
    id: "seed-1",
    text: "Welcome — managers upload inventory notes here (walk counts, station levels, mid-week catches). Paste a transcription or drop a .txt / .md export from phone Notes. EN + ES structure words work the same in the downloadable program.",
    author: "System",
    createdAt: "2026-01-01T12:00:00.000Z",
    venue: "Company-wide",
    source: "paste",
  },
  {
    id: "seed-2",
    text: "Well one, row one: Tito's 0.6, Ketel One 0.4, Tanqueray full. Patio well light on vodka — transfer before Friday count.",
    author: "Bar Manager",
    createdAt: "2026-01-01T11:00:00.000Z",
    venue: "Your Bar 1",
    source: "paste",
  },
];

function loadNotes(): InventoryNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InventoryNote[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: InventoryNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, 50)));
}

/** Read stored notes, seeding once if empty. Safe to call during client render. */
function loadOrSeedNotes(): InventoryNote[] {
  const existing = loadNotes();
  if (existing.length > 0) return existing;
  saveNotes(SEED_NOTES);
  return SEED_NOTES;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InventoryStaffPage() {
  const hydrated = useHydrated();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notesOverride, setNotesOverride] = useState<InventoryNote[] | null>(null);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Manager");
  const [status, setStatus] = useState("");
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  const notes = notesOverride ?? (hydrated ? loadOrSeedNotes() : []);

  const persist = (list: InventoryNote[]) => {
    saveNotes(list);
    setNotesOverride(list);
  };

  const addNote = (body: string, source: "paste" | "file", fileName?: string) => {
    const trimmed = body.trim();
    if (!trimmed) {
      setStatus("Paste or upload inventory notes first.");
      return;
    }
    const next: InventoryNote = {
      id: `note-${Date.now()}`,
      text: trimmed,
      author: author.trim() || "Manager",
      createdAt: new Date().toISOString(),
      venue: "Your Bar 1",
      source,
      fileName,
    };
    persist([next, ...notes]);
    setText("");
    setPendingFileName(null);
    setStatus(
      source === "file"
        ? `Uploaded ${fileName || "file"} — stays in this browser sandbox.`
        : "Inventory notes saved — stays in this browser sandbox."
    );
  };

  const savePaste = () =>
    addNote(text, pendingFileName ? "file" : "paste", pendingFileName || undefined);

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md") && !file.type.startsWith("text/")) {
      setStatus("Use a .txt or .md file (phone Notes export works best).");
      return;
    }
    try {
      const content = await file.text();
      if (!content.trim()) {
        setStatus("That file was empty.");
        return;
      }
      setText(content);
      setPendingFileName(file.name);
      setStatus(`Loaded ${file.name} (${formatBytes(file.size)}) — review below, then save.`);
    } catch {
      setStatus("Could not read that file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const remove = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  if (!hydrated) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-text-muted animate-pulse">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="view-header">
        <p className="view-eyebrow">Team</p>
        <h1>Employee communications</h1>
        <p className="view-lead">
          Managers upload <strong>inventory notes</strong> here — walk counts, station levels, and
          mid-week catches. Drop a phone Notes export or paste the transcription. In the downloaded
          program this pairs with <strong>People &amp; access</strong> (6-digit PINs). This sandbox
          keeps notes in your browser only.
        </p>
      </header>

      <section className="panel panel--glass space-y-4">
        <h2 className="font-serif text-lg text-cream m-0">Upload inventory notes</h2>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">Manager name</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">
            File (.txt, .md — iPhone Notes, Google Keep, Samsung Notes)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => void onFile(e.target.files)}
            className="text-sm text-text-muted file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-copper file:text-bg file:text-xs file:uppercase file:tracking-wide file:cursor-pointer"
          />
        </label>

        {pendingFileName ? (
          <p className="text-xs text-patina-light m-0">
            Staged file: <span className="text-cream">{pendingFileName}</span>
          </p>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">
            Or paste inventory notes
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={`Example:\nWell one, row one: Tito's 0.6, Ketel One 0.4, Tanqueray full.\nBack bar top: Patron Silver 0.3, Don Julio 1942 0.8.\nPatio well light on vodka — transfer before Friday count.`}
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60 resize-y leading-relaxed"
          />
        </label>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={savePaste}
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
          >
            Save inventory notes
          </button>
          {text.trim() ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                setPendingFileName(null);
                setStatus("");
              }}
              className="border border-gear-border text-text-light hover:text-cream hover:border-copper/40 px-4 py-2.5 text-sm transition-all"
            >
              Clear
            </button>
          ) : null}
        </div>
        {status ? <p className="text-sm text-patina-light m-0">{status}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg text-cream m-0">Uploaded notes</h2>
        {notes.map((n) => (
          <article
            key={n.id}
            className="panel panel--glass"
            style={{ padding: "14px 16px" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <strong className="text-cream text-sm">{n.author}</strong>
              <span className="text-xs text-text-muted">
                {n.createdAt.slice(0, 16).replace("T", " ")} · {n.venue}
                {n.source === "file" && n.fileName ? ` · ${n.fileName}` : ""}
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed m-0 whitespace-pre-wrap">{n.text}</p>
            <button
              type="button"
              onClick={() => remove(n.id)}
              className="mt-3 text-xs uppercase tracking-wider text-text-light hover:text-copper border-0 bg-transparent cursor-pointer p-0"
            >
              Remove
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
