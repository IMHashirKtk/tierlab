import type { Metadata } from "next";
import { PageEditorial } from "@/components/PageEditorial";
import { pageQuality } from "@/lib/page-quality";
import { canIndexSite } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tier List Maker Studio",
  robots: { index: canIndexSite() && pageQuality("/create").eligible, follow: true },
  description:
    "Design and customize your tier lists with drag-and-drop tiers, streamer mode, color themes, and 4K lossless exports.",
  alternates: {
    canonical: "/create",
  },
  openGraph: {
    url: "/create",
    title: "Tier List Maker Studio | Tier List Maker",
    description:
      "Design and customize your tier lists with drag-and-drop tiers, streamer mode, color themes, and 4K lossless exports.",
    images: [
      {
        url: "/api/og?title=Tier%20List%20Maker%20Studio&author=Creator%20Studio&category=Studio&mode=template",
        width: 1200,
        height: 630,
        alt: "Tier List Maker Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tier List Maker Studio | Tier List Maker",
    description:
      "Design and customize your tier lists with drag-and-drop tiers, streamer mode, color themes, and 4K lossless exports.",
    images: [
      "/api/og?title=Tier%20List%20Maker%20Studio&author=Creator%20Studio&category=Studio&mode=template",
    ],
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}<div className="px-4"><PageEditorial path="/create" /></div></>;
}
