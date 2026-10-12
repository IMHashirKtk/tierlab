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
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const client = createClient(url, key);

async function seed() {
  console.log('Seeding seed templates into Supabase...');

  // Read seed templates
  const { SEED_TEMPLATES } = await import('../src/data/seed-templates.js').catch(async () => {
    // If TypeScript, read directly
    const raw = fs.readFileSync('./src/data/seed-templates.ts', 'utf8');
    // Extract JSON representation
    return { SEED_TEMPLATES: [] };
  });

  const templatesToInsert = [
    {
      id: "elden-ring-bosses",
      title: "Elden Ring: Shadow of the Erdtree Bosses",
      description: "Rank every main remembrance boss from the Lands Between and Realm of Shadow by mechanical difficulty and design.",
      category: "gaming",
      author_name: "EldenLord",
      rank_count: 14280,
      upvotes: 3840,
      items: [
        { id: "er-1", name: "Malenia, Blade of Miquella", imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80" },
        { id: "er-2", name: "Promised Consort Radahn", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
        { id: "er-3", name: "Messmer the Impaler", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80" },
        { id: "er-4", name: "Bayle the Dread", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80" },
        { id: "er-5", name: "Mohg, Lord of Blood", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "er-6", name: "Godfrey, First Elden Lord", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
        { id: "er-7", name: "Maliketh, the Black Blade", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
        { id: "er-8", name: "Starscourge Radahn", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
        { id: "er-9", name: "Midra, Lord of Frenzied Flame", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=300&q=80" },
        { id: "er-10", name: "Rellana, Twin Moon Knight", imageUrl: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "mcu-movies",
      title: "Marvel Cinematic Universe (All Phases)",
      description: "From Iron Man (2008) to Deadpool & Wolverine. Determine the definitive hierarchy of Marvel Studios films.",
      category: "movies",
      author_name: "CinemaGeek",
      rank_count: 22190,
      upvotes: 5120,
      items: [
        { id: "mcu-1", name: "Avengers: Infinity War", imageUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-2", name: "Avengers: Endgame", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-3", name: "Captain America: The Winter Soldier", imageUrl: "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-4", name: "Captain America: Civil War", imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-5", name: "Guardians of the Galaxy Vol. 1", imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-6", name: "Deadpool & Wolverine", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-7", name: "Spider-Man: No Way Home", imageUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-8", name: "Iron Man", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-9", name: "Thor: Ragnarok", imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-10", name: "Black Panther", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "modern-shonen-anime",
      title: "Top Modern Shonen Anime (2020–2026)",
      description: "Rank Jujutsu Kaisen, Frieren, Demon Slayer, Chainsaw Man, Solo Leveling, and Bleach TYBW.",
      category: "anime",
      author_name: "OtakuRanks",
      rank_count: 18450,
      upvotes: 4210,
      items: [
        { id: "an-1", name: "Frieren: Beyond Journey's End", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80" },
        { id: "an-2", name: "Jujutsu Kaisen", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "an-3", name: "Chainsaw Man", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80" },
        { id: "an-4", name: "Demon Slayer", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80" },
        { id: "an-5", name: "Bleach: Thousand-Year Blood War", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
        { id: "an-6", name: "Solo Leveling", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80" },
        { id: "an-7", name: "Dandadan", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
        { id: "an-8", name: "Kaiju No. 8", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
        { id: "an-9", name: "Hell's Paradise", imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=300&q=80" },
        { id: "an-10", name: "Oshi no Ko", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "fast-food-fries",
      title: "Fast Food French Fries Showdown",
      description: "Crispiness, seasoning, potato texture, and sauce compatibility across all major fast food drive-thrus.",
      category: "food",
      author_name: "FryConnoisseur",
      rank_count: 9420,
      upvotes: 2180,
      items: [
        { id: "ff-1", name: "McDonald's", imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-2", name: "Five Guys (Cajun)", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-3", name: "Popeyes Cajun Fries", imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-4", name: "Arby's Curly Fries", imageUrl: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-5", name: "Wendy's Hot & Crispy", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-6", name: "Chick-fil-A Waffle Fries", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-7", name: "Burger King", imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-8", name: "Shake Shack Crinkle Cut", imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-9", name: "In-N-Out (Well-Done)", imageUrl: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=300&q=80" },
        { id: "ff-10", name: "Taco Bell Nacho Fries", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "roblox-games",
      title: "Roblox Most Played Games (2026)",
      description: "Blox Fruits, Brookhaven, Blade Ball, Dress to Impress, Anime Defenders, and Pet Simulator.",
      category: "gaming",
      author_name: "BloxRanker",
      rank_count: 31200,
      upvotes: 8900,
      items: [
        { id: "rb-1", name: "Blox Fruits", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-2", name: "Dress to Impress", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-3", name: "Anime Defenders", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-4", name: "Blade Ball", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-5", name: "Brookhaven RP", imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-6", name: "Doors", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-7", name: "Pet Simulator 99", imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-8", name: "Murder Mystery 2", imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-9", name: "Fisch", imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=300&q=80" },
        { id: "rb-10", name: "Arsenal", imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "hip-hop-2020s",
      title: "Defining Hip-Hop Albums of the 2020s",
      description: "Rank Kendrick Lamar, Travis Scott, Drake, J. Cole, Tyler the Creator, and Future's defining projects.",
      category: "music",
      author_name: "VinylHead",
      rank_count: 7890,
      upvotes: 1840,
      items: [
        { id: "hh-1", name: "Mr. Morale & The Big Steppers", imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-2", name: "Call Me If You Get Lost", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-3", name: "Utopia", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-4", name: "Heroes & Villains", imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-5", name: "The Melodic Blue", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-6", name: "We Don't Trust You", imageUrl: "https://images.unsplash.com/photo-1445985543468-7940e9f8299b?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-7", name: "The Off-Season", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-8", name: "Her Loss", imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-9", name: "Chromakopia", imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80" },
        { id: "hh-10", name: "Donda", imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=300&q=80" },
      ]
    }
  ];

  for (const tpl of templatesToInsert) {
    const { error } = await client.from('templates').upsert(tpl, { onConflict: 'id' });
    if (error) {
      console.error(`Failed to upsert ${tpl.id}:`, error.message);
    } else {
      console.log(`✓ Seeded ${tpl.id} (${tpl.items.length} items with images)`);
    }
  }

  console.log('Done seeding Supabase!');
}

seed();
