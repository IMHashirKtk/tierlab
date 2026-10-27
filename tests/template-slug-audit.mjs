import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { publishTemplate, fetchTemplateById, fetchTemplates, fetchSharedTierList } from '../src/lib/community.ts';
import { setMockSupabaseClient, setMockSessionUserId, resetMockSupabaseClient, resetMockSessionUserId } from '../src/lib/supabase.ts';
import { proxy } from '../src/proxy.ts';
import { templateQuality } from '../src/lib/indexability.ts';
import { templatePath } from '../src/lib/template-url.ts';
import { SEED_TEMPLATES } from '../src/data/seed-templates.ts';

const row = { id: 'b-ie9n', slug: 'blox-fruits-fruits', title: 'Blox Fruits Fruits', description: 'Fruit roster', category: 'gaming', author_id: 'owner', author_name: 'Creator', items: [{ id:'one',name:'One' },{ id:'two',name:'Two' }], default_tiers: [], created_at: '2026-10-22', upvotes: 3, rank_count: 2 };
const rows = new Map([[row.id,row]]);
let failRead = false;
let transientFailures = 0;
const storage = new Map([['tl_user_templates',JSON.stringify([{...row,slug:row.id,author:{username:'Creator'}}])]]);
globalThis.localStorage = { getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v) };
globalThis.window = {};
const originalEnvironment = process.env.VERCEL_ENV;
setMockSupabaseClient({ from(table) {
  const filters = new Map(); let insertion;
  const builder = {
    select(){return this;},eq(k,v){filters.set(k,v);return this;},order(){return this;},abortSignal(){return this;},
    insert(value){insertion=value;return this;},
    async maybeSingle(){
      if(transientFailures>0){transientFailures--;return {data:null,error:{message:'timeout'},status:0};}
      if(failRead) return {data:null,error:{message:'unavailable'}};
      if(table==='tier_lists') return {data:{id:'ranking',template_id:row.id,templates:{slug:row.slug},tiers:[],created_at:'2026-10-22'},error:null};
      return {data:[...rows.values()].find(r=>[...filters].every(([k,v])=>r[k]===v))??null,error:null};
    },
    async limit(){return {data:[...rows.values()],error:null};},
    then(resolve,reject){
      if(insertion) {
        // The server allocates the slug independently of the client's draft ID.
        const saved={...insertion,slug:'blox-fruits-fruits-2',created_at:'2026-10-22'};
        rows.set(saved.id,saved);
        return Promise.resolve({data:[saved],error:null}).then(resolve,reject);
      }
      return Promise.resolve({data:[...rows.values()],error:null}).then(resolve,reject);
    },
  };return builder;
}});
setMockSessionUserId('owner');
try {
  assert(SEED_TEMPLATES.every(t=>t.slug===t.id),'Library URLs must retain their established paths');
  assert.equal((await proxy(new NextRequest('https://tierlistmaker.app/categories/gaming/page/2'))).headers.get('x-middleware-next'), '1', 'Valid category pagination must reach the page');
  assert.equal((await proxy(new NextRequest('https://tierlistmaker.app/categories/gaming/page/0'))).status, 404);
  assert.equal((await proxy(new NextRequest('https://tierlistmaker.app/categories/unknown/page/2'))).status, 404);
  assert.equal((await fetchTemplateById(row.id)).slug,row.slug,'Cloud slug overrides old browser copy');
  assert.equal((await fetchTemplateById(row.slug)).id,row.id,'Public slug resolves to stable template identity');
  assert.equal((await fetchTemplates()).find(t=>t.id===row.id).slug,row.slug);
  const request = new NextRequest('https://tierlistmaker.app/template/b-ie9n?utm_source=old-link');
  const redirect = await proxy(request);
  assert.equal(redirect.status,301);
  assert.equal(redirect.headers.get('location'),'https://tierlistmaker.app/template/blox-fruits-fruits?utm_source=old-link');
  transientFailures=1;
  assert.equal((await proxy(request)).status,301,'Transient lookup timeout gets one bounded retry');
  assert.equal((await proxy(new NextRequest('https://tierlistmaker.app/template/blox-fruits-fruits'))).headers.get('location'),null,'Canonical path cannot redirect to itself');
  failRead=true;
  assert.equal((await proxy(request)).status,503,'Transient lookup failure must not cache a duplicate URL');
  failRead=false;
  const payload={existingId:'template-persisted-draft',title:row.title,description:row.description,category:'gaming',items:row.items};
  const published=await publishTemplate(payload);
  assert.equal(published.id,payload.existingId,'Draft ID and database identity remain stable');
  assert.equal(published.slug,'blox-fruits-fruits-2','Publish uses the confirmed database slug');
  assert.equal((await publishTemplate(payload)).slug,published.slug,'Lost-response retry retains canonical URL');
  setMockSessionUserId('other-owner');
  await assert.rejects(publishTemplate(payload),/not owned/);
  assert.equal((await fetchSharedTierList('ranking')).templateSlug,row.slug,'Remix links receive canonical slug through FK relationship');
  process.env.VERCEL_ENV='production';
  assert.equal(templatePath(published), '/template/' + published.slug);
  assert.equal(templateQuality(published).eligible, false, 'Two-item fixture must stay out of the quality-gated sitemap');
  console.log('PASS: stable IDs, canonical lookup, stale local copies, 301 with query preservation, retry ownership, joined remix links, and short-roster exclusion');
} finally {
  resetMockSupabaseClient();resetMockSessionUserId();
  if(originalEnvironment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnvironment;
  delete globalThis.window;delete globalThis.localStorage;
}
