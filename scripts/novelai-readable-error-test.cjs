// Regression: NovelAI errors shown to the user are readable (JSON from the local proxy,
// raw upstream JSON, or Cloudflare HTML), never a raw HTML page. No network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ai', 'provider', 'novelai-provider.js'), 'utf8');
const sandbox = { console, window: {}, document: { addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} },
  setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext('class AIProvider { constructor() {} }\n' + src + '\nthis.NovelAIProvider = NovelAIProvider;', sandbox);
const P = sandbox.NovelAIProvider;

const proxyJson = JSON.stringify({ ok: false, status: 401, error: 'NovelAI Token 无效、已过期或未填写（401）。请在设置里重新填写 Persistent API Token。', detail: 'Invalid accessToken' });
let m = P.readableError(401, proxyJson);
assert.match(m, /^NovelAI failed: 401 NovelAI Token 无效/);
assert.match(m, /Invalid accessToken/);
assert.doesNotMatch(m, /[{}"]/, 'no raw JSON');

m = P.readableError(401, '<!DOCTYPE html><html><head><style>x{}</style></head><body><h1>Unauthorized</h1></body></html>');
assert.match(m, /Token/);
assert.doesNotMatch(m, /<|x\{\}/, 'HTML stripped');

m = P.readableError(402, '{"statusCode":402,"message":"Not enough Anlas"}');
assert.match(m, /Anlas 不足/);
assert.match(m, /Not enough Anlas/);

m = P.readableError(503, 'x'.repeat(1000));
assert.match(m, /503/);
assert(m.length < 420);
console.log('PASS NovelAI readable errors (proxy JSON, upstream JSON, HTML)');
