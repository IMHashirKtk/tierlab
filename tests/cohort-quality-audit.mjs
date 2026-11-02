import fs from 'node:fs';import assert from 'node:assert/strict';
import {TEMPLATE_COHORT} from '../src/data/template-cohort.ts';
const root=`${process.env.NEXT_TEST_DIST_DIR||'.next-test-audit'}/server/app`;
const xml=fs.readFileSync(`${root}/sitemap.xml.body`,'utf8'),urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(urls.length,50);assert.equal(urls.filter(u=>u.includes('/template/')).length,40);
for(const [slug,count,category] of [['valorant-agents',29,'gaming'],['pokemon-starters',27,'gaming'],['fast-food-restaurants',40,'food']]) {
 assert(TEMPLATE_COHORT.includes(slug));assert(urls.includes(`https://tierlistmaker.app/template/${slug}`));
 const html=fs.readFileSync(`${root}/template/${slug}.html`,'utf8'),clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 assert(html.includes(`rel="canonical" href="https://tierlistmaker.app/template/${slug}"`));assert(html.includes('name="robots" content="index, follow"'));
 const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']||[]);
 const roster=graphs.find(g=>g['@type']==='ItemList');assert.equal(roster.numberOfItems,count);assert.equal(roster.itemListElement.length,count);
 for(const item of roster.itemListElement)assert(clean.includes(item.name.replaceAll('&','&amp;')),`${slug}: missing visible item ${item.name}`);
 assert(clean.includes('aria-label="Roster scope"'));assert(clean.includes('data-template-intro'));assert(clean.includes('data-template-faq'));
 assert(fs.readFileSync(`${root}/categories/${category}.html`,'utf8').includes(`href="/template/${slug}"`));
 assert(xml.includes(`<loc>https://tierlistmaker.app/template/${slug}</loc>\n<lastmod>2026-11-02</lastmod>`));
}
assert(!urls.includes('https://tierlistmaker.app/template/roblox-games'),'Unreviewed starter remains excluded');
assert(!xml.includes('/page/'),'Archive pages remain outside the sitemap');
for(const route of ['templates/page/2','templates/page/3','categories/gaming/page/2']){const h=fs.readFileSync(`${root}/${route}.html`,'utf8');assert(h.includes('name="robots" content="noindex, follow"'));assert(h.includes(`rel="canonical" href="https://tierlistmaker.app/${route}"`));}
console.log('PASS: cohort status metadata, real 29/27/40 rosters, direct indexed-hub links, deterministic dates and sitemap/archive exclusions');
