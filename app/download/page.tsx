import Link from "next/link";
import { Suspense } from "react";
import OptimizedPicture from "@/components/OptimizedPicture";
import ProgramDownloadPanel from "@/components/ProgramDownloadPanel";
import { Gear, GearDivider } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Download v1.5 — Open Source Barware",
  description:
    "Download Open Source Barware v1.5 — free Chrome-side bar inventory with Spanish-ready notes, mobile counting, POS import, multi-venue, and more. Mac and Windows.",
  path: "/download",
});

export default function DownloadPage() {
  return (
    <>
      <section className="relative min-h-[40vh] flex items-center overflow-hidden grain">
        <OptimizedPicture
          webpSrc="/images/bartop.webp"
          fallbackSrc="/images/bartop.png"
          alt="Dark wood bar top with copper jigger for free bar inventory program"
          className="absolute inset-0 h-full w-full object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/92 via-bg/75 to-bg/45" />
        <div className="absolute right-[-40px] top-[-20px] text-copper">
          <Gear size={160} className="gear-spin opacity-12" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-14">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Version 1.5
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-patina-light border border-patina/30 px-2 py-0.5">
              Spanish-ready notes · July 2026
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.08] max-w-2xl mb-6">
            <span className="copper-text">Download</span>
            <br />
            v1.5.
          </h1>
          <p className="text-text-muted text-lg max-w-xl leading-relaxed">
            Free, local bar inventory on your laptop. Mobile counting, camera
            barcode, recipes, POS import, multi-venue, receiving — and walk/count
            notes in English or Spanish. No subscription. No cloud tax.
          </p>
        </div>
      </section>

      <GearDivider />

      <section className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <Suspense fallback={<div className="text-text-muted text-center py-12">Loading…</div>}>
          <ProgramDownloadPanel />
        </Suspense>
      </section>

      <section className="border-t border-gear-border bg-bg-panel">
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <p className="text-text-muted text-sm mb-4">
            Want to understand what&rsquo;s inside before you install?
          </p>
          <Link
            href="/downloads"
            className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-3 text-sm tracking-wide transition-all"
          >
            Read the program guide
          </Link>
        </div>
      </section>

      {/* Image structured data for SEO - backend only */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "contentUrl": "https://opensourcebarware.com/images/bartop.webp",
            "name": "Dark wood bar top with copper jigger for free bar inventory program",
            "description": "Hero image for downloading the best free bar inventory system. Dark wood bar top with copper jigger.",
            "width": "1200",
            "height": "630"
          })
        }}
      />
    </>
  );
}