import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Head-to-Head Versus Duel & Tier Compare",
  description:
    "Compare your tier list head-to-head against friends and community consensus. Calculate algorithmic similarity scores and debate hot takes.",
  alternates: {
    canonical: "/versus",
  },
  openGraph: {
    title: "Head-to-Head Versus Duel | Tier List Maker",
    description:
      "Compare your tier list head-to-head against friends and community consensus. Calculate algorithmic similarity scores and debate hot takes.",
    images: [
      {
        url: "/api/og?title=Head-to-Head%20Versus%20Duel&author=Versus%20Arena&category=Duel&mode=versus",
        width: 1200,
        height: 630,
        alt: "Head-to-Head Versus Duel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Head-to-Head Versus Duel | Tier List Maker",
    description:
      "Compare your tier list head-to-head against friends and community consensus. Calculate algorithmic similarity scores and debate hot takes.",
    images: [
      "/api/og?title=Head-to-Head%20Versus%20Duel&author=Versus%20Arena&category=Duel&mode=versus",
    ],
  },
};

export default function VersusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
