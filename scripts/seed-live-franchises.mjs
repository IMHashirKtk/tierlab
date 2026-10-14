import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = './.env.local';
if (!fs.existsSync(envPath)) {
  console.log('No .env.local found');
  process.exit(0);
}

const env = fs.readFileSync(envPath, 'utf8');
const lines = env.split(/\r?\n/);
const parsed = {};
for (const line of lines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    parsed[k] = v;
  }
}

const url = parsed['NEXT_PUBLIC_SUPABASE_URL'];
const key = parsed['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.log('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const client = createClient(url, key);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJikanCharacters(malAnimeId, fallbackItems) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malAnimeId}/characters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length >= 8) {
        return data.data.slice(0, 12).map((entry, idx) => ({
          id: `char-${malAnimeId}-${idx + 1}`,
          name: entry.character?.name || `Character ${idx + 1}`,
          imageUrl:
            entry.character?.images?.jpg?.image_url ||
            fallbackItems[idx]?.imageUrl ||
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
        }));
      }
    }
  } catch (err) {
    console.warn(`Jikan API error for anime ${malAnimeId}, using fallback:`, err.message);
  }
  return fallbackItems;
}

async function fetchValorantAgents() {
  const fallback = [
    { id: "val-1", name: "Jett", imageUrl: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png" },
    { id: "val-2", name: "Reyna", imageUrl: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png" },
    { id: "val-3", name: "Omen", imageUrl: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png" },
    { id: "val-4", name: "Sova", imageUrl: "https://media.valorant-api.com/agents/320799d3-4504-c140-1471-6c962e08e6f4/displayicon.png" },
    { id: "val-5", name: "Killjoy", imageUrl: "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f97b07/displayicon.png" },
    { id: "val-6", name: "Cypher", imageUrl: "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png" },
    { id: "val-7", name: "Viper", imageUrl: "https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png" },
    { id: "val-8", name: "Raze", imageUrl: "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png" },
    { id: "val-9", name: "Fade", imageUrl: "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png" },
    { id: "val-10", name: "Clove", imageUrl: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png" },
    { id: "val-11", name: "Iso", imageUrl: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png" },
    { id: "val-12", name: "Phoenix", imageUrl: "https://media.valorant-api.com/agents/eb9333ab-4054-7f42-04e4-81a4306730a3/displayicon.png" },
  ];

  try {
    const res = await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        return data.data.slice(0, 12).map((agent, idx) => ({
          id: `val-agent-${idx + 1}`,
          name: agent.displayName,
          imageUrl: agent.displayIcon || fallback[idx]?.imageUrl,
        }));
      }
    }
  } catch (err) {
    console.warn("Valorant API fetch failed, using fallback:", err.message);
  }
  return fallback;
}

function getPokemonStarters() {
  const starters = [
    { id: 1, name: "Bulbasaur" },
    { id: 4, name: "Charmander" },
    { id: 7, name: "Squirtle" },
    { id: 152, name: "Chikorita" },
    { id: 155, name: "Cyndaquil" },
    { id: 158, name: "Totodile" },
    { id: 252, name: "Treecko" },
    { id: 255, name: "Torchic" },
    { id: 258, name: "Mudkip" },
    { id: 387, name: "Turtwig" },
    { id: 390, name: "Chimchar" },
    { id: 393, name: "Piplup" },
  ];

  return starters.map((p, idx) => ({
    id: `pkmn-${idx + 1}`,
    name: p.name,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`,
  }));
}

async function fetchItunesAlbums(artistQuery, fallbackAlbums) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistQuery)}&entity=album&limit=15`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results)) {
        const seen = new Set();
        const albums = [];
        for (const item of data.results) {
          if (!item.collectionName || seen.has(item.collectionName.toLowerCase())) continue;
          seen.add(item.collectionName.toLowerCase());
          albums.push({
            id: `alb-${albums.length + 1}`,
            name: item.collectionName,
            imageUrl: (item.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
          });
          if (albums.length === 12) break;
        }
        if (albums.length >= 6) return albums;
      }
    }
  } catch (err) {
    console.warn(`iTunes API error for ${artistQuery}, using fallback:`, err.message);
  }
  return fallbackAlbums;
}

async function run() {
  console.log("=== Fetching & Seeding Live Franchise Templates into Supabase ===");

  // 1. One Piece
  console.log("Fetching One Piece characters (Jikan API)...");
  const opFallback = [
    { id: "op-1", name: "Monkey D. Luffy", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80" },
    { id: "op-2", name: "Roronoa Zoro", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80" },
    { id: "op-3", name: "Sanji", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80" },
    { id: "op-4", name: "Nami", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80" },
    { id: "op-5", name: "Nico Robin", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80" },
    { id: "op-6", name: "Tony Tony Chopper", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "op-7", name: "Usopp", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "op-8", name: "Franky", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80" },
    { id: "op-9", name: "Brook", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80" },
    { id: "op-10", name: "Jinbe", imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80" },
    { id: "op-11", name: "Shanks", imageUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&auto=format&fit=crop&q=80" },
    { id: "op-12", name: "Gol D. Roger", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80" },
  ];
  const opItems = await fetchJikanCharacters(21, opFallback);
  await sleep(600);

  // 2. Naruto Shippuden
  console.log("Fetching Naruto Shippuden characters (Jikan API)...");
  const narutoFallback = [
    { id: "nar-1", name: "Naruto Uzumaki", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-2", name: "Sasuke Uchiha", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-3", name: "Kakashi Hatake", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-4", name: "Itachi Uchiha", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-5", name: "Madara Uchiha", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-6", name: "Jiraiya", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-7", name: "Minato Namikaze", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-8", name: "Tsunade", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-9", name: "Orochimaru", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-10", name: "Pain", imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-11", name: "Obito Uchiha", imageUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&auto=format&fit=crop&q=80" },
    { id: "nar-12", name: "Gaara", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80" },
  ];
  const narutoItems = await fetchJikanCharacters(1735, narutoFallback);
  await sleep(600);

  // 3. Attack on Titan
  console.log("Fetching Attack on Titan characters (Jikan API)...");
  const aotFallback = [
    { id: "aot-1", name: "Eren Yeager", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-2", name: "Levi Ackerman", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-3", name: "Mikasa Ackerman", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-4", name: "Armin Arlert", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-5", name: "Erwin Smith", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-6", name: "Reiner Braun", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-7", name: "Hange Zoë", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-8", name: "Zeke Yeager", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-9", name: "Jean Kirstein", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-10", name: "Sasha Blouse", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-11", name: "Annie Leonhart", imageUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&auto=format&fit=crop&q=80" },
    { id: "aot-12", name: "Historia Reiss", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80" },
  ];
  const aotItems = await fetchJikanCharacters(16498, aotFallback);
  await sleep(600);

  // 4. Jujutsu Kaisen
  console.log("Fetching Jujutsu Kaisen characters (Jikan API)...");
  const jjkFallback = [
    { id: "jjk-1", name: "Satoru Gojo", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-2", name: "Ryomen Sukuna", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-3", name: "Yuji Itadori", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-4", name: "Megumi Fushiguro", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-5", name: "Yuta Okkotsu", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-6", name: "Toji Fushiguro", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-7", name: "Suguru Geto", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-8", name: "Kento Nanami", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-9", name: "Nobara Kugisaki", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-10", name: "Aoi Todo", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-11", name: "Maki Zen'in", imageUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&auto=format&fit=crop&q=80" },
    { id: "jjk-12", name: "Mahito", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80" },
  ];
  const jjkItems = await fetchJikanCharacters(40748, jjkFallback);

  // 5. Valorant
  console.log("Fetching Valorant agents (Valorant Public API)...");
  const valItems = await fetchValorantAgents();

  // 6. Pokémon Starters
  console.log("Generating Pokémon starters (PokeAPI Official Artwork)...");
  const pkmnItems = getPokemonStarters();

  // 7. Taylor Swift
  console.log("Fetching Taylor Swift albums (iTunes Search API)...");
  const tsFallback = [
    { id: "ts-1", name: "1989 (Taylor's Version)", imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-2", name: "Red (Taylor's Version)", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-3", name: "Folklore", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-4", name: "Evermore", imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-5", name: "Midnights", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-6", name: "The Tortured Poets Department", imageUrl: "https://images.unsplash.com/photo-1445985543468-7940e9f8299b?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-7", name: "Reputation", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-8", name: "Lover", imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-9", name: "Speak Now (Taylor's Version)", imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80" },
    { id: "ts-10", name: "Fearless (Taylor's Version)", imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80" },
  ];
  const tsItems = await fetchItunesAlbums("Taylor Swift", tsFallback);

  // 8. Kanye West
  console.log("Fetching Kanye West albums (iTunes Search API)...");
  const yeFallback = [
    { id: "ye-1", name: "The College Dropout", imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-2", name: "Late Registration", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-3", name: "Graduation", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-4", name: "My Beautiful Dark Twisted Fantasy", imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-5", name: "808s & Heartbreak", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-6", name: "Yeezus", imageUrl: "https://images.unsplash.com/photo-1445985543468-7940e9f8299b?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-7", name: "The Life of Pablo", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-8", name: "Ye", imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-9", name: "Donda", imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80" },
    { id: "ye-10", name: "Kids See Ghosts", imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80" },
  ];
  const yeItems = await fetchItunesAlbums("Kanye West", yeFallback);

  const franchiseTemplates = [
    {
      id: "one-piece-characters-tier-list",
      title: "One Piece Characters All-Time Tier List",
      description: "Rank the Straw Hats, Yonko, Admirals, and legendary pirates across the Grand Line and Wano.",
      category: "anime",
      author_name: "StrawHatCaptain",
      rank_count: 24300,
      upvotes: 6210,
      items: opItems,
    },
    {
      id: "naruto-shippuden-characters-tier-list",
      title: "Naruto Shippuden Ninja Tier List",
      description: "Rank Naruto, Sasuke, Itachi, Madara, Kakashi, and the legendary shinobi by strength and design.",
      category: "anime",
      author_name: "HokageVibes",
      rank_count: 19800,
      upvotes: 5120,
      items: narutoItems,
    },
    {
      id: "attack-on-titan-characters-tier-list",
      title: "Attack on Titan (AOT) Characters Ranked",
      description: "Rank Eren Jaeger, Levi, Mikasa, Erwin Smith, and the Scout Regiment by character arc and impact.",
      category: "anime",
      author_name: "ScoutRegiment",
      rank_count: 17400,
      upvotes: 4320,
      items: aotItems,
    },
    {
      id: "jujutsu-kaisen-characters-tier-list",
      title: "Jujutsu Kaisen (JJK) Sorcerers & Curses Tier List",
      description: "Rank Gojo Satoru, Sukuna, Yuji Itadori, Megumi, and special grade sorcerers by power and aura.",
      category: "anime",
      author_name: "LimitlessVoid",
      rank_count: 22400,
      upvotes: 5890,
      items: jjkItems,
    },
    {
      id: "valorant-agents-meta-tier-list",
      title: "Valorant Agents Meta Tier List (2026)",
      description: "Rank Duelists, Initiators, Controllers, and Sentinels in the current competitive meta.",
      category: "gaming",
      author_name: "RadiantCoach",
      rank_count: 15600,
      upvotes: 3840,
      items: valItems,
    },
    {
      id: "pokemon-starters-all-gens",
      title: "All Pokémon Starters Ranked (Gens 1–4)",
      description: "Rank the iconic starter Pokémon from Kanto, Johto, Hoenn, and Sinnoh by design and nostalgia.",
      category: "gaming",
      author_name: "PalletTownProf",
      rank_count: 26800,
      upvotes: 7120,
      items: pkmnItems,
    },
    {
      id: "taylor-swift-eras-albums-ranked",
      title: "Taylor Swift Eras & Albums Ranked",
      description: "From Debut and Fearless to 1989, Folklore, Midnights, and The Tortured Poets Department.",
      category: "music",
      author_name: "SwiftieCore",
      rank_count: 31200,
      upvotes: 8450,
      items: tsItems,
    },
    {
      id: "kanye-west-discography-tier-list",
      title: "Kanye West Discography All-Time Ranked",
      description: "Rank The College Dropout, Late Registration, Graduation, MBDTF, Yeezus, TLOP, and Donda.",
      category: "music",
      author_name: "GraduationFan",
      rank_count: 18900,
      upvotes: 4670,
      items: yeItems,
    },
  ];

  for (const tpl of franchiseTemplates) {
    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await client.from("templates").upsert(tpl, { onConflict: "id" });
      if (!error) {
        console.log(`✓ Seeded ${tpl.id} (${tpl.items.length} items with live assets)`);
        success = true;
        break;
      } else {
        console.warn(`Attempt ${attempt} for ${tpl.id} failed: ${error.message}`);
        await sleep(1500);
      }
    }
    if (!success) {
      console.error(`Failed to upsert franchise template ${tpl.id} after 3 attempts.`);
    }
  }

  console.log("=== Successfully seeded all 8 franchise templates into Supabase! ===");
}

run();
