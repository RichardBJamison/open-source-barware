import AboutMockupPage from "@/components/AboutMockupPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About - Open Source Barware",
  description:
    "The story behind Open Source Barware, built from real monthly inventory pressure inside a working restaurant.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutMockupPage />;
}
