import fs from "node:fs";
import assert from "node:assert/strict";
import { TEMPLATE_EDITORIAL } from "../src/data/template-editorial.ts";

const root = `${process.env.NEXT_TEST_DIST_DIR || ".next-test-audit"}/server/app`;
const decode = text => text.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&#39;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const xml = fs.readFileSync(`${root}/sitemap.xml.body`, "utf8");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.equal(urls.filter(u => u.includes("/template/")).length, 40);
for (const [slug, editorial] of Object.entries(TEMPLATE_EDITORIAL)) {
  const html = fs.readFileSync(`${root}/template/${slug}.html`, "utf8");
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const text = decode(clean.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const title = decode(html.match(/<title>([^<]+)/)[1]);
  assert(title.length <= 60, `${slug}: title longer than 60`);
  assert.equal(title, `${editorial.topic} Tier List Maker (Free Template)`);
  assert(text.includes(`${editorial.topic} Tier List Template`));
  assert(clean.includes('data-reviewed="true"'), `${slug}: missing reviewed permanent intro`);
  for (const p of editorial.intro) assert(text.includes(p.replace(/\s+/g, " ")), `${slug}: intro not visible in initial HTML`);
  for (const f of editorial.faqs) { assert(text.includes(f.question)); assert(text.includes(f.answer)); }
  assert(!text.includes("Item #"), `${slug}: generic item labels remain`);
  assert(!text.includes("Loading template"), `${slug}: loading text remains`);
  assert(!text.includes("No submissions yet"), `${slug}: empty consensus remains`);
  const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])).find(s => s["@graph"]?.some(e => e["@type"] === "ItemList"))["@graph"];
  const roster = graph.find(e => e["@type"] === "ItemList");
  assert(roster.numberOfItems >= 8);
  for (const item of roster.itemListElement) assert(text.includes(item.name), `${slug}: missing visible roster name ${item.name}`);
  assert(clean.includes(`href="/categories/`));
  assert(clean.includes('href="/create"'));
  assert(urls.includes(`https://tierlistmaker.app/template/${slug}`));
}
console.log("PASS: 40 reviewed pages with permanent 120–200 word intros, three visible FAQs, complete named rosters, exact titles and sitemap URLs");
