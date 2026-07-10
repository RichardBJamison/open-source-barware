import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Variance Tracking That Actually Works in a Free Inventory System",
  description: "How a real free bar inventory system calculates and surfaces variance at the bottle, station, category, and shift level — without spreadsheets or SaaS dashboards.",
  path: "/blog/variance-tracking-that-works",
  keywords: [
    "bar inventory variance",
    "free inventory system variance",
    "best bar inventory system variance tracking",
    "pour cost variance",
  ],
});

export default function VarianceTracking() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-copper hover:text-copper-bright">← Back to Blog</Link>
        </div>

        <header className="mb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-2">Operations • 2026-07-08</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-cream mb-4">
            Variance Tracking That Actually Works in a Free Inventory System
          </h1>
          <p className="text-lg text-text-muted">
            Most bars discover variance too late and too high-level. Here’s how a proper free system shows you exactly where the money walked out the door.
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-text-muted">
          <h2>The variance lie most systems sell</h2>
          <p>
            You finish a count. You drop in last week’s purchases and the POS report. The dashboard says “overall variance 4.2%.” You nod, close the tab, and move on. Three weeks later the same 4% is back and the owner is asking why the liquor cost is creeping.
          </p>
          <p>
            The problem isn’t the number. The problem is that “overall variance” is almost useless. It hides the fact that your well vodka is 12% off while the back-bar premium spirits are dead-on. It doesn’t tell you whether the shortage happened on day shift or night shift. It doesn’t flag that three specific bottles in one cooler are driving the entire loss.
          </p>

          <h2>What real variance tracking requires</h2>
          <p>
            A system that actually helps you run the bar needs to calculate and display variance at multiple resolutions at the same time:
          </p>
          <ul>
            <li><strong>Bottle level</strong> — individual SKUs (Tito’s 750 vs Grey Goose 1.75L)</li>
            <li><strong>Station level</strong> — which well, which back bar, which service station</li>
            <li><strong>Category level</strong> — liquor vs beer vs wine so you know where to focus ordering and training</li>
            <li><strong>Shift level</strong> — because a 9% variance on Friday night means something completely different from the same number on a slow Tuesday lunch</li>
          </ul>

          <h2>How the free system does it without extra cost</h2>
          <p>
            Because the program already knows every bottle’s location from the original voice walk, every count is automatically tied to the correct station. When you log purchases for the matching window and paste the POS export, the math runs locally:
          </p>
          <p>
            Theoretical usage = (opening inventory + purchases) – closing inventory<br />
            Actual usage = POS sales converted to bottle units using your standard pours<br />
            Variance = Theoretical – Actual
          </p>
          <p>
            The result is stored per bottle, per station, and rolled up. You see both the raw number and the percentage. You see it on the home base the moment you Process.
          </p>

          <h2>What the numbers actually tell you</h2>
          <p>
            In a real bar the patterns are rarely random:
          </p>
          <ul>
            <li>Well vodka 11% high variance on night shift + normal on day shift = someone is free-pouring or ringing wrong.</li>
            <li>One specific back-bar tequila consistently 0.8 oz low every count = the bottle is being used for comps or training that aren’t being logged.</li>
            <li>Beer cooler variance spikes every time a certain delivery driver shows up = short cases or breakage not being recorded on the receiving log.</li>
          </ul>
          <p>
            A free inventory system that shows you this level of detail turns the monthly count from a chore into a management tool. You stop guessing where the money went and start seeing the exact leaks.
          </p>

          <h2>Why paid systems often hide this</h2>
          <p>
            Many SaaS tools give you a pretty overall percentage because it looks impressive in a sales deck. The granular station and shift breakdowns are either behind a higher tier or require you to run custom reports that most managers never learn to use. The data is there — you’re just paying extra to see it in a form that actually helps.
          </p>
          <p>
            In the open-source version the math is the same whether you’re on day one or year three. The detail is always available because there’s no reason to hide it.
          </p>

          <div className="panel p-6 my-8 not-prose">
            <p className="text-cream font-medium mb-2">See the variance the way working bars actually need it.</p>
            <Link href="/download" className="inline-block bg-copper hover:bg-copper-bright text-bg px-6 py-3 text-sm font-semibold tracking-wide">
              Download the free program
            </Link>
          </div>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "Variance Tracking That Actually Works in a Free Inventory System",
              "author": {
                "@type": "Organization",
                "name": "Open Source Barware"
              },
              "datePublished": "2026-07-08",
              "description": "Bottle, station, category, and shift-level variance from real operator data for the free bar inventory system."
            })
          }}
        />
      </article>
    </main>
  );
}
