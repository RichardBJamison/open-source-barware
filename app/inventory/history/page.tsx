"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — cycle history lives on Home base metrics and Analytics trends. */
export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inventory/dashboard");
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-text-muted">
      Opening home base...
    </div>
  );
}