import type { Metadata } from "next";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "ContentOS — AI Content Intelligence pentru România",
    template: "%s | ContentOS",
  },
  description:
    "Platformă AI de creare și optimizare conținut social media pentru creatori și business-uri din România. Facebook, Instagram, TikTok, YouTube.",
  keywords: [
    "content marketing",
    "social media",
    "AI",
    "România",
    "Facebook",
    "Instagram",
    "TikTok",
    "YouTube",
    "marketing digital",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ContentOS — AI Content Intelligence",
    description: "Creează conținut viral cu AI optimizat pentru piața românească",
    url: baseUrl,
    siteName: "ContentOS",
    locale: "ro_RO",
    type: "website",
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
      "@id": `${process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro"}/#organization`,
      name: "ContentOS",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro"}/logo.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro"}/#website`,
      url: process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro",
      name: "ContentOS",
      description: "Platformă AI de creare și optimizare conținut social media pentru România",
      publisher: { "@id": `${process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro"}/#organization` },
      inLanguage: "ro-RO",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="dark" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
