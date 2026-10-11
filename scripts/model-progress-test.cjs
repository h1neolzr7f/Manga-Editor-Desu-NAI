// First-use model download card text (js/ai/manga-model-request.js progressText).
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/ai/manga-model-request.js'), 'utf8'), ctx);
const T = ctx.MangaModelRequest.progressText;
let p = T([{ name: 'isnet-anime.onnx', done: 84 << 20, total: 168 << 20, seconds: 10 }], 11);
assert.strictEqual(p.pct, 50); assert.ok(/50%（84\.0 \/ 168 MB，约剩 10 秒）/.test(p.text), p.text);
p = T([{ name: 'a', done: 10 << 20, total: 600 << 20, seconds: 5 }], 5);
assert.ok(/约剩 5 分钟/.test(p.text), p.text);
p = T([{ name: 'a', done: 5 << 20, total: 0, seconds: 3 }], 3);
assert.strictEqual(p.pct, null); assert.ok(/已下载 5\.0 MB/.test(p.text));
p = T([], 42.4);
assert.strictEqual(p.pct, null); assert.ok(/已用 42 秒/.test(p.text));
console.log('PASS model download progress text: percent + MB + ETA, unknown size, library-managed downloads');
{ // prompt-helper images banner text
  const c2 = {}; c2.window = c2; vm.createContext(c2);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/ui/prompt-helper-images.js'), 'utf8'), c2);
  const D = c2.PromptHelperImages.describe;
  assert.strictEqual(D({ packs: [{ id: 'u', label: '上游示例图', files: 2, have: 2, bytes: 1, downloadable: true }] }), null);
  const it = D({ packs: [{ id: 'u', label: '上游示例图', files: 446, have: 0, bytes: 31457280, downloadable: true }, { id: 'n', label: 'NovelAI 素材示例图', files: 453, have: 0, bytes: 1, downloadable: false }] });
  assert.strictEqual(it.length, 2); assert.ok(/还差 446 张（约 30 MB）/.test(it[0].text)); assert.ok(it[0].downloadable && !it[1].downloadable);
  assert.ok(/暂时没有公开下载地址/.test(it[1].text));
  console.log('PASS prompt-helper images banner: hidden when complete, size + offline-friendly text per pack');
}
