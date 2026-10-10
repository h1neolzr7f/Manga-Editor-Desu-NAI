// 换角色 v2 pure helpers: crop/aspect, placement, descriptor/similarity, grow+feather, tone match.
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

// placement: same framing → untouched; drifted → old height, bottom-centre aligned
let p = A.placement([0, 0, 100, 200], [2, 3, 101, 201]);
assert.strictEqual(p.adjusted, false);
p = A.placement([10, 10, 110, 210], [20, 0, 100, 160]);
assert(p.adjusted && Math.abs(p.scale - 1.25) < 1e-9);
assert(Math.abs(60 * p.scale + p.dx - 60) < 1e-9, 'centre x kept');
assert(Math.abs(160 * p.scale + p.dy - 210) < 1e-9, 'feet stay on the ground');
p = A.placement([0, 0, 100, 400], [0, 0, 100, 100]);
assert.strictEqual(p.scale, 1.4, 'scale clamped');

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

// grow + feather: a single pixel grows to a soft disc, centre stays opaque
const w = 21, h = 21, a = new Uint8ClampedArray(w * h); a[10 * w + 10] = 255;
const g = A.growFeather(a, w, h, 3, 2);
assert.strictEqual(g[10 * w + 10], 255);
assert(g[10 * w + 13] > 0 && g[10 * w + 13] < 255, 'soft edge');
assert.strictEqual(g[0], 0);

// tone match: a too-bright new character moves toward the old one (60% strength)
const src = px(200, 200, 200), ref = px(100, 100, 100);
A.toneMatch(src, all, ref, all, n, 0.6);
assert(Math.abs(src[0] - 140) <= 1, String(src[0]));
console.log('PASS auto-swap helpers: crop aspect/inside page, placement (feet aligned, clamped), descriptor similarity, feather, tone match');

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
