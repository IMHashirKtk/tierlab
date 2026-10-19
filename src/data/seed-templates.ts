import type { Template } from "@/types";
import { presentTemplate } from "@/lib/catalog";

export { CATEGORIES } from "@/data/categories";

const STARTER_TEMPLATES: Template[] = [
  {
    "id": "elden-ring-bosses",
    "slug": "elden-ring-shadow-erdtree-bosses",
    "title": "Elden Ring: Shadow of the Erdtree Bosses",
    "description": "Rank every main remembrance boss from the Lands Between and Realm of Shadow by mechanical difficulty and design.",
    "category": "gaming",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "er-1",
        "name": "Malenia, Blade of Miquella"
      },
      {
        "id": "er-2",
        "name": "Promised Consort Radahn"
      },
      {
        "id": "er-3",
        "name": "Messmer the Impaler"
      },
      {
        "id": "er-4",
        "name": "Bayle the Dread"
      },
      {
        "id": "er-5",
        "name": "Mohg, Lord of Blood"
      },
      {
        "id": "er-6",
        "name": "Godfrey, First Elden Lord"
      },
      {
        "id": "er-7",
        "name": "Maliketh, the Black Blade"
      },
      {
        "id": "er-8",
        "name": "Starscourge Radahn"
      },
      {
        "id": "er-9",
        "name": "Midra, Lord of Frenzied Flame"
      },
      {
        "id": "er-10",
        "name": "Rellana, Twin Moon Knight"
      }
    ],
    "isStarter": true
  },
  {
    "id": "mcu-movies",
    "slug": "mcu-all-phases-ranked",
    "title": "Marvel Cinematic Universe (All Phases)",
    "description": "From Iron Man (2008) to Deadpool & Wolverine. Determine the definitive hierarchy of Marvel Studios films.",
    "category": "movies",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "mcu-1",
        "name": "Avengers: Infinity War"
      },
      {
        "id": "mcu-2",
        "name": "Avengers: Endgame"
      },
      {
        "id": "mcu-3",
        "name": "Captain America: The Winter Soldier"
      },
      {
        "id": "mcu-4",
        "name": "Captain America: Civil War"
      },
      {
        "id": "mcu-5",
        "name": "Guardians of the Galaxy Vol. 1"
      },
      {
        "id": "mcu-6",
        "name": "Deadpool & Wolverine"
      },
      {
        "id": "mcu-7",
        "name": "Spider-Man: No Way Home"
      },
      {
        "id": "mcu-8",
        "name": "Iron Man"
      },
      {
        "id": "mcu-9",
        "name": "Thor: Ragnarok"
      },
      {
        "id": "mcu-10",
        "name": "Black Panther"
      }
    ],
    "isStarter": true
  },
  {
    "id": "modern-shonen-anime",
    "slug": "top-modern-shonen-anime",
    "title": "Top Modern Shonen Anime (2020–2026)",
    "description": "Rank Jujutsu Kaisen, Frieren, Demon Slayer, Chainsaw Man, Solo Leveling, and Bleach TYBW.",
    "category": "anime",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "an-1",
        "name": "Frieren: Beyond Journey's End"
      },
      {
        "id": "an-2",
        "name": "Jujutsu Kaisen"
      },
      {
        "id": "an-3",
        "name": "Chainsaw Man"
      },
      {
        "id": "an-4",
        "name": "Demon Slayer"
      },
      {
        "id": "an-5",
        "name": "Bleach: Thousand-Year Blood War"
      },
      {
        "id": "an-6",
        "name": "Solo Leveling"
      },
      {
        "id": "an-7",
        "name": "Dandadan"
      },
      {
        "id": "an-8",
        "name": "Kaiju No. 8"
      },
      {
        "id": "an-9",
        "name": "Hell's Paradise"
      },
      {
        "id": "an-10",
        "name": "Oshi no Ko"
      }
    ],
    "isStarter": true
  },
  {
    "id": "fast-food-fries",
    "slug": "fast-food-french-fries",
    "title": "Fast Food French Fries Showdown",
    "description": "Crispiness, seasoning, potato texture, and sauce compatibility across all major fast food drive-thrus.",
    "category": "food",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "ff-1",
        "name": "McDonald's"
      },
      {
        "id": "ff-2",
        "name": "Five Guys (Cajun)"
      },
      {
        "id": "ff-3",
        "name": "Popeyes Cajun Fries"
      },
      {
        "id": "ff-4",
        "name": "Arby's Curly Fries"
      },
      {
        "id": "ff-5",
        "name": "Wendy's Hot & Crispy"
      },
      {
        "id": "ff-6",
        "name": "Chick-fil-A Waffle Fries"
      },
      {
        "id": "ff-7",
        "name": "Burger King"
      },
      {
        "id": "ff-8",
        "name": "Shake Shack Crinkle Cut"
      },
      {
        "id": "ff-9",
        "name": "In-N-Out (Well-Done)"
      },
      {
        "id": "ff-10",
        "name": "Taco Bell Nacho Fries"
      }
    ],
    "isStarter": true
  },
  {
    "id": "roblox-games",
    "slug": "roblox-top-games-meta",
    "title": "Roblox Most Played Games (2026)",
    "description": "Blox Fruits, Brookhaven, Blade Ball, Dress to Impress, Anime Defenders, and Pet Simulator.",
    "category": "gaming",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "rb-1",
        "name": "Blox Fruits"
      },
      {
        "id": "rb-2",
        "name": "Dress to Impress"
      },
      {
        "id": "rb-3",
        "name": "Anime Defenders"
      },
      {
        "id": "rb-4",
        "name": "Blade Ball"
      },
      {
        "id": "rb-5",
        "name": "Brookhaven RP"
      },
      {
        "id": "rb-6",
        "name": "Doors"
      },
      {
        "id": "rb-7",
        "name": "Pet Simulator 99"
      },
      {
        "id": "rb-8",
        "name": "Murder Mystery 2"
      },
      {
        "id": "rb-9",
        "name": "Fisch"
      },
      {
        "id": "rb-10",
        "name": "Arsenal"
      }
    ],
    "isStarter": true
  },
  {
    "id": "hip-hop-2020s",
    "slug": "defining-hip-hop-albums-2020s",
    "title": "Defining Hip-Hop Albums of the 2020s",
    "description": "Rank Kendrick Lamar, Travis Scott, Drake, J. Cole, Tyler the Creator, and Future's defining projects.",
    "category": "music",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "hh-1",
        "name": "Mr. Morale & The Big Steppers"
      },
      {
        "id": "hh-2",
        "name": "Call Me If You Get Lost"
      },
      {
        "id": "hh-3",
        "name": "Utopia"
      },
      {
        "id": "hh-4",
        "name": "Heroes & Villains"
      },
      {
        "id": "hh-5",
        "name": "The Melodic Blue"
      },
      {
        "id": "hh-6",
        "name": "We Don't Trust You"
      },
      {
        "id": "hh-7",
        "name": "The Off-Season"
      },
      {
        "id": "hh-8",
        "name": "Her Loss"
      },
      {
        "id": "hh-9",
        "name": "Chromakopia"
      },
      {
        "id": "hh-10",
        "name": "Donda"
      }
    ],
    "isStarter": true
  },
  {
    "id": "nba-all-time-goat",
    "slug": "nba-all-time-goat-legends",
    "title": "NBA All-Time GOAT Legends",
    "description": "Rank the greatest NBA legends from Jordan and LeBron to Curry and Kobe by peak, rings, and legacy.",
    "category": "sports",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "nba-1",
        "name": "Michael Jordan"
      },
      {
        "id": "nba-2",
        "name": "LeBron James"
      },
      {
        "id": "nba-3",
        "name": "Kareem Abdul-Jabbar"
      },
      {
        "id": "nba-4",
        "name": "Magic Johnson"
      },
      {
        "id": "nba-5",
        "name": "Stephen Curry"
      },
      {
        "id": "nba-6",
        "name": "Kobe Bryant"
      },
      {
        "id": "nba-7",
        "name": "Larry Bird"
      },
      {
        "id": "nba-8",
        "name": "Shaquille O'Neal"
      },
      {
        "id": "nba-9",
        "name": "Tim Duncan"
      },
      {
        "id": "nba-10",
        "name": "Nikola Jokić"
      }
    ],
    "isStarter": true
  },
  {
    "id": "world-football-goats",
    "slug": "football-soccer-21st-century-goats",
    "title": "Football / Soccer 21st Century GOATs",
    "description": "Rank the greatest modern footballers across Ballon d'Or winners, World Cup champions, and Champions League icons.",
    "category": "sports",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "wf-1",
        "name": "Lionel Messi"
      },
      {
        "id": "wf-2",
        "name": "Cristiano Ronaldo"
      },
      {
        "id": "wf-3",
        "name": "Zinedine Zidane"
      },
      {
        "id": "wf-4",
        "name": "Ronaldinho"
      },
      {
        "id": "wf-5",
        "name": "Kylian Mbappé"
      },
      {
        "id": "wf-6",
        "name": "Luka Modrić"
      },
      {
        "id": "wf-7",
        "name": "Andrés Iniesta"
      },
      {
        "id": "wf-8",
        "name": "Thierry Henry"
      },
      {
        "id": "wf-9",
        "name": "Neymar Jr"
      },
      {
        "id": "wf-10",
        "name": "Erling Haaland"
      }
    ],
    "isStarter": true
  },
  {
    "id": "ai-models-and-tools-2026",
    "slug": "best-ai-tools-llms-2026",
    "title": "Best AI Tools & LLMs (2026 Tier List)",
    "description": "Rank the top foundational models, agentic coding tools, and creative generative AI systems shaping 2026.",
    "category": "pop-culture",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "ai-1",
        "name": "Claude"
      },
      {
        "id": "ai-2",
        "name": "Gemini"
      },
      {
        "id": "ai-3",
        "name": "ChatGPT"
      },
      {
        "id": "ai-4",
        "name": "Cursor / Antigravity"
      },
      {
        "id": "ai-5",
        "name": "Midjourney"
      },
      {
        "id": "ai-6",
        "name": "Perplexity"
      },
      {
        "id": "ai-7",
        "name": "Suno AI"
      },
      {
        "id": "ai-8",
        "name": "ElevenLabs"
      },
      {
        "id": "ai-9",
        "name": "v0"
      },
      {
        "id": "ai-10",
        "name": "NotebookLM"
      }
    ],
    "isStarter": true
  },
  {
    "id": "programming-languages-meta",
    "slug": "programming-languages-ranked-2026",
    "title": "Programming Languages Ranked (2026 Developer Meta)",
    "description": "Developer happiness, ecosystem maturity, performance, and tooling across modern software engineering stacks.",
    "category": "pop-culture",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "pl-1",
        "name": "TypeScript"
      },
      {
        "id": "pl-2",
        "name": "Python"
      },
      {
        "id": "pl-3",
        "name": "Rust"
      },
      {
        "id": "pl-4",
        "name": "Go"
      },
      {
        "id": "pl-5",
        "name": "C++"
      },
      {
        "id": "pl-6",
        "name": "Java"
      },
      {
        "id": "pl-7",
        "name": "C#"
      },
      {
        "id": "pl-8",
        "name": "Swift"
      },
      {
        "id": "pl-9",
        "name": "Kotlin"
      },
      {
        "id": "pl-10",
        "name": "PHP"
      }
    ],
    "isStarter": true
  },
  {
    "id": "gta-franchise-games",
    "slug": "grand-theft-auto-gta-franchise-ranked",
    "title": "Grand Theft Auto (GTA) Franchise Ranked",
    "description": "From GTA III's revolution to GTA: San Andreas, GTA IV, and GTA V ahead of the next release.",
    "category": "gaming",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "gta-1",
        "name": "GTA: San Andreas"
      },
      {
        "id": "gta-2",
        "name": "GTA V"
      },
      {
        "id": "gta-3",
        "name": "GTA IV"
      },
      {
        "id": "gta-4",
        "name": "GTA: Vice City"
      },
      {
        "id": "gta-5",
        "name": "GTA III"
      },
      {
        "id": "gta-6",
        "name": "GTA: Liberty City Stories"
      },
      {
        "id": "gta-7",
        "name": "GTA: Vice City Stories"
      },
      {
        "id": "gta-8",
        "name": "GTA: Chinatown Wars"
      },
      {
        "id": "gta-9",
        "name": "GTA Online"
      },
      {
        "id": "gta-10",
        "name": "GTA: The Ballad of Gay Tony"
      }
    ],
    "isStarter": true
  },
  {
    "id": "energy-drinks-showdown",
    "slug": "ultimate-energy-drinks-tier-list",
    "title": "Ultimate Energy Drinks Tier List",
    "description": "Flavor profiles, zero-sugar formulas, caffeine kick, and carbonation across the top beverage brands.",
    "category": "food",
    "author": {
      "username": "Template Library"
    },
    "itemCount": 10,
    "remixCount": 0,
    "upvotes": 0,
    "createdAt": "Starter template",
    "featured": false,
    "items": [
      {
        "id": "ed-1",
        "name": "Monster Ultra White"
      },
      {
        "id": "ed-2",
        "name": "Red Bull Original"
      },
      {
        "id": "ed-3",
        "name": "Celsius Peach Vibe"
      },
      {
        "id": "ed-4",
        "name": "Ghost Sour Patch"
      },
      {
        "id": "ed-5",
        "name": "Reign Orange Dreamsicle"
      },
      {
        "id": "ed-6",
        "name": "C4 Frozen Bombsicle"
      },
      {
        "id": "ed-7",
        "name": "Alani Nu Cosmic Stardust"
      },
      {
        "id": "ed-8",
        "name": "Rockstar Punched"
      },
      {
        "id": "ed-9",
        "name": "Bang Blue Razz"
      },
      {
        "id": "ed-10",
        "name": "G Fuel PewDiePie"
      }
    ],
    "isStarter": true
  }
];

export const SEED_TEMPLATES: Template[] = STARTER_TEMPLATES.map(presentTemplate);
