import Link from "next/link";
import OptimizedPicture from "@/components/OptimizedPicture";
import { Gear, GearDivider, BottleIcon } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Program Guide — Open Source Barware",
  description:
    "Learn how each Open Source Barware inventory feature fits inside the Chrome-side bar inventory program.",
  path: "/downloads",
});

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
    format: "PDF · CSV · XLS",
    id: "quick-count-template",
    description:
      "Once the map is populated, download count sheets with blank spaces so you know exactly what to do — and what to say — on your second walk.",
    chromeFit:
      "The Chrome program generates the sheet from your approved bar map, ordered bar → well → row → back bar → cooler → wine, so it always matches the real room. Download it as a printable PDF, or export to CSV to pull into your own apps.",
    looksLike: [
      "A print sheet ordered by your real walking route, bar by bar and row by row",
      "Blank count spaces beside every bottle, well, back bar, cooler shelf, and wine space",
      "PDF for paper in hand, plus CSV/XLS exports for spreadsheets and mobile apps",
    ],
    process: [
      "After the first map is built, download the count sheet as PDF or CSV.",
      "Carry it on the second walk and count by the same order you spoke the first time.",
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
      "Variance becomes part of the admin panel. All inputs feeds it with your count, purchases (typed, pasted, or optional invoice photos), and POS exports.",
    looksLike: [
      "Opening inventory plus invoice purchases minus ending inventory",
      "POS sales imported by the same weekly cycle",
      "Category, bottle, and shift-level flags for unexplained gaps",
    ],
    process: [
      "Add purchases — type them, paste invoice text, or optionally upload invoice photos with AI connected.",
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
    title: "Invoice Photo Reader",
    format: "Optional AI",
    id: "invoice-photo-reader",
    description:
      "The one optional add-on. Snap a phone photo of a vendor invoice and let it read the line items — instead of typing them. Everything else works without it.",
    chromeFit:
      "This is the only place AI ever enters the program, and only if you connect your own key. Skip it and you type or paste invoice text — the local parser handles that on its own, exactly as the system was field-tested.",
    looksLike: [
      "A photo button on the invoice panel, clearly labeled \"needs AI\"",
      "Type-or-paste always sitting right beside it as the default path",
      "Read line items you confirm before they touch the weekly numbers",
    ],
    process: [
      "Optional: add your own AI key in Settings — a private password stored on your Mac.",
      "Snap the Southern Glazer's or Breakthru invoice on your phone and upload it.",
      "Confirm the parsed line items; without a key, just type or paste instead.",
    ],
  },
  {
    number: "06",
    title: "Mobile Count View",
    format: "Mobile",
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
  "Snap photos of your vendor invoices",
  "Enter your POS downloads",
];

const downloadPackageHref = "/downloads/open-source-barware-download-package.zip";
const sourceArchiveHref = "/downloads/open-source-barware-source.zip";

export default function DownloadsPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[35vh] flex items-center overflow-hidden grain">
        <OptimizedPicture
          webpSrc="/images/bartop.webp"
          fallbackSrc="/images/bartop.png"
          alt="Overhead view of dark wood bar top with copper jigger for free inventory system downloads"
          className="absolute inset-0 h-full w-full object-cover object-center"
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
              Program Guide
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

      {/* ── CHROME PROGRAM CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-14">
        <div className="panel rounded-sm p-6 md:p-8 border border-copper/25">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-patina-light mb-3">
                Version 1.5 · Spanish-ready notes
              </p>
              <h2 className="font-serif text-2xl md:text-3xl text-cream mb-2">
                Ready to install the Chrome program?
              </h2>
              <p className="text-text-muted text-sm leading-relaxed max-w-xl">
                Mac and Windows installers for v1.5 — mobile counting, POS, multi-venue,
                Spanish walk/count notes, and more. Join the release list on the download page.
              </p>
            </div>
            <Link
              href="/download"
              className="shrink-0 inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_24px_rgba(168,120,79,0.25)]"
            >
              Download Program
            </Link>
          </div>
        </div>
      </section>

      {/* ── GPL PACKAGE ── */}
      <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-14">
        <div className="panel rounded-sm p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6">
              <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
                GPL Download
              </p>
              <h2 className="font-serif text-3xl text-cream mb-4">
                Program files, license, and source stay together.
              </h2>
              <p className="text-text-muted leading-relaxed">
                The public package includes the editable spreadsheet templates,
                AI prompt, GPL license text, source offer, and notices. The
                corresponding source archive sits beside it for anyone who
                wants to inspect, modify, or redistribute the project.
              </p>
            </div>
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={downloadPackageHref}
                download
                className="border border-gear-border bg-bg/50 p-5 transition-colors hover:border-copper/50"
              >
                <span className="block text-[10px] tracking-[0.25em] uppercase text-copper mb-3">
                  Package
                </span>
                <span className="block text-sm text-cream leading-snug">
                  Download program files with GPL notices
                </span>
              </a>
              <a
                href={sourceArchiveHref}
                download
                className="border border-gear-border bg-bg/50 p-5 transition-colors hover:border-copper/50"
              >
                <span className="block text-[10px] tracking-[0.25em] uppercase text-copper mb-3">
                  Source
                </span>
                <span className="block text-sm text-cream leading-snug">
                  Download corresponding source archive
                </span>
              </a>
              <a
                href="/downloads/LICENSE.txt"
                className="border border-gear-border bg-bg/50 p-5 transition-colors hover:border-copper/50"
              >
                <span className="block text-[10px] tracking-[0.25em] uppercase text-copper mb-3">
                  License
                </span>
                <span className="block text-sm text-cream leading-snug">
                  Read the GNU GPLv3 license text
                </span>
              </a>
              <Link
                href="/open-source-compliance"
                className="border border-gear-border bg-bg/50 p-5 transition-colors hover:border-copper/50"
              >
                <span className="block text-[10px] tracking-[0.25em] uppercase text-copper mb-3">
                  Notice
                </span>
                <span className="block text-sm text-cream leading-snug">
                  View compliance and redistribution notes
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
                Each week the manager drops three things into one place: the
                count, the invoices (type or paste — photos optional), and the
                POS downloads. From there the program updates inventory,
                variance, and reports on its own.
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
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-8 py-3 text-sm tracking-wide transition-all hover:shadow-[0_0_24px_rgba(168,120,79,0.25)]"
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
            v1.5 ships the Chrome program feature set. Next: full Spanish UI and
            the Intelligent Hospitality Systems restaurant package.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PhaseCard
              number="I"
              title="Shipped · v1.0–v1.5"
              timing="July 2026"
              status="active"
              items={[
                "Walk · count · process core",
                "Mobile count + camera barcode",
                "POS import, smart orders, receiving",
                "Spanish-ready inventory notes (MX)",
              ]}
            />
            <PhaseCard
              number="II"
              title="Next Friday"
              timing="July 17 · 6pm ET"
              status="next"
              items={[
                "Full Spanish program UI",
                "Intelligent Hospitality Systems teaser",
                "Restaurant inventory package",
                "Community feedback loop",
              ]}
            />
            <PhaseCard
              number="III"
              title="Beyond"
              timing="Post–July 17"
              status="planned"
              items={[
                "PWA / installable mobile shell",
                "Expanded bottle-weights seed",
                "Food / retail / supplies (paid tier)",
                "Keg tools & larger product DB",
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
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/about"
              className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-4 text-sm tracking-wide transition-all"
            >
              Learn About the Project
            </Link>
            <Link
              href="/manifesto"
              className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-4 text-sm tracking-wide transition-all"
            >
              Why It&rsquo;s Free
            </Link>
          </div>
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
            "name": "Overhead view of dark wood bar top with copper jigger for free inventory system downloads",
            "description": "Hero image showing tools for the best free bar inventory system. Download the free inventory system program and resources.",
            "width": "1200",
            "height": "630"
          })
        }}
      />
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
        className="w-full block bg-copper hover:bg-copper-bright text-bg font-semibold py-3 text-sm tracking-wide text-center transition-all hover:shadow-[0_0_20px_rgba(168,120,79,0.2)]"
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
