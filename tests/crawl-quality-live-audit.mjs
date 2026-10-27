import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
const exec = promisify(execFile);
const origin = 'https://tierlistmaker.app';
const directory = 'tests/.tmp-crawl-20261027/release';
await fs.mkdir(directory, { recursive: true });
let serial = 0;
async function read(url, bot = true) {
  const key = serial++;
  const body = `${directory}/${key}.html`, head = `${directory}/${key}.headers`;
  const { stdout } = await exec('curl.exe', ['--silent', '--show-error', '--retry', '1', '--max-time', '60', '-A', bot ? 'Googlebot/2.1' : 'Mozilla/5.0', '-D', head, '-o', body, '-w', '%{http_code}|%{num_redirects}', url]);
  const html = await fs.readFile(body, 'utf8'), headers = await fs.readFile(head, 'utf8');
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const links = [...clean.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map(m => m[1].replaceAll('&amp;', '&'));
  const result = { url, status: +stdout.split('|')[0], redirects: +stdout.split('|')[1], canonical: clean.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1] || null,
    xRobotsTag: headers.match(/^x-robots-tag:\s*(.+)/im)?.[1]?.trim() || null, challenge: headers.match(/^x-vercel-mitigated:\s*(.+)/im)?.[1]?.trim() || null,
    robots: clean.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/i)?.[1] || null, internalLinks: links.filter(x => x.startsWith('/')).length };
  return { result, html, clean, links };
}
const sitemap = await read(`${origin}/sitemap.xml`);
const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.equal(urls.length, 50);
const bots = [];
for (let i = 0; i < urls.length; i += 3) bots.push(...await Promise.all(urls.slice(i, i + 3).map(async url => {
  const { result, clean } = await read(url);
  assert.equal(result.status, 200, url); assert.equal(result.redirects, 0, url); assert.equal(result.canonical, url, url);
  assert(!result.challenge && !/noindex/i.test(result.xRobotsTag || '') && !/noindex/.test(result.robots || ''), url);
  assert(result.internalLinks > 0, url);
  for (const bad of ['Loading community rankings', 'Awaiting first community submission', 'No rankings yet', 'No submissions yet', 'Item #', '/user/Creator']) assert(!clean.includes(bad), `${url}: ${bad}`);
  return result;
})));
const pool = [...urls], normal = [];
for (let i = 0; i < 10; i++) {
  const url = pool.splice(randomInt(pool.length), 1)[0];
  const { result } = await read(url, false);
  assert.equal(result.status, 200); assert.equal(result.canonical, url); assert.equal(result.redirects, 0);
  normal.push(result);
}
const queue = ['/templates'], visited = new Set(), discovered = new Set();
while (queue.length) {
  const route = queue.shift(); if (visited.has(route)) continue; visited.add(route);
  const { result, links } = await read(`${origin}${route}`); assert.equal(result.status, 200);
  const templates = [...new Set(links.filter(link => link.startsWith('/template/')))]; assert(templates.length <= 100);
  templates.forEach(link => discovered.add(link));
  links.filter(link => /^\/templates\/page\/\d+$/.test(link)).forEach(link => queue.push(link));
}
assert(discovered.size >= 257);
const categoryCounts = {};
for (const category of ['gaming', 'anime', 'food', 'movies', 'music', 'sports', 'pop-culture']) {
  const base = `/categories/${category}`, pending = [base], seen = new Set(), found = new Set();
  while (pending.length) {
    const route = pending.shift(); if (seen.has(route)) continue; seen.add(route);
    const { result, links } = await read(`${origin}${route}`); assert.equal(result.status, 200);
    const templates = [...new Set(links.filter(link => link.startsWith('/template/')))]; assert(templates.length <= 100);
    templates.forEach(link => { found.add(link); assert(discovered.has(link)); });
    links.filter(link => new RegExp(`^${base}/page/\\d+$`).test(link)).forEach(link => pending.push(link));
  }
  categoryCounts[category] = found.size;
}
const unreviewed = await read(`${origin}/template/roblox-games`);
assert.equal(unreviewed.result.status, 200); assert.match(unreviewed.result.robots, /noindex/); assert(!urls.includes(unreviewed.result.url));
const comparison = await read(`${origin}/tiermaker-alternative`); assert.match(comparison.result.robots, /noindex/);
const robots = await read(`${origin}/robots.txt`); assert.equal((robots.html.match(/Sitemap:/g) || []).length, 1); assert(robots.html.includes(`Sitemap: ${origin}/sitemap.xml`)); assert.match(robots.html, /Allow: \/\s/);
const report = { checkedAt: new Date().toISOString(), sitemapCount: urls.length, googlebot: bots, normalSample: normal, discoveredTemplates: discovered.size, categoryCounts, unreviewed: unreviewed.result, comparison: comparison.result };
await fs.writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ sitemapCount: urls.length, normalSample: normal, discoveredTemplates: discovered.size, categoryCounts }, null, 2));
console.log('PASS: production Googlebot fetches, exact canonicals, quality gates, no empty states and complete paginated discovery');
