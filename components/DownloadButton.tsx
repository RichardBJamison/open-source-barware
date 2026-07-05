"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { areDownloadsUnlocked, LAUNCH_LABEL } from "@/lib/launch-gate";
import { useLaunchNow } from "@/lib/use-launch-now";
import type { ToolPreview } from "./DownloadPreviewModal";

const DownloadPreviewModal = dynamic(() => import("./DownloadPreviewModal"), {
  ssr: false,
});
const DownloadLockedModal = dynamic(() => import("./DownloadLockedModal"), {
  ssr: false,
});

export default function DownloadButton({ tool }: { tool: ToolPreview }) {
  const searchParams = useSearchParams();
  const now = useLaunchNow();
  const [open, setOpen] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);

  const previewParam =
    searchParams.get("preview") === "july4" ||
    searchParams.get("july4") === "1";
  const unlocked = areDownloadsUnlocked(now, { preview: previewParam });

  function handleClick() {
    if (!unlocked) {
      setLockedOpen(true);
      return;
    }
    setOpen(true);
  }

  function handleConfirm() {
    setOpen(false);
    if (typeof window !== "undefined" && "osbTrackDownload" in window) {
      (
        window as Window & {
          osbTrackDownload?: (file: string, label?: string) => void;
        }
      ).osbTrackDownload?.(tool.href, tool.title);
    }
    const a = document.createElement("a");
    a.href = tool.href;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full block bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_20px_rgba(168,120,79,0.2)]"
      >
        {unlocked ? "Download the Program" : `Downloads open ${LAUNCH_LABEL}`}
      </button>
      {lockedOpen && <DownloadLockedModal onClose={() => setLockedOpen(false)} />}
      {open && (
        <DownloadPreviewModal
          tool={tool}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}