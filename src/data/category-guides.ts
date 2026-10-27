interface CategoryGuide {
  title: string;
  description: string;
  intro: string;
  criteria: string;
}

/** Editorial guidance describes the available subjects, without invented popularity. */
export const CATEGORY_GUIDES: Record<string, CategoryGuide> = {
  gaming: {
    title: "Gaming Tier Lists & Game Ranking Templates",
    description: "Make gaming tier lists for Elden Ring bosses, Roblox games, GTA releases, Pokémon starters, and Valorant agents. Customize a template and export your ranking.",
    intro: "Compare games, boss encounters, playable agents, or Pokémon. Choose a starter roster for Elden Ring, Roblox, GTA, Valorant, or Pokémon, then add the picks you want to include.",
    criteria: "For competitive rankings, name the patch, map, game mode, and skill level. For favorites, compare enjoyment or replay value. Boss difficulty also depends on your build and whether you use summons.",
  },
  anime: {
    title: "Anime & Manga Tier List Templates",
    description: "Rank anime series and characters from One Piece, Naruto, Attack on Titan, and Jujutsu Kaisen. Choose a starter template and build your own tier list.",
    intro: "Rank anime series or compare characters from One Piece, Naruto Shippuden, Attack on Titan, and Jujutsu Kaisen. Each starter template states its roster size so you can expand the selection.",
    criteria: "Choose favorites, character writing, design, or strength before ranking. Specify the anime season or manga arc and flag spoilers when sharing. Leave unfamiliar series and characters unranked.",
  },
  food: {
    title: "Food & Drink Tier List Templates",
    description: "Create food and drink tier lists with fast food fries and energy drink starter templates. Compare flavors, customize your tiers, and share your picks.",
    intro: "Compare fast food fries or energy drink flavors using a starter roster. Add local favorites and rename the tiers to describe your own taste rather than a universal best-to-worst verdict.",
    criteria: "Judge similar serving conditions and consider flavor, texture, price, and availability. Recipes vary by market. Drink rankings express taste preferences and should not be treated as health advice.",
  },
  movies: {
    title: "Movie & TV Tier List Templates",
    description: "Make movie and TV tier lists, starting with a selected MCU film roster. Rank Marvel movies by story, action, or rewatch value and add your own titles.",
    intro: "Start with a selection of Marvel Cinematic Universe films or create your own movie and TV roster. The MCU template is a selected starting point rather than a complete release list.",
    criteria: "Choose story, performances, action, or rewatch value as your main criterion. Decide whether you are comparing individual films, complete series, or seasons, and label spoilers in shared rankings.",
  },
  music: {
    title: "Music & Album Tier List Templates",
    description: "Rank music with hip-hop, Taylor Swift, and Kanye West album templates. Define your discography scope, customize the roster, and share an album tier list.",
    intro: "Compare selected hip-hop albums from the 2020s or start an album ranking for Taylor Swift or Kanye West. Add missing releases and identify which editions your ranking includes.",
    criteria: "Compare full albums using songwriting, production, cohesion, or replay value. Decide how to treat re-recordings, collaborations, deluxe editions, and bonus tracks so your choices are easy to understand.",
  },
  sports: {
    title: "Sports Tier Lists: NBA & Football Templates",
    description: "Create NBA and football player tier lists using selected legends. Compare peak performance, careers, or personal favorites and explain your ranking criteria.",
    intro: "Build a player ranking from selected NBA and football legends. Expand either roster to include the players, teams, or eras you want to compare.",
    criteria: "Separate peak ability from career achievements and account for era, position, role, and competition. Explain your criteria instead of relying only on points, goals, or championship totals.",
  },
  "pop-culture": {
    title: "Pop Culture & Tech Tier List Templates",
    description: "Compare AI products and programming languages in customizable tier lists. Choose a task, define your criteria, and rank tools you have used.",
    intro: "Compare selected AI products or programming languages for your own projects. These templates organize preferences; they are not live benchmarks or measured popularity charts.",
    criteria: "Pick a task or project type first. Compare workflow, tooling, maintainability, and constraints. Include a version or date when judging products whose features change, and leave tools you have not used unranked.",
  },
};
