import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Saved Projects & Tier Lists",
  description:
    "Manage your local-first tier lists, drafts, and published rankings stored securely in your browser.",
  openGraph: {
    title: "My Saved Projects | Tier List Maker",
    description:
      "Manage your local-first tier lists, drafts, and published rankings stored securely in your browser.",
  },
};

export default function MyProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
