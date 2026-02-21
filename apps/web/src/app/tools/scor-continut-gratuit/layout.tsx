import type { Metadata } from "next";
import type { ReactNode } from "react";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro").trim();
const canonicalPath = "/tools/scor-continut-gratuit";

export const metadata: Metadata = {
  title: "Scor Continut Gratuit | ContentOS",
  description:
    "Testeaza gratuit performanta unei postari pentru Instagram, Facebook, TikTok si YouTube. Fara cont, fara email.",
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    url: `${baseUrl}${canonicalPath}`,
    title: "Scor Continut Gratuit | ContentOS",
    description:
      "Testeaza gratuit performanta unei postari pentru Instagram, Facebook, TikTok si YouTube. Fara cont, fara email.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ContentOS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scor Continut Gratuit | ContentOS",
    description:
      "Testeaza gratuit performanta unei postari pentru Instagram, Facebook, TikTok si YouTube. Fara cont, fara email.",
  },
};

export default function FreeScoreLayout({ children }: { children: ReactNode }) {
  return children;
}
