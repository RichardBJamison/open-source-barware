import InventoryShell from "@/components/InventoryShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Inventory App — Open Source Barware",
  description:
    "Local inventory workspace for Open Source Barware. Setup, counts, weekly inputs, and reporting inside the Chrome-side program.",
  path: "/inventory",
  noIndex: true,
});

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InventoryShell>{children}</InventoryShell>;
}