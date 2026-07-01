"use client";

import Link from "next/link";
import { useState } from "react";

// Slightly oranger than the copper button (#cd7f32) — less blue channel, more vivid
const LOGO_ORANGE = "#d4821a";

function MartiniGlass() {
  return (
    <svg width="58" height="68" viewBox="0 0 52 62" fill="none">
      {/* Bowl */}
      <path
        d="M4 6 L48 6 L26 38 Z"
        stroke={LOGO_ORANGE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem */}
      <line x1="26" y1="38" x2="26" y2="54" stroke={LOGO_ORANGE} strokeWidth="1.5" strokeLinecap="round" />
      {/* Base */}
      <line x1="12" y1="54" x2="40" y2="54" stroke={LOGO_ORANGE} strokeWidth="1.5" strokeLinecap="round" />
      {/* Olive pick */}
      <line x1="7" y1="15" x2="20" y2="26" stroke={LOGO_ORANGE} strokeWidth="1" strokeLinecap="round" />
      {/* Olive */}
      <circle cx="6" cy="14" r="4" stroke={LOGO_ORANGE} strokeWidth="1.2" fill="none" />
      <circle cx="6" cy="14" r="1.5" fill={LOGO_ORANGE} />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-bg border-b border-gear-border">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="group opacity-100 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-3.5">
            <MartiniGlass />
            <div className="flex flex-col gap-1">
              {/* Wordmark */}
              <div
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  letterSpacing: "0.1em",
                  color: LOGO_ORANGE,
                }}
              >
                <span>OPEN S</span>
                <span style={{ fontSize: "0.9rem", opacity: 0.85, fontWeight: 400 }}>{"<>"}</span>
                <span>BARWARE</span>
              </div>
              {/* Tagline — white, sized up 25% vs original small PNG text */}
              <span
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.18em",
                  color: "#f5e6c8",
                  fontWeight: 400,
                  textTransform: "lowercase",
                }}
              >
                free, open-source program for the trade
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/" className="text-text-muted hover:text-copper transition-colors tracking-wide">Home</Link>
          <Link href="/the-process" className="text-text-muted hover:text-copper transition-colors tracking-wide">The Process</Link>
          <Link href="/about" className="text-text-muted hover:text-copper transition-colors tracking-wide">About</Link>
          <Link href="/resources" className="text-text-muted hover:text-copper transition-colors tracking-wide">Resources</Link>
          <Link href="/inventory" className="text-text-muted hover:text-copper transition-colors tracking-wide">App</Link>
          <Link
            href="/downloads"
            className="relative bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 tracking-wide transition-all hover:shadow-[0_0_20px_rgba(205,127,50,0.3)]"
          >
            Free Program
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
          <Link href="/the-process" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">The Process</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">About</Link>
          <Link href="/resources" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">Resources</Link>
          <Link href="/inventory" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-copper transition-colors py-1">App</Link>
          <Link href="/downloads" onClick={() => setMenuOpen(false)} className="bg-copper text-bg font-semibold px-6 py-2.5 tracking-wide text-center">Free Program</Link>
        </div>
      )}
    </header>
  );
}
