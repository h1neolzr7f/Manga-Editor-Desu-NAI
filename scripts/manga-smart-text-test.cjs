const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/ai/manga-smart-text-core.js'), 'utf8');
const context = { window: {}, console };
vm.runInNewContext(source, context, { filename: 'manga-smart-text-core.js' });
const core = context.window.MangaSmartTextCore;
assert(core, 'MangaSmartTextCore must be exposed');
const rect = core.normalizeBox({ x: -8, y: 190, width: 52, height: 30 }, 180, 200);
assert.deepEqual(JSON.parse(JSON.stringify(rect)), { x: 0, y: 190, width: 44, height: 10 });
assert.equal(core.normalizeBox({ x: 190, y: 2, width: 40, height: 10 }, 180, 200), null);
assert.equal(core.normalizeBox({ x: 5, y: 5, width: 0, height: 10 }, 180, 200), null);
assert.equal(core.normalizeBox({ x: 10, y: 8, width: 50, height: 20 }, 100, 100).width, 50);

const findings = core.mapDetections([
  { text: '你好', x: 15, y: 20, width: 140, height: 50, confidence: 86 },
  { text: '<script>alert(1)</script>', x: 5, y: 90, width: 60, height: 40, confidence: 78 },
  { text: ' ', x: 9, y: 60, width: 30, height: 20 },
  { text: 'out of page', x: 500, y: 4, width: 30, height: 30 }
], 180, 200);
assert.equal(findings.length, 2);
assert.equal(findings[0].text, '你好');
assert.equal(findings[1].text, '<script>alert(1)</script>');
assert.equal(findings[0].erase, true);
assert.equal(findings[0].vertical, false);

const lineColor = core.boundaryColor(new Uint8ClampedArray([
  249,249,248,255, 252,252,251,255, 250,249,249,255, 248,250,248,255
]));
assert.equal(lineColor.safe, true);
assert(lineColor.color.r >= 248 && lineColor.color.r <= 252);
const varied = core.boundaryColor(new Uint8ClampedArray([
  0,0,0,255, 255,255,255,255, 30,5,30,255, 240,220,240,255
]));
assert.equal(varied.safe, false, 'do not erase OCR text over complex artwork');
const translucent = core.boundaryColor(new Uint8ClampedArray([
  255,255,255,255, 255,255,255,0, 255,255,255,255
]));
assert.equal(translucent.safe, false, 'do not wipe transparent bubble art');

const object = core.normalizeManualDrag({ x: 160, y: 180 }, { x: 50, y: 60 }, 180, 200);
assert.deepEqual(JSON.parse(JSON.stringify(object)), { x: 50, y: 60, width: 110, height: 120 });
console.log('PASS smart text geometry, OCR drafts and safe erase color guards');
// fitText: a longer replacement shrinks (then wraps) instead of spilling out of the bubble.
{
  const measure = (t, size) => Array.from(t).length * size; // monospace CJK model
  const box = { x: 0, y: 0, width: 250, height: 50 };      // original 「ありがとう」 5 x 50
  const same = core.fitText('ありがとう', box, false, measure);
  assert.equal(same.fontSize, 43); assert.equal(same.wrapped, false);
  const longer = core.fitText('どうもありがとう', box, false, measure);   // 8 chars
  assert.ok(longer.fontSize <= 31 && longer.fontSize >= 23, 'shrinks to fit: ' + longer.fontSize);
  assert.ok(8 * longer.fontSize <= box.width);
  const long = core.fitText('本当にどうもありがとうございました', box, false, measure);
  assert.equal(long.wrapped, true);
  for (const line of long.text.split('\n')) assert.ok(measure(line, long.fontSize) <= box.width, line);
  const v = core.fitText('どうもありがとう', { x: 0, y: 0, width: 40, height: 200 }, true, measure);
  assert.ok(8 * v.fontSize * 1.02 <= 200 && !v.wrapped, 'vertical fits height');
  console.log('PASS fitText shrinks / wraps replacement captions to the original text area');
}
