import assert from 'node:assert/strict';
import fs from 'node:fs';
import { editorStart, templateEditorPath, resolveTemplateStart } from '../src/lib/editor-start.ts';
import { newBlankProject, projectFromTemplate } from '../src/lib/board.ts';
const existing = newBlankProject('existing-draft'); existing.title='Keep my draft';
const original = structuredClone(existing);
for (const [id,title,count] of [['v-hnc9','Valorant Agents',29],['p-3cbq','Pokémon Starters',27],['f-1a68','Fast Food Restaurants',40]]) {
  const template={id,slug:'public-slug',title,category:'gaming',description:'Fixture',author:{username:'Test'},itemCount:count,remixCount:0,upvotes:0,items:Array.from({length:count},(_,i)=>({id:`item-${i}`,name:`Fixture ${i}`}))};
  const path=templateEditorPath(template), start=editorStart(new URL(path,'https://example.test').searchParams);
  assert.deepEqual(start,{kind:'template',id});
  let requested; const result=await resolveTemplateStart(start.id,async key=>{requested=key;return template;});
  assert.equal(requested,id); assert.equal(result.status,'ready');
  const project=projectFromTemplate(result.template,'fresh-'+id);
  assert.equal(project.title,title); assert.equal(project.unranked.length,count); assert.notEqual(project.id,existing.id);
  project.unranked[0].name='Changed locally'; assert.equal(template.items[0].name,'Fixture 0');
}
assert.deepEqual(existing,original,'Starting a template must not mutate another project');
assert.deepEqual(editorStart(new URLSearchParams()),{kind:'blank'});
assert.equal(newBlankProject('blank').unranked.length,0);
assert.deepEqual(editorStart(new URLSearchParams('id=existing-draft&template=other')),{kind:'project',id:'existing-draft'});
assert.equal((await resolveTemplateStart('deleted',async()=>null)).status,'error');
assert.equal((await resolveTemplateStart('network',async()=>{throw Error('offline');})).status,'error');
assert.equal((await resolveTemplateStart('',async()=>{throw Error('must not fetch empty ID');})).status,'error');
if(process.argv.includes('--built')) {
  const root=`${process.env.NEXT_TEST_DIST_DIR||'.next-test-audit'}/server/app`;
  for(const [slug,id] of [['valorant-agents','v-hnc9'],['pokemon-starters','p-3cbq'],['fast-food-restaurants','f-1a68']]) {
    const html=fs.readFileSync(`${root}/template/${slug}.html`,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    assert.match(html,new RegExp(`href="/create\\?template=${id}"[^>]*>Open the editor`),`${slug}: intro CTA lost its template context`);
    assert.equal((html.match(new RegExp(`href="/create\\?template=${id}"`,'g'))||[]).length,3,`${slug}: all contextual links must retain the stable ID`);
  }
}
console.log('PASS: three template starts, stable IDs, blank/draft precedence, immutable drafts and invalid-ID recovery'+(process.argv.includes('--built')?', including real server-rendered contextual CTAs':''));
