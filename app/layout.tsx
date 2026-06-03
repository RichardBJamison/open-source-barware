import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ComingSoonToast from "@/components/ComingSoonToast";

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

const siteUrl = "https://opensourcebarware.com";
const siteTitle = "Open Source Barware — Free Bar Inventory Tools";
const siteDescription =
  "The free bar inventory system built by bartenders, tested in a real restaurant. No subscriptions. No upsells. Just tools that work.";

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
    "open source",
    "restaurant inventory",
    "beverage management",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Open Source Barware",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
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
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
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
        <ComingSoonToast />
      </body>
    </html>
  );
}
