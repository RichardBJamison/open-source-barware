import InventoryShell from "@/components/InventoryShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "The Dojo — Open Source Barware",
  description:
    "Play in the Open Source Barware sandbox. Explore the finished inventory program with demo data before you download and build your own bar.",
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