"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { startAboutSignLights } from "@/lib/about-sign-lights";

const navHotspots = [
  { label: "Home", href: "/", className: "nav-home" },
  { label: "The Process", href: "/the-process", className: "nav-process" },
  { label: "About", href: "/about", className: "nav-about" },
  { label: "Resources", href: "/resources", className: "nav-resources" },
  { label: "The Dojo", href: "/inventory", className: "nav-app" },
  { label: "Free Program", href: "/downloads", className: "nav-free" },
];

export default function AboutMockupPage() {
  const signWrapRef = useRef<HTMLDivElement>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.location.hash === "#story" || window.location.hash === "") {
      requestAnimationFrame(() => {
        signWrapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrap = signWrapRef.current;
    const canvas = signCanvasRef.current;
    if (!wrap || !canvas) return;

    return startAboutSignLights(wrap, canvas);
  }, []);

  return (
    <div className="osb-about-mockup">
      <style>{`
        body:has(.osb-about-mockup) > header,
        body:has(.osb-about-mockup) > footer {
          display: none;
        }

        .osb-about-mockup {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(58, 44, 27, 0.28), transparent 34rem),
            linear-gradient(180deg, #020202 0%, #070706 100%);
          color: #f4ead8;
        }

        .osb-about-page {
          width: min(1122px, 100vw);
          margin: 0 auto;
          background: #090807;
          box-shadow: 0 0 80px rgba(0, 0, 0, 0.72);
        }

        .osb-plate {
          position: relative;
          margin: 0;
        }

        .osb-plate img {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
          position: relative;
          z-index: 1;
        }

        .osb-hotspot {
          position: absolute;
          display: block;
          color: transparent;
          text-decoration: none;
          outline: none;
        }

        .osb-hotspot:focus-visible {
          box-shadow:
            0 0 0 2px #f1c36e,
            0 0 22px rgba(241, 195, 110, 0.6);
          background: rgba(241, 195, 110, 0.08);
        }

        .nav-home {
          left: 40.2%;
          top: 4.1%;
          width: 5.2%;
          height: 2.8%;
        }

        .nav-process {
          left: 47.1%;
          top: 4.1%;
          width: 10.4%;
          height: 2.8%;
        }

        .nav-about {
          left: 58.4%;
          top: 3.4%;
          width: 7.8%;
          height: 4.1%;
        }

        .nav-resources {
          left: 67.1%;
          top: 4.1%;
          width: 9.2%;
          height: 2.8%;
        }

        .nav-app {
          left: 77.7%;
          top: 4.1%;
          width: 4.8%;
          height: 2.8%;
        }

        .nav-free {
          left: 83.4%;
          top: 2.8%;
          width: 13.7%;
          height: 4.8%;
        }

        .support-button {
          left: 50.4%;
          top: 75.4%;
          width: 42.8%;
          height: 9.4%;
        }

        .drink-sign-canvas-wrap {
          position: absolute;
          left: 51.46%;
          top: 76.94%;
          width: 36.82%;
          height: 5.71%;
          z-index: 4;
          pointer-events: none;
        }

        .drink-sign-canvas {
          display: block;
          width: 100%;
          height: 100%;
          mix-blend-mode: screen;
        }

        .osb-sr-copy {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .osb-about-story {
          padding: 4rem 1.5rem 5rem;
          border-top: 1px solid rgba(205, 127, 50, 0.18);
          background: linear-gradient(180deg, #090807 0%, #0d0b09 100%);
        }

        .osb-about-story-inner {
          max-width: 42rem;
          margin: 0 auto;
        }

        .osb-about-story h2 {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          color: #d4821a;
          margin: 2.5rem 0 1rem;
        }

        .osb-about-story h2:first-child {
          margin-top: 0;
        }

        .osb-about-story p,
        .osb-about-story li {
          color: #c8b9a4;
          line-height: 1.75;
          font-size: 1rem;
        }

        .osb-about-story p {
          margin-bottom: 1rem;
        }

        .osb-about-story ul {
          margin: 0 0 1rem 1.25rem;
          padding: 0;
        }

        .osb-about-story li {
          margin-bottom: 0.5rem;
        }

        .osb-about-story a {
          color: #d4821a;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>

      <main className="osb-about-page">
        <section className="osb-plate" id="top" aria-label="Open Source Barware top page section">
          <Image
            src="/images/osb-about-top-approved.png"
            alt="Open Source Barware about page with steampunk barware hero, how it started panel, and credit section"
            width={1122}
            height={1402}
            priority
          />

          {navHotspots.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`osb-hotspot ${link.className}`}
              aria-label={link.label}
            />
          ))}

          <div className="osb-sr-copy">
            <h1>A real bar problem, built with the people living it.</h1>
            <p>Now it is free to the world.</p>
            <p>
              Open Source Barware is a free, open-source bar inventory system built around real bar
              work, real counts, and the people living the problem.
            </p>
          </div>
        </section>

        <section className="osb-plate" id="story" aria-label="Open Source Barware story and support section">
          <Image
            src="/images/osb-about-middle-bottom-approved.png"
            alt="Open Source Barware story section with timeline, Miami hidden bar tours panel, and buy us a drink support panel"
            width={1024}
            height={1106}
            priority
          />

          <div ref={signWrapRef} className="drink-sign-canvas-wrap" aria-hidden="true">
            <canvas ref={signCanvasRef} className="drink-sign-canvas" />
          </div>

          <a
            className="osb-hotspot support-button"
            href="https://ko-fi.com/W2J022HCH2"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buy us a drink"
          />

          <div className="osb-sr-copy">
            <h2>It started with music.</h2>
            <p>
              This project is a thank-you to the bartenders, managers, musicians, guests, cooks,
              servers, barbacks, door staff, dishwashers, and friends who shaped the work.
            </p>
            <h2>Buy us a drink</h2>
            <p>Every donation keeps Open Source Barware alive, open, and free for everyone.</p>
          </div>
        </section>

        <section className="osb-about-story" aria-labelledby="about-story-heading">
          <div className="osb-about-story-inner">
            <h2 id="about-story-heading">Why we built this</h2>
            <p>
              Open Source Barware started with a problem every working bar manager recognizes:
              close out, grab the clipboard, count bottles by tenths, walk to the office, type
              numbers into a spreadsheet from 2014, try to reconcile against POS sales, and watch
              it never quite add up. The industry has lived that loop for decades while vendors
              sold inventory guns, monthly SaaS fees, and consulting priced by the bottle.
            </p>
            <p>
              We built the program we wished existed. It is free, open source, and designed around
              how bars actually run — voice notes on a walk-through, a spreadsheet everyone can
              read, weekly inputs for counts and invoices, and an AI home base that explains what
              changed instead of hiding behind a dashboard. No signup wall. No email capture. No
              investor deck between you and a clean count.
            </p>

            <h2>Field-tested at Agave &amp; Rye</h2>
            <p>
              This was not designed in a conference room. The workflow was pressure-tested at{" "}
              <strong>Agave &amp; Rye</strong> in downtown Cleveland — real wells, real liquor
              rooms, real end-of-shift fatigue. If a step did not survive a late-night count, it
              did not ship. That standard still governs the project: useful before it is fancy,
              honest before it is automated.
            </p>
            <p>
              The Cleveland bar community — including roots through the{" "}
              <a href="https://sites.google.com/usbg.org/usbg-cleveland/home" target="_blank" rel="noopener noreferrer">
                USBG Cleveland chapter
              </a>{" "}
              — shaped the tone of the work. Bartenders, barbacks, cooks, servers, door staff, and
              the guests who kept showing up all left fingerprints on what became Open Source
              Barware.
            </p>

            <h2>What &ldquo;open source&rdquo; means here</h2>
            <p>
              The program, documentation, and operating logic are meant to stay in the open. You can
              download the system, run it in Chrome, connect the AI provider you already trust, and
              keep your own inventory map and weekly packet on your terms. Fork it. Improve it. Share
              it with the next bar that is tired of renting their own workflow.
            </p>
            <ul>
              <li>One free Chrome-side program — not six upsells dressed as a toolkit.</li>
              <li>Customer-owned data with provider-connected AI, not a black-box platform.</li>
              <li>Checks and gates before the first live count, so the map is right before the math.</li>
              <li>Weekly rhythm: count the room, add invoices and POS, read the story.</li>
            </ul>

            <h2>Who is behind it</h2>
            <p>
              Open Source Barware is a <strong>RBJP Holdings</strong> project, forged in Cleveland,
              Ohio, and given to the trade with no strings attached. Richard B. Jamison built it
              from decades in hospitality, music, and operating businesses where the numbers only work
              when the people doing the work trust the system.
            </p>
            <p>
              Hirado Junior — Nito to anyone who has worked a floor with him — appears in the origin
              story because this work was always about the crew on the other side of the stick, not a
              product category. If you want the full philosophy, read{" "}
              <Link href="/manifesto">the manifesto</Link>. If you want the workflow, start with{" "}
              <Link href="/the-process">the process</Link> or{" "}
              <Link href="/downloads">download the program</Link>.
            </p>

            <h2>Buy us a drink</h2>
            <p>
              The software stays free. Donations through{" "}
              <a href="https://ko-fi.com/W2J022HCH2" target="_blank" rel="noopener noreferrer">
                Ko-fi
              </a>{" "}
              help cover hosting, images, and the time it takes to keep the project open and honest
              for everyone. Every contribution keeps Open Source Barware alive without turning it into
              something we would not want to use behind our own bar.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
