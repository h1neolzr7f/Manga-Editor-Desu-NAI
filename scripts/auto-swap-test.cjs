// 换角色 pure helpers: crop aspect/inside panel, prompt, descriptor/similarity, panel clip, identity matching.
const assert = require('node:assert');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const ctx = { globalThis: null }; ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/ai/auto-swap.js'), 'utf8'), ctx);
const A = ctx.AutoSwap;

// crop: tall figure → 2:3, contains the padded box, inside the page
let c = A.fitCrop([100, 100, 300, 500], 1238, 1754);
assert.strictEqual(c.size, '1024x1536');
assert(Math.abs(c.w / c.h - 2 / 3) < 0.01, JSON.stringify(c));
assert(c.x <= 100 && c.y <= 100 && c.x + c.w >= 300 && c.y + c.h >= 500);
// near the page corner: shifted inside, not clipped
c = A.fitCrop([0, 0, 400, 260], 1238, 1754);
assert(c.x === 0 && c.y === 0 && c.size === '1536x1024');
// figure larger than the page aspect allows: shrunk to fit, still inside
c = A.fitCrop([0, 0, 1238, 1754], 1238, 1754);
assert(c.x >= 0 && c.y >= 0 && c.x + c.w <= 1238 && c.y + c.h <= 1754, JSON.stringify(c));

// crop inside a panel: never crosses the panel border, keeps an API aspect
c = A.fitCropIn([620, 600, 900, 1100], [560, 551, 1182, 1119], 0.18);
assert(c.x >= 560 && c.y >= 551 && c.x + c.w <= 1182 && c.y + c.h <= 1119, JSON.stringify(c));
assert(['1024x1024', '1536x1024', '1024x1536'].includes(c.size));
// whole-figure crop: big character → whole panel; small one → box + margin inside the panel
c = A.swapCrop([60, 560, 600, 1110], [55, 551, 623, 1119], 1238, 1754);
assert(c.x <= 55 && c.y <= 551 && c.x + c.w >= 623 && c.y + c.h >= 1119, 'whole panel ' + JSON.stringify(c));
c = A.swapCrop([300, 700, 360, 800], [55, 551, 1182, 1119], 1238, 1754);
assert(c.x >= 55 && c.x + c.w <= 1182 && c.w < 600, 'small ' + JSON.stringify(c));
// figure mask: whole silhouette pasted even where change-only said "unchanged"; other characters protected
{ const w = 40, h = 20, own = new Uint8Array(w * h), oth = new Uint8Array(w * h), ch0 = new Uint8ClampedArray(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) own[y * w + x] = 1;
  for (let y = 0; y < h; y++) for (let x = 30; x < 40; x++) { oth[y * w + x] = 1; ch0[y * w + x] = 255; }
  const f = A.figureMask(ch0, own, oth, w, h, 3);
  assert(f[10 * w + 10] === 255 && f[10 * w + 3] === 255, 'silhouette + grow kept');
  assert(f[10 * w + 22] === 0, 'unchanged background stays original');
  { const ch1 = new Uint8ClampedArray(w * h).fill(255); const f2 = A.figureMask(ch1, own, oth, w, h, 2); assert(f2[10 * w + 26] === 0 && f2[10 * w + 18] === 255, 'changes far from the target are dropped when others share the crop'); }
  assert(f[10 * w + 35] === 0, 'other character protected even though it changed'); }
{ const h = A.targetHint({ id: 'a', face: [100, 300, 200, 400], box: [50, 250, 300, 600] }, [{ id: 'b', face: [600, 100, 700, 200], box: [550, 50, 800, 600] }], { x: 0, y: 0, w: 800, h: 600 });
  assert(/ONLY the one whose face is at the middle left/.test(h) && /Do NOT change the person whose face is at the upper right/.test(h), h); }
assert(/same neck and shoulders/.test(A.PROMPT_SWAP));
assert(/facial expression/.test(A.KEEP_EXPRESSION) && /eyes open or closed/.test(A.KEEP_EXPRESSION));
assert(/IN PLACE/.test(A.PROMPT_SWAP) && /speech bubbles/.test(A.PROMPT_SWAP));

// descriptor: grey art → hue weight ~0; same character in two panels scores higher than a different one
const n = 400, px = (r, g, b) => { const d = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) d.set([r, g, b, 255], i * 4); return d; };
const half = (a, b) => { const d = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) d.set(i < n / 2 ? a : b, i * 4); return d; };
const all = new Uint8Array(n).fill(1);
const grey = A.descriptor(px(120, 120, 120), all, n);
assert(grey.slice(12).reduce((s, v) => s + v, 0) < 1e-9, 'grey: no hue weight');
const girlA = A.descriptor(half([220, 90, 60, 255], [40, 40, 50, 255]), all, n);
const girlB = A.descriptor(half([215, 95, 62, 255], [45, 42, 52, 255]), all, n);
const boy = A.descriptor(half([60, 90, 220, 255], [30, 30, 30, 255]), all, n);
assert(A.similarity(girlA, girlB) > 0.9 && A.similarity(girlA, boy) < 0.8, [A.similarity(girlA, girlB), A.similarity(girlA, boy)].join());

console.log('PASS auto-swap helpers: crop aspect/inside page/inside panel, prompt, descriptor similarity');

// panel clip: nothing outside the panel (inset past its border line) survives
{
  const crop = { x: 100, y: 100, w: 10, h: 10 }, al = new Uint8ClampedArray(100).fill(255);
  A.clipToPanel(al, crop, [104, 0, 107, 1000], 2);       // usable columns: page x 106..104 → crop x 6..(107-2-100=5) → empty
  assert(al.every(v => v === 0), 'panel narrower than its border inset: nothing left');
  const b = new Uint8ClampedArray(100).fill(255);
  A.clipToPanel(b, crop, [103, 102, 1000, 108], 1);      // crop x >= 4, 3 <= y < 7
  assert.strictEqual(b[5 * 10 + 4], 255);
  assert.strictEqual(b[5 * 10 + 3], 0, 'left of the panel');
  assert.strictEqual(b[2 * 10 + 6], 0, 'above the panel');
  assert.strictEqual(b[7 * 10 + 6], 0, 'below the panel');
  console.log('PASS auto-swap panel clip');
}

// identity matches: same cluster pre-checked, close singleton offered unchecked, other clusters never
{
  const identity = { ids: ['g1', 'g2', 'g3', 'b1', 'b2', 'x'], cluster: { g1: 0, g2: 0, g3: 0, b1: 1, b2: 1, x: 2 },
    diff: [[0, .08, .07, .3, .28, .16], [.08, 0, .06, .35, .33, .2], [.07, .06, 0, .36, .35, .21], [.3, .35, .36, 0, .11, .17], [.28, .33, .35, .11, 0, .2], [.16, .2, .21, .17, .2, 0]] };
  const panel = { g1: 0, g2: 1, g3: 2, b1: 0, b2: 3, x: 3 };
  const m = A.identityMatches(identity, 'g1', id => panel[id]);
  assert.deepStrictEqual(m.map(r => r.id + (r.sure ? '!' : '?')).join(','), 'g3!,g2!,x?');
  assert(!m.some(r => r.id.startsWith('b')), 'boys never offered for a girl');
  const mb = A.identityMatches(identity, 'b1', id => panel[id]);
  assert.strictEqual(mb.map(r => r.id + (r.sure ? '!' : '?')).join(','), 'b2!,x?');
  assert.strictEqual(A.identityMatches(null, 'g1', id => panel[id]), null);
  assert(/Keep the clothing/.test(A.KEEP_OUTFIT));
  console.log('PASS auto-swap identity matching');
}
