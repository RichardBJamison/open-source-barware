import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Liquor Inventory App: What \"Free\" Usually Means — Open Source Barware",
  description: "Most free liquor inventory apps are trials, freemium tiers, or your data as the product. What to check before you commit a season of counts, and what genuinely free looks like.",
  path: "/blog/free-liquor-inventory-app",
  keywords: [
    "free liquor inventory app",
    "liquor inventory app free",
    "free bar inventory app",
    "bar inventory software free",
    "free liquor inventory software",
  ],
});

export default function FreeLiquorInventoryApp() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-copper hover:text-copper-bright">← Back to Blog</Link>
        </div>

        <header className="mb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-2">Guide • 2026-08-06</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-cream mb-4">
            Free Liquor Inventory App: What &ldquo;Free&rdquo; Usually Means
          </h1>
          <p className="text-lg text-text-muted">
            There are plenty of free bar inventory apps. Only a few of them are still free once your data is in them.
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-text-muted">
          <p>
            Searching for a free liquor inventory app returns a long list, and most of the results are free in a way that expires. That&rsquo;s worth understanding before you spend a season entering 180 SKUs, because inventory data is expensive to move and everyone building these products knows it.
          </p>

          <h2>The four kinds of &ldquo;free&rdquo;</h2>
          <p>
            <strong>Free trial.</strong> Thirty days, then a card. Honest enough, and it&rsquo;s usually stated up front. Just know the clock is running while you&rsquo;re still learning the tool.
          </p>
          <p>
            <strong>Freemium with a ceiling.</strong> Free under some limit — one location, fifty items, one user. The limit is invariably set just below what a working bar needs. The variance report, the thing you actually came for, is often the first paid feature.
          </p>
          <p>
            <strong>Free because you&rsquo;re the product.</strong> No charge, but the terms let them use your purchasing data. For a bar, that data is your supplier pricing and volumes. Worth reading the terms before deciding whether you mind.
          </p>
          <p>
            <strong>Actually free.</strong> Open-source software with a real license. No tier, no expiry, no seat count. Rarer, and it looks different from the others in ways you can verify.
          </p>

          <h2>Five questions to ask before you commit</h2>
          <ul>
            <li><strong>Can I export everything, right now, in a format I can read?</strong> If the export is a paid feature or a support ticket, your data is hostage. Test this on day one, not on the day you leave.</li>
            <li><strong>Is the variance report included?</strong> Counting is the work; variance is the payoff. If the number you actually need is behind a tier, the free version is a demo.</li>
            <li><strong>What happens at the limit?</strong> Read-only? Locked out? Find out before you hit it mid-count.</li>
            <li><strong>Where does the data physically live?</strong> If it&rsquo;s their server, your access depends on their business continuing to exist.</li>
            <li><strong>Is there a license, or just a pricing page?</strong> A real open-source license (MIT, GPL) is a legal commitment. A pricing page that currently says $0 is a marketing decision that can change on a Tuesday.</li>
          </ul>

          <h2>Why we built ours the way we did</h2>
          <p>
            Open Source Barware is free in the fourth sense. It is licensed under the GPL (v3), which means the permission is legally granted rather than offered — nobody can revoke it later, including us. The GPL goes further than a permissive licence: anyone who redistributes a modified version has to keep it open too, so it cannot quietly become somebody&rsquo;s paid product.
          </p>
          <ul>
            <li><strong>No tiers.</strong> The version you download is the entire program. Variance, POS reconciliation, count sheets, history — all of it.</li>
            <li><strong>No account.</strong> Nothing to sign up for, no login to lose.</li>
            <li><strong>Your data is on your machine</strong>, in readable files, exportable to CSV whenever you want.</li>
            <li><strong>No seat fees.</strong> Put it on every machine in the building.</li>
            <li><strong>Tenths counting and enforced date windows</strong> — the two things that make variance numbers trustworthy — are standard, not premium.</li>
          </ul>
          <p>
            The honest trade-off: there&rsquo;s no support contract and no account manager. It runs on your hardware, and if you want a company to call at 2 a.m., a paid product is a legitimate choice. What you get instead is a tool that cannot be taken away, repriced, or sunset.
          </p>

          <p>
            <Link href="/free-bar-inventory-software" className="text-copper hover:text-copper-bright">Download it free</Link>
            {" · "}
            <Link href="/blog/liquor-inventory-spreadsheet" className="text-copper hover:text-copper-bright">Coming from a spreadsheet?</Link>
          </p>
        </div>
      </article>
    </main>
  );
}
