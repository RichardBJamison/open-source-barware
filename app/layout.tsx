import type { Metadata } from "next";
import { Caveat, Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JulyFourthLaunchOverlay from "@/components/JulyFourthLaunchOverlay";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";

const GA_MEASUREMENT_ID = "G-DQJKBWMM8H";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-pen",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://opensourcebarware.com";
const siteTitle = "Open Source Barware — Free Bar Inventory Program";
const siteDescription =
  "The free bar inventory program built by bartenders, tested in a real restaurant. No subscriptions. No upsells. Just a system that works.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "free bar inventory spreadsheet",
    "bar inventory template free",
    "pour cost calculator",
    "free bartender tools",
    "open source bar inventory",
    "bartender resources",
    "cocktail inventory management",
    "bar inventory system free",
    "liquor inventory spreadsheet",
    "beverage cost calculator",
    "bar inventory",
    "free inventory system",
    "bartender tools",
    "liquor inventory",
    "free liquor inventory",
    "wine inventory",
    "free wine inventory",
    "open source",
    "restaurant inventory",
    "beverage management",
  ],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Open Source Barware",
    type: "website",
    locale: "en_US",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: DEFAULT_OG_IMAGE.url, alt: DEFAULT_OG_IMAGE.alt }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Open Source Barware",
      url: siteUrl,
      description: siteDescription,
    },
    {
      "@type": "WebSite",
      name: "Open Source Barware",
      url: siteUrl,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${caveat.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <JulyFourthLaunchOverlay />
        </Suspense>
      </body>
    </html>
  );
}
