import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Gear, GearDivider } from "@/components/SteampunkElements";

export const metadata: Metadata = {
  title: "About — Open Source Barware",
  description:
    "The story behind Open Source Barware, built from real monthly inventory pressure inside a working restaurant.",
};

export default function AboutPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute right-[-60px] top-[-20px] text-copper">
          <Gear size={200} className="gear-spin opacity-15" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              About
            </span>
          </div>
          <h1 className="font-serif max-w-3xl">
            <span className="block text-4xl md:text-5xl lg:text-6xl copper-text leading-tight mb-3">
              A real bar problem,
            </span>
            <span className="block text-2xl md:text-3xl lg:text-4xl text-cream leading-snug mb-3">
              built with the people living it.
            </span>
            <span className="block text-xl md:text-2xl text-patina-light font-serif italic leading-snug">
              Now it&rsquo;s free to the world.
            </span>
          </h1>
        </div>
      </section>

      <GearDivider />

      {/* ── THE STORY ── */}
      <section className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-[1px] bg-copper/40" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
                How It Started
              </span>
            </div>
            <div className="relative mt-6 rounded-sm overflow-hidden panel">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/images/copper-glass.png"
                  alt="Copper bar tools and glassware on a slate surface"
                  fill
                  loading="eager"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-bg/20" />
              </div>
            </div>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <div className="space-y-5 text-text-muted leading-relaxed text-lg">
              <p>
                If you&rsquo;ve been in charge of a bar, you know the last
                day of the month does not just show up. It looms. Either you
                push inventory to the last possible minute and drag yourself
                in early for a couple-hour count, no matter what day of the
                week it lands on, or the system is so oversized and half-broken
                that a simple count turns into a two-day project before anyone
                trusts the numbers.
              </p>
              <p>
                Worse, sometimes the person asking for perfect numbers has
                never had to walk the room themselves. They want every answer,
                but there is no workable process underneath the demand, so the
                count never really gets done right. Open Source Barware is
                meant to cure those ills: make setup clear, make the count
                repeatable, connect invoices and POS to the same window, and
                give the team a home base that turns inventory from dread into
                a rhythm.
              </p>
            </div>

            <div className="mt-10 panel rounded-sm p-8">
              <p className="font-serif text-xl text-cream leading-relaxed">
                Then AI showed up. And suddenly, building genuinely good
                inventory program costs{" "}
                <span className="copper-text font-bold">nothing</span>. So we
                built it. And we&rsquo;re giving it away.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PEOPLE ── dark section */}
      <section className="relative bg-bg-panel border-y border-gear-border overflow-hidden grain">
        <div className="absolute -right-10 bottom-[-40px] text-copper">
          <Gear size={160} className="gear-spin-slow opacity-15" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="glow-dot" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light">
                  A Small Credit
                </span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight">
                <span className="copper-text">Built with the room.</span>
              </h2>
            </div>
            <p className="text-text-muted leading-relaxed max-w-xl">
              A quiet thank-you to the people who put real counts, real
              pressure, and real restaurant feedback into the system.
            </p>
          </div>

          <div className="panel rounded-sm p-6 md:p-7">
            <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-gear-border/80">
              <article className="py-5 first:pt-0 md:py-0 md:pr-7">
                <h3 className="font-serif text-2xl copper-text mb-2">
                  Richard Jamison
                </h3>
                <p className="text-[10px] tracking-[0.2em] uppercase text-patina-light mb-4">
                  Creator &amp; Developer
                </p>
                <p className="text-text-muted leading-relaxed">
                  Bar industry veteran turned entrepreneur and developer. He
                  brings the bartender&rsquo;s eye and the engineer&rsquo;s
                  precision to making inventory less painful.
                </p>
              </article>

              <article className="py-5 md:py-0 md:px-7">
                <h3 className="font-serif text-2xl copper-text mb-2">
                  Bill McLaughlin
                </h3>
                <p className="text-[10px] tracking-[0.2em] uppercase text-patina-light mb-4">
                  General Manager, Agave &amp; Rye - Cleveland
                </p>
                <p className="text-text-muted leading-relaxed">
                  Bill opened his restaurant, his bar, his team, and three
                  weeks of real inventory sessions. That is how the program got
                  tested against the real room.
                </p>
              </article>

              <article className="py-5 last:pb-0 md:py-0 md:pl-7">
                <h3 className="font-serif text-2xl copper-text mb-2">
                  Hirado Junior <span className="text-cream">&ldquo;Nito&rdquo;</span>
                </h3>
                <p className="text-[10px] tracking-[0.2em] uppercase text-patina-light mb-4">
                  Bartender &amp; Bar Manager, Agave &amp; Rye - Cleveland
                </p>
                <p className="text-text-muted leading-relaxed">
                  Everybody calls him Nito. He is doing the first live test run
                  solo, with no hand-holding; if it works for him in the room,
                  it is ready to earn its keep.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ── FIELD TESTED ── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto flex items-start gap-6">
          <div className="h-12 w-[2px] bg-copper/40 shrink-0 mt-1" />
          <p className="text-text-muted leading-relaxed">
            The program was field-tested at <span className="text-cream font-medium">Agave &amp; Rye</span>{" "}in
            downtown Cleveland &mdash; three weeks of real counts, real data, and real
            feedback from bartenders who just want to go home on time. If you&rsquo;re
            ever in the neighborhood, go support them. Good people running a great spot.
          </p>
        </div>
      </section>

      {/* ── COMMUNITY ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-[1px] bg-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              Beyond the Program
            </span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl leading-tight mb-6">
            <span className="copper-text">Built for the community.</span>
          </h2>
          <div className="space-y-5 text-text-muted leading-relaxed">
            <p>
              Open Source Barware isn&rsquo;t just free spreadsheets. We connect bartenders
              with the organizations that support the craft &mdash; from the United States
              Bartenders&rsquo; Guild to education programs and mental health resources
              built specifically for hospitality workers.
            </p>
            <p>
              The bar industry takes care of everyone else. We think it&rsquo;s time
              someone built a program that takes care of the bar industry.
            </p>
          </div>
          <div className="mt-8">
            <Link
              href="/resources"
              className="inline-block border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-8 py-3 text-sm tracking-wide transition-all"
            >
              Explore Community Resources
            </Link>
          </div>
        </div>
      </section>

      <GearDivider />

      {/* ── MISSION ── */}
      <section className="relative overflow-hidden">
        <div className="absolute left-[-40px] bottom-[-40px] text-copper">
          <Gear size={140} className="gear-spin-slow opacity-10" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-copper/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-text-light">
              The Mission
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-copper/40" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-8">
            <span className="copper-text">Free means free.</span>
          </h2>
          <div className="space-y-5 text-text-muted text-lg leading-relaxed max-w-xl mx-auto">
            <p>
              Every bar &mdash; from the dive on the corner to the craft
              cocktail lounge downtown &mdash; deserves a proper inventory system.
              Not everyone can afford $200/month software. We don&rsquo;t think
              they should have to.
            </p>
            <p>
              We build in the open. We test in real restaurants. We give the
              results to the industry. No premium tier. No paywall. No strings.
            </p>
          </div>
          <div className="mt-12">
            <Link
              href="/downloads"
              className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-4 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download the Program
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
