"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/components/dojo/useHydrated";

const STORAGE_KEY = "osb_dojo_staff_board";

type StaffPost = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  venue: string;
};

function loadPosts(): StaffPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaffPost[]) : [];
  } catch {
    return [];
  }
}

function savePosts(posts: StaffPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 50)));
}

export default function InventoryStaffPage() {
  const hydrated = useHydrated();
  const [posts, setPosts] = useState<StaffPost[]>([]);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("You");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    const existing = loadPosts();
    if (existing.length === 0) {
      const seed: StaffPost[] = [
        {
          id: "seed-1",
          text: "Welcome to Employee communications — same idea as the downloadable program’s Staff board. Leave handoffs for the next shift here.",
          author: "System",
          createdAt: new Date().toISOString(),
          venue: "Company-wide",
        },
        {
          id: "seed-2",
          text: "Demo: Patio well is light on vodka — transfer before Friday count. (In the real program this can tag a venue and sit next to PIN logins.)",
          author: "Admin",
          createdAt: new Date(Date.now() - 3600_000).toISOString(),
          venue: "Your Bar 1",
        },
      ];
      savePosts(seed);
      setPosts(seed);
    } else {
      setPosts(existing);
    }
  }, [hydrated]);

  const postNote = () => {
    const body = text.trim();
    if (!body) {
      setStatus("Write a short note first.");
      return;
    }
    const next: StaffPost = {
      id: `post-${Date.now()}`,
      text: body,
      author: author.trim() || "You",
      createdAt: new Date().toISOString(),
      venue: "Your Bar 1",
    };
    const list = [next, ...posts];
    setPosts(list);
    savePosts(list);
    setText("");
    setStatus("Posted — stays in this browser sandbox.");
  };

  const remove = (id: string) => {
    const list = posts.filter((p) => p.id !== id);
    setPosts(list);
    savePosts(list);
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
          Handoffs for the next shift — company notes and venue tags. In the downloaded program this
          pairs with <strong>People &amp; access</strong> (6-digit PINs for bar managers). This
          sandbox keeps notes in your browser only.
        </p>
      </header>

      <section className="panel panel--glass space-y-4">
        <h2 className="font-serif text-lg text-cream m-0">Post a note</h2>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">Your name</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-light">Note</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. Count the patio first — they close early Friday."
            className="bg-bg-warm border border-gear-border px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-copper/60 resize-y"
          />
        </label>
        <button
          type="button"
          onClick={postNote}
          className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all"
        >
          Post to board
        </button>
        {status ? <p className="text-sm text-patina-light m-0">{status}</p> : null}
      </section>

      <div className="space-y-3">
        {posts.map((p) => (
          <article
            key={p.id}
            className="panel panel--glass"
            style={{ padding: "14px 16px" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <strong className="text-cream text-sm">{p.author}</strong>
              <span className="text-xs text-text-muted">
                {p.createdAt.slice(0, 16).replace("T", " ")} · {p.venue}
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed m-0 whitespace-pre-wrap">{p.text}</p>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="mt-3 text-xs uppercase tracking-wider text-text-light hover:text-copper border-0 bg-transparent cursor-pointer p-0"
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
