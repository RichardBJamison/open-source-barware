"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type DownloadStats = {
  total: number;
  unique: number;
};

async function fetchDownloadStats(): Promise<DownloadStats> {
  const res = await fetch("/api/stats?days=1", { cache: "no-store" });
  if (!res.ok) throw new Error("stats unavailable");
  const data = await res.json();
  const overview = data?.overview ?? {};
  return {
    total: overview.totalDownloadsAllTime ?? 0,
    unique: overview.uniqueDownloadersEver ?? 0,
  };
}

export default function DownloadGauge({
  caption = "Program downloads",
  showUnique = false,
  compact = false,
}: {
  caption?: string;
  showUnique?: boolean;
  compact?: boolean;
}) {
  const [stats, setStats] = useState<DownloadStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchDownloadStats()
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => {
        if (!cancelled) setStats({ total: 0, unique: 0 });
      });

    const timer = window.setInterval(() => {
      fetchDownloadStats()
        .then((next) => {
          if (!cancelled) setStats(next);
        })
        .catch(() => {});
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const display = stats === null ? "—" : String(stats.total);

  return (
    <div
      className={`download-gauge-wrap${compact ? " download-gauge-wrap--compact" : ""}`}
    >
      <div className="download-gauge-frame">
        <Image
          src="/images/download-gauge.jpg"
          alt="Steampunk download counter gauge"
          width={683}
          height={1024}
          className="download-gauge-img"
        />
        <div className="download-gauge-readout" aria-live="polite">
          <span className="download-gauge-readout-bg">
            <span className="download-gauge-readout-num">{display}</span>
          </span>
        </div>
      </div>
      <p className="download-gauge-caption">{caption}</p>
      {showUnique && stats !== null && (
        <p className="download-gauge-unique">
          {stats.unique.toLocaleString()} unique downloader
          {stats.unique === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}