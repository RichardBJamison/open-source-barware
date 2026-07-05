"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — counts now flow through Weekly inputs in the home-base admin. */
export default function CountRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inventory/inputs");
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-text-muted">
      Opening weekly inputs...
    </div>
  );
}