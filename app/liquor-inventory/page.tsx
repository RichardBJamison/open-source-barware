import Link from "next/link";
import OptimizedPicture from "@/components/OptimizedPicture";
import { Gear, GearDivider, BottleIcon } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Liquor Inventory Software — Open Source Barware",
  description:
    "Free liquor inventory tracking for bars, restaurants, and liquor rooms. Bottle-level counts, cost, and variance by category, bottle, and shift. One open-source program, no subscription.",
  path: "/liquor-inventory",
  keywords: [
    "free liquor inventory",
    "free liquor inventory software",
    "free liquor inventory tracker",
    "free liquor inventory spreadsheet",
    "open source liquor inventory",
    "liquor cost percentage",
    "back bar inventory",
    "liquor room inventory system",
  ],
});

const whyDifferent = [
  {
    title: "Highest cost per ounce",
    body: "Liquor carries more dollar value per bottle than beer or well mixers, so a small counting error turns into a real number fast.",
  },
  {
    title: "Highest shrinkage risk",
    body: "Over-pours, comp drinks, and back-bar bottles that quietly disappear hit liquor cost harder than any other category.",
  },
  {
    title: "SKU explosion",
    body: "Proof, bottle size, and brand variants multiply fast — a generic spreadsheet breaks down long before your liquor room does.",
  },
];

const tracked = [
  {
    number: "01",
    title: "Bottle-level par and reorder",
    body: "Every bottle in the well, back bar, and liquor room gets a par level and a reorder signal, not just a category total.",
  },
  {
    number: "02",
    title: "Cost and variance by bottle, category, or shift",
    body: "The same variance engine used for the full bar inventory breaks liquor out on its own, so a bad Friday shows up before month-end.",
  },
  {
    number: "03",
    title: "500+ product database",
    body: "Common liquor brands, bottle sizes, and standard pours are already loaded, so setup starts from a real list, not a blank sheet.",
  },
  {
    number: "04",
    title: "Location-mapped, not category-dumped",
    body: "Wells, back bar, and liquor room storage are tracked as the physical places they are, matching how you actually walk the room.",
  },
];

export default function LiquorInventoryPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[35vh] flex items-center overflow-hidden grain">
        <OptimizedPicture
          webpSrc="/images/copper-glass.webp"
          fallbackSrc="/images/copper-glass.png"
          alt="Copper still and glassware behind a liquor-focused bar setup for free liquor inventory system"
          className="absolute inset-0 h-full w-full object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/70 to-bg/40" />
        <div className="absolute right-[-40px] top-[-20px] text-copper">
          <Gear size={160} className="gear-spin opacity-15" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Free Liquor Inventory
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.08] max-w-xl mb-6">
            <span className="copper-text">Every bottle counted.</span>
            <br />
            Every dollar accounted for.
          </h1>
          <p className="text-text-muted text-lg max-w-lg leading-relaxed">
            Liquor is the most expensive category behind your bar and the
            easiest to lose track of. This is how the free program keeps it
            honest &mdash; no subscription, no seat limits.
          </p>
        </div>
      </section>

      <GearDivider />

      {/* ── WHY LIQUOR IS DIFFERENT ── */}
      <section className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="flex items-center gap-3 mb-4">
          <div className="glow-dot" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light">
            Why Liquor Is Different
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-4 max-w-2xl">
          <span className="copper-text">Most bars target a liquor cost</span>{" "}
          around 18&ndash;20%. Most spreadsheets can&rsquo;t tell you where it
          leaked.
        </h2>
        <p className="text-text-muted mb-12 max-w-2xl">
          Beer and wine forgive small mistakes. Liquor doesn&rsquo;t &mdash;
          a few extra half-ounce pours a night adds up to real money by the
          end of the month.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whyDifferent.map((item) => (
            <div key={item.title} className="panel rounded-sm p-6 md:p-7 relative rivets">
              <div className="mb-5 opacity-40">
                <BottleIcon />
              </div>
              <h3 className="font-serif text-xl text-cream mb-3">{item.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT THE PROGRAM TRACKS ── */}
      <section className="border-y border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="max-w-2xl mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Inside the Program
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">
              What it tracks for your liquor room.
            </h2>
            <p className="text-text-muted leading-relaxed">
              This isn&rsquo;t a separate liquor app &mdash; it&rsquo;s the
              same free program covering bar, liquor, and wine, with liquor
              broken out where the numbers actually need it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tracked.map((item) => (
              <div key={item.number} className="panel rounded-sm p-6 md:p-7">
                <span className="text-xs font-mono text-text-light tracking-wider">
                  {item.number}
                </span>
                <h3 className="font-serif text-xl text-cream mt-4 mb-3">
                  {item.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS, SHORT VERSION ── */}
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4 text-center">
          The Short Version
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-cream mb-10 text-center">
          Map it. Count it. See where it went.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ShortStep number="01" title="Walk the liquor room by voice" body="Speak the wells, back bar, and storage shelves the way you'd show a new hire." />
          <ShortStep number="02" title="Count against the approved map" body="The weekly count follows the same route, so nothing gets skipped or double-counted." />
          <ShortStep number="03" title="Read the variance" body="Counts, invoices, and POS sales reconcile into one number per bottle, per category, per shift." />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-gear-border bg-bg-panel">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <h2 className="font-serif text-3xl text-cream mb-10 text-center">
            Quick questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              q="Is the liquor inventory tracking actually free?"
              a="Yes. It's part of the same free program that covers the whole bar. No paid tier, no seat limits, no credit card."
            />
            <FaqItem
              q="Does it replace my POS?"
              a="No. It reads your POS sales export to reconcile against counts and invoices — it works alongside whatever POS you already run."
            />
            <FaqItem
              q="Can it handle proof and bottle size variants?"
              a="Yes. The product database tracks bottle size, standard pour, and cost per item so proof and size differences don't get flattened into one generic 'liquor' line."
            />
          </div>
        </div>
      </section>

      {/* ── CROSS-LINK ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ManifestoLink href="/free-bar-inventory-software" title="Free Bar Inventory Software" body="Full program overview — how OSB compares to spreadsheets and paid SaaS." />
          <ManifestoLink href="/wine-inventory" title="Free Wine Inventory" body="Vintages, bins, and bottle-level tracking for your wine program." />
          <ManifestoLink href="/manifesto" title="The Manifesto" body="Why the whole program is free, and why it stays that way." />
          <ManifestoLink href="/the-process" title="The Process" body="The kitchen-table walkthrough of setup and weekly counts." />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-warm to-bg" />
        <div className="absolute right-[10%] bottom-[-20px] text-copper">
          <Gear size={100} className="gear-spin-slow opacity-15" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="copper-text">Count the liquor room</span> without
            the invoice.
          </h2>
          <p className="text-text-muted text-lg mb-10 max-w-md mx-auto">
            No signup. No email capture. Download the program and start
            tonight.
          </p>
          <Link
            href="/downloads"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(168,120,79,0.25)]"
          >
            Download Program
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
            "contentUrl": "https://opensourcebarware.com/images/copper-glass.webp",
            "name": "Copper still and glassware behind a liquor-focused bar setup for free liquor inventory system",
            "description": "Image of copper still and glassware for the free liquor inventory system - part of the best free bar inventory system.",
            "width": "1200",
            "height": "630"
          })
        }}
      />
    </>
  );
}

function ShortStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="panel rounded-sm p-6">
      <span className="font-mono text-copper text-xs">{number}</span>
      <h3 className="font-serif text-xl text-cream mt-4 mb-3">{title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="panel rounded-sm p-6">
      <h3 className="font-serif text-lg text-cream mb-2">{q}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{a}</p>
    </div>
  );
}

function ManifestoLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group block panel card-lift rounded-sm p-6 relative rivets">
      <h3 className="font-serif text-xl text-cream mb-3 group-hover:text-copper transition-colors">
        {title}
      </h3>
      <p className="text-text-muted text-sm leading-relaxed">{body}</p>
    </Link>
  );
}
