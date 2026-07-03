import Link from "next/link";
import { Gear, GearDivider } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "The Open Source Bar Manifesto — Open Source Barware",
  description:
    "Why we built a free, open source bar inventory program and gave the whole thing away. No subscriptions, no investors, no email capture — just people who were tired of paying to count bottles.",
  path: "/manifesto",
  keywords: [
    "open source bar inventory",
    "free bar inventory software",
    "why is open source barware free",
    "free restaurant inventory system",
    "free liquor inventory program",
    "bar inventory manifesto",
    "open source hospitality software",
  ],
});

const bill = [
  {
    label: "The Gun",
    amount: "$3,000+",
    body: "Handheld inventory scanners that still need someone to walk the room and point them at every bottle.",
  },
  {
    label: "The Subscription",
    amount: "$200+ / mo",
    body: "SaaS platforms billing every month, forever, for a spreadsheet with a nicer font.",
  },
  {
    label: "The Consultant",
    amount: "By the bottle",
    body: "Inventory services that charge a fee to come count what your own staff already knows how to count.",
  },
];

const promises = [
  "No investors to answer to, so no pressure to add a paywall later.",
  "No email capture on the download — the program does not need your address to work.",
  "No seat limits, no location limits, no “upgrade to Pro” screen hiding behind a feature you already need.",
  "Open source, so if we ever drifted from this, anyone could see it in the code and fork it.",
];

export default function ManifestoPage() {
  return (
    <>
      {/* ── HERO (typographic, no photo) ── */}
      <section className="relative overflow-hidden border-b border-gear-border grain">
        <div className="absolute right-[-60px] top-[-40px] text-copper pointer-events-none">
          <Gear size={240} className="gear-spin opacity-15" />
        </div>
        <div className="absolute left-[-30px] bottom-[-30px] text-patina pointer-events-none">
          <Gear size={140} className="gear-spin-reverse opacity-15" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="glow-dot" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light font-medium">
              The Manifesto
            </span>
            <div className="glow-dot" />
          </div>

          <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] mb-8 max-w-3xl mx-auto">
            Counting bottles shouldn&rsquo;t
            <br />
            <span className="copper-text">cost you a shift&rsquo;s tips.</span>
          </h1>

          <p className="text-text-muted text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
            This is the honest version of why Open Source Barware exists, who
            it&rsquo;s for, and why the whole program &mdash; bar, liquor,
            and wine inventory included &mdash; is free and stays free.
          </p>
        </div>
      </section>

      {/* ── THE BILL ── */}
      <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[1px] bg-copper/40" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
            The Bill Nobody Talks About
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6 max-w-2xl">
          <span className="copper-text">Inventory has been a paid problem</span>{" "}
          for decades.
        </h2>
        <p className="text-text-muted leading-relaxed max-w-2xl mb-12 text-lg">
          Somewhere along the way, an industry decided that counting your own
          bottles was worth charging you for. We&rsquo;ve seen the invoices.
          Three of them show up again and again.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bill.map((item) => (
            <div key={item.label} className="panel rounded-sm p-6 md:p-7 relative rivets">
              <p className="text-[10px] tracking-[0.25em] uppercase text-copper mb-4">
                {item.label}
              </p>
              <p className="font-serif text-3xl text-cream mb-4">{item.amount}</p>
              <p className="text-text-muted text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <GearDivider />

      {/* ── WHAT CHANGED ── */}
      <section className="relative bg-bg-panel border-y border-gear-border overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-14 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light">
              What Changed
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="copper-text">AI made it possible to build this</span>{" "}
            without a dev team or a funding round.
          </h2>
          <div className="text-text-muted leading-relaxed space-y-5 text-lg max-w-2xl">
            <p>
              We&rsquo;re not going to pretend otherwise: this program was
              built with AI, by people who work behind bars, not by a startup
              with a Series A. That&rsquo;s the whole point. The tools that
              used to require a company &mdash; and a reason to charge you
              &mdash; are now buildable by the people who actually live the
              problem every close.
            </p>
            <p className="text-cream font-medium">
              So instead of pitching investors on a subscription model, we
              just built the thing and gave it away.
            </p>
          </div>
        </div>
      </section>

      {/* ── FIELD TESTED ── */}
      <section className="max-w-4xl mx-auto px-6 py-14 md:py-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[1px] bg-copper/40" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
            Field-Tested, Not Focus-Grouped
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6 max-w-2xl">
          Built at the bar. <span className="copper-text">Tested at the bar.</span>
        </h2>
        <p className="text-text-muted leading-relaxed max-w-2xl text-lg mb-6">
          Open Source Barware started in the USBG Cleveland chapter, then
          spent three weeks running for real at Agave &amp; Rye in downtown
          Cleveland &mdash; real bottles, real counts, real closing-shift
          pressure. Nothing shipped that we hadn&rsquo;t used ourselves at
          2am with a clipboard in hand.
        </p>
        <p className="text-text-muted leading-relaxed max-w-2xl text-lg">
          If a feature didn&rsquo;t survive a Friday night, it didn&rsquo;t
          make it into the program.
        </p>
      </section>

      <GearDivider />

      {/* ── WHY IT STAYS FREE ── */}
      <section className="relative bg-bg-panel border-y border-gear-border overflow-hidden grain">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-copper">
          <Gear size={180} className="gear-spin-slow opacity-10" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-14 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light">
              Why It Stays Free
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-10 max-w-2xl">
            <span className="copper-text">Free isn&rsquo;t a launch price.</span>{" "}
            It&rsquo;s the whole model.
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
            {promises.map((item) => (
              <li key={item} className="flex items-start gap-4 panel rounded-sm p-5">
                <span className="text-copper shrink-0 mt-0.5">&mdash;</span>
                <span className="text-text-muted text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── PULL QUOTE ── */}
      <section className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        <blockquote className="pull-quote">
          &ldquo;We didn&rsquo;t build a company that sells software to bars.
          We built the spreadsheet we wished someone had handed us on a bad
          Monday close.&rdquo;
        </blockquote>
        <p className="text-sm text-text-light mt-4 pl-7">
          &mdash; Open Source Barware
        </p>
      </section>

      {/* ── WHAT WE ASK INSTEAD ── */}
      <section className="max-w-4xl mx-auto px-6 pb-14 md:pb-20">
        <div className="panel rounded-sm p-7 md:p-9 relative rivets">
          <p className="text-[10px] tracking-[0.25em] uppercase text-copper mb-4">
            What We Ask Instead
          </p>
          <h3 className="font-serif text-2xl md:text-3xl text-cream mb-4">
            No purchase required. If you want to say thanks, we&rsquo;ll take
            it two ways.
          </h3>
          <p className="text-text-muted leading-relaxed mb-6 max-w-2xl">
            Tell us what&rsquo;s missing &mdash; a feature, a bad assumption,
            a step that doesn&rsquo;t match how your bar actually runs. Or,
            if the program saved you a night, buy us a drink. Every donation
            keeps it alive, open, and free for the next bar.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://ko-fi.com/W2J022HCH2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-8 py-3 text-sm tracking-wide transition-all hover:shadow-[0_0_24px_rgba(168,120,79,0.25)]"
            >
              Buy Us a Drink
            </a>
            <Link
              href="/about"
              className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-3 text-sm tracking-wide transition-all"
            >
              Read the Full Story
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHERE TO GO FROM HERE ── */}
      <section className="border-t border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
            Where To Go From Here
          </p>
          <h2 className="font-serif text-3xl text-cream mb-10 max-w-lg">
            One program. Every category behind the bar.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ManifestoLink
              href="/liquor-inventory"
              title="Free Liquor Inventory"
              body="How the program handles your highest-cost, highest-risk category."
            />
            <ManifestoLink
              href="/wine-inventory"
              title="Free Wine Inventory"
              body="Vintages, bins, and bottle-level tracking for your wine program."
            />
            <ManifestoLink
              href="/the-process"
              title="The Process"
              body="The kitchen-table walkthrough of how setup and weekly counts work."
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute right-[10%] bottom-[-20px] text-copper">
          <Gear size={100} className="gear-spin-slow opacity-15" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            <span className="copper-text">Read the manifesto.</span> Now go
            count something.
          </h2>
          <p className="text-text-muted text-lg mb-10 max-w-md mx-auto">
            No signup. No email capture. No sales pitch. Download the program
            and get to work.
          </p>
          <Link
            href="/downloads"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(168,120,79,0.25)]"
          >
            Download the Program
          </Link>
        </div>
      </section>
    </>
  );
}

function ManifestoLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group block panel card-lift rounded-sm p-6 relative rivets"
    >
      <h3 className="font-serif text-xl text-cream mb-3 group-hover:text-copper transition-colors">
        {title}
      </h3>
      <p className="text-text-muted text-sm leading-relaxed">{body}</p>
    </Link>
  );
}
