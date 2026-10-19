import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "A Free TierMaker Alternative for Creators",
  description: "Explore Tier List Maker: local drafts, text and image ranking, presentation mode, and image or video exports.",
  alternates: { canonical: "/tiermaker-alternative" },
};

const features = [
  ["Start with your own items", "Upload images, add text, or choose a library template. Rename and recolor tiers to match your topic."],
  ["Keep drafts on your device", "Your projects save in this browser. Back them up from Privacy & Device Storage before clearing browser data."],
  ["Export for your audience", "Choose landscape, square, or vertical image exports. Video export offers reveal pacing and optional sound effects."],
  ["Present and compare", "Use presentation mode for a focused board. Publish a ranking to share it or compare with community submissions when available."],
];

export default function AlternativePage() {
  return <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
    <Navbar />
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">Home</Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-indigo-400">A studio for your rankings</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl">Looking for a TierMaker alternative?</h1>
      <p className="mt-5 text-lg text-zinc-400 leading-relaxed max-w-2xl">Try a free tier list studio with local drafts, text and image cards, and flexible exports. Create your first board and see whether the workflow suits you.</p>
      <Link href="/create" className="inline-flex mt-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 font-semibold">Create a tier list</Link>
      <div className="grid sm:grid-cols-2 gap-5 mt-14">{features.map(([title, description]) => <section key={title} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6"><h2 className="font-semibold text-lg">{title}</h2><p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p></section>)}</div>
      <section className="mt-12 max-w-3xl space-y-4 text-sm text-zinc-400 leading-relaxed">
        <h2 className="text-xl font-semibold text-zinc-100">Before you start</h2>
        <p>Creating and exporting a board does not require an account. Public publishing uses a cloud connection. Drafts stay on the device where you created them, so export a backup if you want to move them.</p>
        <p>Uploaded images and externally sourced artwork remain subject to their owners’ rights. Use images you are permitted to use.</p>
      </section>
    </main>
    <Footer />
  </div>;
}
