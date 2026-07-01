import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Gear, GearDivider, BottleIcon } from "@/components/SteampunkElements";

export const metadata: Metadata = {
  title: "Toolkit Guide — Open Source Barware",
  description:
    "Learn how each Open Source Barware inventory tool fits inside the Chrome-side bar inventory program.",
};

const toolGuides = [
  {
    number: "01",
    title: "Bar Inventory Master Sheet",
    format: "XLS",
    id: "bar-inventory-master-sheet",
    description:
      "The main workbook view for liquor, beer, wine, mixers, costs, par levels, usage, and reorder signals.",
    chromeFit:
      "Inside the Chrome program, this is the spreadsheet brain behind the admin panel. Setup builds the first version from the approved bar map, then each cycle updates it with counts, invoices, and POS exports.",
    looksLike: [
      "Tabs for liquor, beer, wine, mixers, and future dry goods",
      "Rows organized by physical location: wells, back bar, coolers, storage, and liquor room",
      "Columns for product, bottle size, par, opening count, purchases, closing count, cost, and variance",
    ],
    process: [
      "The customer maps the bar by voice during setup.",
      "The system turns that map into the first XLS workbook.",
      "After the customer audits and approves it, the workbook becomes the source for weekly reporting.",
    ],
  },
  {
    number: "02",
    title: "Quick Count Template",
    format: "PDF + XLS",
    id: "quick-count-template",
    description:
      "A printable walk sheet for fast weekly counting when the manager wants paper in hand.",
    chromeFit:
      "The Chrome program generates the template from the latest approved inventory map, so it changes when the bar layout, product list, or categories change.",
    looksLike: [
      "A simple print sheet ordered by the customer's real walking route",
      "Blank count fields beside each bottle, shelf, well, cooler, and storage area",
      "A matching XLS version so paper counts can be entered back into the program",
    ],
    process: [
      "Print or open the sheet before walking the bar.",
      "Count by the same left-to-right route used during setup.",
      "Enter the results into Weekly Inputs so the admin panel updates the cycle.",
    ],
  },
  {
    number: "03",
    title: "Variance Calculator",
    format: "XLS",
    id: "variance-calculator",
    description:
      "The calculation layer that compares inventory movement against POS sales and delivery invoices.",
    chromeFit:
      "Variance becomes part of the admin panel. Weekly Inputs feeds it with three things: the count, invoice pictures, and POS downloads.",
    looksLike: [
      "Opening inventory plus invoice purchases minus ending inventory",
      "POS sales imported by the same weekly cycle",
      "Category, bottle, and shift-level flags for unexplained gaps",
    ],
    process: [
      "Upload invoice photos from the inventory period.",
      "Upload the POS sales export for the same dates.",
      "The system compares expected usage against actual count movement and updates the report.",
    ],
  },
  {
    number: "04",
    title: "Product Database",
    format: "CSV + XLS",
    id: "product-database",
    description:
      "The product reference table that keeps names, bottle sizes, categories, aliases, and costs consistent.",
    chromeFit:
      "The database lives inside the program so voice notes, invoices, POS exports, and spreadsheet rows all resolve to the same product identity.",
    looksLike: [
      "Common bar products with category, bottle size, pour size, and cost fields",
      "Alias matching for voice transcription and invoice naming differences",
      "Customer-specific additions created during setup and weekly corrections",
    ],
    process: [
      "The setup flow starts with a standard product list.",
      "Customer products are matched or added as the first bar map is reconciled.",
      "Future invoice and count inputs update the database when new products appear.",
    ],
  },
  {
    number: "05",
    title: "AI Bottle Counter",
    format: "Vision",
    id: "ai-bottle-counter",
    description:
      "A guided photo-assisted counting feature for estimating bottle fill levels when visual review is faster than typing.",
    chromeFit:
      "This is a feature inside the Chrome program, not a separate script. It supports the count workflow when the customer takes shelf or bottle pictures.",
    looksLike: [
      "A photo intake step connected to the approved location map",
      "AI estimates that still ask the manager to confirm uncertain bottles",
      "Corrections that feed back into the inventory count for that cycle",
    ],
    process: [
      "Open the count flow for a mapped section.",
      "Take or upload the shelf image.",
      "Confirm the fill estimates before they update the weekly count.",
    ],
  },
  {
    number: "06",
    title: "Mobile Count App",
    format: "Web App",
    id: "mobile-count-app",
    description:
      "The phone-friendly counting surface for walking the bar without carrying a laptop.",
    chromeFit:
      "This is the mobile side of the same Chrome/admin program. It follows the approved map and sends weekly counts back into the dashboard.",
    looksLike: [
      "A section-by-section count screen ordered by the real bar walk",
      "Large tap targets for bottle level, cases, loose bottles, and notes",
      "A final review before the count becomes part of the weekly cycle",
    ],
    process: [
      "Choose the section you are counting.",
      "Enter bottle levels or case counts as you walk.",
      "Submit the count into Weekly Inputs for reconciliation.",
    ],
  },
];

const weeklyInputs = [
  "Enter your inventory count this week",
  "Enter your invoice pictures",
  "Enter your POS downloads",
];

export default function DownloadsPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[35vh] flex items-center overflow-hidden grain">
        <Image
          src="/images/bartop.png"
          alt="Overhead view of dark wood bar top with copper jigger"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/70 to-bg/40" />
        <div className="absolute right-[-40px] top-[-20px] text-copper">
          <Gear size={160} className="gear-spin opacity-12" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Toolkit Guide
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.08] max-w-xl mb-6">
            <span className="copper-text">What lives inside</span>
            <br />
            the Chrome program.
          </h1>
          <p className="text-text-muted text-lg max-w-lg leading-relaxed">
            These are not separate products anymore. They are pieces of the
            same inventory program: setup, spreadsheets, weekly inputs,
            variance, product matching, and mobile counting.
          </p>
        </div>
      </section>

      <GearDivider />

      {/* ── TOOL CARDS ── */}
      <section className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolGuides.map((tool) => (
            <DownloadCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* ── TOOL DETAILS ── */}
      <section className="border-y border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Learn More
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">
              Each piece has a job inside the program.
            </h2>
            <p className="text-text-muted leading-relaxed">
              The customer downloads one Chrome-side system. These sections
              explain what each part looks like, how it works, and how it feeds
              the admin panel after the weekly inputs are entered.
            </p>
          </div>

          <div className="space-y-6">
            {toolGuides.map((tool) => (
              <article
                key={tool.id}
                id={tool.id}
                className="panel rounded-sm p-6 md:p-8 scroll-mt-28"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <span className="text-xs font-mono text-text-light tracking-wider">
                        {tool.number}
                      </span>
                      <span className="text-[10px] font-mono tracking-wider text-copper border border-gear-border px-2 py-0.5">
                        {tool.format}
                      </span>
                    </div>
                    <div className="mb-5 opacity-40">
                      <BottleIcon />
                    </div>
                    <h3 className="font-serif text-2xl text-cream mb-4">
                      {tool.title}
                    </h3>
                    <p className="text-text-muted text-sm leading-relaxed">
                      {tool.chromeFit}
                    </p>
                  </div>

                  <div className="lg:col-span-4">
                    <p className="text-[10px] tracking-[0.25em] uppercase text-copper mb-4">
                      What It Looks Like
                    </p>
                    <ul className="space-y-3">
                      {tool.looksLike.map((item) => (
                        <li key={item} className="flex gap-3 text-sm text-text-muted leading-relaxed">
                          <span className="text-copper shrink-0">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-4">
                    <p className="text-[10px] tracking-[0.25em] uppercase text-copper mb-4">
                      How It Works
                    </p>
                    <ol className="space-y-3">
                      {tool.process.map((item, i) => (
                        <li key={item} className="flex gap-3 text-sm text-text-muted leading-relaxed">
                          <span className="font-mono text-copper text-xs mt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEKLY INPUTS ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="panel rounded-sm p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5">
              <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
                Admin Panel
              </p>
              <h2 className="font-serif text-3xl text-cream mb-4">
                Weekly Inputs drive the updates.
              </h2>
              <p className="text-text-muted leading-relaxed">
                The admin panel now needs an Inputs area. Each week the manager
                enters the count, invoice pictures, and POS downloads in one
                place so the system can update inventory, variance, and reports.
              </p>
            </div>
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {weeklyInputs.map((input) => (
                <div key={input} className="border border-gear-border bg-bg/50 p-4">
                  <p className="text-sm text-cream leading-snug">{input}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <Link
              href="/inventory/inputs"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-8 py-3 text-sm tracking-wide transition-all hover:shadow-[0_0_24px_rgba(205,127,50,0.25)]"
            >
              View Weekly Inputs
            </Link>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="relative bg-bg-panel border-y border-gear-border overflow-hidden grain">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-copper">
          <Gear size={180} className="gear-spin-slow opacity-12" />
        </div>
        <div className="absolute right-[-40px] bottom-[-40px] text-copper">
          <Gear size={120} className="gear-spin-reverse opacity-10" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light">
              Roadmap
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-4">
            <span className="copper-text">
              Where we are. Where we&rsquo;re going.
            </span>
          </h2>
          <p className="text-text-muted mb-16 max-w-lg">
            The public page is moving away from standalone downloads and toward
            one Chrome-side application with an admin panel, weekly inputs, and
            guided inventory intelligence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PhaseCard
              number="I"
              title="Foundation"
              timing="Weeks 1–2"
              status="active"
              items={[
                "Full baseline inventory count",
                "Master spreadsheet with live data",
                "Quick count template",
                "Product categorization system",
              ]}
            />
            <PhaseCard
              number="II"
              title="Intelligence"
              timing="Week 3"
              status="next"
              items={[
                "Variance calculator + POS matching",
                "Product database (500+ items)",
                "Reorder point formulas",
                "Category-level cost analysis",
              ]}
            />
            <PhaseCard
              number="III"
              title="Automation"
              timing="Post-Launch"
              status="planned"
              items={[
                "AI bottle level reader",
                "Mobile progressive web app",
                "POS data import tools",
                "Multi-location support",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── CONTRIBUTE ── */}
      <section className="relative overflow-hidden">
        <div className="absolute right-[5%] bottom-0 text-copper">
          <Gear size={80} className="gear-spin-slow opacity-10" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Open Source
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-copper/40" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="copper-text">Built in the open.</span>
            <br />
            Contributions welcome.
          </h2>
          <p className="text-text-muted text-lg mb-10 max-w-md mx-auto">
            Bartender with ideas? Developer who wants to help? Bar owner
            who wants to test? This is a community project &mdash; jump in.
          </p>
          <Link
            href="/about"
            className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-4 text-sm tracking-wide transition-all"
          >
            Learn About the Project
          </Link>
        </div>
      </section>
    </>
  );
}

function DownloadCard({
  tool,
}: {
  tool: (typeof toolGuides)[number];
}) {
  return (
    <div className="panel card-lift rounded-sm p-7 flex flex-col relative rivets">
      <div className="flex items-start justify-between mb-5">
        <span className="text-xs font-mono text-text-light tracking-wider">
          {tool.number}
        </span>
        <span className="text-[10px] font-mono tracking-wider text-copper border border-gear-border px-2 py-0.5">
          {tool.format}
        </span>
      </div>
      <div className="mb-4 opacity-40">
        <BottleIcon />
      </div>
      <h3 className="font-serif text-lg text-cream mb-3">{tool.title}</h3>
      <p className="text-text-muted text-sm leading-relaxed mb-8 flex-1">
        {tool.description}
      </p>
      <Link
        href={`#${tool.id}`}
        className="w-full block bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_20px_rgba(205,127,50,0.2)]"
      >
        Learn More
      </Link>
    </div>
  );
}

function PhaseCard({
  number,
  title,
  timing,
  status,
  items,
}: {
  number: string;
  title: string;
  timing: string;
  status: "active" | "next" | "planned";
  items: string[];
}) {
  return (
    <div className="panel rounded-sm p-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="font-serif text-2xl copper-text">{number}</span>
        {status === "active" && <div className="glow-dot" />}
      </div>
      <h3 className="font-serif text-xl text-cream mb-1">{title}</h3>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-text-muted">{timing}</span>
        <span
          className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border ${
            status === "active"
              ? "text-patina-light border-patina/30"
              : status === "next"
              ? "text-copper border-gear-border"
              : "text-text-light border-gear-border"
          }`}
        >
          {status === "active"
            ? "In Progress"
            : status === "next"
            ? "Up Next"
            : "Planned"}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-text-muted text-sm flex items-start gap-3"
          >
            <span
              className={`mt-1.5 block w-1.5 h-1.5 rounded-full shrink-0 ${
                status === "active" ? "bg-patina-light" : "bg-copper/30"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
