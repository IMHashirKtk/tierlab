import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username || "Creator");

  const title = `@${decoded}'s Tier Lists & Creator Profile`;
  const description = `Explore tier lists, rankings, and custom templates published by @${decoded} on Tier List Maker.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Tier List Maker`,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`@${decoded}'s Creator Profile`)}&author=${encodeURIComponent(
            decoded
          )}&category=Creator&mode=profile`,
          width: 1200,
          height: 630,
          alt: `@${decoded}'s Tier List Maker Profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Tier List Maker`,
      description,
    },
  };
}

export default async function UserProfileLayout({ children }: Props) {
  return <>{children}</>;
}
