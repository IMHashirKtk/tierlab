import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Head-to-Head Versus Duel & Tier Compare",
  description:
    "Compare your tier list head-to-head against friends and community consensus. Calculate algorithmic similarity scores and debate hot takes.",
  openGraph: {
    title: "Head-to-Head Versus Duel | TierLab",
    description:
      "Compare your tier list head-to-head against friends and community consensus. Calculate algorithmic similarity scores and debate hot takes.",
  },
};

export default function VersusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
