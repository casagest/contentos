import type { Metadata } from "next";
import HomePageClient from "./home-page-client";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: baseUrl,
    title: "ContentOS — AI Content Intelligence",
    description: "Creează conținut viral cu AI optimizat pentru piața românească",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ContentOS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContentOS — AI Content Intelligence",
    description: "Creează conținut viral cu AI optimizat pentru piața românească",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "ContentOS",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "ContentOS",
      description:
        "Platformă AI de creare și optimizare conținut social media pentru România",
      publisher: { "@id": `${baseUrl}/#organization` },
      inLanguage: "ro-RO",
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
