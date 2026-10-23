import { GearDivider } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use — Open Source Barware",
  description:
    "Terms for using opensourcebarware.com and the free Open Source Barware program, licensed under the GNU GPL version 3 or later.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <section className="relative overflow-hidden grain border-b border-gear-border bg-bg-panel">
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:py-20">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-text-light">
            Terms
          </p>
          <h1 className="mb-6 max-w-3xl font-serif text-4xl leading-tight text-cream md:text-5xl">
            Terms of Use
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-muted">
            Last updated October 23, 2026. These terms cover use of opensourcebarware.com. The Open Source Barware program itself is licensed under the GNU General Public License.
          </p>
        </div>
      </section>

      <GearDivider />

      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">The software license</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">Open Source Barware is free software distributed under the GNU General Public License version 3 or later. Your rights to use, copy, modify, and share the program come from that license, which is included with every download. See the Open Source Compliance page for the license text and source.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">No warranty</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">The program and website are provided as is, without warranty of any kind, as stated in the GPL. Inventory counts, variance, and pour-cost figures depend on the data you enter. Check results before relying on them for purchasing, payroll, or financial decisions.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Limitation of liability</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">To the extent the law allows, Open Source Barware and its contributors are not liable for any loss arising from use of the website or the program.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Using the website</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">Please do not attempt to disrupt the site, overload its services, or access areas that are not public. The online demo is for evaluation and may change or reset at any time.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Names and marks</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">The GPL covers the software. It does not grant rights to present a modified version as the official Open Source Barware release. Please mark modified versions clearly.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Contact</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">Questions about these terms: RJamison@reservationrelief.com.</p>
        </div>
      </section>
    </>
  );
}
