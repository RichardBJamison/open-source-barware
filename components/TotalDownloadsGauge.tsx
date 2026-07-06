"use client";

import { useEffect, useState } from "react";
const FALLBACK_COUNT = 27;
const KOFI_URL = "https://ko-fi.com/W2J022HCH2";

function formatCount(value: number) {
  return String(Math.max(0, value)).padStart(6, "0");
}

export default function TotalDownloadsGauge() {
  const [count, setCount] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function refreshCount() {
      fetch("/api/download-count", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (typeof data?.total === "number") {
            setCount(data.total);
          }
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
    }

    function onDownloadCount(event: Event) {
      const total = (event as CustomEvent<{ total?: number }>).detail?.total;
      if (typeof total === "number") {
        setCount(total);
        setReady(true);
      }
    }

    refreshCount();
    window.addEventListener("osb-download-count", onDownloadCount);

    return () => {
      cancelled = true;
      window.removeEventListener("osb-download-count", onDownloadCount);
    };
  }, []);

  const displayCount = count ?? FALLBACK_COUNT;
  const digits = formatCount(displayCount);

  return (
    <div
      className="download-gauge-section"
      aria-label={`${displayCount.toLocaleString()} total program downloads`}
    >
      <div className={`download-gauge-frame ${ready ? "download-gauge-frame--ready" : ""}`}>
        <img
          src="/images/total-downloads-gauge.jpg?v=2"
          alt=""
          className="download-gauge-art"
          width={1024}
          height={335}
          loading="lazy"
          decoding="async"
        />

        <div className="download-gauge-display-mask" aria-hidden="true">
          <div className="download-gauge-display">
            {digits.split("").map((digit, index) => (
              <span
                key={`${index}-${digit}`}
                className="download-gauge-digit"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="download-gauge-caption">
        Live count — every installer pulled from this page since its release July
        4th 2026.
      </p>

      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="download-gauge-kofi"
      >
        <img
          src="/images/ko-fi-icon.png"
          alt=""
          width={28}
          height={28}
          className="download-gauge-kofi-icon"
          loading="lazy"
          decoding="async"
        />
        <span>Buy Me a Coffee</span>
      </a>
    </div>
  );
}