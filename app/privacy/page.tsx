import { GearDivider } from "@/components/SteampunkElements";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy — Open Source Barware",
  description:
    "How opensourcebarware.com handles visitor data, release-list emails, and analytics. The program itself runs on your own machine.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <section className="relative overflow-hidden grain border-b border-gear-border bg-bg-panel">
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:py-20">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-text-light">
            Privacy
          </p>
          <h1 className="mb-6 max-w-3xl font-serif text-4xl leading-tight text-cream md:text-5xl">
            Privacy Policy
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-muted">
            Last updated October 23, 2026. Open Source Barware is built to keep your bar data on your own machine. This page explains the limited information the website itself handles.
          </p>
        </div>
      </section>

      <GearDivider />

      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">The program keeps your data local</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">The downloadable Open Source Barware program and spreadsheets run on your own computer. Your counts, products, costs, and variance data stay on your device unless you choose to share them. We do not receive that data.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Release-list sign-ups</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">If you join the release list, we store the email address you submit, and any details you include, so we can send release and update notices. Notices are sent through our email delivery provider.</p>
          <p className="mb-3 text-base leading-relaxed text-text-muted">To be removed from the list, email RJamison@reservationrelief.com and we will delete your address.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Analytics and visit counts</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">The website uses Google Analytics to understand which pages are useful. Google may set cookies and process your IP address under its own policies.</p>
          <p className="mb-3 text-base leading-relaxed text-text-muted">We also keep first-party, aggregate visit and download counts. These use general location (country, region, city) and browser information supplied by our hosting provider. We do not sell this information.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Hosting</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">The site is hosted on Cloudflare, which processes standard request information such as IP address and browser type to deliver and secure the site.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Your choices</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">You can block cookies or analytics scripts in your browser and still use the site and the download.</p>
          <p className="mb-3 text-base leading-relaxed text-text-muted">Questions or deletion requests: RJamison@reservationrelief.com.</p>
        </div>
        <div className="mb-10">
          <h2 className="mb-3 font-serif text-2xl text-cream">Changes</h2>
          <p className="mb-3 text-base leading-relaxed text-text-muted">If this policy changes, we will update this page and the date above.</p>
        </div>
      </section>
    </>
  );
}
