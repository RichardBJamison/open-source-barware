"use client";

import Link from "next/link";
import { useState } from "react";
import { CocktailIcon } from "./SteampunkElements";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm border-b border-gear-border">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-sans font-black text-[24px] leading-none tracking-tight uppercase text-copper">Open</span>
          <CocktailIcon size={24} className="shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-sans font-black text-[24px] leading-none tracking-tight uppercase text-copper">Barware</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link
            href="/"
            className="text-text-muted hover:text-copper transition-colors tracking-wide"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-text-muted hover:text-copper transition-colors tracking-wide"
          >
            About
          </Link>
          <Link
            href="/resources"
            className="text-text-muted hover:text-copper transition-colors tracking-wide"
          >
            Resources
          </Link>
          <Link
            href="/inventory"
            className="text-text-muted hover:text-copper transition-colors tracking-wide"
          >
            App
          </Link>
          <Link
            href="/downloads"
            className="relative bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 tracking-wide transition-all hover:shadow-[0_0_20px_rgba(205,127,50,0.3)]"
          >
            Free Downloads
          </Link>
        </div>

        {/* Mobile */}
        <button
          className="md:hidden text-copper"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-gear-border px-6 py-6 bg-bg-warm flex flex-col gap-4 text-sm">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">Home</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">About</Link>
          <Link href="/resources" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">Resources</Link>
          <Link href="/inventory" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">App</Link>
          <Link href="/downloads" onClick={() => setMenuOpen(false)} className="bg-copper text-bg font-semibold px-6 py-2.5 tracking-wide text-center">Free Downloads</Link>
        </div>
      )}
    </header>
  );
}
