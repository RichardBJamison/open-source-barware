import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Inventory System for Bars: Setup in One Night — Open Source Barware",
  description: "A complete free inventory system for bars. Walk your stations, count in tenths, reconcile purchases and sales — no subscription required.",
  path: "/blog/free-inventory-system-guide",
  keywords: [
    "free inventory system",
    "free bar inventory system",
    "bar inventory software free",
    "best free bar inventory",
  ],
});

export default function FreeInventorySystemGuide() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-copper hover:text-copper-bright">← Back to Blog</Link>
        </div>

        <header className="mb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-2">Setup • 2026-07-08</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-cream mb-4">
            Free Inventory System for Bars: Setup in One Night
          </h1>
          <p className="text-lg text-text-muted">
            Walk your bar once. Build the map. Count, reconcile, and repeat — all without paying for software every month.
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-text-muted">
          <h2>Why a free inventory system matters for real bars</h2>
          <p>
            Walk into most bars at close and you’ll see the same scene: a manager hunched over a clipboard or a half-broken Excel sheet, trying to remember which well had the Hendrick’s and whether that case of Tito’s came in on Tuesday or Wednesday. By the time they’ve typed everything in, the numbers are already stale.
          </p>
          <p>
            Paid bar inventory systems promise to fix this with tablets and cloud dashboards, but they come with $150–$400 per month per location, seat limits, export fees, and the constant risk that if you stop paying, your historical data disappears or becomes hard to get out. Spreadsheets are “free” until you factor in the hours lost to formula errors, version conflicts, and the inevitable end-of-month guesswork when the counts don’t match the POS.
          </p>
          <p>
            A genuine free inventory system removes the financial and technical friction. It runs entirely on your machine, stores data in open formats, and gives you the complete workflow — station mapping, tenths-level counting, purchase logging, POS reconciliation, variance by bottle/category/shift, and smart ordering — without ever asking for a credit card.
          </p>

          <h2>The one-night setup that actually works</h2>
          <p>
            The program is designed so you can map an entire bar in a single shift and start getting useful numbers the same week. Here’s exactly how operators do it:
          </p>

          <h3>1. Name your physical spaces first</h3>
          <p>
            Stand behind the bar. Count the actual bars (not “the front” and “the back” — two separate bars mean two separate stations in the system). Name wells, back bars, service bars, coolers, and wine racks the way you already talk about them. “Main well, row 1 left to right.” The program uses these names as the backbone for every future count and variance report.
          </p>

          <h3>2. Walk and speak (or type) the bottles in order</h3>
          <p>
            This is the part most systems get wrong. You don’t type SKUs at a desk. You walk the actual route you use during service, top to bottom, left to right. Speak the bottles in the exact sequence you see them:
          </p>
          <p className="font-mono text-sm bg-bg-panel p-3 rounded">
            Bar one. Well one, row one: Tito’s 750, Ketel One liter, Tanqueray 750.<br />
            Well one, row two: Bacardi 750, Captain Morgan 750 — no row three.
          </p>
          <p>
            The built-in parser turns that voice note into a structured map with correct stations, rows, and bottle IDs. You review it once, fix any misheard names or duplicates, and the map is locked for the week. This single walk replaces hours of spreadsheet building.
          </p>

          <h3>3. Run your first count and log purchases the same week</h3>
          <p>
            Count in tenths the way real bars do. Log every invoice that arrived during the count window (type the lines or paste from email/PDF). Drop in the matching POS export. The system calculates usage, cost, variance, and par status automatically.
          </p>

          <h3>4. Process and repeat</h3>
          <p>
            After the first Process, the same bookmarked page becomes your home base. You see bottles on map, stations, total units, items below par, cycles logged, and POS drops at a glance. The “First week baseline” section locks the numbers from your initial cycle so you can measure improvement.
          </p>

          <h2>What a real free inventory system must deliver (and this one does)</h2>
          <ul>
            <li><strong>Bottle-level and station-level accuracy</strong> — Not lumped totals. You know the Hendrick’s in well 2 is at 1.4 while the back bar is at 3.7.</li>
            <li><strong>Variance by category, shift, or product</strong> — See exactly where the 21 products below par are and whether they’re liquor, beer, or wine.</li>
            <li><strong>Structured POS import</strong> — Toast, Square, or CSV. The parser matches sales to your mapped bottles so variance math is real.</li>
            <li><strong>Smart order suggestions</strong> — Based on actual movement from the last cycle, not gut feel or last week’s guess.</li>
            <li><strong>Receiving workflow</strong> — Log a PO, receive against it, flag discrepancies before the driver leaves.</li>
            <li><strong>Everything local</strong> — No cloud account required. Your data is in plain files you control. Open source under GPLv3.</li>
          </ul>

          <p>
            No seat limits. No location limits. No “upgrade to see last month’s numbers.” The program that runs the demo bar on the site is the same program you download and run on your laptop tonight.
          </p>

          <h2>Common mistakes this system prevents</h2>
          <p>
            Most first-time inventory disasters come from the same three places: inconsistent station naming, counting outside the actual purchase/POS window, and skipping the review step after the first map is built. The guided flow forces you to name bars and stations before you ever count, locks the count window to matching paperwork, and makes you approve the map before any variance numbers are trusted.
          </p>

          <div className="panel p-6 my-8 not-prose">
            <p className="text-cream font-medium mb-2">Ready to run a real free inventory system?</p>
            <Link href="/download" className="inline-block bg-copper hover:bg-copper-bright text-bg px-6 py-3 text-sm font-semibold tracking-wide">
              Download the program and start tonight
            </Link>
            <p className="text-xs text-text-light mt-2">Mac, Windows, or Chrome-side. No account. No credit card.</p>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-gear-border text-xs text-text-light">
          Part of the Open Source Barware project. All tools are free under GPLv3.
        </footer>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "Free Inventory System for Bars: Setup in One Night",
              "author": {
                "@type": "Organization",
                "name": "Open Source Barware"
              },
              "datePublished": "2026-07-08",
              "description": "A complete free inventory system for bars. Walk your stations, count in tenths, reconcile purchases and sales — no subscription required.",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://opensourcebarware.com/blog/free-inventory-system-guide"
              }
            })
          }}
        />
      </article>
    </main>
  );
}
