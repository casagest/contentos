import type { Metadata } from "next";
import HomePageClient from "./home-page-client";
import { PLANS } from "@contentos/shared";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro").trim();

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: baseUrl,
    title: "ContentOS — AI Content Intelligence",
    description: `Creează conținut viral cu AI optimizat pentru piața românească. Starter ${PLANS.starter.priceRon} RON/lună, Pro ${PLANS.pro.priceRon} RON/lună.`,
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
    description: `Creează conținut viral cu AI optimizat pentru piața românească. Starter ${PLANS.starter.priceRon} RON/lună, Pro ${PLANS.pro.priceRon} RON/lună.`,
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
    {
      "@type": "SoftwareApplication",
      name: "ContentOS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          name: PLANS.starter.name,
          price: String(PLANS.starter.priceRon),
          priceCurrency: "RON",
          description: "Pentru creatori la început de drum — 2 conturi sociale, 30 postări/lună, AI Coach basic",
          url: `${baseUrl}/register`,
        },
        {
          "@type": "Offer",
          name: PLANS.pro.name,
          price: String(PLANS.pro.priceRon),
          priceCurrency: "RON",
          description: "Tot ce ai nevoie pentru conținut viral — 5 conturi sociale, postări nelimitate, Algorithm Scorer complet",
          url: `${baseUrl}/register`,
        },
        {
          "@type": "Offer",
          name: PLANS.agency.name,
          price: String(PLANS.agency.priceRon),
          priceCurrency: "RON",
          description: "Pentru echipe și agenții de marketing — conturi nelimitate, API access, suport prioritar",
          url: `${baseUrl}/register`,
        },
      ],
    },
  ],
};

/* SSR pricing fallback — visible to crawlers and noscript browsers */
function SsrPricingFallback() {
  return (
    <noscript>
      <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", color: "#fff" }}>
        <h2>Prețuri ContentOS</h2>
        <div>
          <h3>{PLANS.starter.name} — {PLANS.starter.priceRon} RON / lună</h3>
          <p>2 conturi sociale, 30 postări/lună, Algorithm Scorer (5 metrici), AI Coach basic, Brain Dump nelimitat</p>
        </div>
        <div>
          <h3>{PLANS.pro.name} — {PLANS.pro.priceRon} RON / lună (Cel mai popular)</h3>
          <p>5 conturi sociale, postări nelimitate, Algorithm Scorer complet (9 metrici), AI Coach personalizat, Account Research, Script Video Generator</p>
        </div>
        <div>
          <h3>{PLANS.agency.name} — {PLANS.agency.priceRon} RON / lună</h3>
          <p>Tot din Pro + conturi nelimitate, API access, membri nelimitați, suport prioritar</p>
        </div>
        <p><a href="/register">Începe cu 7 zile gratuit — fără card de credit</a></p>
      </div>
    </noscript>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsrPricingFallback />
      <HomePageClient />
    </>
  );
}
