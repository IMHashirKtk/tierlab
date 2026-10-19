import assert from 'node:assert/strict';
import { getItemImageUrl } from '../src/lib/image-url.ts';

const key = 'items/964d676e0d9cb46f197a5c33.webp';
const base = 'https://owned.r2.dev';
assert.equal(getItemImageUrl(`${base}/${key}`, base), `/api/cdn/${key}`);
assert.equal(getItemImageUrl(`${base}/${key}?v=1`, `${base}/`), `/api/cdn/${key}`);
assert.equal(getItemImageUrl(`${base}/assets/${key}`, `${base}/assets`), `/api/cdn/${key}`);
for (const src of [
  `https://other.r2.dev/${key}`, `https://owned.r2.dev.evil.test/${key}`,
  `${base}/private/image.webp`, `${base}/assets-extra/${key}`,
  `${base}/items/../../secret.webp`, `${base}/items/%2e%2e%2fsecret.webp`,
  'data:image/webp;base64,test', 'blob:https://example.test/test', `/api/cdn/${key}`,
]) assert.equal(getItemImageUrl(src, base), src, src);
assert.equal(getItemImageUrl(`${base}/${key}`, ''), `${base}/${key}`);
assert.equal(getItemImageUrl(`${base}/${key}`, 'invalid'), `${base}/${key}`);
console.log('PASS: owned R2 image routing, custom path prefix, third-party preservation, and path boundaries');
