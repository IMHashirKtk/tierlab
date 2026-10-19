import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Saved Projects & Tier Lists",
  alternates: { canonical: "/my-projects" },
  description:
    "Manage your local-first tier lists, drafts, and published rankings stored securely in your browser.",
  openGraph: {
    url: "/my-projects",
    title: "My Saved Projects | Tier List Maker",
    description:
      "Manage your local-first tier lists, drafts, and published rankings stored securely in your browser.",
    images: [
      {
        url: "/api/og?title=My%20Saved%20Projects&author=Local-First%20Vault&category=Projects&mode=template",
        width: 1200,
        height: 630,
        alt: "My Saved Projects",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Saved Projects | Tier List Maker",
    description:
      "Manage your local-first tier lists, drafts, and published rankings stored securely in your browser.",
    images: [
      "/api/og?title=My%20Saved%20Projects&author=Local-First%20Vault&category=Projects&mode=template",
    ],
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function MyProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
