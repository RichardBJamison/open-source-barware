import Link from "next/link";
import { Gear, GearDivider, PipeLine, PipeNode } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "The Process - Open Source Barware",
  description:
    "A kitchen-table explanation of the Open Source Barware Chrome-side inventory system, from voice notes and spreadsheets to the AI home base.",
  path: "/the-process",
});

const productBlocks = [
  {
    label: "One Program",
    title: "One Chrome-side program",
    body: "You open one place in Chrome. It guides the first setup, keeps the bar map, collects weekly inputs, and becomes the home base you return to.",
  },
  {
    label: "The Changeover",
    title: "Caterpillar to butterfly",
    body: "At first it feels like a guided checklist. After the bar is mapped and approved, it opens up into the everyday inventory dashboard.",
  },
  {
    label: "The Spine",
    title: "Voice notes, spreadsheets, and AI",
    body: "You talk through the bar the way you already walk it. The system turns that into a clean spreadsheet view, then uses AI to help organize, check, and explain the numbers.",
  },
];

const homeBaseFeatures = [
  {
    title: "AI Home Base",
    body: "The calm landing page: last inventory, current cycle, what changed, what needs attention, and where to go next.",
  },
  {
    title: "Spreadsheet View",
    body: "The full workbook stays readable: products, locations, par levels, counts, deliveries, costs, and reconciliation math.",
  },
  {
    title: "In-House Inventory",
    body: "A running view of what should still be in the building after sales, deliveries, and the latest approved count.",
  },
  {
    title: "Category Rooms",
    body: "Liquor, beer, wine, mixers, and future dry goods each get their own clean area without turning the whole system into a maze.",
  },
  {
    title: "Weekly Inputs",
    body: "Counts, invoice pictures, POS downloads, and manager notes enter through one weekly packet instead of living in scattered messages.",
  },
  {
    title: "Cycle Reports",
    body: "Each cycle explains the story: betterments, losses, usage movement, spending movement, and anything worth a manager look.",
  },
];

const setupGates = [
  "Choose the AI helper before sensitive inventory information goes in",
  "Confirm the Chrome-side connection without pasting secret values into reports",
  "Name every well, back bar, cooler, shelf, room, and storage area",
  "Ask about unclear brands, bottle sizes, duplicate items, and missing spaces",
  "Review the first map before the first real inventory count begins",
  "Match weekly count, invoices, and POS report to the same date window",
];

type ProcessStep = {
  number: string;
  title: string;
  body: string;
  note: string;
  cards?: Array<{ name: string; path: string }>;
  example?: {
    label: string;
    lines: string[];
  };
};

const steps: ProcessStep[] = [
  {
    number: "01",
    title: "Open the Chrome Program",
    body: "You start in one simple place. The program opens in Chrome, explains what it needs, and keeps the whole first setup moving in order.",
    note: "This is the caterpillar stage: small, guided, and focused only on getting the room understood.",
  },
  {
    number: "02",
    title: "Choose Your AI Helper",
    body: "The setup asks which AI provider you want to use. It helps you make the connection, then keeps moving once the system is ready to interpret notes and reports.",
    note: "Your provider is the helper. The bar map and operating data stay part of your own working system.",
    cards: [
      { name: "Claude", path: "Choose provider and connect" },
      { name: "ChatGPT", path: "Choose provider and connect" },
      { name: "Grok", path: "Choose provider and connect" },
    ],
  },
  {
    number: "03",
    title: "Walk the Bar by Voice",
    body: "You walk the restaurant the same way you would show it to a new manager. Speak the shelves, wells, coolers, storage rooms, and bottle placements into your phone.",
    note: "This first pass is a map, not a count. We are teaching the system where things live.",
  },
  {
    number: "04",
    title: "Turn the Walk Into a First Map",
    body: "The program takes the voice notes and drafts a readable bar map. It groups products by location and flags anything that sounds unclear or out of place.",
    note: "Messy speech is normal. The system should ask before it guesses.",
  },
  {
    number: "05",
    title: "Check the Spreadsheet View",
    body: "You get a clean spreadsheet-style view of the first map. Blank spaces and questions are left on purpose so a human can verify the real room.",
    note: "The spreadsheet is not there to make more work. It is the shared table everyone can point to.",
    example: {
      label: "First walk example:",
      lines: [
        "Main well, row one, left to right: Titos 750, Ketel One liter, Captain Morgan 750",
        "Back bar, top shelf: Casamigos Blanco 750, Cointreau 750, Don Julio Blanco 750",
        "Liquor room, tequila shelf: Patron Silver, Espolon Blanco, Herradura Reposado",
      ],
    },
  },
  {
    number: "06",
    title: "Pass the Checks and Gates",
    body: "Before the live inventory starts, the system makes sure the setup makes sense. Locations are named, unclear bottles are corrected, and the first map is approved.",
    note: "This is the check-in moment. The software helps, but the restaurant approves the truth.",
  },
  {
    number: "07",
    title: "Run the First Live Count",
    body: "Now you count quantities and bottle levels against the approved map. The count finally has structure, so it feels less like hunting through a messy room.",
    note: "The map gives the route. The count gives the numbers.",
  },
  {
    number: "08",
    title: "Add Invoices and POS",
    body: "The weekly packet gets the matching invoices, POS sales report, and manager notes for the same inventory window.",
    note: "One week, one packet, one story. That is how the numbers stay fair.",
  },
  {
    number: "09",
    title: "Open the AI Home Base",
    body: "After the first cycle, the guided setup becomes the butterfly: a home base that shows what happened, what changed, and what deserves attention.",
    note: "It should feel like hospitality: calm, clear, useful, and ready when the manager opens it.",
  },
  {
    number: "10",
    title: "Repeat and Improve",
    body: "Each new cycle updates the same system. The bar gets cleaner, the reports get easier to read, and the team can see whether the operation is improving.",
    note: "The real win is not one report. It is getting a little more honest and organized every cycle.",
  },
];

const whatYouNeed = [
  { item: "Google Chrome", detail: "The working program lives in Chrome so it is easy to open and return to." },
  { item: "Your AI provider", detail: "Use the helper you already trust, then connect it during setup." },
  { item: "A phone for voice notes", detail: "Walk the bar naturally and speak the shelves, wells, and rooms as you see them." },
  { item: "A first bar walk", detail: "The opening pass teaches the system where products live before anyone worries about quantities." },
  { item: "Invoices and POS report", detail: "These come in once the first real inventory cycle is ready." },
  { item: "A careful review", detail: "The first map gets checked and approved before the system becomes your home base." },
];

const weeklyRhythm = [
  {
    title: "Count",
    body: "Walk the approved map and record quantities, bottle levels, and anything that feels off.",
  },
  {
    title: "Add",
    body: "Bring in invoices, POS sales, delivery notes, and manager context for the same period.",
  },
  {
    title: "Read",
    body: "Open the home base and see the weekly story: usage, spend, variance, betterments, and next checks.",
  },
];

const dataPromises = [
  "Your bar map stays easy for your team to understand.",
  "Your weekly packet stays tied to the correct count window.",
  "Your AI helper explains the work instead of hiding the work.",
  "Your setup pauses and asks when something is unclear.",
  "Your home base makes the next action obvious.",
];

export default function TheProcess() {
  return (
    <main className="min-h-screen">

      {/* HERO */}
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
              The Kitchen Table Version
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-patina to-transparent" />
            <div className="glow-dot" />
          </div>

          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-8">
            <span className="copper-text">One Chrome-side program.</span>
            <br />
            <span className="text-cream">Caterpillar to butterfly.</span>
          </h1>

          <p className="text-text-muted text-xl leading-relaxed max-w-2xl mx-auto mb-6">
            Open Source Barware starts as a guided setup you can understand in
            one sitting. You walk the bar by voice, review the spreadsheet view,
            pass the checks, then open the AI home base for everyday inventory.
          </p>

          <p className="text-text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            The point is not to make your team learn a complicated software
            language. The point is to turn the way you already talk about the
            bar into a system that can count, compare, and explain itself.
          </p>
        </div>
      </section>

      {/* PRODUCT VIEW */}
      <section id="system-report" className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">
              The Big Picture
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-5">
              What you are actually using
            </h2>
            <p className="text-text-muted leading-relaxed text-lg">
              Think of it as one calm control panel. At first it helps you set
              up the room. Once the room is approved, that same place becomes
              your inventory home base with voice notes, spreadsheets, AI help,
              checks, and weekly reporting working together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {productBlocks.map((block) => (
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
                  Inside the Home Base
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-copper/20 bg-copper/20">
                {homeBaseFeatures.map((module) => (
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
              <h3 className="font-serif text-3xl text-cream mb-5">
                The system slows down where it should.
              </h3>
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                Inventory gets expensive when everyone guesses. These gates
                make sure the first map is clear before the restaurant relies
                on it.
              </p>
              <ul className="space-y-4">
                {setupGates.map((check, i) => (
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
        </div>
      </section>

      {/* WHAT YOU NEED */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Before Setup</p>
            <h2 className="font-serif text-4xl text-cream mb-4">What you need at the table</h2>
            <p className="text-text-muted">
              Nothing exotic. Just the pieces a real restaurant already has,
              gathered into one guided flow.
            </p>
          </div>
          <ul className="flex flex-col gap-5">
            {whatYouNeed.map((item, i) => (
              <li key={item.item} className="panel p-5 flex items-start gap-5">
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

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">First Setup</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">How it goes from first walk to home base</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              The first setup is meant to feel like a guided conversation. Do
              one thing, check it, then move to the next thing.
            </p>
          </div>

          <PipeLine>
            {steps.map((step, i) => (
              <PipeNode key={step.number} active={i === 5}>
                <div className="panel p-7 md:p-9 mb-0">
                  <div className="flex items-start gap-5 mb-5">
                    <span className="font-mono text-2xl text-copper flex-shrink-0 mt-1">{step.number}</span>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-serif text-2xl text-cream">{step.title}</h3>
                      </div>
                      <p className="text-text-muted leading-relaxed">{step.body}</p>
                    </div>
                  </div>

                  {step.cards && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 ml-0 md:ml-14">
                      {step.cards.map((card) => (
                        <div key={card.name} className="bg-bg/60 border border-gear-border rounded p-4">
                          <p className="text-xs font-semibold text-copper uppercase tracking-widest mb-2">{card.name}</p>
                          <p className="text-xs text-text-muted leading-relaxed">{card.path}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.example && (
                    <div className="mt-5 ml-0 md:ml-14">
                      <p className="text-xs text-text-light uppercase tracking-wider mb-3">{step.example.label}</p>
                      <div className="bg-bg/60 border border-gear-border rounded p-4 font-mono text-sm text-text-muted leading-loose">
                        {step.example.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 ml-0 md:ml-14 flex items-start gap-3 bg-bg/40 border border-copper/10 rounded p-4">
                    <span className="font-mono text-copper text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">Note</span>
                    <p className="text-sm text-text-muted leading-relaxed">{step.note}</p>
                  </div>
                </div>
              </PipeNode>
            ))}
          </PipeLine>
        </div>
      </section>

      {/* VOICE COUNT EXAMPLE */}
      <section className="border-b border-gear-border">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Voice to Spreadsheet</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">What the first bar walk sounds like</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              You do not have to speak like a robot. You describe the room the
              way you would explain it to a person, and the system gives you a
              cleaner version to review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="glow-dot" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light">What You Say Into Your Phone</span>
              </div>
              <div className="font-mono text-sm text-text-muted leading-loose bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light mb-1">Main well, row one:</p>
                <p>Bottle one left to right: Titos 750</p>
                <p>Ketel One liter</p>
                <p>Captain Morgan 750</p>
                <p>Casamigos Blanco 750</p>
                <p>Cointreau 750</p>
                <p className="text-text-light mt-3 mb-1">Back bar, top shelf:</p>
                <p>Left to right: Don Julio Blanco, Espolon, Herradura</p>
                <p className="text-text-light mt-3 mb-1">Liquor room:</p>
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
                <span className="text-[11px] tracking-[0.3em] uppercase text-brass-light">What Comes Back to Review</span>
              </div>
              <div className="text-sm text-text-muted leading-relaxed bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light text-xs uppercase tracking-wider mb-3">Main Well - Draft Map</p>
                <div className="space-y-1 mb-4">
                  <p>Row 1, Slot 1 - <span className="text-copper font-mono">Tito&apos;s 750ml</span></p>
                  <p>Row 1, Slot 2 - <span className="text-copper font-mono">Ketel One 1L</span></p>
                  <p>Row 1, Slot 3 - <span className="text-copper font-mono">Captain Morgan 750ml</span></p>
                  <p>Row 1, Slot 4 - <span className="text-copper font-mono">Casamigos Blanco 750ml</span></p>
                  <p>Row 1, Slot 5 - <span className="text-copper font-mono">Cointreau 750ml</span></p>
                </div>
                <p className="text-text-light text-xs uppercase tracking-wider mb-3 border-t border-gear-border pt-3">Liquor Room - Draft Map</p>
                <div className="space-y-1 mb-4">
                  <p>Tequila Shelf - <span className="text-copper font-mono">Patron, Casamigos, Don Julio</span></p>
                  <p>Vodka Shelf - <span className="text-copper font-mono">Tito&apos;s, Ketel One, Grey Goose</span></p>
                  <p>Reserved Blank - <span className="text-copper font-mono">Add missing shelf item</span></p>
                </div>
                <div className="border-t border-gear-border pt-3 bg-rust/10 -mx-4 px-4 py-3 rounded-b text-xs text-rust">
                  Check-in: confirm whether Cointreau belongs in the well or back bar.
                </div>
              </div>
              <p className="text-xs text-text-light mt-4 italic">
                The output becomes the review sheet before the first live count.
              </p>
            </div>
          </div>
        </div>
      </section>

      <GearDivider />

      {/* WEEKLY RHYTHM */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">After Setup</p>
            <h2 className="font-serif text-4xl text-cream mb-4">The weekly rhythm is simple</h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              Once the butterfly opens, the restaurant repeats the same clean
              loop: count the room, add the matching paperwork, read the story.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {weeklyRhythm.map((item, i) => (
              <article key={item.title} className="panel p-6">
                <p className="font-mono text-copper text-xs mb-4">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-serif text-2xl text-cream mb-3">{item.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DATA + TRUST */}
      <section className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Your Data</p>
            <h2 className="font-serif text-3xl text-cream mb-5">Customer-owned, provider-connected.</h2>
            <p className="text-text-muted leading-relaxed mb-4">
              The Chrome-side home base connects to the AI provider you choose.
              The inventory map, weekly notes, invoice details, POS reports,
              and spreadsheet outputs are there to serve your operation.
            </p>
            <p className="text-text-muted leading-relaxed">
              The home base treats provider connections and key setup as
              sensitive, and it keeps the working files understandable enough
              for a manager to review without a translator.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">The Promise</p>
            <h2 className="font-serif text-3xl text-cream mb-5">Useful before it is fancy.</h2>
            <ul className="flex flex-col gap-4">
              {dataPromises.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-text-muted">
                  <span className="text-copper flex-shrink-0 mt-0.5">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 text-copper pointer-events-none opacity-10">
          <Gear size={320} className="gear-spin-slow" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-6">Ready when you are</p>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6 max-w-2xl mx-auto">
            Start with the first bar walk.<br />
            <span className="copper-text">Let the home base grow from there.</span>
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-10 text-lg">
            Keep it human at the beginning. Voice notes, checks, spreadsheets,
            and AI all become more useful once the real room is understood.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inventory"
              prefetch={false}
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-base tracking-wide transition-all hover:shadow-[0_0_40px_rgba(205,127,50,0.3)]"
            >
              Open the Trial Home Base
            </Link>
            <Link
              href="/downloads"
              prefetch={false}
              className="inline-block border border-copper/40 text-copper hover:bg-copper/10 font-semibold px-10 py-4 text-base tracking-wide transition-all"
            >
              Download the Program
            </Link>
          </div>
          <p className="text-text-light text-sm mt-5">
            Forked kitchen table talk: clear enough to explain to a friend, sturdy enough to run the bar.
          </p>
        </div>
      </section>

    </main>
  );
}
