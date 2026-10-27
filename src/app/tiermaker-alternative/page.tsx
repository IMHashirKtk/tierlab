import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Keep this comparison out of search until all six competitor capabilities are verified.
export const metadata = {
  ...pageMetadata("TierMaker Alternative: Features Compared", "Compare accounts, watermarks, ads, exports and device drafts, with dated sources and clear verification limits.", "/tiermaker-alternative"),
  robots: { index: false, follow: true },
};
const faq = "https://tiermaker.com/blog/support/10/tier-list-template-creation-guide-and-faqs";
const builder = "https://tiermaker.com/create/star-wars-film-ranking-6747";
const rows = [
  ["Watermarks", "Image and reveal-video badges are optional and off by default; removing them is free.", "The official FAQ lists logo-free output among paid subscription benefits.", faq],
  ["Account required", "No account for local editing or downloading. Public publishing needs a cloud connection.", "The FAQ requires an account for template creation. The reviewed public builder requests login to save to a profile; these are different workflows.", faq],
  ["Ads", "No advertising slots or ad network SDK in this website build.", "The FAQ describes a paid ad-free website benefit.", faq],
  ["Export formats", "PNG image downloads, with compact, landscape, square and vertical layouts.", "The public builder offers an image download. Its actual file extension has not been verified in this review.", builder],
  ["Video export", "Animated reveal export; available video codecs depend on the browser.", "Video-export support has not been verified. Absence of a control on the reviewed page does not establish absence across the product.", builder],
  ["Local drafts", "Projects save in this browser. Device-storage tools offer backup and restore; clearing browser storage can remove drafts.", "For its single-use private workflow specifically, the FAQ warns that refreshing loses progress. Other draft workflows have not been verified.", faq],
];
export default function AlternativePage() {
  return <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
    <Navbar />
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">Home</Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-indigo-400">A practical workflow comparison</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Tier List Maker and TierMaker compared</h1>
      <p className="mt-5 text-lg text-zinc-400 leading-relaxed max-w-3xl">Choose a ranking tool around the work you want to finish: a quick image for a group chat, a reusable public template, or an animated reveal. This comparison separates local editing from account-based publishing so you can assess the workflow that matters to you.</p>
      <p className="mt-4 text-sm text-zinc-400">Sources checked <time dateTime="2026-10-27">27 October 2026</time>. Unverified capabilities are labelled below; they are not claims that a feature is unavailable.</p>
      <Link href="/create" className="inline-flex mt-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 font-semibold">Open the editor</Link>
      <div className="mt-12 overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[640px] text-sm text-left">
          <caption className="p-5 text-left text-zinc-400">Website workflows and documented subscription benefits; mobile-app features are not assumed to match the website.</caption>
          <thead className="bg-zinc-900"><tr>{["Feature", "tierlistmaker.app", "TierMaker · evidence and limits"].map(h => <th scope="col" key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{rows.map(([feature, ours, theirs, source]) => <tr key={feature} className="border-t border-zinc-800 align-top"><th scope="row" className="p-4 font-semibold">{feature}</th><td className="p-4 text-zinc-300 leading-relaxed">{ours}</td><td className="p-4 text-zinc-400 leading-relaxed">{theirs} <a href={source} className="text-indigo-300 underline underline-offset-4">Official source</a></td></tr>)}</tbody>
        </table>
      </div>
      <section className="mt-12 max-w-3xl space-y-4 text-zinc-400 leading-relaxed">
        <h2 className="text-2xl font-semibold text-zinc-100">Choose by the result you need</h2>
        <p>For an image-first workflow here, start with a named roster, choose a consistent ranking criterion, and arrange the items before exporting. Compact export wraps long rows so artwork remains useful on a phone. Fixed aspect ratios remain available when a video frame or social post requires a particular shape. Check the preview before downloading, especially when a tier contains far more items than its neighbours.</p>
        <p>For work spread across several sessions, treat a local draft as device storage rather than a cloud account. Use Privacy &amp; Device Storage to make a backup before switching browsers, clearing site data, or moving computers. Downloaded images preserve the visible result, while a project backup preserves editable placements. Public publishing is a separate action and should only include artwork and text you are permitted to share.</p>
        <p>For a reveal video, test the export on the browser and device you intend to use. Codec support and rendering capacity vary. For a public template on TierMaker, consult its current creation guide and account requirements directly. This table does not establish comparative speed, audience size, search rankings, or the full feature set of either mobile app.</p>
        <h2 className="text-2xl font-semibold text-zinc-100">Verification still needed</h2>
        <p>This page remains excluded from search indexing while TierMaker download extensions, video capabilities and broader draft behaviour need direct verification. The dated source links let you inspect the documented facts independently. Product policies can change after the review date.</p>
      </section>
      <Link href="/templates" className="inline-flex mt-8 text-indigo-300">Browse templates →</Link>
    </main><Footer />
  </div>;
}
