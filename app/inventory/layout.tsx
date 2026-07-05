import { Instrument_Sans } from "next/font/google";
import InventoryShell from "@/components/InventoryShell";
import { pageMetadata } from "@/lib/seo";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-admin",
  display: "swap",
});

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
  return (
    <div className={`${instrument.variable} inventory-app admin-body`}>
      <InventoryShell>{children}</InventoryShell>
    </div>
  );
}