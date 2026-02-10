import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentOS — AI Content Intelligence pentru România",
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
    url: "https://contentos.ro",
    siteName: "ContentOS",
    locale: "ro_RO",
    type: "website",
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
