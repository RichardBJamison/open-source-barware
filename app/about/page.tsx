import type { Metadata } from "next";
import AboutMockupPage from "@/components/AboutMockupPage";

export const metadata: Metadata = {
  title: "About - Open Source Barware",
  description:
    "The story behind Open Source Barware, built from real monthly inventory pressure inside a working restaurant.",
};

export default function AboutPage() {
  return <AboutMockupPage />;
}
