import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const origin='https://tierlistmaker.app', cache=new Map();
const results=[];
for(const slug of ['elden-ring-bosses','overwatch-heroes','blox-fruits-fruits']) {
  const response=await fetch(`${origin}/template/${slug}`); assert.equal(response.status,200);
  const html=await response.text(), tags=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)];
  const chunks=[];
  for(const tag of tags) {
    if(!tag[1].startsWith('/_next/')) continue;
    if(!cache.has(tag[1])) {const r=await fetch(origin+tag[1]);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());cache.set(tag[1],{raw:bytes.length,gzip:gzipSync(bytes).length});}
    chunks.push({path:tag[1],...cache.get(tag[1]),legacyOnly:/nomodule/i.test(tag[0])});
  }
  const totalGzipBytes=chunks.reduce((sum,c)=>sum+c.gzip,0),modernGzipBytes=chunks.filter(c=>!c.legacyOnly).reduce((sum,c)=>sum+c.gzip,0);
  assert(totalGzipBytes<296547,'Initial script payload must improve over the production baseline');
  results.push({page:`/template/${slug}`,chunks,totalGzipBytes,modernGzipBytes,targetMet:modernGzipBytes<100000});
}
await fs.writeFile('tests/.tmp-crawl-20261027/production-js.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({page,totalGzipBytes,modernGzipBytes,targetMet})=>({page,totalGzipBytes,modernGzipBytes,targetMet})),null,2));
