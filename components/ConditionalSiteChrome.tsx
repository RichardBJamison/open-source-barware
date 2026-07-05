"use client";

import { usePathname } from "next/navigation";

export function useIsInventoryApp() {
  const pathname = usePathname();
  return Boolean(pathname?.startsWith("/inventory"));
}

export default function ConditionalSiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const isInventory = useIsInventoryApp();
  if (isInventory) return null;
  return <>{children}</>;
}