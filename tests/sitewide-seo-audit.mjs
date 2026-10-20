import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Read-only audit of every sitemap page. Use --baseline to record existing issues.
const base = (process.env.AUDIT_BASE_URL || 'http://localhost:3012').replace(/\/$/, '');
const output = process.env.SEO_REPORT_PATH || 'tests/seo/sitewide-report.json';
const baseline = process.argv.includes('--baseline');
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] || '');
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
assert(urls.length > 0, 'No public sitemap URLs');
const origin = new URL(urls[0]).origin;
const pages = [];
const issues = [];
for (const url of urls) {
  const path = new URL(url).pathname;
  const start = performance.now();
  const response = await fetch(`${base}${path}`);
  const html = await response.text();
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]);
  const links = [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => {
    const href = attr(match[1], 'href');
    const text = decode(match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    return { href, text, rel: attr(match[1], 'rel') };
  }).filter(link => link.href);
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]).find(tag => attr(tag, 'rel') === 'canonical');
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
  const description = attr(meta.find(tag => attr(tag, 'name') === 'description') || '', 'content');
  const ogTitle = attr(meta.find(tag => attr(tag, 'property') === 'og:title') || '', 'content');
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
  const page = { path, status: response.status, title, description, canonical: attr(canonical || '', 'href'), ogTitle,
    h1: [...markup.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map(match => decode(match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())),
    links, ids: [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => attr(match[0], 'id')),
    schemaTypes: jsonLd.flatMap(node => node['@graph'] || [node]).map(node => node['@type']),
    htmlBytes: Buffer.byteLength(html), responseMs: Math.round(performance.now() - start) };
  pages.push(page);
  if (response.status !== 200) issues.push(`${path}: HTTP ${response.status}`);
  if (!title || !description) issues.push(`${path}: missing title or description`);
  if (page.h1.length !== 1) issues.push(`${path}: ${page.h1.length} H1 headings`);
  if (page.canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) issues.push(`${path}: incorrect canonical`);
  if (meta.some(tag => attr(tag, 'name') === 'robots' && /noindex/.test(attr(tag, 'content')))) issues.push(`${path}: noindex sitemap page`);
  if (title !== ogTitle) issues.push(`${path}: social title differs from page title`);
}
const inbound = Object.fromEntries(pages.map(page => [page.path, new Set()]));
const outbound = new Map();
for (const page of pages) for (const link of page.links) {
  const url = new URL(link.href, `${origin}${page.path}`);
  if (url.origin === origin && inbound[url.pathname] && url.pathname !== page.path) inbound[url.pathname].add(page.path);
  if (/^https?:/.test(url.protocol) && url.origin !== origin) outbound.set(url.href, { url: url.href, rel: link.rel });
}
for (const page of pages) {
  page.inboundPages = inbound[page.path].size;
  if (page.path !== '/' && !page.inboundPages) issues.push(`${page.path}: no inbound link from another sitemap page`);
}
const titles = new Set();
const descriptions = new Set();
for (const page of pages) {
  if (titles.has(page.title)) issues.push(`${page.path}: duplicate title`);
  if (descriptions.has(page.description)) issues.push(`${page.path}: duplicate description`);
  titles.add(page.title);
  descriptions.add(page.description);
}
const internalPaths = new Set();
for (const page of pages) for (const link of page.links) {
  const url = new URL(link.href, `${origin}${page.path}`);
  if (url.origin !== origin) continue;
  internalPaths.add(url.pathname);
  const target = pages.find(candidate => candidate.path === url.pathname);
  if (target && url.hash && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) issues.push(`${page.path}: missing fragment ${url.pathname}${url.hash}`);
}
const linkChecks = [];
for (const path of internalPaths) {
  const known = pages.find(page => page.path === path);
  const status = known?.status || (await fetch(`${base}${path}`)).status;
  linkChecks.push({ path, status });
  if (status < 200 || status >= 400) issues.push(`${path}: broken internal link (HTTP ${status})`);
}
const home = await (await fetch(base)).text();
const scripts = [...new Set([...home.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => decode(match[1])))];
const assets = [];
for (const path of scripts) {
  const data = Buffer.from(await (await fetch(new URL(path, base))).arrayBuffer());
  assets.push({ path, bytes: data.length, gzipBytes: gzipSync(data).length });
}
const report = { base, generatedAt: new Date().toISOString(), pageCount: pages.length, issues,
  homeJavaScript: { requests: assets.length, gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0), assets },
  outboundLinks: [...outbound.values()], linkChecks, pages };
await fs.mkdir('tests/seo', { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pages: pages.length, issues, outboundLinks: report.outboundLinks, homeJavaScriptGzipBytes: report.homeJavaScript.gzipBytes, report: output }, null, 2));
if (!baseline) assert.deepEqual(issues, [], 'Site-wide SEO regressions');
