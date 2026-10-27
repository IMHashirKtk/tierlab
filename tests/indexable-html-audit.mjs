import fs from "node:fs";
import assert from "node:assert/strict";
const root = `${process.env.NEXT_TEST_DIST_DIR || ".next-test-audit"}/server/app`;
const xml = fs.readFileSync(`${root}/sitemap.xml.body`, "utf8");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
for (const url of urls) {
  const route = new URL(url).pathname;
  const html = fs.readFileSync(`${root}/${route === "/" ? "index" : route.slice(1)}.html`, "utf8");
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  assert.equal(canonical, url, `${url}: sitemap/canonical mismatch`);
  assert(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html), `${url}: sitemap includes noindex`);
  assert(/<a\b[^>]*href="\//.test(clean), `${url}: no internal links in initial HTML`);
  for (const forbidden of ["Loading community rankings", "Awaiting first community submission", "No rankings yet", "No submissions yet", "Item #", "/user/Creator"])
    assert(!clean.includes(forbidden), `${url}: ${forbidden}`);
}
const home = fs.readFileSync(`${root}/index.html`, "utf8");
assert(home.includes("watermark-free images"), "Homepage metadata must match free watermark-free exports");
assert(!/href="\/create"[^>]*>Free Tier List Maker/.test(home));
console.log(`PASS: ${urls.length} sitemap URLs have exact canonicals, indexable metadata and no forbidden empty-state/profile text in initial HTML`);
