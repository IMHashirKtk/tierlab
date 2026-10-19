import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { POLICY_UPDATED, SITE_OPERATOR, SUPPORT_EMAIL } from "@/lib/site-info";

export const metadata: Metadata = { title: "Terms of Use", description: "Tier List Maker terms covering permitted use, user content, public publishing, exports, and moderation.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <InfoPage title="Terms of use" intro={`Operated by ${SITE_OPERATOR}. Updated ${POLICY_UPDATED}.`}>
    <section><h2>Using the tool</h2><p>The tool is provided free of charge for creating and sharing tier lists. Features, availability, and storage may change. Keep backups of work you want to retain; local browser storage and anonymous sessions are not guaranteed permanent storage or account recovery.</p></section>
    <section><h2>Your content and other people’s rights</h2><p>You retain rights you hold in your original contributions. Upload or publish only content you are permitted to use. Permission to use this tool or download an export does not grant rights in third-party images, logos, characters, music, or other material.</p><p>By choosing public publishing, you permit the service to store, display, and share your submitted content through its public pages and ranking features. Other visitors may view, copy, or remix publicly available templates.</p></section>
    <section><h2>Public content standards</h2><p>Do not publish spam, malware, unlawful material, harassment, personal information without permission, or misleading impersonations. Do not use automated submissions to overload the service or manipulate votes.</p><p>The operator may hide content that is reported, violates these standards, or needs review. Report a problem through the <Link href="/contact">contact page</Link>.</p></section>
    <section><h2>Rankings and availability</h2><p>Rankings express opinions. Starter templates are curated examples; community consensus reflects available submissions rather than verified expert judgment. The service does not promise particular search rankings, audience reach, or uninterrupted availability.</p><p>Questions about these terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p></section>
  </InfoPage>;
}
