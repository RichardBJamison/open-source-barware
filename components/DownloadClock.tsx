"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function statsUrl() {
  if (typeof window === "undefined") return "/api/stats?days=1";
  if (window.location.hostname === "localhost") {
    return "https://opensourcebarware.com/api/stats?days=1";
  }
  return "/api/stats?days=1";
}

async function fetchDownloadTotal(): Promise<number> {
  const res = await fetch(statsUrl(), { cache: "no-store" });
  if (!res.ok) throw new Error("stats unavailable");
  const data = await res.json();
  return data?.overview?.totalDownloadsAllTime ?? 0;
}

function RotaryDigit({ digit }: { digit: number }) {
  const value = Number.isFinite(digit) ? Math.min(9, Math.max(0, digit)) : 0;

  return (
    <div className="rotary-digit" aria-hidden="true">
      <div className="rotary-digit-bezel">
        <div
          className="rotary-digit-drum"
          style={{ transform: `translate3d(0, -${value * 10}%, 0)` }}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="rotary-digit-face">
              {i}
            </span>
          ))}
        </div>
        <span className="rotary-digit-glare" />
      </div>
    </div>
  );
}

export default function DownloadClock() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      fetchDownloadTotal()
        .then((total) => {
          if (!cancelled) setCount(total);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });

    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const display = count ?? 0;
  const digitChars = String(display).split("");
  const padded =
    digitChars.length < 4
      ? [...Array(4 - digitChars.length).fill("0"), ...digitChars]
      : digitChars;

  return (
    <div className="download-clock" aria-label="Program download counter">
      <div className="download-clock-frame">
        <Image
          src="/images/download-clock.jpg"
          alt=""
          width={687}
          height={1024}
          className="download-clock-art"
          priority={false}
        />
        <div
          className="download-clock-display"
          role="status"
          aria-live="polite"
          aria-label={`${display} program downloads`}
        >
          <div className="download-clock-dials">
            {count === null ? (
              <span className="download-clock-loading">···</span>
            ) : (
              padded.map((char, index) => (
                <RotaryDigit
                  key={`${index}-${padded.length}-${char}`}
                  digit={parseInt(char, 10)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}