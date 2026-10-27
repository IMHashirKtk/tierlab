import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tier List Maker — Community Tier List & Ranking Platform",
    short_name: "TierListMaker",
    description:
      "Create, rank, duel, and remix tier lists with local-first privacy, 4K exports, and animated reveal videos.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png?v=tier-board-1",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png?v=tier-board-1",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.png?v=tier-board-1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg?v=tier-board-1",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["entertainment", "games", "productivity", "utilities"],
  };
}
