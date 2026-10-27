import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const dist = process.env.NEXT_TEST_DIST_DIR || '.next-test-audit';
for (const file of ['src/components/Navbar.tsx', 'src/components/Footer.tsx', 'src/app/template/[id]/page.tsx']) {
  const source = fs.readFileSync(file, 'utf8');
  for (const tag of source.matchAll(/<Link\b[^>]*href="\/(?:create|versus|my-projects)"[^>]*>/g))
    assert(tag[0].includes('prefetch={false}'), `${file}: interactive route would preload its heavy bundle`);
}
const routes = ['elden-ring-bosses', 'overwatch-heroes', 'blox-fruits-fruits'];
const results = routes.map(slug => {
  const html = fs.readFileSync(`${dist}/server/app/template/${slug}.html`, 'utf8');
  const tags = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)];
  const scripts = [...new Set(tags.map(m => m[1]))];
  const chunks = scripts.filter(src => src.startsWith('/_next/')).map(src => {
    const file = path.join(dist, src.replace(/^\/_next\//, '').split('?')[0]);
    const data = fs.readFileSync(file);
    return { path: src, raw: data.length, gzip: gzipSync(data).length, legacyOnly: tags.some(m => m[1] === src && /nomodule/i.test(m[0])) };
  });
  const totalGzipBytes = chunks.reduce((sum, item) => sum + item.gzip, 0);
  assert(totalGzipBytes < 296547, `${slug}: initial JS regressed beyond production baseline`);
  assert(html.includes('Rank ') && html.includes('Open the editor'));
  const loader = fs.readFileSync('src/app/template/[id]/TemplateClientLoader.tsx', 'utf8');
  assert(loader.includes('if (opened) return <Studio'));
  const modernGzipBytes = chunks.filter(item => !item.legacyOnly).reduce((sum, item) => sum + item.gzip, 0);
  return { page: `/template/${slug}`, chunks, totalGzipBytes, modernGzipBytes, targetBytes: 100000, targetMet: modernGzipBytes < 100000 };
});
fs.mkdirSync('tests/.tmp-crawl-20261027', { recursive: true });
fs.writeFileSync('tests/.tmp-crawl-20261027/optimized-js.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(({page,totalGzipBytes,modernGzipBytes,targetMet}) => ({page,totalGzipBytes,modernGzipBytes,targetMet})), null, 2));
console.log('PASS: non-editor initial script payload reduced; strict 100 KB target reported separately');
