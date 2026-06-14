import { Gear, GearDivider, PipeLine, PipeNode } from "@/components/SteampunkElements";

export const metadata = {
  title: "The Process — Open Source Barware",
  description:
    "Step-by-step guide to the Open Source Barware AI inventory system. Set up once, count weekly by voice, upload your invoices and POS report, and let AI do the math.",
};

const steps = [
  {
    number: "01",
    title: "Download the Prompt File",
    emoji: "⬇️",
    body: "Click the download button on this page. You'll get a single file called a Markdown file — think of it like a text document. That file contains all the instructions that turn your AI into a bar inventory system. You don't need to understand what's inside it. You just need to copy it.",
    tip: "It will download to your phone or computer just like any other file. Find it in your Downloads folder.",
  },
  {
    number: "02",
    title: "Open Your AI and Create a Project",
    emoji: "🤖",
    body: "Open Claude (claude.ai), ChatGPT (chat.openai.com), or Grok. Look for a section called \"Projects\" in the sidebar or menu. Create a new project and give it a name like \"Bar Inventory\" or the name of your bar. A Project is like a saved workspace — it remembers everything you tell it, every single time you come back.",
    tip: "If you don't see \"Projects,\" don't worry — you can still use the system. Just paste the prompt at the very top of any new conversation before you start. It works the same way, you'll just need to paste it again next time.",
    platforms: [
      { name: "Claude", path: "Left sidebar → Projects → New Project" },
      { name: "ChatGPT", path: "Left sidebar → Projects → New Project" },
      { name: "Grok", path: "Use a saved conversation or workspace feature" },
    ],
  },
  {
    number: "03",
    title: "Paste the Prompt Into Your Project",
    emoji: "📋",
    body: "Open the file you downloaded in step 1. Select all the text (press Ctrl+A on Windows or Cmd+A on Mac) and copy it. Now go back to your AI project. Find the section called \"Project Instructions\" or \"System Prompt\" or \"Customize\" — it's usually under a settings or gear icon inside your project. Paste everything you copied in there. Save it.",
    tip: "You only do this once. After you paste it, your AI project is permanently loaded with the inventory system. You never have to do this step again.",
  },
  {
    number: "04",
    title: "Let the AI Walk You Through Your Bar Setup",
    emoji: "🗺️",
    body: "Now open a conversation inside your project and just say: \"I'm ready to set up my bar.\" The AI will take it from there. It will ask you questions one section at a time — your bar wells, your back bar, your liquor room, your wine storage. For each section it will ask what products you carry, what size bottles (750ml vs 1 liter — this matters for the math), and how they're organized. Answer as you go. This usually takes 30 to 60 minutes the first time.",
    tip: "When setup is done, the AI will summarize your full inventory map. Copy that summary and save it in a note on your phone. If anything ever resets, you can paste it back in and pick up exactly where you left off.",
  },
  {
    number: "05",
    title: "Count Your Inventory by Voice — Every Week",
    emoji: "🎙️",
    body: "Once a week, grab your phone and open your favorite notes app — Apple Notes, Google Keep, Notion, anything with voice-to-text. Hit the microphone button and walk your bar. Speak naturally as you count each section. For bottles in your wells and back bar, say the product name and how full it is — \"half bottle,\" \"point four,\" \"full bottle.\" For your liquor room, count by the case plus loose bottles. Don't worry about perfect pronunciation or spelling — the AI is built to understand messy voice notes.",
    example: {
      label: "Here's what it sounds like:",
      lines: [
        "Well one — Patron silver half bottle, Casa Migos blanco point four, Don Julio full bottle",
        "Well two — Titos half, Bacardi three quarters, Jack Daniels full bottle",
        "Liquor room — Patron silver two cases three bottles, Titos one case, Jack Daniels six bottles",
      ],
    },
    tip: "Walk the same route every week. Left to right, section by section. Consistency makes it faster and the AI gets better at knowing your bar.",
  },
  {
    number: "06",
    title: "Export Your Notes and Upload Them",
    emoji: "📤",
    body: "When you're done counting, export your note as a file. In Apple Notes or Google Keep, look for a share or export option and choose PDF or text. In Notion, export as Markdown or PDF. Go back to your AI project, open a new conversation, and upload that file. Just drag it in or tap the paperclip icon. Type something like \"Here is my weekly inventory count\" and hit send. The AI will read through it, clean up any transcription issues, and ask you about anything it's not sure about.",
    tip: "If you can't figure out how to export, you can also just copy and paste the text directly from your notes app into the chat. It works the same way.",
  },
  {
    number: "07",
    title: "Photograph and Upload Your Invoices",
    emoji: "🧾",
    body: "Take photos of every delivery invoice from the past week with your phone camera. Don't stress about perfect lighting — just make sure the text is readable. Upload each photo directly into the AI conversation. The AI will read every line item, pull out the product names and quantities, and match them to your inventory. If it can't read something clearly, it will tell you exactly what it missed and ask you to confirm rather than guessing.",
    tip: "You can upload multiple invoice photos at once. If you have PDF invoices from your distributor email, those work even better — just download them and attach them.",
  },
  {
    number: "08",
    title: "Upload Your POS Sales Report",
    emoji: "📊",
    body: "Log into your point-of-sale system — Toast, Square, Aloha, Lightspeed, whatever you use. Pull the weekly sales report for the same period as your inventory count. Export it as a PDF or spreadsheet and upload it to the AI conversation. The AI will use your sales numbers to calculate what you should have used versus what actually disappeared. This is how it finds the gaps.",
    tip: "Not sure how to pull a sales report from your POS? Most systems have it under Reports → Sales Summary → by date range. If you're stuck, ask your POS support team to show you once.",
  },
  {
    number: "09",
    title: "Answer the AI's Questions",
    emoji: "💬",
    body: "Before it calculates anything, the AI will pause and ask you a few things. It might ask about bottle sizes it wasn't sure about. It might ask if you had any comps, staff drinks, spillage, or free rounds this week — those get subtracted from the math before anything gets flagged. It might flag a brand name it wasn't sure it read correctly. Answer each question. This is the step that makes the report accurate. The more honest you are here, the cleaner your numbers will be.",
    tip: "Be honest about comps and staff drinks. The system isn't here to get anyone in trouble — it's here to give you accurate numbers. Unexplained variance that's actually just Tuesday's staff shift drink shouldn't show up as a red flag.",
  },
  {
    number: "10",
    title: "Get Your Weekly Report",
    emoji: "📋",
    body: "Once you've confirmed everything, the AI produces your full weekly beverage inventory report. You'll see every product with its opening count, what was delivered, what's left, and what was actually used. It compares that to your sales and flags anything that doesn't add up — by severity, with a recommended action for each one. High-severity flags mean something significant is off. Low-severity means minor discrepancies worth keeping an eye on. The whole report is clean, readable, and ready to hand to your owner or manager.",
    tip: "Copy the report and save it somewhere — a Google Doc, an email to yourself, a folder on your phone. You'll want to reference last week's closing numbers as next week's opening numbers.",
  },
];

const whatYouNeed = [
  { item: "Claude, ChatGPT, or Grok — free or paid", detail: "Free accounts work. If your free account doesn't have Projects, you can paste the prompt at the start of any conversation and it still works." },
  { item: "A smartphone with a notes app", detail: "Apple Notes, Google Keep, Notion — anything with voice-to-text built in." },
  { item: "Your weekly delivery invoices", detail: "Paper photos or PDF emails from your distributor both work." },
  { item: "A weekly sales report from your POS", detail: "Toast, Square, Aloha, Lightspeed — any export format is fine." },
  { item: "30–60 minutes for your first setup", detail: "One time only. After that, weekly count takes 10–20 minutes." },
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
            <span className="copper-text">Your AI subscription</span>
            <br />
            <span className="text-cream">is now your inventory software.</span>
          </h1>

          <p className="text-text-muted text-xl leading-relaxed max-w-2xl mx-auto mb-6">
            Open Source Barware gives you a single prompt file that turns Claude, ChatGPT, or Grok
            into a full bar inventory system. You walk your bar by voice. Upload your invoices.
            The AI does all the math and hands you a clean report.
          </p>

          <p className="text-text-muted text-lg leading-relaxed max-w-2xl mx-auto mb-12">
            No app to download. No software to buy. No subscription. No data sent to us.
            Just your AI doing the work — with instructions we wrote for it.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/downloads/master-prompt.md"
              download="open-source-barware-inventory-prompt.md"
              className="bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-base tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.35)]"
            >
              Download the Prompt — Free
            </a>
            <a
              href="#how-it-works"
              className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-10 py-4 text-base tracking-wide transition-all"
            >
              See How It Works ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU NEED ── */}
      <section className="border-b border-gear-border bg-bg-panel">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Before You Start</p>
            <h2 className="font-serif text-4xl text-cream mb-4">What you need</h2>
            <p className="text-text-muted">No special hardware. No IT person. Just these five things.</p>
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
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Step by Step</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">How it works</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              Follow these steps in order. Each one is explained so you can't get lost.
              If you've never used AI before, that's fine — this is written for you.
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
              href="/downloads/master-prompt.md"
              download="open-source-barware-inventory-prompt.md"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-12 py-4 text-base tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download the Free Prompt — Start Today
            </a>
            <p className="text-text-light text-sm mt-4">Free forever. No account required to download.</p>
          </div>
        </div>
      </section>

      {/* ── VOICE COUNT EXAMPLE ── */}
      <section className="border-b border-gear-border">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Real Example</p>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">What messy sounds like. What clean looks like.</h2>
            <p className="text-text-muted max-w-xl mx-auto">
              This is what actually happens when you speak into your phone and upload it. The AI handles the mess so you don't have to.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="glow-dot" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-patina-light">What You Say Into Your Phone</span>
              </div>
              <div className="font-mono text-sm text-text-muted leading-loose bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light mb-1">Well one —</p>
                <p>Patron silver half bottle</p>
                <p>Casa Migos blanco point four</p>
                <p>Espolon half</p>
                <p>Don Ho full bottle</p>
                <p>Cointreau half bottle</p>
                <p className="text-text-light mt-3 mb-1">Liquor room —</p>
                <p>Patron silver two cases three bottles</p>
                <p>Titos one case</p>
                <p>Jack Daniels six bottles</p>
                <p>Heradura reposado one case two bottles</p>
              </div>
              <p className="text-xs text-text-light mt-4 italic">
                "Don Ho" is what voice-to-text heard. That's fine. The AI knows.
              </p>
            </div>

            <div className="panel p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-brass/60 shadow-[0_0_8px_var(--brass)]" />
                <span className="text-[11px] tracking-[0.3em] uppercase text-brass-light">What the AI Gives You Back</span>
              </div>
              <div className="text-sm text-text-muted leading-relaxed bg-bg/60 p-4 rounded border border-gear-border">
                <p className="text-text-light text-xs uppercase tracking-wider mb-3">Well 1 — Confirmed ✓</p>
                <div className="space-y-1 mb-4">
                  <p>Patrón Silver — <span className="text-copper font-mono">0.5</span></p>
                  <p>Casamigos Blanco — <span className="text-copper font-mono">0.4</span></p>
                  <p>Espolòn Blanco — <span className="text-copper font-mono">0.5</span></p>
                  <p>Don Julio Blanco — <span className="text-copper font-mono">1.0</span> <span className="text-text-light text-xs">(matched "Don Ho")</span></p>
                  <p>Cointreau — <span className="text-copper font-mono">0.5</span></p>
                </div>
                <p className="text-text-light text-xs uppercase tracking-wider mb-3 border-t border-gear-border pt-3">Liquor Room — Confirmed ✓</p>
                <div className="space-y-1 mb-4">
                  <p>Patrón Silver — <span className="text-copper font-mono">27 btl</span> <span className="text-text-light text-xs">(2 cases + 3)</span></p>
                  <p>Tito's — <span className="text-copper font-mono">12 btl</span></p>
                  <p>Jack Daniel's — <span className="text-copper font-mono">6 btl</span></p>
                  <p>Herradura Reposado — <span className="text-copper font-mono">14 btl</span> <span className="text-text-light text-xs">(1 case + 2)</span></p>
                </div>
                <div className="border-t border-gear-border pt-3 bg-rust/10 -mx-4 px-4 py-3 rounded-b text-xs text-rust">
                  ⚑ One question before I calculate: Cointreau — do you carry 750ml or 1 liter?
                </div>
              </div>
              <p className="text-xs text-text-light mt-4 italic">
                One question, then it runs the full report. That's it.
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
            <h2 className="font-serif text-3xl text-cream mb-5">We see nothing.</h2>
            <p className="text-text-muted leading-relaxed mb-4">
              Everything you upload — invoices, POS reports, inventory counts — goes directly into your own AI account. We built the instructions. We don't have a server. We can't see your data. It never touches us.
            </p>
            <p className="text-text-muted leading-relaxed">
              Your privacy depends on the AI provider you use. Read their privacy policy if your business has strict data rules.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-light mb-4">Be Aware</p>
            <h2 className="font-serif text-3xl text-cream mb-5">Good to know.</h2>
            <ul className="flex flex-col gap-4">
              {[
                "AI can struggle to read handwritten or crumpled invoices — photograph them flat in good light",
                "Voice transcription sometimes mishears brand names — the AI flags these and asks before calculating",
                "Your first setup takes 30–60 minutes — budget time for it",
                "Always save a local copy of your inventory map — AI projects can occasionally reset",
                "This report is for operations only — it's not a legal or tax document",
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
            Download the prompt.<br />
            <span className="copper-text">Your AI does the rest.</span>
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-10 text-lg">
            One file. Paste it once. Walk your bar every week. Get a report that tells you exactly what's happening to your inventory.
          </p>
          <a
            href="/downloads/master-prompt.md"
            download="open-source-barware-inventory-prompt.md"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-14 py-5 text-base tracking-wide transition-all hover:shadow-[0_0_40px_rgba(205,127,50,0.3)]"
          >
            Get the Free Inventory System
          </a>
          <p className="text-text-light text-sm mt-5">Free forever · Works with Claude, ChatGPT, and Grok — free or paid · No account needed to download</p>
        </div>
      </section>

    </main>
  );
}
