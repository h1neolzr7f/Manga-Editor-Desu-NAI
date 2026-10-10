// Offline UI smoke test: verifies the standalone editor parses and maps CSS pixels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const launcher = fs.readFileSync(path.join(__dirname, '../start_manga_editor_nai.ps1'), 'utf8');
assert(launcher.includes('Get-EnvValue "GPT_IMAGE_API_KEY"'), 'launcher must load optional GPT image key');
assert(launcher.includes('Get-EnvValue "GPT_IMAGE_TRUSTED_BASE_URL"'), 'launcher must pin env key to trusted base URL');
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
  'mangaGptUrl', 'mangaGptModel', 'mangaGptModelPreset', 'mangaGptSize', 'mangaGptKey',
  'mangaGptPrompt', 'mangaGptSubtitle', 'mangaGptAllowUpscale', 'mangaGptCancel', 'mangaGptIncludeText'
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
  createElement: tag => {
    const node = new MockNode(tag);
    if (tag === 'canvas') {
      node.drawn = [];
      node.getContext = () => ({ fillRect() {}, drawImage: (...args) => node.drawn.push(args), set fillStyle(v) {},
        getImageData: (x, y, w, h) => (node.pixels = { data: new Uint8ClampedArray(w * h * 4).fill(255) }),
        putImageData: data => { node.put = data; } });
      node.toDataURL = () => 'data:image/png;base64,UEFEREVE';
      createdCanvases.push(node);
    }
    return node;
  },
  getElementById: id => elements[id] || null,
  querySelector: selector => selector === '#canvas-area .area-header' ? new MockNode('header') : null,
  addEventListener(name, cb) { this.events[name] = cb; }
};
let saved = 0;
const createdCanvases = [];
class MockImage {
  set src(value) { this._src = value; this.width = 1600; this.height = 1800; setTimeout(() => this.onload(), 0); }
}
let proxyCalls = 0;
const windowListeners = {};
const windowMock = {
  addEventListener(name, cb) { (windowListeners[name] = windowListeners[name] || new Set()).add(cb); },
  removeEventListener(name, cb) { if (windowListeners[name]) windowListeners[name].delete(cb); }
};
let proxyBody;
const baked = { w: 0, h: 0 };
const sandbox2 = {
  document: fakeDocument, window: windowMock, canvas: page, Image: MockImage, setTimeout, clearTimeout,
  location: { protocol: 'http:', origin: 'http://127.0.0.1:8000' },
  fabric: {
    Image: {
      fromURL: (url, callback) => callback(url === 'data:image/png;base64,UEFEREVE' ? {
        width: baked.w, height: baked.h, getElement: () => ({}),
        set(attributes, value) {
          if (typeof attributes === 'string') this[attributes] = value;
          else Object.assign(this, attributes);
        }
      } : {
        width: 2200, height: 2200, getElement: () => ({}),
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
assert.equal((windowListeners.scroll || new Set()).size, 0, 'scroll listener removed after selection');

// A page scroll / resize during selection aborts it instead of mapping to the wrong pixels.
const savedRegionStatus = elements.mangaGptStatus.textContent;
elements.mangaGptSelect.handlers.click();
const overlay2 = fakeDocument.body.children.at(-1);
assert.equal(windowListeners.scroll.size, 1);
[...windowListeners.scroll][0]();
assert(overlay2.removed, 'overlay removed when the page scrolls');
assert.match(elements.mangaGptStatus.textContent, /重新点/);
assert.equal(windowListeners.scroll.size, 0);
assert.equal(windowListeners.resize.size, 0);
elements.mangaGptStatus.textContent = savedRegionStatus;

(async () => {
  await elements.mangaGptGenerate.handlers.click();
  assert.equal(proxyCalls, 1);
  assert.equal(proxyBody.operation, 'edit');
  // The 1600x1800 selection is letterboxed (white bars) to the nearest API aspect (1:1)
  // instead of being cropped, and the matching size is requested explicitly.
  assert.equal(proxyBody.size, '1024x1024');
  assert.equal(proxyBody.image, 'data:image/png;base64,UEFEREVE');
  const padded = createdCanvases.at(-1);
  assert.equal(padded.width, 1024);
  assert.equal(padded.height, 1024);
  // Padding is filled with the real page around the selection (context), then the
  // selection itself is drawn on top at the exact inner rectangle.
  assert.equal(padded.drawn.length, 2, 'context + selection');
  const [, cx, cy, cw, ch] = padded.drawn[0];
  assert(cx > -1 && cy > -1 && cw > 0 && ch > 0, 'context drawn inside the upload');
  const [, dx, dy, dw, dh] = padded.drawn[1];
  assert(Math.abs(dw / dh - 1600 / 1800) < 1e-9, 'selection keeps its aspect inside the letterbox');
  assert(dx > 0 && Math.abs(dy) < 1e-9 && Math.abs(dh - 1024) < 1e-9);
  assert.equal(elements.mangaGptApply.disabled, false);
  const createdBefore = createdCanvases.length;
  baked.w = 1956; baked.h = 2200; // native-resolution crop of the 2200x2200 result (1600:1800)
  await elements.mangaGptApply.handlers.click();
  const bake = createdCanvases.slice(createdBefore).find(c => c.drawn.length === 1 && c.drawn[0].length === 9);
  assert(bake && bake.drawn.length === 1, 'patch is baked at the crop native resolution');
  const [, sx, sy, sw, sh] = bake.drawn[0];
  assert(sx > 0 && sy === 0 && Math.abs(sw / sh - 1600 / 1800) < 1e-9, 'crop keeps the selection aspect');
  assert(bake.put, 'feathered alpha written (selection borders other artwork on all sides)');
  assert(page.added, 'a new Fabric image must be added');
  assert.equal(page.added.left, 300);
  assert.equal(page.added.top, 400);
  assert(Math.abs(page.added.scaleX / page.added.scaleY - 1) < 0.002, 'no stretching');
  assert(page.added.mangaGptCrop.x > 0 && page.added.mangaGptCrop.y === 0, 'letterbox bars are removed horizontally');
  assert.equal(page.added.cropX, 0);
  assert.equal(Math.round(page.added.width * page.added.scaleX), 1600);
  assert.equal(page.added.name, 'GPT 局部改图');
  assert.equal(page.added.mangaGptSource, 'openai-compatible-image');
  assert.equal(Math.round(page.added.height * page.added.scaleY), 1800);
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

  page.active = { type: 'vertical-textbox', set(name, value) { this[name] = value; },
    setCoords() {}, initDimensions() { this.reflowed = true; } };
  elements.mangaGptSubtitle.value = '竖排修改';
  elements.mangaGptReplaceText.handlers.click();
  assert.equal(page.active.text, '竖排修改');
  assert.equal(page.active.reflowed, true);
  assert.equal(saved, 3);

  const bubble = { customType: 'speechBubbleSVG', type: 'path' };
  const bubbleText = { type: 'textbox', customType: 'speechBubbleText', targetObject: bubble,
    set(name, value) { this[name] = value; }, setCoords() {} };
  page.getObjects = () => [bubble, bubbleText];
  page.active = bubble;
  elements.mangaGptSubtitle.value = '气泡修改';
  elements.mangaGptReplaceText.handlers.click();
  assert.equal(bubbleText.text, '气泡修改');
  assert.equal(saved, 4);
  console.log('PASS mocked region selection -> HTTP -> Fabric layer -> undo snapshots + vertical/bubble text');

  // ---- Aspect regression matrix: selection (wide/tall/square) x model result (1:1, 3:2, 2:3).
  const api = sandbox2.window.MangaGPTRegionEditor;
  const selections = [[900, 300], [300, 900], [500, 500], [1654, 2339], [1200, 1100]];
  const results = [[1024, 1024], [1536, 1024], [1024, 1536], [1254, 1254]];
  for (const [w, h] of selections) {
    const plan = api.letterboxPlan(w, h, 'auto');
    const [pw, ph] = plan.size.split('x').map(Number);
    assert(Math.abs(plan.width / plan.height - pw / ph) < 0.01, 'padded image has API aspect');
    assert(plan.width <= pw && plan.height <= ph, 'padded upload never exceeds the API size');
    assert(Math.abs((plan.inner.w * plan.width) / (plan.inner.h * plan.height) - w / h) < 0.01,
      'selection keeps its aspect inside the padding');
    for (const [rw, rh] of results) {
      const rect = api.resultCropRect(rw, rh, { width: w, height: h, plan });
      assert(Math.abs(rect.w / rect.h - w / h) < 1e-6, 'no stretching: crop has selection aspect');
      assert(rect.x >= -1e-9 && rect.y >= -1e-9 && rect.x + rect.w <= rw + 1e-6 && rect.y + rect.h <= rh + 1e-6);
      if (rw / rh === pw / ph) {
        // Model honoured the requested aspect: the whole selection comes back, nothing trimmed.
        assert(Math.abs(rect.w - plan.inner.w * rw) < 1e-6 && Math.abs(rect.h - plan.inner.h * rh) < 1e-6);
      }
    }
  }
  // Feather only on sides bordering other artwork; page borders stay hard.
  const fp = api.featherPlan({ left: 0, top: 10, width: 500, height: 1000 }, 500, 1010);
  assert.deepEqual([fp.left, fp.top, fp.right, fp.bottom], [false, true, false, false]);
  assert.equal(fp.width, 15);
  const all = { left: true, right: true, top: true, bottom: true };
  assert(api.featherAlpha(0, 50, 100, 100, 10, all) < 0.1 && api.featherAlpha(50, 50, 100, 100, 10, all) === 1);
  assert.equal(api.featherAlpha(0, 50, 100, 100, 10, { left: false, right: true, top: true, bottom: true }), 1);
  // Seam match: a patch 20 levels lighter than the page meets it at the interior edges, fades to 0 inside.
  {
    const W = 40, H = 40, px = (v, a = 255) => [v, v, v, a];
    const orig = new Uint8ClampedArray(W * H * 4), pat = new Float32Array(W * H * 4);
    for (let k = 0; k < W * H; k++) { orig.set(px(100), k * 4); pat.set(px(120), k * 4); }
    const sides = { left: true, right: false, top: true, bottom: false };
    const d = api.seamDiffs(pat, orig, W, H, sides);
    assert.deepEqual(Object.keys(d).sort(), ['left', 'top'], 'only interior sides are measured');
    assert(Math.abs(d.left[0] + 20) < 0.01 && Math.abs(d.top[2] + 20) < 0.01, 'measures -20 per channel');
    assert(api.applySeamMatch(pat, W, H, d, 10) > 0);
    assert(Math.abs(pat[(20 * W + 0) * 4] - 100) < 0.5, 'left edge pulled to the page tone');
    assert(Math.abs(pat[(20 * W + 30) * 4] - 120) < 0.01, 'centre/right keeps model colour');
    assert(Math.abs(pat[0] - 100) < 0.5, 'corner where two sides meet is not over-corrected');
    // transparent original (lettering/transparent page) is ignored; huge differences are clamped
    const o2 = new Uint8ClampedArray(W * H * 4); const p2 = new Float32Array(W * H * 4);
    for (let k = 0; k < W * H; k++) { o2.set(px(0, 0), k * 4); p2.set(px(200), k * 4); }
    assert.equal(Object.keys(api.seamDiffs(p2, o2, W, H, sides)).length, 0, 'no opaque original -> no correction');
    // a big step is changed content, not drift: left alone (no tinted band)
    for (let k = 0; k < W * H; k++) { o2.set(px(0), k * 4); }
    assert.equal(Object.keys(api.seamDiffs(p2, o2, W, H, sides)).length, 0, 'content change is not corrected');
    // half of the left edge is changed content (other colour), half is a -20 drift: only the drift half is corrected
    const H3 = 200, o3 = new Uint8ClampedArray(W * H3 * 4), p3 = new Float32Array(W * H3 * 4);
    for (let y = 0; y < H3; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; o3.set(px(100), k); p3.set(y < 100 ? [220, 40, 40, 255] : px(120), k); }
    const d3 = api.seamDiffs(p3, o3, W, H3, { left: true });
    assert(Math.abs(d3.left[190 * 3] + 20) < 0.5, 'drift half measured');
    assert(Math.abs(d3.left[2 * 3]) < 0.5, 'changed-content half not tinted');
  }
  // Context around a corner selection is clipped to the page; the inner mapping is unchanged.
  const cplan = api.letterboxPlan(400, 100, '1024x1024');
  const cr = api.contextRect({ left: 0, top: 0, width: 400, height: 100 }, cplan, 1000, 1000);
  assert(cr.full.top < 0 && cr.clip.top === 0 && cr.clip.left === 0 && cr.clip.height <= Math.ceil(cr.full.height + cr.full.top));
  // Real case F (1002x571 forced into 1024x1536) recomposed; warn for such mismatches only.
  assert.equal(api.aspectMismatch(1002, 571, '1024x1536'), true);
  assert.equal(api.aspectMismatch(802, 1240, '1024x1536'), false);
  assert.equal(api.aspectMismatch(802, 1240, '1024x1024'), false);
  assert.equal(api.aspectMismatch(802, 1240, 'auto'), false);
  const explicit = api.letterboxPlan(900, 300, '1024x1536');
  assert.equal(explicit.size, '1024x1536', 'explicit size choice is respected');
  // Extreme forced aspect: the guard switches to the closest API aspect (case F -> 3:2).
  assert.deepEqual({ ...api.effectiveSize(1002, 571, '1024x1536', true) }, { size: '1536x1024', switchedFrom: '1024x1536' });
  assert.deepEqual({ ...api.effectiveSize(1002, 571, '1024x1536', false) }, { size: '1024x1536', switchedFrom: null });
  assert.deepEqual({ ...api.effectiveSize(802, 1240, '1024x1536', true) }, { size: '1024x1536', switchedFrom: null });
  assert.deepEqual({ ...api.effectiveSize(900, 300, 'auto', true) }, { size: 'auto', switchedFrom: null });

  // Selection cutting a character: report objects that are partly covered, not page
  // backgrounds, not small edits inside a big picture, not fully contained objects.
  const sel = { left: 100, top: 100, width: 200, height: 200 };
  const half = { left: 200, top: 100, width: 200, height: 200, name: 'hero' };      // 50% covered
  const inside = { left: 120, top: 120, width: 50, height: 50, name: 'prop' };      // fully inside
  const pageBg = { left: 0, top: 0, width: 1000, height: 1000, name: 'page' };         // background
  const big = { left: 0, top: 0, width: 800, height: 900, name: 'panel art' };       // 5.6% covered
  const away = { left: 600, top: 600, width: 100, height: 100, name: 'far' };
  const cutBoxes = api.findCutBoxes([half, inside, pageBg, big, away], sel, 1000, 1000);
  assert.deepEqual([...cutBoxes.map(b => b.name)], ['hero']);
  assert.deepEqual({ ...api.expandRegion(sel, cutBoxes, 1000, 1000) }, { left: 100, top: 100, width: 300, height: 200 });
  assert.deepEqual({ ...api.expandRegion(sel, [{ left: -50, top: 950, width: 100, height: 200 }], 1000, 1000) },
    { left: 0, top: 100, width: 300, height: 900 }, 'expansion is clamped to the page');

  // Transparency: the original selection's alpha is multiplied into the baked patch.
  const canvasCount = createdCanvases.length;
  const mask = new Uint8ClampedArray(4 * 2).fill(255);
  mask[0] = 0; mask[1] = 128;
  api.bakePatch({}, { x: 0, y: 0, w: 4, h: 2 }, 1, null, null, mask);
  const bakeCanvas = createdCanvases.slice(canvasCount)[0];
  const alpha = Array.from(bakeCanvas.put.data.filter((_, i) => i % 4 === 3));
  assert.deepEqual(alpha, [0, 128, 255, 255, 255, 255, 255, 255], 'alpha mask restored');
  assert.equal(api.tr('mgpt_region_selected', '已选中原始画布区域：{w} × {h} 像素。', { w: 3, h: 4 }), '已选中原始画布区域：3 × 4 像素。');

  // ---- Lettering stays above the new layer.
  const art = { type: 'image' }; const t1 = { type: 'vertical-textbox' };
  const b1 = { customType: 'speechBubbleSVG', type: 'path' }; const patch = { type: 'image' };
  assert.equal(api.letteringInsertIndex([art, b1, t1, patch], patch), 1);
  assert.equal(api.letteringInsertIndex([art, patch], patch), 1);
  assert.equal(api.letteringInsertIndex([b1, art, t1, patch], patch), 2);
  assert(api.isLettering({ type: 'i-text' }) && api.isLettering({ isSpeechBubble: true }) && !api.isLettering(art));
  console.log('PASS letterbox aspect matrix, aspect guard, cut-object detection, alpha mask, lettering z-order');
})().catch(err => { console.error(err); process.exitCode = 1; });
