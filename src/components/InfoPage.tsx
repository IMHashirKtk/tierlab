import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-zinc-400 leading-relaxed">{intro}</p>
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-300 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-3 [&_p+p]:mt-3 [&_a]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-4 [&_a]:break-words">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
