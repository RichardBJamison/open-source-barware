"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ToolPreview } from "./DownloadPreviewModal";

const DownloadPreviewModal = dynamic(() => import("./DownloadPreviewModal"), { ssr: false });

export default function DownloadButton({ tool }: { tool: ToolPreview }) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    // Trigger actual file download
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
        onClick={() => setOpen(true)}
        className="w-full block bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_20px_rgba(205,127,50,0.2)]"
      >
        Download Free
      </button>
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
