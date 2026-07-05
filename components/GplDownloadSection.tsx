import Link from "next/link";
import DownloadDayCounter from "@/components/DownloadDayCounter";
import { GearDivider } from "@/components/SteampunkElements";

const downloadPackageHref = "/downloads/open-source-barware-download-package.zip";
const sourceArchiveHref = "/downloads/open-source-barware-source.zip";

export default function GplDownloadSection() {
  return (
    <section className="gpl-download-section" aria-labelledby="gpl-download-heading">
      <div className="download-program-intro">
        <p className="download-program-kicker">the program.</p>
        <p className="download-program-lede">
          One Chrome-side inventory system for your bar. Early production &mdash;
          honest about bugs, fast on fixes, built with the community.
        </p>
      </div>

      <div className="download-counter-stage">
        <GearDivider />
        <DownloadDayCounter />
      </div>

      <div className="gpl-download-panel panel rounded-sm">
        <div className="gpl-download-version-row">
          <span className="gpl-download-version-tag">Version 1.0</span>
          <span className="gpl-download-version-date">July 4 &middot; 7:30 PM Eastern</span>
        </div>

        <div className="gpl-download-heading">
          <p className="gpl-download-eyebrow">GPL Download</p>
          <h2 id="gpl-download-heading" className="gpl-download-title">
            Blistering work. Real bar software. Early production.
          </h2>
        </div>

        <p className="gpl-download-copy">
          The public package includes the editable spreadsheet templates, AI
          prompt, GPL license text, source offer, and notices. The corresponding
          source archive sits beside it for anyone who wants to inspect, modify,
          or redistribute the project.
        </p>

        <div className="gpl-download-grid">
          <a href={downloadPackageHref} download className="gpl-download-card">
            <span className="gpl-download-card-label">Package</span>
            <span className="gpl-download-card-text">
              Download program files with GPL notices
            </span>
          </a>
          <a href={sourceArchiveHref} download className="gpl-download-card">
            <span className="gpl-download-card-label">Source</span>
            <span className="gpl-download-card-text">
              Download corresponding source archive
            </span>
          </a>
          <a href="/downloads/LICENSE.txt" className="gpl-download-card">
            <span className="gpl-download-card-label">License</span>
            <span className="gpl-download-card-text">
              Read the GNU GPLv3 license text
            </span>
          </a>
          <Link href="/open-source-compliance" className="gpl-download-card">
            <span className="gpl-download-card-label">Notice</span>
            <span className="gpl-download-card-text">
              View compliance and redistribution notes
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}