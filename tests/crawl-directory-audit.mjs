import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.join(process.env.NEXT_TEST_DIST_DIR || ".next-test-audit", "server/app");
const read = route => fs.readFileSync(path.join(root, route === "/" ? "index.html" : `${route.slice(1)}.html`), "utf8")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m => m[1].replaceAll("&amp;", "&"));
const templates = html => new Set(links(html).filter(href => href.startsWith("/template/")));
const categories = ["gaming", "anime", "food", "movies", "music", "sports", "pop-culture"];
function crawl(base) {
  const queue = [base], visited = new Set(), result = new Set();
  while (queue.length) {
    const route = queue.shift();
    if (visited.has(route)) continue;
    visited.add(route);
    const html = read(route), urls = templates(html);
    assert((html.match(/<article\b/g) || []).length <= 24, `${route}: more than 24 directory cards`);
    assert((html.match(/<img\b/g) || []).length <= 100, `${route}: excessive preview images`);
    assert(!html.includes("Loading category hub"), `${route}: directory still hidden behind loading UI`);
    for (const url of urls) result.add(url);
    for (const href of links(html)) if (href.startsWith(`${base}/page/`) && !visited.has(href)) queue.push(href);
  }
  return { visited: visited.size, urls: result };
}
const hub = crawl("/templates");
const allCategories = new Set();
for (const category of categories) {
  assert(links(read("/templates")).includes(`/categories/${category}`), `Missing category ${category}`);
  const result = crawl(`/categories/${category}`);
  for (const url of result.urls) allCategories.add(url);
  console.log(`${category}: ${result.urls.size} templates across ${result.visited} HTML pages`);
}
assert.deepEqual([...allCategories].sort(), [...hub.urls].sort(), "Category directories must cover the entire public hub");
assert.equal((read("/").match(/<article\b/g) || []).length, 12, "Homepage must render twelve featured cards");
for (const slug of ["valorant-agents", "pokemon-starters", "fast-food-restaurants"]) {
  assert(templates(read("/")).has(`/template/${slug}`), `Missing featured cohort template ${slug}`);
  assert(templates(read("/templates")).has(`/template/${slug}`), `Cohort must have a direct link from the indexed hub`);
}
assert(links(read("/")).includes("/templates"), "Homepage must link the full hub");
console.log(`PASS: ${hub.urls.size} templates discoverable without executing JavaScript`);
