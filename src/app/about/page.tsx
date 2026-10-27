import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { SITE_OPERATOR } from "@/lib/site-info";

export const metadata = pageMetadata("About Tier List Maker", "Learn about Tier List Maker, operated by HashirK, and how its ranking tools and starter library work.", "/about");

export default function AboutPage() {
  return <InfoPage title="About Tier List Maker" intro={`An independent tier list tool operated by ${SITE_OPERATOR}.`}>
    <section><h2>Make your own ranking</h2><p>Tier List Maker lets you arrange images and text into tiers, save drafts on your device, and export images or animated videos. You can also publish a board or reusable template for other people to explore.</p><p>Creating a local board does not require an account. Public publishing needs an internet connection and uses an anonymous session to associate content with its creator.</p></section>
    <section><h2>What the template library contains</h2><p>Templates labelled “Template Library” are curated starting rosters. They are not community votes, complete catalogs, or live popularity charts. Each selection describes its scope; you can add missing items and choose your own ranking criteria.</p><p>Some templates use text cards. Image uploads remain available when you have permission to use the artwork. Community consensus appears only when genuine published rankings are available.</p></section>
    <section><h2>Your drafts and published content</h2><p>Local drafts stay in the browser where you created them. Export a backup before clearing browser storage or changing devices. Publishing sends the selected content to cloud storage and makes it publicly accessible.</p><p>Read our <Link href="/privacy">privacy policy</Link> or <Link href="/contact">contact the operator</Link> with questions or feedback.</p></section>
  </InfoPage>;
}
