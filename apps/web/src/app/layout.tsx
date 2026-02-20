import type { Metadata, Viewport } from "next";
import { DM_Sans, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans-loaded",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage-loaded",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono-loaded",
  display: "swap",
  weight: ["400", "500", "600"],
});

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro").trim();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
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
    <html lang="ro" className={`dark ${dmSans.variable} ${bricolage.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-600 focus:text-white focus:text-sm focus:font-medium"
        >
          Sari la conținut
        </a>
        <ToastProvider>
          <div id="main-content">
            {children}
          </div>
        </ToastProvider>
        {/* Setează NEXT_PUBLIC_VERCEL_ANALYTICS=1 în Vercel după ce activezi Web Analytics în Dashboard */}
        {String(process.env.NEXT_PUBLIC_VERCEL_ANALYTICS || "").trim() === "1" && (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        )}
      </body>
    </html>
  );
}
