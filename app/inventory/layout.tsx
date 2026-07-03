import InventoryShell from "@/components/InventoryShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Salle d'Armes — Open Source Barware",
  description:
    "Enter the Clockwork Gymnasium. Play in the Open Source Barware sandbox with demo data before you download and build your own bar.",
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