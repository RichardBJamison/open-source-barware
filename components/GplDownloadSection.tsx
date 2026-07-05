import Link from "next/link";
import DownloadClock from "@/components/DownloadClock";

const downloadPackageHref = "/downloads/open-source-barware-download-package.zip";
const sourceArchiveHref = "/downloads/open-source-barware-source.zip";

export default function GplDownloadSection() {
  return (
    <section className="gpl-download-section" aria-labelledby="gpl-download-heading">
      <div className="gpl-download-heading">
        <p className="gpl-download-eyebrow">GPL Download</p>
        <h2 id="gpl-download-heading" className="gpl-download-title">
          Program files, license, and source stay together.
        </h2>
      </div>

      <div className="gpl-download-panel panel rounded-sm">
        <div className="gpl-download-layout">
          <div className="gpl-download-clock-col">
            <DownloadClock />
          </div>

          <div className="gpl-download-actions-col">
            <p className="gpl-download-copy">
              The public package includes the editable spreadsheet templates,
              AI prompt, GPL license text, source offer, and notices. The
              corresponding source archive sits beside it for anyone who wants to
              inspect, modify, or redistribute the project.
            </p>

            <div className="gpl-download-grid">
              <a
                href={downloadPackageHref}
                download
                className="gpl-download-card"
              >
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
        </div>
      </div>
    </section>
  );
}