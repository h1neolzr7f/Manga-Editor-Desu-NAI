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


// Headless end-to-end mock: select a region, send image request, insert one image
// object without clearing the old canvas, and record exactly one history snapshot.
class MockNode {
  constructor(tag = 'div') {
    this.tag = tag;
    this.style = {};
    this.handlers = {};
    this.children = [];
    this.disabled = false;
    this.hidden = false;
    this.value = '';
    this.dataset = {};
  }
  addEventListener(name, callback) { this.handlers[name] = callback; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute() {}
  setPointerCapture() {}
  remove() { this.removed = true; }
}

const elements = Object.fromEntries([
  'mangaGptStatus', 'mangaGptClose', 'mangaGptSelect', 'mangaGptGenerate',
  'mangaGptApply', 'mangaGptReplaceText', 'mangaGptMode',
  'mangaGptReferences', 'mangaGptReferenceList', 'mangaGptPreview',
  'mangaGptUrl', 'mangaGptModel', 'mangaGptSize', 'mangaGptKey',
  'mangaGptPrompt', 'mangaGptSubtitle', 'mangaGptAllowUpscale'
].map(id => [id, new MockNode('input')]));
elements.mangaGptMode.value = 'edit';
elements.mangaGptUrl.value = 'https://api.example.com/v1';
elements.mangaGptModel.value = 'gpt-image-1';
elements.mangaGptSize.value = 'auto';
elements.mangaGptKey.value = 'fake-key';
elements.mangaGptPrompt.value = 'only change the selected region';
const page = {
  upperCanvasEl: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 150 }) },
  getWidth: () => 2000, getHeight: () => 3000,
  toDataURL: () => 'data:image/png;base64,QUJDRA==',
  add(img) { this.added = img; },
  setActiveObject(img) { this.active = img; },
  getActiveObject() { return this.active; },
  requestRenderAll() {}
};
const fakeDocument = {
  readyState: 'loading',
  events: {},
  body: new MockNode('body'),
  createElement: tag => new MockNode(tag),
  getElementById: id => elements[id] || null,
  querySelector: selector => selector === '#canvas-area .area-header' ? new MockNode('header') : null,
  addEventListener(name, cb) { this.events[name] = cb; }
};
let saved = 0;
let proxyCalls = 0;
let proxyBody;
const sandbox2 = {
  document: fakeDocument, window: {}, canvas: page,
  location: { protocol: 'http:', origin: 'http://127.0.0.1:8000' },
  fabric: {
    Image: {
      fromURL: (_url, callback) => callback({
        width: 2200, height: 2200,
        set(attributes, value) {
          if (typeof attributes === 'string') this[attributes] = value;
          else Object.assign(this, attributes);
        }
      })
    }
  },
  fetch: async (_url, options) => {
    proxyCalls++;
    proxyBody = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer fake-key');
    return { ok: true, json: async () => ({
      ok: true, image: 'data:image/png;base64,QUJDRA=='
    }) };
  },
  saveStateByManual: () => saved++,
  changeDoNotSaveHistory() {},
  changeDoSaveHistory() {},
  updateLayerPanel() {}
};
vm.runInNewContext(source, sandbox2, { filename: 'gpt-region-editor.js' });
fakeDocument.events.DOMContentLoaded();
assert(fakeDocument.body.children.length >= 1, 'panel must be attached');
elements.mangaGptSelect.handlers.click();
const overlay = fakeDocument.body.children.at(-1);
overlay.handlers.pointerdown({ button: 0, clientX: 15, clientY: 20,
  pointerId: 1, preventDefault() {} });
overlay.handlers.pointerup({ clientX: 95, clientY: 110 });
assert(overlay.removed, 'selection overlay must not remain after crop');

(async () => {
  await elements.mangaGptGenerate.handlers.click();
  assert.equal(proxyCalls, 1);
  assert.equal(proxyBody.operation, 'edit');
  assert.equal(proxyBody.image, page.toDataURL());
  assert.equal(elements.mangaGptApply.disabled, false);
  await elements.mangaGptApply.handlers.click();
  assert(page.added, 'a new Fabric image must be added');
  assert.equal(page.added.left, 300);
  assert.equal(page.added.top, 400);
  assert.equal(page.added.scaleX, 1600 / 2200);
  assert.equal(page.added.scaleY, 1800 / 2200);
  assert.equal(saved, 1, 'one history snapshot for one applied patch');
  assert.equal(page.getWidth(), 2000);
  assert.equal(page.getHeight(), 3000);
  elements.mangaGptSubtitle.value = '新的字幕';
  page.active = {
    type: 'textbox', set(name, value) { this[name] = value; }, setCoords() {}
  };
  elements.mangaGptReplaceText.handlers.click();
  assert.equal(page.active.text, '新的字幕');
  assert.equal(saved, 2, 'one history snapshot for text replacement');
  console.log('PASS mocked region selection -> HTTP -> Fabric layer -> undo snapshot');
})().catch(err => { console.error(err); process.exitCode = 1; });
