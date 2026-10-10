// Regression: the shared service request/error layer gives one consistent, readable Chinese
// message per failure kind for every service, prefers the server's own readable message,
// never shows HTML, and maps timeouts/aborts/network errors.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/core/service/service-request.js'), 'utf8');
function load(fetchImpl) {
  const ctx = { window: {}, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, Blob, FormData, JSON, Error, Number, Object, String };
  vm.createContext(ctx); vm.runInContext(src, ctx); return ctx.window.ServiceRequest;
}
const SR = load(() => { throw new Error('unused'); });
const d = SR.describe;
assert.match(d('gpt', { network: true }), /127\.0\.0\.1:8000/);
assert.match(d('cutout', { network: true }), /本机抠图服务没有启动/);
assert.match(d('novelai', { status: 401 }), /NovelAI Token 无效/);
assert.match(d('gpt', { status: 403 }), /API Key 被拒绝/);
assert.match(d('gpt', { status: 429 }), /太频繁或额度不足/);
assert.match(d('gpt', { status: 530 }), /暂时不可用（HTTP 530）/);
assert.match(d('local', { status: 404 }), /HTTP 404/);
assert.equal(d('gpt', { aborted: true }), '已取消请求。');
assert.match(d('novelai', { timeout: true }), /超时/);
assert.equal(d('gpt', { status: 400, body: { ok: false, error: '模型不能为空' } }), '模型不能为空');
assert.equal(d('gpt', { status: 502, body: { error: { message: '<html><title>x</title></html>' } } }), 'GPT 图像服务暂时不可用（HTTP 502），这次没有生成结果，请稍后重试。');
assert.match(d('gpt', { status: 401, body: { error: 'Unauthorized' } }), /^Unauthorized。API Key 被拒绝/);
for (const svc of ['gpt', 'novelai', 'local', 'cutout']) for (const info of [{ network: true }, { status: 500 }, { status: 401 }, { timeout: true }]) {
  const m = d(svc, info); assert(/[\u4e00-\u9fff]/.test(m) && !/undefined|\[object/.test(m), svc + ' ' + JSON.stringify(info) + ' -> ' + m);
}
(async () => {
  const ok = load(async (url, init) => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, url, method: init.method, ct: init.headers['Content-Type'] }) }));
  const r = await ok.request('local', '/manga-smart/status', { body: {} });
  assert.equal(r.method, 'POST'); assert.equal(r.ct, 'application/json');
  const bad = load(async () => ({ ok: false, status: 401, text: async () => '{"ok":false,"error":"Invalid token"}' }));
  await assert.rejects(bad.request('novelai', '/nai-proxy/health'), e => e.status === 401 && /NovelAI Token 无效/.test(e.userMessage));
  const okFalse = load(async () => ({ ok: true, status: 200, text: async () => '{"ok":false,"error":"请先填写"}' }));
  await assert.rejects(okFalse.request('gpt', '/x', { body: {} }), e => e.userMessage === '请先填写');
  const down = load(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(down.request('gpt', '/x'), e => e.network && /一键启动/.test(e.message));
  const slow = load((url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('a'); e.name = 'AbortError'; rej(e); })));
  await assert.rejects(slow.request('gpt', '/x', { timeoutMs: 30 }), e => /超时/.test(e.message));
  const ctl = new AbortController(); const p = slow.request('gpt', '/x', { signal: ctl.signal, timeoutMs: 5000 }); ctl.abort();
  await assert.rejects(p, e => e.message === '已取消请求。');
  console.log('PASS service request layer: consistent readable errors for gpt/novelai/local/cutout, timeout/abort/network, server messages kept, HTML hidden');
})().catch(e => { console.error(e); process.exit(1); });
