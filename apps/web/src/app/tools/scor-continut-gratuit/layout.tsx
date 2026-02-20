import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scor Conținut Gratuit — Verifică Postarea | ContentOS",
  description:
    "Analizează gratuit calitatea postării tale pentru Instagram, Facebook, TikTok sau YouTube. Scor pe 4 metrici: hook, lizibilitate, CTA, engagement. Fără cont necesar.",
  openGraph: {
    title: "Scor Conținut Gratuit — ContentOS",
    description:
      "Verifică instant cât de bine va performa postarea ta pe social media. Analiză pe 4 metrici, sugestii de îmbunătățire. 100% gratuit.",
  },
};

export default function ScorContinutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
