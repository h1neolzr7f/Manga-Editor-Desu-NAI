// Local model requests (OCR / LaMa): failures tell a beginner the next step.
const assert = require('node:assert');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/ai/manga-model-request.js'), 'utf8');
function load(fetchImpl) { const ctx = { fetch: fetchImpl, confirm: () => false, globalThis: null }; ctx.globalThis = ctx; vm.runInNewContext(src, ctx); return ctx.MangaModelRequest; }
const res = (status, body, json = true) => ({ status, ok: status >= 200 && status < 300,
  json: async () => { if (!json) throw new SyntaxError('Unexpected token <'); return body; } });
(async () => {
  let r = await load(async () => { throw new TypeError('Failed to fetch'); }).post('/manga-smart/lama-inpaint', {});
  assert.match(r.error, /一键启动/); assert.match(r.error, /127\.0\.0\.1:8000/);
  r = await load(async () => res(502, null, false)).post('/x', {});
  assert.match(r.error, /暂时不可用（HTTP 502）/); assert.match(r.error, /一键启动/);
  r = await load(async () => res(500, { ok: false, error: 'CUDA out of memory. Tried to allocate 2.00 GiB' })).post('/x', {});
  assert.match(r.error, /内存\/显存不足/); assert.match(r.error, /更小的区域/); assert.match(r.error, /CUDA out of memory/);
  r = await load(async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }).post('/x', {});
  assert.equal(r.cancelled, true);
  r = await load(async () => res(400, { ok: false, error: '红色去字区域必须非空' })).post('/x', {});
  assert.equal(r.error, '红色去字区域必须非空', 'server messages already readable are kept as-is');
  r = await load(async () => res(200, { ok: true, image: 'data:' })).post('/x', {});
  assert.equal(r.ok, true);
  console.log('PASS local model request errors: service down / 502 / out-of-memory give a next step; cancel + readable errors unchanged');
})().catch(e => { console.error(e); process.exit(1); });
