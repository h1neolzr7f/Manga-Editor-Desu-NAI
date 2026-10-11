// Regression: toneStart() resolved the clicked panel, but updatecanvas() re-asked getLastObject(),
// so after an undo/redo reload (different stack/selection) the tone went to the wrong object
// (full-feature E2E 'screentone on the selected panel' got no clip). The resolved target must be used.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/sidebar/tone/tone.js'), 'utf8');
const panel = { name: 'clicked panel', isPanel: true, left: 0, top: 700, width: 100, height: 50, scaleX: 1, scaleY: 1 };
const other = { name: 'last object', type: 'textbox', width: 10, height: 10, scaleX: 1, scaleY: 1 };
const placed = [];
const el = v => ({ value: v, checked: false });
const ctx = {
  console, Math, parseInt,
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ scale() {}, clearRect() {} }), toDataURL: () => 'data:' }) },
  canvas: { width: 1000, getObjects: () => [panel, other], getActiveObject: () => null, remove() {}, add(o) { placed.push(['add', o]); }, renderAll() {} },
  fabric: { Image: { fromURL: (u, cb) => cb({ scaleToWidth() {} }) } },
  isPanel: o => !!(o && o.isPanel), getLastObject: () => other, mangaToneRequireTarget: () => panel,
  putImageInFrame: (img, x, y, a, b, c, target) => placed.push(['frame', target]),
  $: id => el(id.endsWith('grad-check') ? false : id.endsWith('dot-style') ? 'circle' : '5'),
  MODE_TONE: 'Tone', nowTone: null
};
vm.createContext(ctx); vm.runInContext(src, ctx);
assert.strictEqual(ctx.toneStart(), true);
ctx.updatecanvas();
assert.ok(placed.length >= 1 && placed.every(p => p[0] === 'frame'), 'tone is framed into a panel, not added unclipped');
assert.ok(placed.every(p => p[1] === panel), 'the panel toneStart resolved, not getLastObject()');
console.log('tone-target-apply-test: 2 checks PASS');
