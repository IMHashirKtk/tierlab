interface StarterGuide {
  title: string;
  topic: string;
  description: string;
  criteria: string;
}

// Editorial scope describes the actual roster; these are selections, not popularity charts.
export const STARTER_GUIDES: Record<string, StarterGuide> = {
  "elden-ring-bosses": {
    topic: "Elden Ring Bosses",
    title: "Elden Ring Bosses: Base Game & DLC Selection",
    description: "Rank 10 selected bosses from Elden Ring and Shadow of the Erdtree, including Malenia, Messmer, and Promised Consort Radahn. This is a starter selection, not every boss.",
    criteria: "Choose difficulty, encounter design, or personal enjoyment before ranking. For difficulty, use a consistent build and decide whether summons count.",
  },
  "mcu-movies": {
    topic: "MCU Movies",
    title: "MCU Movies: 10-Film Starter Selection",
    description: "Compare 10 selected Marvel films, from Iron Man to Deadpool & Wolverine. Add other MCU films to build a larger roster.",
    criteria: "Rank by story, rewatch value, or action rather than mixing all three without a rule. Decide whether nostalgia should influence your placements.",
  },
  "modern-shonen-anime": {
    topic: "Modern Anime",
    title: "Modern Anime: 10-Series Starter Selection",
    description: "Rank 10 selected modern anime series, including Frieren, Jujutsu Kaisen, and Demon Slayer. This selection spans different genres rather than only shonen.",
    criteria: "Choose whether you are judging the anime adaptation or the source material. Compare completed seasons you have watched and leave unfamiliar shows unranked.",
  },
  "fast-food-fries": {
    topic: "Fast Food Fries",
    title: "Fast Food Fries: 10-Chain Selection",
    description: "Compare fries from 10 selected fast-food chains. Availability, recipes, and serving quality can vary by location.",
    criteria: "Use similar serving conditions when comparing crispness, seasoning, and value. Leave chains you have not tried unranked.",
  },
  "roblox-games": {
    topic: "Roblox Games",
    title: "Roblox Games: 10-Game Starter Selection",
    description: "Rank a selection of 10 Roblox games, including Blox Fruits, Brookhaven, and Doors. This is not a live player-count chart.",
    criteria: "Compare replay value, learning curve, and how enjoyable the games are with friends. Judge the versions you have actually played.",
  },
  "hip-hop-2020s": {
    topic: "Hip-Hop Albums of the 2020s",
    title: "Hip-Hop Albums of the 2020s: 10-Album Selection",
    description: "Rank 10 selected hip-hop albums from the 2020s, including projects by Kendrick Lamar, Tyler the Creator, and Travis Scott.",
    criteria: "Compare complete albums rather than only singles. Pick a balance between lyricism, production, cohesion, and replay value.",
  },
  "nba-all-time-goat": {
    topic: "NBA Legends",
    title: "NBA Legends: 10-Player Selection",
    description: "Compare 10 selected NBA legends, including Michael Jordan, LeBron James, Stephen Curry, and Kobe Bryant.",
    criteria: "Decide whether peak ability or career achievements matter more. Account for differences in era, role, and competition before using raw totals.",
  },
  "world-football-goats": {
    topic: "Football Legends",
    title: "Modern Football Legends: 10-Player Selection",
    description: "Rank 10 selected football players, including Lionel Messi, Cristiano Ronaldo, Zinedine Zidane, and Ronaldinho.",
    criteria: "Choose peak performance, longevity, or personal influence as your main criterion. Compare positions thoughtfully rather than relying only on goals.",
  },
  "ai-models-and-tools-2026": {
    topic: "AI Tools",
    title: "AI Products: 10-Tool Starter Selection",
    description: "Compare 10 selected AI products across coding, writing, images, and audio. These are different tools, not a current model benchmark.",
    criteria: "Pick a task and compare the tools you have used for that task. Record the version or date in your board title because product capabilities change.",
  },
  "programming-languages-meta": {
    topic: "Programming Languages",
    title: "Programming Languages: 10-Language Selection",
    description: "Rank 10 selected programming languages for your own projects. This is a preference template, not a measured popularity ranking.",
    criteria: "Choose a project type first, such as web development or systems programming. Compare tooling, maintainability, ecosystem, and deployment constraints.",
  },
  "gta-franchise-games": {
    topic: "GTA Games",
    title: "GTA Games: 10-Game Selection",
    description: "Rank 10 selected Grand Theft Auto releases, including GTA III, Vice City, San Andreas, GTA IV, and GTA V.",
    criteria: "Compare story, world design, missions, or replay value. Decide whether to judge each game at release or by how it plays today.",
  },
  "energy-drinks-showdown": {
    topic: "Energy Drinks",
    title: "Energy Drinks: 10-Drink Selection",
    description: "Rank 10 selected energy drinks and flavors by personal taste. Formulas and availability may differ between markets.",
    criteria: "Compare flavor, sweetness, carbonation, and price. Use this as a taste ranking rather than a health or safety rating.",
  },
  "one-piece-characters-tier-list": {
    topic: "One Piece Characters",
    title: "One Piece Characters: 12-Character Selection",
    description: "Rank 12 selected One Piece characters. Add other characters to expand this starter roster.",
    criteria: "Choose character writing, design, or strength. For strength comparisons, specify the story arc and avoid mixing different versions of a character.",
  },
  "naruto-shippuden-characters-tier-list": {
    topic: "Naruto Shippuden Characters",
    title: "Naruto Shippuden: 12-Character Selection",
    description: "Compare 12 selected Naruto Shippuden characters by your preferred ranking criterion.",
    criteria: "Set the story arc and character form before judging strength. For a favorites list, consider character development and memorable scenes instead.",
  },
  "attack-on-titan-characters-tier-list": {
    topic: "Attack on Titan Characters",
    title: "Attack on Titan: 12-Character Selection",
    description: "Rank 12 selected Attack on Titan characters by character writing, impact, or personal preference.",
    criteria: "Decide how far into the story your ranking goes and flag spoilers in your board title. Separate likability from how effectively a character serves the story.",
  },
  "jujutsu-kaisen-characters-tier-list": {
    topic: "Jujutsu Kaisen Characters",
    title: "Jujutsu Kaisen: 12-Character Selection",
    description: "Compare 12 selected Jujutsu Kaisen sorcerers and curses. This is a starter roster rather than every character.",
    criteria: "Specify the anime season or manga arc. Decide whether you are ranking strength, design, or favorites before placing characters.",
  },
  "valorant-agents-meta-tier-list": {
    topic: "Valorant Agents",
    title: "Valorant Agents: 12-Agent Selection",
    description: "Rank 12 selected Valorant agents. This roster is not a complete agent list or a live competitive meta report.",
    criteria: "Choose a map, patch, and skill level. Compare agents by role and team utility, or explicitly rank them by how much you enjoy playing them.",
  },
  "pokemon-starters-all-gens": {
    topic: "Pokémon Starters (Gen 1–4)",
    title: "Pokémon Starter Forms: Generations 1–4",
    description: "Rank the 12 first-stage starter Pokémon from Kanto, Johto, Hoenn, and Sinnoh. Later generations and evolved forms are outside this roster.",
    criteria: "Choose design, nostalgia, or playthrough usefulness. If judging usefulness, name the game version and keep all Pokémon at comparable stages.",
  },
  "taylor-swift-eras-albums-ranked": {
    topic: "Taylor Swift Albums",
    title: "Taylor Swift Albums: 12-Entry Selection",
    description: "Compare the 12 album entries included in this starter template. Add or rename editions to match your preferred discography scope.",
    criteria: "Decide how to treat re-recordings and bonus tracks. Compare complete listening experiences using songwriting, production, and replay value.",
  },
  "kanye-west-discography-tier-list": {
    topic: "Kanye West Albums",
    title: "Kanye West Albums: 12-Entry Selection",
    description: "Rank the 12 album entries included in this starter template. This is a selected roster rather than a promise of a complete current discography.",
    criteria: "Decide whether collaborations count alongside solo albums. Compare production, cohesion, and replay value using the editions you have heard.",
  },
};
