import { getPublicProfile } from "@/lib/server/public-content";
import { getSiteUrl, safeJsonLd } from "@/lib/seo";
import { UserProfileClient } from "./UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/user/${encodeURIComponent(username)}`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: { "@type": "Person", name: username },
  };
  return <>
    {(profile.templates.length > 0 || profile.tierLists.length > 0) && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />}
    <UserProfileClient key={username} username={username} initialProfile={profile} />
  </>;
}
