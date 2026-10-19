import assert from 'node:assert/strict';

const base = (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const canonicalOrigin = 'https://tierlistmaker.app';
const sitemapResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
assert(urls.length >= 34, 'Public pages missing from sitemap');
assert(urls.every(url => url.startsWith(canonicalOrigin) && !/launch-test|\/create$|\/user\//.test(url)));

for (const url of urls) {
  const path = new URL(url).pathname;
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, `${path}: broken sitemap page`);
  const html = await response.text();
  assert(!/<meta name="robots" content="[^"]*noindex/.test(html), `${path}: sitemap contains noindex page`);
  assert(html.includes(`rel="canonical" href="${canonicalOrigin}${path === '/' ? '' : path}"`) || html.includes(`rel="canonical" href="${canonicalOrigin}${path}"`), `${path}: wrong canonical`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(match[1]);
}

for (const path of ['/create', '/my-projects', '/versus', '/user/readiness-empty-profile']) {
  const html = await (await fetch(`${base}${path}`)).text();
  assert(/<meta name="robots" content="[^"]*noindex/.test(html), `${path}: must be noindex`);
}
const missingCategory = await fetch(`${base}/categories/readiness-invalid-category`);
assert.equal(missingCategory.status, 404, 'Unsupported categories must return 404');
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert(robots.includes('Allow: /api/cdn/'));
assert(robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
console.log(`PASS: ${urls.length} public sitemap URLs, canonical consistency, JSON-LD syntax, utility/empty-profile exclusion, invalid categories, and public image crawling`);
