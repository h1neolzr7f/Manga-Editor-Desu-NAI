// Regression: panels are not selectable, so "click a panel, then a tone" put the tone on
// the last-added object (or showed "请先点一个分镜格子" forever). The panel under the
// user's last press on the page is now the target.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/sidebar/tone/tone-manager.js'), 'utf8');
const start = src.indexOf('var mangaToneLastPagePoint'), end = src.indexOf('function mangaToneRequireTarget');
assert.ok(start > 0 && end > start, 'targeting block found');
const rect = (name, x, y, w, h, extra) => Object.assign({ name, visible: true,
  containsPoint: p => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h }, extra);
const top = rect('top', 0, 0, 100, 50, { isPanel: true }), bottom = rect('bottom', 0, 60, 100, 50, { isPanel: true });
const text = rect('text', 10, 10, 20, 10, { type: 'textbox' });
let listener;
const upper = {};
const ctx = {
  document: { addEventListener: (type, fn) => { if (type === 'pointerdown') listener = fn; } },
  fabric: { Point: function (x, y) { this.x = x; this.y = y; } },
  canvas: { upperCanvasEl: upper, active: null, getActiveObject() { return this.active; },
    getObjects: () => [top, bottom, text], getPointer: e => ({ x: e.px, y: e.py }) },
  isPanel: o => !!(o && o.isPanel), isImage: o => !!(o && o.type === 'image'), getLastObject: () => text,
};
vm.createContext(ctx); vm.runInContext(src.slice(start, end), ctx);
assert.strictEqual(ctx.mangaToneTarget(), null, 'no click, last object is text -> no target');
listener({ target: upper, px: 50, py: 80 });
assert.strictEqual(ctx.mangaToneTarget(), bottom, 'press inside the bottom panel targets it');
listener({ target: {}, px: 50, py: 20 });
assert.strictEqual(ctx.mangaToneTarget(), bottom, 'presses outside the page are ignored');
listener({ target: upper, px: 50, py: 20 });
assert.strictEqual(ctx.mangaToneTarget(), top, 'press in the top panel retargets');
ctx.canvas.active = bottom;
assert.strictEqual(ctx.mangaToneTarget(), bottom, 'an explicit selection still wins');
bottom.visible = false; ctx.canvas.active = null; listener({ target: upper, px: 50, py: 80 });
assert.strictEqual(ctx.mangaToneTarget(), null, 'hidden panels are not targeted');
console.log('tone-target-click-test: 6 checks PASS');
