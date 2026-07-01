import { Gear, GearDivider, PipeLine, PipeNode } from "@/components/SteampunkElements";

export const metadata = {
  title: "System Build Report — Open Source Barware",
  description:
    "Audit-ready breakdown of the Chrome-side Open Source Barware inventory program, guided setup flow, admin panel, and weekly inventory workflow.",
};

const reportBlocks = [
  {
    label: "Product Form",
    title: "One Chrome-side customer program",
    body: "The customer starts with one download from the site. Opening it sets up the Open Source Barware control panel in Chrome and explains how to pin or reopen it from the browser bar.",
  },
  {
    label: "Lifecycle",
    title: "Caterpillar to butterfly",
    body: "The first version the customer sees is a setup guide. After provider setup, bar mapping, reconciliation, and approval, it becomes the permanent admin home base.",
  },
  {
    label: "Operating Spine",
    title: "Voice notes, spreadsheets, AI, and reports",
    body: "The system accepts voice-transcribed bar walks, builds a spreadsheet-backed inventory map, uses the chosen AI provider for interpretation, then produces cycle reports and dashboard updates.",
  },
];

const adminModules = [
  {
    title: "Home Base",
    body: "Shows last inventory date, current count cycle, improvement trend, variance direction, and quick links into the rest of the system.",
  },
  {
    title: "Spreadsheet View",
    body: "A clean Excel-style area for the full workbook: products, locations, par levels, costs, counts, deliveries, and reconciliation math.",
  },
  {
    title: "In-House Inventory",
    body: "A live view of what should still be in the building after the latest approved count and reconciliation cycle.",
  },
  {
    title: "Category Rooms",
    body: "Subpages for liquor, beer, wine, mixers, and a reserved dry-goods area so the system can grow without being rebuilt.",
  },
  {
    title: "Cycle Reports",
    body: "Compares cycle to cycle: betterments, losses, sales movement, usage changes, and items that need manager attention.",
  },
  {
    title: "Setup and Provider",
    body: "Stores setup progress, selected AI provider, API connection status, and the correction queue for unclear products or locations.",
  },
];

const setupChecks = [
  "AI provider selected before inventory intake begins",
  "API key waypoint completed without storing secret values in reports or handoffs",
  "Every well, back bar, cooler, shelf, and room receives a named location",
  "Bottle sizes and product names are confirmed before the first workbook is approved",
  "Blank spaces are intentionally left for missing bottles and customer corrections",
  "Stage two cannot start until the first inventory map is reviewed and accepted",
];

const auditQuestions = [
  "Confirm whether the first download is packaged as a Chrome extension, local Chrome app, or installable browser shortcut.",
  "Decide which AI providers are supported at launch and how API keys are stored locally.",
  "Decide whether Excel files are generated locally in the program or produced by the AI and imported back into the panel.",
  "Define the first POS export formats to support before direct POS integrations are considered.",
  "Choose the backup and restore path for a customer who changes computers.",
];

const steps = [
  {
    number: "01",
    title: "Download the Chrome Setup",
    emoji: "01",
    body: "The customer downloads one setup package from the site. When opened, it establishes the Open Source Barware program inside Chrome and shows the customer how to return to it from the browser bar.",
    tip: "This first form is the caterpillar: simple, guided, and focused only on getting the system installed and ready.",
  },
  {
    number: "02",
    title: "Choose the AI Provider",
    emoji: "02",
    body: "Before inventory is entered, the setup asks which AI system will power interpretation and reporting. It then points the customer to the correct API key location for that provider and confirms the connection is ready.",
    tip: "The program needs the connection, but secret values should never be copied into public reports, handoffs, or support notes.",
    platforms: [
      { name: "Claude", path: "Provider choice and API key waypoint" },
      { name: "ChatGPT", path: "Provider choice and API key waypoint" },
      { name: "Grok", path: "Provider choice and API key waypoint" },
    ],
  },
  {
    number: "03",
    title: "Map the Bar by Voice",
    emoji: "03",
    body: "The customer walks the physical bar and speaks the placement of products into a notes app. This first pass is not a quantity count. It builds the location map: wells, back bar, storage shelves, liquor room, beer, wine, coolers, mixers, and future dry goods.",
    tip: "The route matters: left to right, row by row, shelf by shelf, the same way a person would read a page.",
  },
  {
    number: "04",
    title: "Upload the Setup Notes",
    emoji: "04",
    body: "The customer uploads the first voice notes into the welcome stage. The system parses the spoken walk, organizes it by location, and flags anything that sounds unclear, duplicated, missing, or out of order.",
    tip: "Messy speech is expected. The program should ask before guessing on brand names, bottle sizes, or locations.",
  },
  {
    number: "05",
    title: "Reconcile the First Map",
    emoji: "05",
    body: "The system turns the setup notes into an Excel-style workbook and a readable confirmation sheet. It leaves blank spaces for missing placements, uncertain bottles, and corrections the customer needs to make while walking the bar again.",
    example: {
      label: "Setup speech example:",
      lines: [
        "Well one, row one, bottle one left to right: Titos 750, Ketel One liter, Captain Morgan 750",
        "Back bar, top shelf left to right: Casamigos Blanco 750, Cointreau 750, Don Julio Blanco 750",
        "Liquor room, tequila shelf: Patron Silver, Espolon Blanco, Herradura Reposado",
      ],
    },
    tip: "The first workbook is not final until the customer audits it against the real room.",
  },
  {
    number: "06",
    title: "Walk the Audit Sheet",
    emoji: "06",
    body: "The customer prints the sheet or opens it on a phone and walks the bar again. They confirm placements, fill blank spaces, correct bottle names, and mark anything that belongs in a different section.",
    tip: "This is the major check-and-balance step: the software learns the bar, but the human verifies the room.",
  },
  {
    number: "07",
    title: "Approve Corrections",
    emoji: "07",
    body: "Corrections are entered back into the setup flow. The system rebuilds the workbook, confirms bottle sizes and categories, and asks for approval before allowing the customer into the first real inventory count.",
    tip: "Approval is the gate between setup and operation.",
  },
  {
    number: "08",
    title: "Run the First Live Inventory",
    emoji: "08",
    body: "Now the customer performs the first actual inventory count. This time they count quantities and bottle levels against the approved map, then upload invoices and a POS sales report for the same cycle.",
    tip: "The map gives the count structure. The weekly count gives the numbers.",
  },
  {
    number: "09",
    title: "Open the Admin Home Base",
    emoji: "09",
    body: "After setup and first reconciliation, the dashboard becomes the butterfly. The customer lands on a home base showing last inventory, cycle status, sales movement, variance movement, and links into spreadsheets, reports, and in-house inventory.",
    tip: "The home base should feel like hospitality: calm, clear, and useful the moment the manager opens it.",
  },
  {
    number: "10",
    title: "Repeat the Cycle",
    emoji: "10",
    body: "Every cycle updates the same home base: inventory position, spending, usage, variance, sales trends, and betterments from cycle to cycle. The customer can also drill into liquor, beer, wine, mixers, and later dry goods.",
    tip: "The long-term value is not one report. It is the manager seeing whether the bar is getting cleaner or messier each cycle.",
  },
];

const whatYouNeed = [
  { item: "Google Chrome", detail: "The customer program lives in Chrome, similar in spirit to the existing OVLP POP pattern." },
  { item: "One setup download", detail: "The site provides one installer or package that opens the guided setup experience." },
  { item: "An AI provider and API key", detail: "The setup needs a chosen provider before it can interpret notes, invoices, and reports." },
  { item: "A smartphone with voice notes", detail: "Apple Notes, Google Keep, Notion, or any voice-to-text note system can capture the bar walk." },
  { item: "Invoices and POS reports", detail: "These are not stage-one setup materials, but they become part of the first live inventory cycle." },
  { item: "Time for the first audit pass", detail: "The first setup should expect a careful walk, workbook review, corrections, and final approval." },
];

export default function TheProcess() {
  return (
    <main className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-gear-border">
        <div className="absolute right-[-60px] top-[-40px] text-copper pointer-events-none">
          <Gear size={240} className="gear-spin opacity-20" />
        </div>
        <div className="absolute left-[-30px] bottom-[-30px] text-copper pointer-events-none">
          <Gear size={120} className="gear-spin-slow opacity-10" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="glow-dot" />
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-patina to-transparent" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light font-medium">
              The AI Inventory System
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-patina to-transparent" />
            <div className="glow-dot" />
          </div>

          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-8">
            <span className="copper-text">The Chrome control panel</span>
            <br />
            <span className="text-cream">becomes the inventory system.</span>
          </h1>

          <p className="text-text-muted text-xl leading-relaxed max-w-2xl mx-auto mb-6">
            Open Source Barware starts as one Chrome-side setup program. The
            customer opens it, connects their chosen AI provider, walks the bar
            by voice, audits the first workbook, then graduates into a permanent
            admin home base.
          </p>

          <p className="text-text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            This page is the report version of that build: product shape,
            setup stages, dashboard modules, checks, and open decisions.
          </p>
        </div>
      </section>

      {/* ── SYSTEM BUILD REPORT ── */}
      <section id="system-report" className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              Build Report
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-5">
              Overall product view
            </h2>
            <p className="text-text-muted leading-relaxed text-lg">
              The product is not four separate downloads. It is one customer
              program that starts in setup mode and matures into an operating
              dashboard after the customer approves the first inventory map.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {reportBlocks.map((block) => (
              <article key={block.label} className="panel p-6 md:p-7">
                <p className="text-[10px] tracking-[0.25em] uppercase text-copper mb-5">
                  {block.label}
                </p>
                <h3 className="font-serif text-2xl text-cream mb-4">
                  {block.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {block.body}
                </p>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="panel p-6 md:p-8 lg:col-span-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="glow-dot" />
                <p className="text-[11px] tracking-[0.3em] uppercase text-patina-light">
                  Admin Home Base
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-copper/20 bg-copper/20">
                {adminModules.map((module) => (
                  <div key={module.title} className="bg-bg-panel/95 p-5">
                    <h4 className="font-serif text-xl text-cream mb-2">
                      {module.title}
                    </h4>
                    <p className="text-text-muted text-sm leading-relaxed">
                      {module.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel p-6 md:p-8 lg:col-span-5">
              <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-5">
                Checks and Gates
              </p>
              <ul className="space-y-4">
                {setupChecks.map((check, i) => (
                  <li key={check} className="flex gap-4 text-sm text-text-muted leading-relaxed">
                    <span className="font-mono text-copper text-xs mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          <div className="panel p-6 md:p-8 mt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="max-w-sm">
                <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
                  Open Decisions
                </p>
                <h3 className="font-serif text-3xl text-cream">
                  Items to audit before build
                </h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {auditQuestions.map((question) => (
                  <li key={question} className="border border-gear-border bg-bg/50 p-4 text-sm text-text-muted leading-relaxed">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU NEED ── */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Before Setup</p>
            <h2 className="font-serif text-4xl text-cream mb-4">What the customer needs</h2>
            <p className="text-text-muted">The first setup is guided, but it still needs these inputs.</p>
          </div>
          <ul className="flex flex-col gap-5">
            {whatYouNeed.map((item, i) => (
              <li key={i} className="panel p-5 flex items-start gap-5">
                <div className="w-8 h-8 rounded-full border border-copper/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-serif text-copper text-sm">{i + 1}</span>
                </div>
                <div>
                  <p className="text-cream text-sm font-semibold mb-1">{item.item}</p>
                  <p className="text-text-muted text-sm leading-relaxed">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Setup Flow</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">From setup guide to admin panel</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              The product should walk the customer through each stage, confirm
              each checkpoint, and only unlock the full dashboard once the
              inventory map is approved.
            </p>
          </div>

          <PipeLine>
            {steps.map((step, i) => (
              <PipeNode key={i} active={i === 4}>
                <div className="panel p-7 md:p-9 mb-0">
                  <div className="flex items-start gap-5 mb-5">
                    <span className="text-3xl flex-shrink-0">{step.emoji}</span>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-serif text-lg copper-text opacity-50">{step.number}</span>
                        <h3 className="font-serif text-2xl text-cream">{step.title}</h3>
                      </div>
                      <p className="text-text-muted leading-relaxed">{step.body}</p>
                    </div>
                  </div>

                  {/* Platform instructions for step 02 */}
                  {"platforms" in step && step.platforms && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 ml-14">
                      {step.platforms.map((p) => (
                        <div key={p.name} className="bg-bg/60 border border-gear-border rounded p-4">
                          <p className="text-xs font-semibold text-copper uppercase tracking-widest mb-2">{p.name}</p>
                          <p className="text-xs text-text-muted leading-relaxed">{p.path}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voice example for step 05 */}
                  {"example" in step && step.example && (
                    <div className="mt-5 ml-14">
                      <p className="text-xs text-text-light uppercase tracking-wider mb-3">{step.example.label}</p>
                      <div className="bg-bg/60 border border-gear-border rounded p-4 font-mono text-sm text-text-muted leading-loose">
                        {step.example.lines.map((line, j) => (
                          <p key={j}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  <div className="mt-5 ml-14 flex items-start gap-3 bg-bg/40 border border-copper/10 rounded p-4">
                    <span className="text-copper text-base flex-shrink-0 mt-0.5">💡</span>
                    <p className="text-sm text-text-muted leading-relaxed">{step.tip}</p>
                  </div>
                </div>
              </PipeNode>
            ))}
          </PipeLine>

          <div className="mt-14 text-center">
            <a
              href="#system-report"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-12 py-4 text-base tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Return to the Build Report
            </a>
            <p className="text-text-light text-sm mt-4">Use this structure to audit the system before we build the Chrome program.</p>
          </div>
        </div>
      </section>

      {/* ── VOICE COUNT EXAMPLE ── */}
      <section className="border-b border-gear-border">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Setup Intake Example</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">What the first bar walk sounds like</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              The first spoken pass creates the map of what products live where.
              Quantity counts happen later, after this layout has been audited.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="glow-dot" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light">What You Say Into Your Phone</span>
              </div>
              <div className="font-mono text-sm text-text-muted leading-loose bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light mb-1">Main well, row one —</p>
                <p>Bottle one left to right: Titos 750</p>
                <p>Ketel One liter</p>
                <p>Captain Morgan 750</p>
                <p>Casamigos Blanco 750</p>
                <p>Cointreau 750</p>
                <p className="text-text-light mt-3 mb-1">Back bar, top shelf —</p>
                <p>Left to right: Don Julio Blanco, Espolon, Herradura</p>
                <p className="text-text-light mt-3 mb-1">Liquor room —</p>
                <p>Tequila shelf: Patron Silver, Casamigos, Don Julio</p>
                <p>Vodka shelf: Titos, Ketel One, Grey Goose</p>
              </div>
              <p className="text-xs text-text-light mt-4 italic">
                The first pass records placement, not quantities.
              </p>
            </div>

            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-brass/60 shadow-[0_0_8px_var(--brass)]" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-brass-light">What the AI Gives You Back</span>
              </div>
              <div className="text-sm text-text-muted leading-relaxed bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light text-xs uppercase tracking-wider mb-3">Main Well — Draft Map</p>
                <div className="space-y-1 mb-4">
                  <p>Row 1, Slot 1 — <span className="text-copper font-mono">Tito&apos;s 750ml</span></p>
                  <p>Row 1, Slot 2 — <span className="text-copper font-mono">Ketel One 1L</span></p>
                  <p>Row 1, Slot 3 — <span className="text-copper font-mono">Captain Morgan 750ml</span></p>
                  <p>Row 1, Slot 4 — <span className="text-copper font-mono">Casamigos Blanco 750ml</span></p>
                  <p>Row 1, Slot 5 — <span className="text-copper font-mono">Cointreau 750ml</span></p>
                </div>
                <p className="text-text-light text-xs uppercase tracking-wider mb-3 border-t border-gear-border pt-3">Liquor Room — Draft Map</p>
                <div className="space-y-1 mb-4">
                  <p>Tequila Shelf — <span className="text-copper font-mono">Patron, Casamigos, Don Julio</span></p>
                  <p>Vodka Shelf — <span className="text-copper font-mono">Tito&apos;s, Ketel One, Grey Goose</span></p>
                  <p>Reserved Blank — <span className="text-copper font-mono">Add missing shelf item</span></p>
                </div>
                <div className="border-t border-gear-border pt-3 bg-rust/10 -mx-4 px-4 py-3 rounded-b text-xs text-rust">
                  Flag: confirm whether Cointreau belongs in the well or back bar.
                </div>
              </div>
              <p className="text-xs text-text-light mt-4 italic">
                The output becomes an audit sheet before the first live count.
              </p>
            </div>
          </div>
        </div>
      </section>

      <GearDivider />

      {/* ── PRIVACY + LIMITS ── */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Your Data</p>
            <h2 className="font-serif text-3xl text-cream mb-5">Provider-connected, customer-owned.</h2>
            <p className="text-text-muted leading-relaxed mb-4">
              The intended program connects the customer&apos;s Chrome-side
              control panel to their chosen AI provider. Inventory notes,
              invoices, POS reports, and workbook outputs belong to the
              customer&apos;s operating environment.
            </p>
            <p className="text-text-muted leading-relaxed">
              API keys and provider credentials must be treated as sensitive
              setup data. Secret values should not appear in exports, support
              notes, handoffs, or reports.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Build Constraints</p>
            <h2 className="font-serif text-3xl text-cream mb-5">Keep these in scope.</h2>
            <ul className="flex flex-col gap-4">
              {[
                "The setup flow must not skip provider selection and API connection",
                "The first walk maps placement before it counts quantities",
                "Every unclear brand, bottle size, and location needs a correction queue",
                "The first workbook needs an approval gate before live inventory starts",
                "The admin panel must leave room for mixers and future dry goods",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                  <span className="text-copper flex-shrink-0 mt-0.5">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 text-copper pointer-events-none opacity-10">
          <Gear size={320} className="gear-spin-slow" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-6">Ready when you are</p>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6 max-w-2xl mx-auto">
            Audit the blueprint.<br />
            <span className="copper-text">Then build the Chrome program.</span>
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-10 text-lg">
            This report turns the raw product direction into a buildable shape:
            setup wizard, AI provider connection, inventory map, admin home
            base, and cycle reporting.
          </p>
          <a
            href="#system-report"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-14 py-5 text-base tracking-wide transition-all hover:shadow-[0_0_40px_rgba(205,127,50,0.3)]"
          >
            Back to Build Report
          </a>
          <p className="text-text-light text-sm mt-5">Audit first. Build second. Keep the customer setup guided the whole way.</p>
        </div>
      </section>

    </main>
  );
}
