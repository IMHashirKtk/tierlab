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

async function seed() {
  console.log('Seeding all 12 seed templates into Supabase...');

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
        { id: "er-8", name: "Starscourge Radahn", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80" },
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
        { id: "mcu-7", name: "Spider-Man: No Way Home", imageUrl: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-8", name: "Iron Man", imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80" },
        { id: "mcu-9", name: "Thor: Ragnarok", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80" },
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
    },
    {
      id: "nba-all-time-goat",
      title: "NBA All-Time GOAT Legends",
      description: "Rank the greatest NBA legends from Jordan and LeBron to Curry and Kobe by peak, rings, and legacy.",
      category: "sports",
      author_name: "HoopsAnalyst",
      rank_count: 16500,
      upvotes: 4320,
      items: [
        { id: "nba-1", name: "Michael Jordan", imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-2", name: "LeBron James", imageUrl: "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-3", name: "Kareem Abdul-Jabbar", imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-4", name: "Magic Johnson", imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-5", name: "Stephen Curry", imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-6", name: "Kobe Bryant", imageUrl: "https://images.unsplash.com/photo-1628779238951-be5c9f2a095e?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-7", name: "Larry Bird", imageUrl: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-8", name: "Shaquille O'Neal", imageUrl: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-9", name: "Tim Duncan", imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=300&q=80" },
        { id: "nba-10", name: "Nikola Jokić", imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "world-football-goats",
      title: "Football / Soccer 21st Century GOATs",
      description: "Rank the greatest modern footballers across Ballon d'Or winners, World Cup champions, and Champions League icons.",
      category: "sports",
      author_name: "GolazoKing",
      rank_count: 28400,
      upvotes: 6890,
      items: [
        { id: "wf-1", name: "Lionel Messi", imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-2", name: "Cristiano Ronaldo", imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-3", name: "Zinedine Zidane", imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-4", name: "Ronaldinho", imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-5", name: "Kylian Mbappé", imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-6", name: "Luka Modrić", imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-7", name: "Andrés Iniesta", imageUrl: "https://images.unsplash.com/photo-1489944445391-11dd35572130?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-8", name: "Thierry Henry", imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-9", name: "Neymar Jr", imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=80" },
        { id: "wf-10", name: "Erling Haaland", imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "ai-models-and-tools-2026",
      title: "Best AI Tools & LLMs (2026 Tier List)",
      description: "Rank the top foundational models, agentic coding tools, and creative generative AI systems shaping 2026.",
      category: "pop-culture",
      author_name: "NeuralDev",
      rank_count: 19800,
      upvotes: 5410,
      items: [
        { id: "ai-1", name: "Claude", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-2", name: "Gemini", imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-3", name: "ChatGPT", imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-4", name: "Cursor / Antigravity", imageUrl: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-5", name: "Midjourney", imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-6", name: "Perplexity", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-7", name: "Suno AI", imageUrl: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-8", name: "ElevenLabs", imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-9", name: "v0", imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80" },
        { id: "ai-10", name: "NotebookLM", imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "programming-languages-meta",
      title: "Programming Languages Ranked (2026 Developer Meta)",
      description: "Developer happiness, ecosystem maturity, performance, and tooling across modern software engineering stacks.",
      category: "pop-culture",
      author_name: "ByteCraft",
      rank_count: 11200,
      upvotes: 3100,
      items: [
        { id: "pl-1", name: "TypeScript", imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-2", name: "Python", imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-3", name: "Rust", imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-4", name: "Go", imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-5", name: "C++", imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-6", name: "Java", imageUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-7", name: "C#", imageUrl: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-8", name: "Swift", imageUrl: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-9", name: "Kotlin", imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80" },
        { id: "pl-10", name: "PHP", imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "gta-franchise-games",
      title: "Grand Theft Auto (GTA) Franchise Ranked",
      description: "From GTA III's revolution to GTA: San Andreas, GTA IV, and GTA V ahead of the next release.",
      category: "gaming",
      author_name: "ViceCityResident",
      rank_count: 25400,
      upvotes: 6120,
      items: [
        { id: "gta-1", name: "GTA: San Andreas", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-2", name: "GTA V", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-3", name: "GTA IV", imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-4", name: "GTA: Vice City", imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-5", name: "GTA III", imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-6", name: "GTA: Liberty City Stories", imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-7", name: "GTA: Vice City Stories", imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-8", name: "GTA: Chinatown Wars", imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-9", name: "GTA Online", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80" },
        { id: "gta-10", name: "GTA: The Ballad of Gay Tony", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80" },
      ]
    },
    {
      id: "energy-drinks-showdown",
      title: "Ultimate Energy Drinks Tier List",
      description: "Flavor profiles, zero-sugar formulas, caffeine kick, and carbonation across the top beverage brands.",
      category: "food",
      author_name: "CaffeineFiend",
      rank_count: 8400,
      upvotes: 1950,
      items: [
        { id: "ed-1", name: "Monster Ultra White", imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-2", name: "Red Bull Original", imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-3", name: "Celsius Peach Vibe", imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-4", name: "Ghost Sour Patch", imageUrl: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-5", name: "Reign Orange Dreamsicle", imageUrl: "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-6", name: "C4 Frozen Bombsicle", imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-7", name: "Alani Nu Cosmic Stardust", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-8", name: "Rockstar Punched", imageUrl: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-9", name: "Bang Blue Razz", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80" },
        { id: "ed-10", name: "G Fuel PewDiePie", imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=300&q=80" },
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

  console.log('Done seeding all 12 templates to Supabase!');
}

seed();
