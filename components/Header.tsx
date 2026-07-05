"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SignMarqueeLights from "@/components/SignMarqueeLights";

const LOGO_COPPER = "#b88958";

function MartiniGlass() {
  return (
    <svg width="58" height="68" viewBox="0 0 52 62" fill="none">
      {/* Bowl */}
      <path
        d="M4 6 L48 6 L26 38 Z"
        stroke={LOGO_COPPER}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem */}
      <line x1="26" y1="38" x2="26" y2="54" stroke={LOGO_COPPER} strokeWidth="1.5" strokeLinecap="round" />
      {/* Base */}
      <line x1="12" y1="54" x2="40" y2="54" stroke={LOGO_COPPER} strokeWidth="1.5" strokeLinecap="round" />
      {/* Olive pick */}
      <line x1="7" y1="15" x2="20" y2="26" stroke={LOGO_COPPER} strokeWidth="1" strokeLinecap="round" />
      {/* Olive */}
      <circle cx="6" cy="14" r="4" stroke={LOGO_COPPER} strokeWidth="1.2" fill="none" />
      <circle cx="6" cy="14" r="1.5" fill={LOGO_COPPER} />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDojo = pathname?.startsWith("/inventory");

  const logo = (
    <div className="flex items-center gap-3.5 py-1.5 px-2">
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
            color: LOGO_COPPER,
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
  );

  return (
    <header className="bg-bg border-b border-gear-border">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="group opacity-100 hover:opacity-90 transition-opacity">
          {isDojo ? <SignMarqueeLights>{logo}</SignMarqueeLights> : logo}
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/" className="text-text-muted hover:text-copper transition-colors tracking-wide">Home</Link>
          <Link href="/the-process" className="text-text-muted hover:text-copper transition-colors tracking-wide">The Process</Link>
          <Link href="/about" className="text-text-muted hover:text-copper transition-colors tracking-wide">About</Link>
          <Link href="/resources" className="text-text-muted hover:text-copper transition-colors tracking-wide">Resources</Link>
          <Link
            href="/inventory/dashboard"
            className={`tracking-wide transition-colors ${isDojo ? "text-copper" : "text-text-muted hover:text-copper"}`}
          >
            Salle d&apos;Armes
          </Link>
          <Link
            href="/download"
            className="relative bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 tracking-wide transition-all hover:shadow-[0_0_20px_rgba(168,120,79,0.3)]"
          >
            Download Program
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
          <Link
            href="/inventory/dashboard"
            onClick={() => setMenuOpen(false)}
            className={`py-1 transition-colors ${isDojo ? "text-copper" : "text-text-muted hover:text-copper"}`}
          >
            Salle d&apos;Armes
          </Link>
          <Link href="/download" onClick={() => setMenuOpen(false)} className="bg-copper text-bg font-semibold px-6 py-2.5 tracking-wide text-center">Download Program</Link>
        </div>
      )}
    </header>
  );
}
