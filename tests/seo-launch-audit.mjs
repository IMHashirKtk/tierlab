import assert from 'node:assert/strict';
import sitemap from '../src/app/sitemap.ts';
import robots from '../src/app/robots.ts';
import { getSiteUrl, canIndexSite, safeJsonLd } from '../src/lib/seo.ts';
import { setMockSupabaseClient, resetMockSupabaseClient } from '../src/lib/supabase.ts';

const site = process.env.NEXT_PUBLIC_SITE_URL;
const environment = process.env.VERCEL_ENV;
process.env.NEXT_PUBLIC_SITE_URL='https://tierlistmaker.app/';
setMockSupabaseClient({from() {return { select(){return this;}, order(){return this;}, async limit(){return {error:null,data:[
  {id:'launch-test-reusable-template-h3mu',items:[1,2,3],updated_at:'2026-10-19'},
  {id:'real-template',items:[1,2],updated_at:'2026-10-18T12:00:00Z'},
  {id:'invalid-items',items:null},
  {id:'empty-template',items:[]},
]};}};}});
try {
  process.env.VERCEL_ENV='production';
  assert.equal(getSiteUrl(),'https://tierlistmaker.app');
  assert.equal(canIndexSite(),true);
  const routes=await sitemap();
  assert(routes.some(r=>r.url.endsWith('/template/real-template')));
  assert(routes.every(r=>r.url.startsWith('https://tierlistmaker.app')));
  assert(!routes.some(r=>/launch-test|invalid-items|empty-template|\/create$|\/versus$|\/my-projects/.test(r.url)));
  assert.equal(routes.find(r=>r.url==='https://tierlistmaker.app').lastModified,undefined);
  assert.equal(robots().sitemap,'https://tierlistmaker.app/sitemap.xml');
  process.env.VERCEL_ENV='preview';
  assert.equal(canIndexSite(),false);
  assert.deepEqual(await sitemap(),[]);
  assert(!safeJsonLd({name:'</script><script>alert(1)</script>'}).includes('</script>'));
  console.log('PASS: production sitemap, preview exclusion, test/invalid/utility filtering, honest timestamps, domain consistency, and JSON-LD escaping');
} finally {
  resetMockSupabaseClient();
  if(site===undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL=site;
  if(environment===undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV=environment;
}
