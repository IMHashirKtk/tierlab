import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tier List Maker Studio",
  description:
    "Design and customize your tier lists with drag-and-drop tiers, streamer mode, color themes, and 4K lossless exports.",
  openGraph: {
    title: "Tier List Maker Studio | Tier List Maker",
    description:
      "Design and customize your tier lists with drag-and-drop tiers, streamer mode, color themes, and 4K lossless exports.",
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
