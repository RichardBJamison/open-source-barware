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
      </main>
    </div>
  );
}
