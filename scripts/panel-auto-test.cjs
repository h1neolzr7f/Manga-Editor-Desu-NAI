// Automatic panel detection core: XY-cut (MangaPageStructure) + tighten to ink, mapped to page pixels.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/ai/panel-auto.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
const A = ctx.PanelAuto;
// 400x300 white page, 20 px white margin; two panels side by side (gutter 20 px), each a grey fill
const W = 400, H = 300, data = new Uint8ClampedArray(W * H * 4).fill(255);
const fill = (x0, y0, x1, y1, v) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; } };
fill(20, 20, 190, 280, 120);   // left panel
fill(210, 20, 380, 280, 90);   // right panel
const img = { width: W, height: H, data };
const t = A.tighten(img, { x: 0, y: 0, width: 200, height: 300 });
assert.strictEqual(t.x, 20); assert.strictEqual(t.y, 20); assert.strictEqual(t.width, 170); assert.strictEqual(t.height, 260);
assert.strictEqual(A.tighten(img, { x: 190, y: 0, width: 20, height: 300 }), null, 'gutter has no ink');
// detection in page pixels of a 2x larger page; manga order right-to-left
const p = A.detectFrom(img, 800, 600, 'rtl');
assert.strictEqual(p.length, 2, JSON.stringify(p));
assert.ok(p[0].x > p[1].x, 'rtl: right panel first');
assert.strictEqual([p[1].x, p[1].y, p[1].w, p[1].h].join(), '40,40,340,520');
assert.strictEqual(p.map(x => x.n).join(), '1,2');
// an empty white page → no panels (whole-page fallback has no ink)
assert.strictEqual(A.detectFrom({ width: 50, height: 50, data: new Uint8ClampedArray(50 * 50 * 4).fill(255) }, 50, 50).length, 0);
console.log('PASS panel-auto: tighten to ink, page-pixel mapping, rtl order, empty page');
