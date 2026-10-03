import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Wine Bar Software: What Actually Differs From Bar Inventory — Open Source Barware",
  description: "Wine inventory breaks most bar software: bottles sell whole, by the glass, and sit as assets for years. What wine bars actually need, and a free open-source option.",
  path: "/blog/wine-bar-software",
  keywords: [
    "wine bar software",
    "wine inventory software",
    "wine cellar inventory software",
    "free wine inventory software",
    "restaurant wine list software",
  ],
});

export default function WineBarSoftware() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-copper hover:text-copper-bright">← Back to Blog</Link>
        </div>

        <header className="mb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-2">Guide • 2026-08-06</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-cream mb-4">
            Wine Bar Software Is a Different Problem
          </h1>
          <p className="text-lg text-text-muted">
            Most bar inventory tools were built for spirits and treat wine as an afterthought. That&rsquo;s why wine programs are the hardest thing in the building to count.
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-text-muted">
          <p>
            Spirits inventory is a solved problem in principle: a bottle holds a known volume, you pour measured amounts, you count what&rsquo;s left. Wine breaks nearly every assumption in that sentence, which is why generic bar software handles it badly and why most wine directors end up back in a spreadsheet.
          </p>

          <h2>Four ways wine is genuinely different</h2>
          <p>
            <strong>The same bottle sells two ways.</strong> A bottle of Chardonnay might leave as a whole bottle at one price or as five glasses at another. Your software has to understand that one unit of inventory has two revenue paths, or your usage math never reconciles.
          </p>
          <p>
            <strong>Open bottles are a decaying asset.</strong> An open bottle of vodka is fine next month. An open bottle of wine has two or three days, less without preservation. Counting a half-full Sancerre as half a bottle of value is often wrong — it may be waste already. Spirits software has no concept for this.
          </p>
          <p>
            <strong>Vintages are separate items that look identical.</strong> The 2021 and 2022 of the same wine are different products with different costs, and staff counting quickly will absolutely combine them. If your system can&rsquo;t hold vintage as a distinct field, your cost basis drifts every time you take delivery.
          </p>
          <p>
            <strong>Cellared wine is inventory that isn&rsquo;t moving.</strong> A serious wine program might hold thousands in bottles that won&rsquo;t sell for a year. That&rsquo;s a real asset requiring real tracking, but it will wreck any usage or variance report that assumes stock turns over.
          </p>

          <h2>What a wine program actually needs</h2>
          <ul>
            <li><strong>Both units, on one item</strong> — bottle and by-the-glass, with the pour size defined, so depletion math works either way.</li>
            <li><strong>Vintage as its own field</strong> — not jammed into the product name.</li>
            <li><strong>Partial-bottle handling that reflects reality</strong> — including the ability to write off what didn&rsquo;t sell in time.</li>
            <li><strong>Storage location</strong> — cellar, back bar, reach-in. A count sheet is useless if it doesn&rsquo;t follow where the bottles physically are.</li>
            <li><strong>Separation of active and cellared stock</strong> — so your variance report reflects what&rsquo;s actually moving.</li>
            <li><strong>Counting in tenths</strong> — by-the-glass pours leave real fractions.</li>
          </ul>

          <h2>Why most tools miss</h2>
          <p>
            Two reasons. First, the market is bigger for spirits, so that&rsquo;s what gets built first and wine gets bolted on. Second, real wine features — vintages, cellar tracking, dual units — usually appear only on higher-priced tiers, which is exactly backwards for a small wine bar with a deep list and thin margins.
          </p>
          <p>
            The result is predictable: the wine director keeps a private spreadsheet, and the &ldquo;system of record&rdquo; quietly stops matching the building.
          </p>

          <h2>A free option worth trying</h2>
          <p>
            Open Source Barware is a free, GPLv3-licensed inventory program, and its wine handling isn&rsquo;t behind a paywall because there isn&rsquo;t one:
          </p>
          <ul>
            <li><strong>Tenths counting throughout</strong>, so by-the-glass depletion is real rather than rounded.</li>
            <li><strong>Location-based mapping</strong> — build the count in the order you physically walk the cellar and the bar.</li>
            <li><strong>Enforced date windows</strong> — POS and invoice periods must match before usage calculates, which is where most wine variance actually goes wrong.</li>
            <li><strong>Permanent history in open files</strong> — a wine program&rsquo;s value is in the trend, and the data stays yours, exportable to CSV.</li>
            <li><strong>No subscription, no seat fees, no tier</strong> — the version you download is the whole program.</li>
          </ul>
          <p>
            It won&rsquo;t replace a dedicated cellar management platform for a collection running into the thousands of bottles. For a wine bar or a restaurant with a serious list and no interest in paying monthly, it does the job.
          </p>

          <p>
            <Link href="/wine-inventory" className="text-copper hover:text-copper-bright">Wine inventory features</Link>
            {" · "}
            <Link href="/free-bar-inventory-software" className="text-copper hover:text-copper-bright">Download the free program</Link>
          </p>
        </div>
      </article>
    </main>
  );
}
