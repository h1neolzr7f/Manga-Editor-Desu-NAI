// Regression: GPT region edits must not erase panel borders / gutters inside the selection.
// Real gpt-image-2 calls (case A/B, 2026-10-09) redrew the selection and dropped the
// horizontal gutter line; panelLineAlpha keeps long straight dark runs from the original.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/ai/gpt-region-editor.js'), 'utf8');
const sandbox = { document: { readyState: 'loading', addEventListener() {} }, window: {} };
vm.runInNewContext(source, sandbox);
const { panelLineAlpha, combineAlpha } = sandbox.window.MangaGPTRegionEditor;

function page(w, h, draw) {
  const px = new Uint8ClampedArray(w * h * 4).fill(255);
  const set = (x, y, v) => { const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = v; };
  draw(set);
  return px;
}
const W = 200, H = 150;
// horizontal gutter (4px) across, vertical border (3px) on the right, a character with short strokes
const px = page(W, H, set => {
  for (let y = 70; y < 74; y++) for (let x = 0; x < W; x++) set(x, y, 10);
  for (let x = 180; x < 183; x++) for (let y = 0; y < H; y++) set(x, y, 20);
  for (let y = 20; y < 50; y++) for (let x = 40; x < 60; x++) if ((x + y) % 7 === 0) set(x, y, 0); // hatching
  for (let x = 90; x < 120; x++) set(x, 30, 0); // a short 30px stroke (hair line) - not a panel line
  for (let y = 80; y < 150; y++) for (let x = 100; x < 140; x++) set(x, y, 40); // dark skirt: tall dark fill, 40px wide
  for (let y = 90; y < 150; y++) set(60, y, 0); // a pleat: long thin straight stroke that ends inside the picture
  for (let x = 0; x < W; x++) { set(x, 69, 150); set(x, 74, 230); } // AA edge (mid gray) and light content next to gutter
});
const a = panelLineAlpha(px, W, H);
assert(a, 'lines found');
for (let x = 0; x < W; x += 13) for (let y = 70; y < 74; y++) assert.equal(a[y * W + x], 0, 'gutter kept at ' + x + ',' + y);
assert.equal(a[69 * W + 50], 0, 'AA edge above gutter protected');
assert.equal(a[74 * W + 50], 255, 'light content next to the line is NOT pulled from the original');
assert.equal(a[66 * W + 50], 255, 'nothing beyond 1px');
assert.equal(a[120 * W + 120], 255, 'tall dark fill (old clothes) is not a line');
assert.equal(a[100 * W + 60], 255, 'unanchored straight stroke (pleat) is redrawable');
assert.equal(a[100 * W + 181], 0, 'vertical border kept');
assert.equal(a[30 * W + 100], 255, 'short stroke is redrawable');
assert.equal(a[30 * W + 47], 255, 'hatching is redrawable');
assert.equal(a[10 * W + 10], 255, 'empty area is redrawable');
let zero = 0; for (const v of a) if (v === 0) zero++;
assert(zero < W * H * 0.15, 'only lines are protected: ' + zero);
console.log('PASS panel gutter / border lines protected, character strokes and hatching left to the model');

assert.equal(panelLineAlpha(page(W, H, () => {}), W, H), null, 'blank -> null');
const transparent = page(W, H, set => { for (let x = 0; x < W; x++) set(x, 10, 0); });
for (let x = 0; x < W; x++) transparent[(10 * W + x) * 4 + 3] = 0;
assert.equal(panelLineAlpha(transparent, W, H), null, 'transparent dark pixels are not ink');
console.log('PASS blank / transparent selection yields no line mask');

const m = combineAlpha(Uint8ClampedArray.from([255, 0, 128]), Uint8ClampedArray.from([0, 255, 200]));
assert.deepEqual(Array.from(m), [0, 0, 128]);
assert.equal(combineAlpha(null, null), null);
console.log('PASS line mask combines with the transparency mask (minimum)');

assert(source.includes("mangaGptKeepLines") && /opt\('mangaGptKeepLines'[^)]*true\)/.test(source), 'option exists and defaults ON');
console.log('PASS keep-lines option present and on by default');
