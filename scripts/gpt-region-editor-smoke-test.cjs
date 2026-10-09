// Offline UI smoke test: verifies the standalone editor parses and maps CSS pixels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/ai/gpt-region-editor.js'), 'utf8');
const listeners = new Map();
const sandbox = {
  document: {
    readyState: 'loading',
    addEventListener: (event, callback) => listeners.set(event, callback)
  },
  window: {}
};
vm.runInNewContext(source, sandbox, { filename: 'gpt-region-editor.js' });
const editor = sandbox.window.MangaGPTRegionEditor;
assert(editor);
assert.equal(typeof editor.startSelection, 'function');
assert.equal(typeof editor.normalizeRegion, 'function');
assert.equal(typeof listeners.get('DOMContentLoaded'), 'function');

const c = { getWidth: () => 2000, getHeight: () => 3000 };
const selection = editor.normalizeRegion(15, 20, 95, 110, { width: 100, height: 150 }, c);
assert.equal(JSON.stringify(selection), JSON.stringify({ left: 300, top: 400, width: 1600, height: 1800 }));
const reversed = editor.normalizeRegion(95, 110, 15, 20, { width: 100, height: 150 }, c);
assert.equal(JSON.stringify(reversed), JSON.stringify(selection));

assert(source.includes('/gpt-image-proxy'), 'image relay endpoint must be wired');
assert(source.includes('saveStateByManual'), 'image insertion must enter existing history');
assert(source.includes("state.references"), 'reference images must be included');

console.log('PASS GPT region editor parsing, proportional selection, history/relay wiring');
