import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { SITE_OPERATOR, SUPPORT_EMAIL } from "@/lib/site-info";

export const metadata = pageMetadata("Contact & Report Content", "Contact HashirK for Tier List Maker support, feedback, privacy requests, or reports about published content.", "/contact");

export default function ContactPage() {
  return <InfoPage title="Contact & report content" intro={`Support and content reports are handled by ${SITE_OPERATOR}.`}>
    <section><h2>Email the operator</h2><p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p><p>For a technical problem, include the page URL, what you expected, what happened, and your browser or device. A screenshot can help explain a visual issue.</p></section>
    <section><h2>Report a public template, ranking, or comment</h2><p>Send the exact page URL, identify the item or comment, and explain the concern. Reports may concern spam, harassment, unlawful content, impersonation, or inappropriate uploads. The operator can hide reported content while reviewing it.</p><p><a href={`mailto:${SUPPORT_EMAIL}?subject=Tier%20List%20Maker%20content%20report`}>Compose a content report</a></p></section>
    <section><h2>Privacy and copyright requests</h2><p>For a removal request, include the relevant public URL and enough information to identify the content and your relationship to it. Anonymous publishing may require additional verification of ownership.</p><p>See the <Link href="/privacy">privacy policy</Link> and <Link href="/copyright">copyright reporting page</Link> for details.</p></section>
  </InfoPage>;
}
