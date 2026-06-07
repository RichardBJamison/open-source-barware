import Link from "next/link";
import { Gear, CocktailIcon } from "./SteampunkElements";

export default function Footer() {
  return (
    <footer className="relative border-t border-gear-border mt-auto overflow-hidden">
      {/* Decorative gears */}
      <div className="absolute -right-10 -bottom-10 text-copper">
        <Gear size={120} className="gear-spin-slow opacity-30" />
      </div>
      <div className="absolute -left-6 -top-6 text-copper">
        <Gear size={60} className="gear-spin-reverse opacity-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <CocktailIcon />
              <div className="leading-none">
                <div className="text-[9px] font-sans tracking-[0.35em] uppercase copper-text opacity-80 mb-0.5">open source</div>
                <div className="text-lg font-sans font-bold tracking-[0.1em] uppercase copper-text leading-none">Barware</div>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-sm">
              Crafted by bartenders. Tested at Agave &amp; Rye, downtown
              Cleveland. Given to the trade, no strings attached. Because good
              tools shouldn&rsquo;t cost you a shift&rsquo;s worth of tips.
            </p>
          </div>

          {/* Nav */}
          <div className="md:col-span-3 md:col-start-7">
            <span className="text-[10px] text-text-light tracking-[0.3em] uppercase block mb-4">
              Navigate
            </span>
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-sm text-text-muted hover:text-copper transition-colors">Home</Link>
              <Link href="/about" className="text-sm text-text-muted hover:text-copper transition-colors">About</Link>
              <Link href="/resources" className="text-sm text-text-muted hover:text-copper transition-colors">Resources</Link>
              <Link href="/downloads" className="text-sm text-text-muted hover:text-copper transition-colors">Downloads</Link>
              <Link href="/inventory" className="text-sm text-text-muted hover:text-copper transition-colors">App</Link>
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-3">
            <span className="text-[10px] text-text-light tracking-[0.3em] uppercase block mb-4">
              Workshop
            </span>
            <p className="text-sm text-text-muted leading-relaxed">
              A RBJP Holdings project.
              <br />
              Forged in Cleveland, Ohio.
              <br />
              Free forever.
            </p>
          </div>
        </div>

        <div className="border-t border-gear-border mt-12 pt-6 flex items-center justify-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-copper/30" />
          <p className="text-xs text-text-light">
            &copy; {new Date().getFullYear()} Open Source Barware &mdash; All
            tools are free and open source
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-copper/30" />
        </div>
      </div>
    </footer>
  );
}
