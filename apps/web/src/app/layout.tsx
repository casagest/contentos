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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="dark" suppressHydrationWarning>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
