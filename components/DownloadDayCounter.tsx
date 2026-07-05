"use client";

import Image from "next/image";
import { getProgramDay } from "@/lib/launch-gate";
import { useLaunchNow } from "@/lib/use-launch-now";

export default function DownloadDayCounter() {
  const now = useLaunchNow();
  const day = getProgramDay(now);
  const displayDay = day > 0 ? day : 1;

  return (
    <div className="download-day-counter" aria-labelledby="download-day-label">
      <div className="download-day-counter-glow" aria-hidden="true" />
      <div className="download-day-counter-frame">
        <Image
          src="/images/download-day-counter.jpg"
          alt="Steampunk download counter showing today's program downloads"
          width={683}
          height={1024}
          className="download-day-counter-art"
          priority
        />
      </div>

      <div className="download-day-counter-meta">
        <p id="download-day-label" className="download-day-label">
          Day <span className="download-day-number">{displayDay}</span>
        </p>
        <p className="download-day-hint">
          A fresh count every day &mdash; this number advances at midnight Eastern.
        </p>
      </div>
    </div>
  );
}