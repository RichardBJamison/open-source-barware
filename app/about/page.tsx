import AboutMockupPage from "@/components/AboutMockupPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About Open Source Barware — Built by Bar Operators",
  description:
    "Why we built free open-source bar inventory from real monthly count pressure—and released it under GPLv3.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutMockupPage />;
}
