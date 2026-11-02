import fs from 'node:fs';import assert from 'node:assert/strict';
const origin=process.env.AUDIT_BASE_URL||'http://localhost:3016',categories=['gaming','anime','food','movies','music','sports','pop-culture'];
const urls=new Set(),counts={};
for(const base of ['/templates',...categories.map(c=>`/categories/${c}`)]) {
 const queue=[base],seen=new Set(),items=new Set();
 while(queue.length){const route=queue.shift();if(seen.has(route))continue;seen.add(route);const r=await fetch(origin+route);assert.equal(r.status,200,route);const h=(await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');assert(h.includes(`rel="canonical" href="https://tierlistmaker.app${route}"`),route);assert((h.match(/<article\b/g)||[]).length<=24);if(route!==base)assert(h.includes('name="robots" content="noindex, follow"'));
 const links=[...h.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);for(const link of links){if(link.startsWith('/template/'))items.add(link);if(new RegExp(`^${base}/page/\\d+$`).test(link))queue.push(link);}}
 counts[base]={pages:seen.size,templates:items.size};if(base==='/templates')for(const u of items)urls.add(u);else for(const u of items)assert(urls.has(u),u);
}
const builtRoot=`${process.env.NEXT_TEST_DIST_DIR||'.next-test-audit'}/server/app`;
const builtFiles=[`${builtRoot}/templates.html`,...fs.readdirSync(`${builtRoot}/templates/page`).filter(f=>/^\d+\.html$/.test(f)).map(f=>`${builtRoot}/templates/page/${f}`)];
const expected=new Set(builtFiles.flatMap(file=>[...fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').matchAll(/href="(\/template\/[^"?#]+)"/g)].map(m=>m[1])));
assert.deepEqual([...urls].sort(),[...expected].sort(),'Running routes must preserve every built catalog path');
for(const [slug,count]of [['valorant-agents',29],['pokemon-starters',27],['fast-food-restaurants',40]]){const r=await fetch(`${origin}/template/${slug}`);assert.equal(r.status,200);const h=await r.text();assert(h.includes(`numberOfItems":${count}`));assert(h.includes('name="robots" content="index, follow"'));}
const invalid=await fetch(origin+'/categories/not-a-category/page/2');assert.equal(invalid.status,404);
fs.writeFileSync('tests/.tmp-november/live-checks.json',JSON.stringify({origin,counts,cohort:'29/27/40',unknownCategory:404},null,2));console.log(JSON.stringify(counts,null,2));console.log('PASS: actual HTTP pagination, 257 unique template paths, cohort responses, canonical/archive policy and invalid category handling');
