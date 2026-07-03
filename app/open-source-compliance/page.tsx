import Link from "next/link";
import { Gear, GearDivider } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Open Source Compliance — Open Source Barware",
  description:
    "GPL license, source code, and download package notices for Open Source Barware.",
  path: "/open-source-compliance",
});

const complianceItems = [
  "Download packages include the GPL license text, package README, source offer, and notice files.",
  "The corresponding source archive is available from the same download area at no charge.",
  "Modified redistributions should keep license notices intact and mark meaningful changes with a relevant date.",
  "Running the hosted website by itself does not require users to distribute their private changes; conveying downloadable copies does.",
];

export default function OpenSourceCompliancePage() {
  return (
    <>
      <section className="relative overflow-hidden grain border-b border-gear-border bg-bg-panel">
        <div className="absolute right-[-40px] top-[-30px] text-copper">
          <Gear size={160} className="gear-spin-slow opacity-10" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:py-20">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-text-light">
            GPL Compliance
          </p>
          <h1 className="mb-6 max-w-3xl font-serif text-4xl leading-tight text-cream md:text-5xl">
            Open source means the source stays with the download.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-muted">
            Open Source Barware is free software distributed under the GNU
            General Public License version 3 or later. The license, notices,
            and corresponding source are provided here for anyone downloading,
            sharing, or modifying the program.
          </p>
        </div>
      </section>

      <GearDivider />

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <a
            href="/downloads/open-source-barware-download-package.zip"
            className="panel rounded-sm p-6 transition-colors hover:border-copper/50"
            download
          >
            <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-copper">
              Download Package
            </p>
            <h2 className="mb-3 font-serif text-2xl text-cream">
              Program files with license
            </h2>
            <p className="text-sm leading-relaxed text-text-muted">
              Spreadsheet templates, AI prompt, GPL license, package README,
              source offer, and copyright notice in one zip.
            </p>
          </a>

          <a
            href="/downloads/open-source-barware-source.zip"
            className="panel rounded-sm p-6 transition-colors hover:border-copper/50"
            download
          >
            <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-copper">
              Corresponding Source
            </p>
            <h2 className="mb-3 font-serif text-2xl text-cream">
              Editable project source
            </h2>
            <p className="text-sm leading-relaxed text-text-muted">
              Site source, program scaffold, templates, prompts, package
              notices, and build scripts needed to inspect or modify the work.
            </p>
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href="/downloads/LICENSE.txt"
            className="border border-gear-border px-5 py-4 text-sm text-text-muted transition-colors hover:border-copper/50 hover:text-copper"
          >
            GPL License Text
          </a>
          <a
            href="/downloads/SOURCE-OFFER.md"
            className="border border-gear-border px-5 py-4 text-sm text-text-muted transition-colors hover:border-copper/50 hover:text-copper"
          >
            Source Offer
          </a>
          <a
            href="https://github.com/RichardBJamiosn/open-source-barware"
            className="border border-gear-border px-5 py-4 text-sm text-text-muted transition-colors hover:border-copper/50 hover:text-copper"
          >
            GitHub Repository
          </a>
        </div>
      </section>

      <section className="border-y border-gear-border bg-bg-panel">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-text-light">
            What We Keep With It
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {complianceItems.map((item) => (
              <div key={item} className="border border-gear-border bg-bg/45 p-5">
                <p className="text-sm leading-relaxed text-text-muted">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-text-muted">
            This page is a practical compliance notice for the project, not
            individualized legal advice. The full license text controls the
            rights and obligations for redistribution.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="panel rounded-sm p-6 md:p-8">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-copper">
            Distribution Notes
          </p>
          <h2 className="mb-4 font-serif text-2xl text-cream">
            If you share a modified copy
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-text-muted">
            Keep the GPL license with the files, keep copyright and warranty
            notices visible, provide the editable source for the version you
            distribute, and note meaningful modifications with a relevant date.
            The public download package and source archive are generated from
            this repository with <code>npm run package:compliance</code>.
          </p>
          <div className="mt-7">
            <Link
              href="/downloads"
              className="inline-block bg-copper px-8 py-3 text-sm font-semibold tracking-wide text-bg transition-all hover:bg-copper-bright"
            >
              Return to Program Guide
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
