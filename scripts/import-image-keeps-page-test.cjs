// Regression: File > Import image on a page that only had a manga template resized the
// A4 page to the imported picture (e.g. 512x512) and pushed the panels off the page,
// because "has content" was guessed from the undo-history length.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const cm = fs.readFileSync(path.join(root, 'js/canvas-manager.js'), 'utf8');
const pm = fs.readFileSync(path.join(root, 'js/sidebar/panel/panel-manager.js'), 'utf8');
const m = cm.match(/function pageHasUserContent\(\) \{[\s\S]*?\n\}\n/);
assert.ok(m, 'pageHasUserContent exists');
const check = objects => {
  const ctx = { canvas: { getObjects: () => objects }, isPlaceholderCanvasObject: o => !!o.placeholder };
  vm.createContext(ctx); vm.runInContext(m[0], ctx); return ctx.pageHasUserContent();
};
assert.strictEqual(check([]), false, 'empty page');
assert.strictEqual(check([{ placeholder: true }]), false, 'placeholder-only page is empty');
assert.strictEqual(check([{ isPanel: true }, { isPanel: true }]), true, 'template panels are content');
assert.strictEqual(check([{ placeholder: true }, { type: 'image' }]), true, 'image is content');
const importBlock = cm.slice(cm.indexOf("$('imageInput').addEventListener"), cm.indexOf('function changeView'));
assert.ok(/if \(pageHasUserContent\(\)\)/.test(importBlock), 'import uses pageHasUserContent');
assert.ok(!/stateStack\.length>2/.test(importBlock), 'import no longer guesses from history length');
assert.ok(/img\.set\(\{left:\(canvas\.width-img\.getScaledWidth\(\)\)\/2/.test(importBlock), 'imported image is centred');
assert.strictEqual((pm.match(/if \(pageHasUserContent\(\)\) \{/g) || []).length, 2, 'both drop paths use pageHasUserContent');
assert.ok(!/stateStack\.length>=2&&getObjectCount\(\)>0/.test(pm), 'drop no longer guesses from history length');
console.log('import-image-keeps-page-test: 9 checks PASS');
