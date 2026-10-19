import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { POLICY_UPDATED, SUPPORT_EMAIL } from "@/lib/site-info";

export const metadata: Metadata = { title: "Copyright & Content Removal", description: "How to report copyright concerns about images, templates, rankings, or other content published on Tier List Maker.", alternates: { canonical: "/copyright" } };

export default function CopyrightPage() {
  return <InfoPage title="Copyright & content removal" intro={`Updated ${POLICY_UPDATED}. Artwork remains subject to its owners’ rights.`}>
    <section><h2>Report a copyright concern</h2><p>If you own relevant rights or represent the rights holder, email <a href={`mailto:${SUPPORT_EMAIL}?subject=Tier%20List%20Maker%20copyright%20report`}>{SUPPORT_EMAIL}</a>.</p><p>Identify the protected work, provide the exact URLs of the material you are reporting, describe your ownership or authority to act, and include a way to contact you. Include supporting information that helps the operator locate and assess the material.</p></section>
    <section><h2>Review and removal</h2><p>The operator reviews reports and may hide content while investigating or request further information. A report does not automatically establish ownership or infringement. The tool does not grant a blanket permission to reuse third-party artwork.</p><p>For content you published yourself, include the public page URL and explain your request. Anonymous-session ownership may require verification.</p></section>
  </InfoPage>;
}
