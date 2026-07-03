import Link from "next/link";
import { Gear, GearDivider, BottleIcon } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Wine Inventory Software — Open Source Barware",
  description:
    "Free wine inventory tracking for restaurant wine programs — vintages, bins, and bottle-level variance. Built for wine directors and bar managers, not home cellars. One open-source program, no subscription.",
  path: "/wine-inventory",
  keywords: [
    "free wine inventory",
    "free wine inventory software",
    "free wine inventory spreadsheet",
    "free wine inventory for restaurants",
    "restaurant wine program inventory",
    "open source wine inventory",
    "wine bin tracking",
  ],
});

const whyDifferent = [
  {
    title: "Every bottle is its own SKU",
    body: "Vintage, producer, and format turn one label into a dozen line items — a generic inventory sheet flattens them into noise.",
  },
  {
    title: "It sells two ways",
    body: "By the bottle and by the glass, off two different price points, so a wine program's variance math isn't the same as liquor's.",
  },
  {
    title: "Storage is split",
    body: "Working stock behind the bar, deeper stock in a cellar or bin room — the count has to match where the bottle actually lives.",
  },
];

const tracked = [
  {
    number: "01",
    title: "Bottle-level counts by bin and location",
    body: "Cellar bins, back-bar stock, and by-the-glass pours are mapped to where they physically sit, not lumped into one 'wine' total.",
  },
  {
    number: "02",
    title: "Vintage and producer as real fields",
    body: "The product database keeps vintage, producer, and format as their own data, so two bottles of the same label don't collapse into one row.",
  },
  {
    number: "03",
    title: "Variance against POS, by the glass or bottle",
    body: "The same variance engine reconciles by-the-glass pours and full-bottle sales against your POS export for the same period.",
  },
  {
    number: "04",
    title: "Built for the restaurant wine list, not a home cellar",
    body: "This tracks a working wine program — reorder points, cost, and turn — not tasting notes or a personal collection.",
  },
];

export default function WineInventoryPage() {
  return (
    <>
      {/* ── HERO (typographic, wine accent) ── */}
      <section className="relative overflow-hidden border-b border-gear-border grain">
        <div className="absolute right-[-60px] top-[-40px] text-wine pointer-events-none">
          <Gear size={220} className="gear-spin opacity-15" />
        </div>
        <div className="absolute left-[-30px] bottom-[-30px] text-copper pointer-events-none">
          <Gear size={120} className="gear-spin-slow opacity-10" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-14 md:pt-20 md:pb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-wine-glow shadow-[0_0_10px_var(--wine-glow)]" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-wine-glow font-medium">
              Free Wine Inventory
            </span>
            <div className="w-2 h-2 rounded-full bg-wine-glow shadow-[0_0_10px_var(--wine-glow)]" />
          </div>

          <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] mb-8 max-w-2xl mx-auto">
            Your wine list deserves
            <br />
            <span className="text-wine-glow">better than a clipboard.</span>
          </h1>

          <p className="text-text-muted text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
            Vintages, bins, and bottle-level variance for a working restaurant
            wine program &mdash; free, inside the same open-source program
            that runs the rest of the bar.
          </p>
        </div>
      </section>

      <GearDivider />

      {/* ── WHY WINE IS DIFFERENT ── */}
      <section className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[1px] bg-wine/50" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
            Why Wine Breaks Normal Inventory
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-4 max-w-2xl">
          <span className="text-wine-glow">Wine doesn&rsquo;t behave</span>{" "}
          like the rest of the bar.
        </h2>
        <p className="text-text-muted mb-12 max-w-2xl">
          A spreadsheet built for liquor or beer will choke on a wine list
          the moment vintages start repeating and bottles start living in two
          different places at once.
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
              What it tracks for your wine program.
            </h2>
            <p className="text-text-muted leading-relaxed">
              Wine gets its own tab in the same master workbook that runs
              liquor, beer, and mixers &mdash; one program, one bar map, one
              weekly cycle.
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
          Map the bins. Count the bottles. Match the pours.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ShortStep number="01" title="Map cellar and bar wine by voice" body="Bin numbers, back-bar wine fridge, and by-the-glass pours all get named where they actually live." />
          <ShortStep number="02" title="Count against the approved map" body="A weekly count follows the same bin order every time, so nothing gets missed in the back cellar." />
          <ShortStep number="03" title="Reconcile bottle and glass sales" body="POS exports split by-the-glass and full-bottle sales, matched against the count and invoices for that window." />
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
              q="Is this for a restaurant wine program or a home cellar?"
              a="A working restaurant or bar wine program. It tracks reorder points, cost, and variance for a wine list that's actively selling — not tasting notes for a personal collection."
            />
            <FaqItem
              q="Does it handle by-the-glass pours separately from bottle sales?"
              a="Yes. The variance engine reconciles both against your POS export for the same period, so a bottle opened for by-the-glass service doesn't throw off the count."
            />
            <FaqItem
              q="Is the wine tracking free like the rest of the program?"
              a="Yes — it's the same free, open-source program covering bar, liquor, and wine. No separate purchase, no seat limits."
            />
          </div>
        </div>
      </section>

      {/* ── CROSS-LINK ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ManifestoLink href="/liquor-inventory" title="Free Liquor Inventory" body="How the program handles your highest-cost, highest-risk category." />
          <ManifestoLink href="/manifesto" title="The Manifesto" body="Why the whole program is free, and why it stays that way." />
          <ManifestoLink href="/the-process" title="The Process" body="The kitchen-table walkthrough of setup and weekly counts." />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-warm to-bg" />
        <div className="absolute right-[10%] bottom-[-20px] text-wine">
          <Gear size={100} className="gear-spin-slow opacity-15" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="text-wine-glow">Count the cellar</span> without
            losing a Friday night.
          </h2>
          <p className="text-text-muted text-lg mb-10 max-w-md mx-auto">
            No signup. No email capture. Download the program and start
            tonight.
          </p>
          <Link
            href="/downloads"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
          >
            Download the Program
          </Link>
        </div>
      </section>
    </>
  );
}

function ShortStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="panel rounded-sm p-6">
      <span className="font-mono text-wine-glow text-xs">{number}</span>
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
