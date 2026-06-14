import Link from "next/link";
import { Gear, GearDivider, PipeLine, PipeNode } from "@/components/SteampunkElements";

export const metadata = {
  title: "The Process — Open Source Barware",
  description:
    "How the Open Source Barware inventory system works. Set up once, count weekly by voice, upload your invoices and POS report, and let AI calculate everything.",
};

const steps = [
  {
    number: "01",
    title: "Download the Prompt",
    body: "Grab the master project prompt from our downloads page. It's a single text file. This file is the entire system.",
  },
  {
    number: "02",
    title: "Create an AI Project",
    body: "Open Claude, ChatGPT, or Grok. Create a new Project — a saved workspace that remembers your instructions. Paste the prompt into the project's system instructions. Your AI subscription just became your inventory software.",
  },
  {
    number: "03",
    title: "Map Your Bar (One Time)",
    body: "The AI walks you through your operation section by section — wells, back bar, liquor room, wine storage. Every product, bottle size, and par level gets logged. This takes 30–60 minutes once. You never do it again.",
  },
  {
    number: "04",
    title: "Count Weekly by Voice",
    body: "Once a week, open your notes app, turn on voice-to-text, and walk your bar. Speak naturally. The AI knows what you mean.",
  },
  {
    number: "05",
    title: "Upload Your Invoices",
    body: "Photograph your delivery invoices on your phone and upload them to the AI project. Images, PDFs, or text — all accepted. The AI extracts every line item and flags anything it can't read.",
  },
  {
    number: "06",
    title: "Upload Your POS Report",
    body: "Pull your weekly sales report from Toast, Square, Aloha, or whatever you use. Upload it to the project. The AI matches sales to inventory for variance calculation.",
  },
  {
    number: "07",
    title: "Review the Flags",
    body: "Before calculating, the AI surfaces anything ambiguous — unclear quantities, possible transcription errors, missing bottle sizes. You confirm or correct. Nothing is assumed.",
  },
  {
    number: "08",
    title: "Get Your Report",
    body: "Usage by product. Variance against sales. Unexplained loss flagged by severity. Recommended actions. Clean, ready for your owner or accountant.",
  },
];

const whatYouNeed = [
  "Claude, ChatGPT, or Grok account (any paid plan)",
  "A phone with voice-to-text",
  "Your weekly delivery invoices",
  "A weekly sales report from your POS",
  "30–60 minutes for initial setup",
  "10–20 minutes per week after that",
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
          <Gear size={120} className="gear-spin-slow opacity-15" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-8">
            <div className="glow-dot" />
            <div className="h-[1px] w-12 bg-gradient-to-r from-patina to-transparent" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light font-medium">
              How It Works
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-6 max-w-3xl">
            <span className="copper-text">Bar inventory software</span>
            <br />
            costs $200–$500 a month.
            <br />
            <span className="text-cream">This costs nothing.</span>
          </h1>

          <p className="text-text-muted text-lg md:text-xl leading-relaxed max-w-xl mb-10">
            We replaced the software with a prompt. Your AI subscription does the math.
            We provide the instructions. Your data never leaves your account.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/downloads"
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-8 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download the Prompt — Free
            </Link>
            <a
              href="#how-it-works"
              className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-4 text-sm tracking-wide transition-all"
            >
              See the Workflow ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── WHAT REPLACES WHAT ── */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gear-border">
          {[
            { label: "Traditional software", value: "$200–500/mo", sub: "Subscription, vendor lock-in, monthly billing" },
            { label: "Open Source Barware", value: "$0", sub: "Your AI does the math. We provide the instructions." },
            { label: "Time to set up", value: "~1 hour", sub: "One time. Then 10–20 minutes each week." },
          ].map((s) => (
            <div key={s.label} className="px-8 py-8 text-center first:pl-0 last:pr-0">
              <p className="text-[11px] tracking-[0.25em] uppercase text-text-light mb-2">{s.label}</p>
              <p className="font-serif text-4xl copper-text mb-2">{s.value}</p>
              <p className="text-xs text-text-muted leading-relaxed">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT YOU NEED ── */}
      <section className="border-b border-gear-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Before You Start</p>
            <h2 className="font-serif text-4xl text-cream mb-6">What you need</h2>
            <p className="text-text-muted leading-relaxed">
              No hardware. No installation. No IT department. Just the tools you probably already have.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {whatYouNeed.map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <div className="w-5 h-5 rounded-full border border-copper/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-copper" />
                </div>
                <span className="text-text-muted text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-b border-gear-border bg-bg-warm">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">The System</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream">How it works</h2>
          </div>

          <PipeLine>
            {steps.map((step, i) => (
              <PipeNode key={i} active={i === 3}>
                <div className="panel p-6 md:p-8 mb-0">
                  <div className="flex items-start gap-6">
                    <span className="font-serif text-3xl copper-text opacity-60 flex-shrink-0 leading-none mt-1">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="font-serif text-xl text-cream mb-2">{step.title}</h3>
                      <p className="text-text-muted text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </div>
              </PipeNode>
            ))}
          </PipeLine>

          <div className="mt-12 text-center">
            <Link
              href="/downloads"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download the Free Prompt
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHAT IS AN AI PROJECT ── */}
      <section className="border-b border-gear-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Plain Language</p>
            <h2 className="font-serif text-4xl text-cream mb-6">What is an AI project?</h2>
            <p className="text-text-muted leading-relaxed mb-4">
              A saved workspace inside your AI tool. Instead of starting from scratch every conversation, the project remembers the instructions you gave it. For Open Source Barware, that project becomes your private inventory system.
            </p>
            <p className="text-text-muted leading-relaxed">
              You paste our prompt in once. After that, it knows your bar — your wells, your products, your layout — every time you open it.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { platform: "Claude", instruction: "Create a Project → Project instructions → paste the prompt" },
              { platform: "ChatGPT", instruction: "Create a Project → Customize → paste the prompt" },
              { platform: "Grok", instruction: "Use the closest persistent workspace or saved conversation feature available" },
            ].map((p) => (
              <div key={p.platform} className="panel p-5">
                <p className="text-xs font-semibold text-copper uppercase tracking-widest mb-2">{p.platform}</p>
                <p className="text-sm text-text-muted leading-relaxed">{p.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOICE COUNT EXAMPLE ── */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Weekly Workflow</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">Count by voice. Upload. Done.</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              Walk your bar with your phone. Speak naturally into your notes app. Messy is fine — the system is built for it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Raw voice input */}
            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="glow-dot" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light">What You Say</span>
              </div>
              <div className="font-mono text-sm text-text-muted leading-loose space-y-1 bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light">Well one —</p>
                <p>Patron silver half bottle</p>
                <p>Casa Migos blanco point four</p>
                <p>Espolon half</p>
                <p>Don Ho full bottle</p>
                <p>Cointreau half bottle</p>
                <p className="mt-3 text-text-light">Liquor room —</p>
                <p>Patron silver two cases three bottles</p>
                <p>Titos one case</p>
                <p>Jack Daniels six bottles</p>
                <p>Heradura reposado one case two bottles</p>
              </div>
              <p className="text-xs text-text-light mt-4 italic">Exactly how it sounds walking the bar. No formatting required.</p>
            </div>

            {/* AI cleaned output */}
            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-brass/60 shadow-[0_0_8px_var(--brass)]" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-brass-light">What the AI Produces</span>
              </div>
              <div className="text-sm text-text-muted leading-relaxed space-y-3 bg-bg/60 p-4 rounded border border-gear-border">
                <div>
                  <p className="text-text-light text-xs uppercase tracking-wider mb-2">Well 1 — Confirmed</p>
                  <p>Patrón Silver — <span className="text-copper">0.5 btl</span></p>
                  <p>Casamigos Blanco — <span className="text-copper">0.4 btl</span></p>
                  <p>Espolòn Blanco — <span className="text-copper">0.5 btl</span></p>
                  <p>Don Julio Blanco — <span className="text-copper">1.0 btl</span> <span className="text-text-light text-xs">(matched "Don Ho")</span></p>
                  <p>Cointreau — <span className="text-copper">0.5 btl</span></p>
                </div>
                <div className="border-t border-gear-border pt-3">
                  <p className="text-text-light text-xs uppercase tracking-wider mb-2">Liquor Room — Confirmed</p>
                  <p>Patrón Silver — <span className="text-copper">27 btl</span> <span className="text-text-light text-xs">(2 cases + 3)</span></p>
                  <p>Tito's — <span className="text-copper">12 btl</span> <span className="text-text-light text-xs">(1 case)</span></p>
                  <p>Jack Daniel's — <span className="text-copper">6 btl</span></p>
                  <p>Herradura Reposado — <span className="text-copper">14 btl</span> <span className="text-text-light text-xs">(1 case + 2)</span></p>
                </div>
                <div className="border-t border-gear-border pt-3 bg-rust/10 -mx-4 px-4 py-2 rounded-b">
                  <p className="text-xs text-rust">⚑ Flag: Cointreau — confirm bottle size (750ml or 1L?)</p>
                </div>
              </div>
              <p className="text-xs text-text-light mt-4 italic">Brand names matched, cases converted, one flag for your confirmation.</p>
            </div>
          </div>
        </div>
      </section>

      <GearDivider />

      {/* ── PRIVACY ── */}
      <section className="border-b border-gear-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Your Data</p>
            <h2 className="font-serif text-4xl text-cream mb-6">We receive nothing.</h2>
            <p className="text-text-muted leading-relaxed mb-4">
              Your invoices, POS reports, inventory counts, pricing, and product list are uploaded directly into your own AI account. Open Source Barware has no server, no database, and no access to any of it.
            </p>
            <p className="text-text-muted leading-relaxed">
              Your data privacy depends on the AI provider you choose. Review their policies if your business has strict data requirements.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Limitations</p>
            <h2 className="font-serif text-4xl text-cream mb-6">What to know first.</h2>
            <ul className="flex flex-col gap-3">
              {[
                "AI can misread handwritten or thermal invoices",
                "Voice transcription can mishear brand names",
                "Initial setup requires careful product mapping",
                "AI projects can reset — always save your inventory map locally",
                "Do not use output as a legal, tax, or accounting document without professional review",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                  <span className="text-copper mt-0.5 flex-shrink-0">—</span>
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
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-6">Ready to start</p>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6 max-w-2xl mx-auto">
            One prompt. One setup. <span className="copper-text">Free forever.</span>
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-10">
            Download the prompt, set up your AI project, and run your first count. Takes about an hour to get live.
          </p>
          <Link
            href="/downloads"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-12 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_40px_rgba(205,127,50,0.3)]"
          >
            Get the Free Inventory System
          </Link>
        </div>
      </section>

    </main>
  );
}
