import Link from "next/link";
import Image from "next/image";
import {
  Gear,
  GearDivider,
  BottleIcon,
} from "@/components/SteampunkElements";
import HeroVideo from "@/components/HeroVideo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Open Source Barware — Free Bar Inventory Program",
  description:
    "The free bar inventory program built by bartenders, tested in a real restaurant. No subscriptions. No upsells. Just a system that works.",
  path: "/",
});

const primaryCtaClass =
  "group relative inline-flex w-full items-center justify-center bg-copper px-8 py-4 text-center text-sm font-semibold tracking-wide text-bg transition-all hover:bg-copper-bright hover:shadow-[0_0_30px_rgba(205,127,50,0.25)] sm:w-[210px]";

const workshopTools = [
  {
    number: "01",
    title: "Smart Inventory Sheets",
    description:
      "Pre-built spreadsheets that calculate cost, usage, variance, and reorder points.",
  },
  {
    number: "02",
    title: "Variance Tracker",
    description:
      "Compare physical counts against POS sales by category, bottle, and shift.",
  },
  {
    number: "03",
    title: "AI Bottle Counter",
    description:
      "Snap a shelf photo and let AI read bottle levels from the image.",
  },
  {
    number: "04",
    title: "Product Database",
    description:
      "500+ common bar products with bottle sizes, costs, and standard pours.",
  },
];

export default function Home() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden grain">
        {/* Hero video */}
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/60 to-bg/30" />
        <div className="absolute right-[-80px] top-[-40px] text-copper">
          <Gear size={300} className="gear-spin opacity-40" />
        </div>
        <div className="absolute right-[100px] top-[120px] text-brass">
          <Gear size={140} className="gear-spin-reverse opacity-30" />
        </div>
        <div className="absolute left-[-30px] bottom-[-30px] text-copper">
          <Gear size={180} className="gear-spin-slow opacity-20" />
        </div>

        {/* Steam puffs */}
        <div className="absolute right-[20%] top-[15%] pointer-events-none">
          <div className="steam-puff w-4 h-4 rounded-full bg-cream/5 blur-md" />
        </div>
        <div className="absolute right-[25%] top-[20%] pointer-events-none">
          <div className="steam-puff-delay w-3 h-3 rounded-full bg-cream/4 blur-lg" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
          <div className="max-w-2xl">
            {/* Pipe accent */}
            <div className="flex items-center gap-3 mb-8">
              <div className="glow-dot" />
              <div className="h-[1px] w-16 bg-gradient-to-r from-patina to-transparent" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light font-medium">
                Free &amp; Open Source
              </span>
            </div>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-8">
              <span className="copper-text">Bar inventory</span>
              <br />
              shouldn&rsquo;t cost
              <br />
              <span className="text-cream">you a thing.</span>
            </h1>

            <p className="text-text-muted text-lg md:text-xl leading-relaxed max-w-md mb-12">
              We have now created the program we wished existed. It is
              free for you &mdash; use your AI. No subscriptions. No vendor
              lock-in. Just count your bottles and go home.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/the-process"
                className={primaryCtaClass}
              >
                <span className="relative z-10">Learn This System</span>
              </Link>
              <Link
                href="/about"
                className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-4 text-sm tracking-wide transition-all"
              >
                Read Our Story
              </Link>
              <Link
                href="/downloads"
                className={primaryCtaClass}
              >
                <span className="relative z-10">Download the Program</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom pipe accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-copper/30 to-transparent" />
      </section>

      {/* ── STATS STRIP ── */}
      <section className="border-y border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatBlock number="$0" label="Cost, forever" />
          <StatBlock number="1" label="Free program" />
          <StatBlock number="3" label="Weeks of field testing" />
          <StatBlock number="100%" label="Open source" />
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:pt-16 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-[1px] bg-copper/40" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
                The Problem
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight copper-text">
              Every bar manager
              <br />
              knows the drill.
            </h2>
            <div className="mt-8 max-w-[300px]">
              <ProblemHourglass />
            </div>
          </div>
          <div className="md:col-span-7 lg:col-span-6 lg:col-start-7">
            <div className="max-w-2xl space-y-5 text-text-muted leading-relaxed text-lg">
              <p>
                Close out. Grab the clipboard. Count every bottle by tenths.
                Scribble numbers on paper. Walk to the office. Type it all into
                a spreadsheet someone made in 2014. Try to reconcile against POS
                sales. Watch it never add up. Repeat next week.
              </p>
              <p>
                The bar industry has been doing this for decades. And companies
                have profited from the pain &mdash; selling $3,000 inventory
                guns, $200/month SaaS platforms, and consulting services that
                charge by the bottle.
              </p>
              <p className="text-cream font-medium text-xl">
                AI changed everything. Now we can build this program for free.
                So we did.
              </p>
              <p>
                <Link href="/manifesto" className="text-copper hover:text-copper-bright transition-colors copper-underline">
                  Read the full manifesto
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-copper/25 to-transparent" />
      </div>

      {/* ── WHAT WE BUILT ── program card with steampunk panels */}
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[1px] bg-copper/40" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
            The Workshop
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-4 max-w-lg">
          <span className="copper-text">Precision instruments</span> for the
          craft.
        </h2>
        <p className="text-text-muted mb-12 max-w-lg">
          We provide one simple system. Here you will find the free program
          and the markdown that explains how it works.
        </p>

        {/* Workshop photo */}
        <div className="relative rounded-sm overflow-hidden panel mb-16">
          <div className="aspect-[21/9] relative">
            <Image
              src="/images/workshop.jpg"
              alt="Craftsman workbench with bar tools, jiggers, and vintage measuring instruments"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg/40 to-transparent" />
          </div>
        </div>

        <Link
          href="/downloads"
          aria-label="Download the complete Open Source Barware program"
          className="group block panel card-lift rounded-sm p-6 md:p-8 relative rivets focus:outline-none focus-visible:ring-2 focus-visible:ring-copper/70"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
            <div>
              <span className="text-xs font-mono text-text-light tracking-wider">
                01-04
              </span>
              <h3 className="font-serif text-2xl md:text-3xl text-cream mt-5 mb-3 group-hover:text-copper transition-colors">
                One free program, the full workflow inside.
              </h3>
              <p className="text-text-muted leading-relaxed max-w-2xl">
                The pieces below live inside one free program for the full
                inventory workflow.
              </p>
            </div>
            <div className="flex items-center gap-4 text-copper">
              <span className="text-sm font-semibold tracking-wide text-copper">
                Download the Program
              </span>
              <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                <BottleIcon />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px border border-copper/25 bg-copper/20">
            {workshopTools.map((tool) => (
              <div
                key={tool.number}
                className="min-h-[132px] bg-bg-panel/95 p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <span className="text-xs font-mono text-text-light tracking-wider">
                    {tool.number}
                  </span>
                  <div className="text-copper opacity-50">
                    <BottleIcon />
                  </div>
                </div>
                <h4 className="font-serif text-xl text-cream mb-2">
                  {tool.title}
                </h4>
                <p className="text-text-muted leading-relaxed text-sm">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-6 text-sm text-text-muted">
          <span className="text-text-light">Tracking one category?</span>
          <Link href="/liquor-inventory" className="text-copper hover:text-copper-bright transition-colors">
            Free Liquor Inventory
          </Link>
          <span className="text-text-light">&middot;</span>
          <Link href="/wine-inventory" className="text-wine-glow hover:text-copper transition-colors">
            Free Wine Inventory
          </Link>
        </div>
      </section>

      {/* ── FIELD TESTED ── image-backed mention */}
      <section className="relative bg-bg-panel border-y border-gear-border overflow-hidden">
        <Image
          src="/images/hands.png"
          alt="Bartender writing inventory counts in a notebook at the bar"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/75 to-bg/50" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 flex items-center gap-6">
          <div className="h-12 w-[2px] bg-copper/40 shrink-0" />
          <p className="text-text-muted leading-relaxed">
            The program was field-tested at <span className="text-cream font-medium">Agave &amp; Rye</span> in
            downtown Cleveland. Real bottles. Real counts. Real pressure.
          </p>
        </div>
      </section>

      {/* ── PULL QUOTE ── */}
      <section className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <blockquote className="pull-quote">
          &ldquo;If you&rsquo;re going to build an inventory program, you better do
          it standing behind a bar at 2am with a clipboard. Otherwise
          you&rsquo;re just guessing.&rdquo;
        </blockquote>
        <p className="text-sm text-text-light mt-4 pl-7">
          &mdash; The philosophy behind Open Source Barware
        </p>
      </section>

      <GearDivider />

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-warm to-bg" />
        <div className="absolute right-[10%] bottom-[-20px] text-copper">
          <Gear size={100} className="gear-spin-slow opacity-15" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Get Started
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-copper/40" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="copper-text">Open the program.</span> Start tonight.
          </h2>
          <p className="text-text-muted text-lg mb-10 max-w-md mx-auto">
            No signup. No email capture. No sales pitch. Download the program
            and get to work.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/downloads"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download the Program
            </Link>
            <Link
              href="/downloads"
              className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-10 py-4 text-sm tracking-wide transition-all"
            >
              Explore Community Resources
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ProblemHourglass() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-sm border border-copper/20 bg-bg-panel/55 p-5 shadow-[inset_0_0_40px_rgba(205,127,50,0.06),0_20px_60px_rgba(0,0,0,0.25)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(205,127,50,0.18),transparent_38%),linear-gradient(135deg,rgba(45,102,94,0.12),transparent_45%)]" />
      <div className="absolute left-5 right-5 top-5 h-px bg-gradient-to-r from-transparent via-copper/40 to-transparent" />
      <div className="absolute bottom-5 left-5 right-5 h-px bg-gradient-to-r from-transparent via-copper/25 to-transparent" />
      <svg
        viewBox="0 0 220 270"
        className="relative mx-auto h-[240px] w-full text-copper drop-shadow-[0_0_18px_rgba(205,127,50,0.16)]"
        fill="none"
      >
        <defs>
          <linearGradient id="hourglassSand" x1="88" x2="132" y1="74" y2="204">
            <stop stopColor="#d9a460" />
            <stop offset="1" stopColor="#8b4a22" />
          </linearGradient>
          <linearGradient id="hourglassGlass" x1="57" x2="163" y1="50" y2="220">
            <stop stopColor="#f3dfbc" stopOpacity="0.2" />
            <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#2d665e" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        <path
          d="M66 54c9 39 29 59 44 77-15 18-35 38-44 77h88c-9-39-29-59-44-77 15-18 35-38 44-77H66Z"
          fill="url(#hourglassGlass)"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M83 77h54c-7 18-18 31-27 42-9-11-20-24-27-42Z"
          fill="url(#hourglassSand)"
          opacity="0.76"
        />
        <path
          d="M88 195c7-19 16-31 22-39 6 8 15 20 22 39H88Z"
          fill="url(#hourglassSand)"
          opacity="0.84"
        />
        <path d="M110 126v48" stroke="#d9a460" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 8" />
        <path d="M57 46h106M57 216h106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M71 34h78M71 228h78" stroke="#8b4a22" strokeWidth="6" strokeLinecap="round" />
        <path d="M76 38v186M144 38v186" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
        <circle cx="76" cy="38" r="5" fill="currentColor" opacity="0.55" />
        <circle cx="144" cy="38" r="5" fill="currentColor" opacity="0.55" />
        <circle cx="76" cy="224" r="5" fill="currentColor" opacity="0.55" />
        <circle cx="144" cy="224" r="5" fill="currentColor" opacity="0.55" />
        <path d="M36 132h38M146 132h38" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="110" cy="132" r="7" stroke="#2d665e" strokeWidth="1.5" opacity="0.8" />
        <circle cx="110" cy="132" r="2" fill="#2d665e" opacity="0.8" />
      </svg>
      <div className="relative mt-1 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.28em] text-text-light">
        <span className="h-px w-8 bg-copper/30" />
        <span>Time back</span>
        <span className="h-px w-8 bg-copper/30" />
      </div>
    </div>
  );
}

function StatBlock({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="stat-number copper-text">{number}</div>
      <div className="text-xs text-text-light tracking-wider uppercase mt-1">
        {label}
      </div>
    </div>
  );
}
