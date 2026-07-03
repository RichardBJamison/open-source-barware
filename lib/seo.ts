import type { Metadata } from "next";

export const SITE_URL = "https://opensourcebarware.com";

export const DEFAULT_OG_IMAGE = {
  url: "/images/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Open Source Barware — free bar inventory program built by bartenders",
};

type PageSeoOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE.url,
}: PageSeoOptions): Metadata {
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
      images: [
        {
          url: ogImage,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: DEFAULT_OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}