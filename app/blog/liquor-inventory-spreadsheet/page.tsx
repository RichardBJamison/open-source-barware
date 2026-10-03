import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "The Liquor Inventory Spreadsheet Problem — Open Source Barware",
  description: "Spreadsheets work for bar inventory right up until they don't. Where they break, how to patch them, and when it's worth moving to something built for counting bottles.",
  path: "/blog/liquor-inventory-spreadsheet",
  keywords: [
    "liquor inventory spreadsheet",
    "bar inventory spreadsheet",
    "liquor inventory excel template",
    "free liquor inventory spreadsheet",
    "bar inventory template",
  ],
});

export default function LiquorInventorySpreadsheet() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-copper hover:text-copper-bright">← Back to Blog</Link>
        </div>

        <header className="mb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-2">Guide • 2026-08-06</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-cream mb-4">
            The Liquor Inventory Spreadsheet Problem
          </h1>
          <p className="text-lg text-text-muted">
            Almost every bar starts with a spreadsheet, and for a while it&rsquo;s the right call. Here&rsquo;s exactly where it breaks, and what to do about it.
          </p>
        </header>

        <div className="prose prose-invert max-w-none text-text-muted">
          <p>
            If you&rsquo;re running liquor inventory in Excel or Google Sheets, you&rsquo;re in good company. It&rsquo;s free, you already know it, and for a single bar with a hundred SKUs it genuinely works. Anyone who tells you a spreadsheet is amateur hour has not run a small bar on a thin margin.
          </p>
          <p>
            But spreadsheets fail in specific, predictable ways, and they fail quietly — you usually find out during a bad variance month when you can&rsquo;t tell whether you have a theft problem or a math problem.
          </p>

          <h2>Where the spreadsheet actually breaks</h2>
          <p>
            <strong>Tenths.</strong> Most templates track full bottles, or bottles plus a rough fraction. Real pours don&rsquo;t work that way. A tenth of a bottle of well vodka, missed across forty bottles every week, is a number that matters at the end of the year. If your sheet rounds, your variance is fiction.
          </p>
          <p>
            <strong>The date window.</strong> This is the one that ruins more counts than anything else. Your POS export covers one range, the invoice you&rsquo;re looking at covers another, and the count happened Tuesday. A spreadsheet will happily calculate usage from mismatched windows and give you a confident, wrong answer. Nothing in the sheet forces those dates to line up.
          </p>
          <p>
            <strong>Two people counting.</strong> The moment a second person opens the file, you have version problems. &ldquo;Inventory_FINAL_v3_KJ.xlsx&rdquo; is a real file on someone&rsquo;s desktop right now.
          </p>
          <p>
            <strong>History.</strong> Most bars overwrite the same sheet every month. Six months later you want to know whether your tequila variance is trending or was one bad week, and the data is gone.
          </p>
          <p>
            <strong>Formula rot.</strong> Someone inserts a row, a SUM range doesn&rsquo;t extend, and the sheet keeps working — just wrong. This can go undetected for months because nothing errors out.
          </p>

          <h2>How to make a spreadsheet genuinely better</h2>
          <p>
            If you&rsquo;re staying on sheets, these fixes are worth an afternoon:
          </p>
          <ul>
            <li><strong>Count in tenths, always.</strong> One decimal place on every count column. No &ldquo;about half.&rdquo;</li>
            <li><strong>Put the date range in a locked cell at the top</strong>, and enter it before you count anything. Then pull your POS export to match it exactly.</li>
            <li><strong>Never overwrite.</strong> Duplicate the tab each period, dated. Storage is free; history isn&rsquo;t recoverable.</li>
            <li><strong>Order the sheet the way you walk the bar</strong> — station by station, left to right, exactly as you physically move. Not alphabetically. This alone cuts counting time and mistakes.</li>
            <li><strong>Lock your formula cells.</strong> Only count cells should be editable.</li>
            <li><strong>Reconcile one category first.</strong> If the numbers are wild, don&rsquo;t debug all 180 SKUs — get vodka right, then expand.</li>
          </ul>
          <p>
            That gets you a long way. Plenty of well-run bars never need more than this.
          </p>

          <h2>When it&rsquo;s time to stop patching</h2>
          <p>
            The honest signal isn&rsquo;t SKU count — it&rsquo;s time and trust. Move on when the count takes longer than the insight is worth, when more than one person needs to touch it, when you can&rsquo;t answer &ldquo;is this getting better or worse&rdquo; without digging through old files, or when you&rsquo;ve stopped believing the variance number.
          </p>
          <p>
            That last one is the real tell. A number nobody trusts is worse than no number, because it makes you feel covered when you aren&rsquo;t.
          </p>

          <h2>What we built instead</h2>
          <p>
            Open Source Barware is a free, open-source program for exactly this handoff. It was built by someone who did the counts, and it takes the spreadsheet&rsquo;s failure modes seriously:
          </p>
          <ul>
            <li><strong>Tenths by default</strong> — every count and every variance calculation works in 0.1 increments.</li>
            <li><strong>It forces the date window</strong> — you can&rsquo;t calculate usage until the POS and invoice periods match. That single constraint eliminates most bad variance numbers.</li>
            <li><strong>Permanent history</strong> — every count is kept, so trends are visible instead of overwritten.</li>
            <li><strong>Your data stays yours</strong> — readable files on your own machine, exportable to CSV. No login, no subscription, nothing held hostage.</li>
            <li><strong>Genuinely free</strong> — MIT licensed, no paid tier hiding the variance report you actually need.</li>
          </ul>
          <p>
            And if you want to keep your spreadsheet alongside it, that&rsquo;s fine. Exports are plain CSV.
          </p>

          <p>
            <Link href="/free-bar-inventory-software" className="text-copper hover:text-copper-bright">See how the program works</Link>
            {" · "}
            <Link href="/inventory/spreadsheets" className="text-copper hover:text-copper-bright">Spreadsheet import and export</Link>
          </p>
        </div>
      </article>
    </main>
  );
}
