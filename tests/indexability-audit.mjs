import assert from "node:assert/strict";
import fs from "node:fs";
import { PAGE_EDITORIAL } from "../src/data/page-editorial.ts";
import { pageQuality } from "../src/lib/page-quality.ts";
import { templateQuality } from "../src/lib/indexability.ts";
import { TEMPLATE_EDITORIAL } from "../src/data/template-editorial.ts";

for (const route of Object.keys(PAGE_EDITORIAL)) assert(pageQuality(route).eligible, `${route} needs 200+ words`);
const fixture = { id: "unreviewed", slug: "unreviewed", items: Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `Real subject ${i}` })) };
assert(!templateQuality(fixture).eligible, "Publishing must not imply indexability");
for (const [slug, editorial] of Object.entries(TEMPLATE_EDITORIAL)) {
  const reviewed = { ...fixture, slug };
  assert(templateQuality(reviewed).eligible, `${slug}: intro 120–200 words, total 200+, three FAQs required`);
  assert(!templateQuality({ ...reviewed, items: reviewed.items.slice(0, 7) }).eligible, "Seven items must not qualify");
  assert(!templateQuality({ ...reviewed, items: [{ id: "placeholder", name: "Item #1" }, ...reviewed.items] }).eligible, "Generic roster names must not qualify");
  assert.equal(new Date(editorial.updated).toISOString().slice(0, 10), editorial.updated);
}
assert(!fs.readFileSync("src/app/sitemap.ts", "utf8").includes("new Date("), "Sitemap must never stamp build time");
console.log(`PASS: ${Object.keys(PAGE_EDITORIAL).length} page policies; ${Object.keys(TEMPLATE_EDITORIAL).length} reviewed template policies; unreviewed/short/generic templates excluded`);
