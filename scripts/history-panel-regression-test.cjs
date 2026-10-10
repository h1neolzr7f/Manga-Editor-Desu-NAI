const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

const root = path.resolve(__dirname, '..');
function environment() {
  const pending = [];
  const canvas = {
    objects: [], canvasGuid: 'original',
    getObjects() { return this.objects.slice(); },
    loadFromJSON(state, callback) { pending.push(() => { this.objects = state.objects.map(o => ({...o})); callback(); }); },
    toJSON() { return {objects: this.objects, canvasGuid: this.canvasGuid}; },
    add(obj) { this.objects.push(obj); },
    remove(obj) { this.objects = this.objects.filter(o => o !== obj); },
    moveTo(obj, index) { this.remove(obj); this.objects.splice(index, 0, obj); },
    setActiveObject(obj) { this.active = obj; return this; },
    renderAll() {}, requestRenderAll() { return this; }, item(index) { return this.objects[index]; }
  };
  const context = {
    console, Map, Promise, canvas, commonProperties: [],
    document: {addEventListener() {}},
    fabric: {Object: function() {}, Canvas: function() {}, loadSVGFromString(text, cb) { cb([image(100, 100)], {}); }, util: {object: {extend: Object.assign}, groupSVGElements(objects) { return objects[0]; }}},
    updateLayerPanel() {}, setCanvasGUID(guid) { canvas.canvasGuid = guid; },
    isSpeechBubbleSVG() { return false; }, isFreehandBubblePath() { return false; }, isShapes() { return false; },
    customSpeechBubbleAllRelocation() {}, clearJSTSGeometry() {},
    saveInitialState() {}, avtive(obj) { canvas.active = obj; },
    panelLogger: {debug() {}, info() {}},
    lz4Compressor: {async unLz4Files() { return []; }},
    getDataByName() { return ''; }, ArrayBufferUtils: {fromArrayBufferToString(value) { return value; }},
    basePrompt: {}, resizeCanvasByNum() {}, compressionLogger: {error() {}},
    $(id) { return {addEventListener() {}}; }
  };
  context.fabric.Object.prototype.toObject = function() {};
  context.window = context;
  vm.createContext(context);
  for (const file of ['js/layer/image-history-management.js', 'js/sidebar/panel/panel-manager.js', 'js/core/compression/project-compression.js', 'js/ui/bottom-bar.js', 'js/sidebar/panel/panel-template.js', 'js/ai/prompt/auto/auto-generation.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  context.stateStack = [0, 1, 2].map(n => JSON.stringify({objects: [{name: String(n), selectable: false}], canvasGuid: 'page'}));
  context.currentStateIndex = 2;
  return {context, canvas, pending};
}
function image(width, height, props = {}) {
  return {width, height, left: 0, top: 0, scaleX: 1, scaleY: 1, ...props, set(values) { Object.assign(this, values); }, setCoords() {}};
}

test('history ignores overlapping undo/redo until Fabric has finished loading', async () => {
  const {context: c, canvas, pending} = environment();
  const loading = c.undo();
  c.undo(); c.redo(); c.jumpToHistoryIndex(0);
  assert.equal(pending.length, 1);
  assert.equal(c.NaiHistoryLoading, true);
  assert.equal(c.isSaveHistory, false);
  pending.shift()();
  await loading;
  assert.equal(canvas.objects[0].name, '1');
  assert.equal(c.currentStateIndex, 1);
  assert.equal(c.NaiHistoryLoading, false);
  assert.equal(c.isSaveHistory, true);
  const redo = c.redo(); pending.shift()(); await redo;
  assert.equal(canvas.objects[0].selectable, false);
});

test('empty history lastRedo is a no-op and keeps history saving enabled', () => {
  const {context: c, pending} = environment();
  c.stateStack = []; c.currentStateIndex = -1;
  assert.doesNotThrow(() => c.lastRedo());
  assert.equal(pending.length, 0);
  assert.equal(c.isSaveHistory, true);
});

test('history is blocked while an async page switch is preparing its data', () => {
  const {context: c, pending} = environment();
  c.NaiPageLoading = true;
  c.undo(); c.redo(); c.jumpToHistoryIndex(0);
  assert.equal(pending.length, 0);
  assert.equal(c.currentStateIndex, 2);
});

test('Fabric load errors release the history lock and preserve the current index', async () => {
  const {context: c, canvas} = environment();
  canvas.loadFromJSON = () => { throw new Error('invalid Fabric object'); };
  await assert.rejects(c.undo(), /invalid Fabric object/);
  assert.equal(c.currentStateIndex, 2);
  assert.equal(c.NaiHistoryLoading, false);
  assert.equal(c.isSaveHistory, true);
});

test('project serialization cannot append partial canvas history during restoration', async () => {
  const {context: c} = environment();
  c.NaiHistoryLoading = true;
  c.changeDoNotSaveHistory();
  const history = c.stateStack.slice();
  await assert.rejects(c.generateProjectFileBufferList());
  assert.deepEqual(c.stateStack, history);
  assert.equal(c.currentStateIndex, 2);
});

test('page loading waits for Fabric restoration and rejects a simultaneous second load', async () => {
  const {context: c, pending, canvas} = environment();
  let finishRead;
  const read = new Promise(resolve => { finishRead = resolve; });
  c.lz4Compressor.unLz4Files = () => read;
  const loading = c.loadLz4BlobProjectFile({}, 'next');
  assert.equal(c.NaiPageLoading, true);
  const overlap = await c.loadLz4BlobProjectFile({}, 'wrong');
  assert.equal(overlap, false);
  finishRead([{name: 'state_000000.json', data: JSON.stringify(JSON.stringify({objects: [], canvasGuid: 'next'}))}]);
  await new Promise(setImmediate);
  assert.equal(pending.length, 1);
  assert.equal(c.NaiPageLoading, true);
  pending.shift()();
  await loading;
  assert.equal(canvas.canvasGuid, 'next');
  assert.equal(c.NaiPageLoading, false);
});

test('empty imported projects leave the current history intact and release the page lock', async () => {
  const {context: c} = environment();
  const history = c.stateStack;
  await assert.rejects(c.loadLz4BlobProjectFile({}, 'empty'), /no canvas history/);
  assert.equal(c.stateStack, history);
  assert.equal(c.currentStateIndex, 2);
  assert.equal(c.NaiPageLoading, false);
  assert.equal(c.isSaveHistory, true);
});

test('opening a legacy project clears unrelated visual character archives',async()=>{
  const {context:c,pending}=environment();c.basePrompt.gptVisualProfiles=[{name:'private previous project'}];
  c.lz4Compressor.unLz4Files=async()=>[{name:'state_000000.json',data:JSON.stringify(JSON.stringify({objects:[],canvasGuid:'legacy'}))}];
  c.getDataByName=(files,name)=>name==='text2img_basePrompt.json'?JSON.stringify({text2img_prompt:'legacy'}):'';
  const loaded=c.loadLz4BlobProjectFile({},'legacy');await new Promise(setImmediate);pending.shift()();await loaded;
  assert.equal(JSON.stringify(c.basePrompt.gptVisualProfiles),'[]','archives cannot leak into an unrelated legacy file');
});

test('saving an unchanged restored page preserves redo and does not add duplicate undo states',()=>{
  const {context:c,canvas}=environment();
  c.stateStack=[JSON.stringify({objects:[{left:0}],canvasGuid:'original'}),JSON.stringify({objects:[{left:20}],canvasGuid:'original'})];
  c.currentStateIndex=0;canvas.objects=[{left:0,name:'图层 1',guid:'hydrated',guids:[]}];
  c.saveState();assert.equal(c.currentStateIndex,0);assert.equal(c.stateStack.length,2,'file saves cannot erase redo');
  c.saveState();assert.equal(c.stateStack.length,2,'metadata hydration cannot create a fake undo edit');
});

test('a page switch holds its lock from saving through completed Fabric restoration', async () => {
  const {context: c, pending, canvas} = environment();
  vm.runInContext("btmProjectsMap.set('next',{blob:{}}); btmProjectsMap.set('other',{blob:{}});", c);
  let finishSave;
  c.btmSaveProjectFile = () => new Promise(resolve => { finishSave = resolve; });
  c.lz4Compressor.unLz4Files = async () => [{name: 'state_000000.json', data: JSON.stringify(JSON.stringify({objects: [], canvasGuid: 'next'}))}];
  const switchPage = c.chengeCanvasByGuid('next', true);
  assert.equal(c.NaiPageLoading, true);
  assert.equal(await c.chengeCanvasByGuid('other', true), false);
  assert.equal(canvas.canvasGuid, 'original');
  finishSave();
  await new Promise(setImmediate);
  assert.equal(pending.length, 1);
  assert.equal(c.NaiPageLoading, true);
  pending.shift()();
  assert.equal(await switchPage, true);
  assert.equal(canvas.canvasGuid, 'next');
  assert.equal(c.NaiPageLoading, false);
});

test('image replacement keeps displayed dimensions and transforms at its captured stack index', () => {
  const {context: c, canvas} = environment();
  const old = image(200, 100, {left: 30, top: 40, scaleX: 2, scaleY: 3, angle: 37, originX: 'center', originY: 'center', skewX: 4, skewY: 2, flipX: true, flipY: false});
  const overlay = image(20, 20);
  canvas.objects = [overlay];
  const replacement = image(800, 400);
  c.replaceImageObject(old, replacement, 'I2I', 0);
  assert.equal(replacement.width * replacement.scaleX, 400);
  assert.equal(replacement.height * replacement.scaleY, 300);
  for (const prop of ['left', 'top', 'angle', 'originX', 'originY', 'skewX', 'skewY', 'flipX', 'flipY']) assert.equal(replacement[prop], old[prop], prop);
  assert.equal(canvas.objects[0], replacement);
  assert.equal(canvas.objects[1], overlay);
});

test('an SVG placed into the canvas is actually added', () => {
  const {context: c, canvas} = environment();
  c.putImageInFrame('<svg></svg>', 10, 10);
  assert.equal(canvas.objects.length, 1);
});

test('new page creation cannot reset the canvas during a history restore', async () => {
  const {context: c, canvas} = environment();
  c.NaiHistoryLoading = true;
  c.getCanvasGUID = () => canvas.canvasGuid;
  c.getObjectCount = () => canvas.objects.length;
  c.OP_showLoading = () => ({}); c.OP_hideLoading = () => {};
  c.resizeCanvasToObject = (width, height) => { canvas.width = width; canvas.height = height; };
  canvas.clear = () => { canvas.objects = []; };
  const result = await c.loadBookSize(1200, 1600, false);
  assert.equal(result, false);
  assert.equal(canvas.canvasGuid, 'original');
  assert.equal(canvas.width, undefined);
});

test('bulk generation aborts when the target page could not be loaded', async () => {
  const {context: c, canvas} = environment();
  const panel = {generated: false}; canvas.objects = [panel];
  c.$ = () => ({value: 1});
  c.btmGetGuids = () => ['next'];
  c.chengeCanvasByGuid = async () => false;
  c.getPanelObjectList = () => canvas.objects;
  c.OP_showLoading = () => ({}); c.OP_updateLoadingState = () => {}; c.OP_hideLoading = () => {};
  c.OP_isCancelled = () => false;
  c.requestAnimationFrame = callback => callback();
  c.getGUID = () => 'panel'; c.createSpinner = () => 'spinner';
  c.T2I = async () => { panel.generated = true; };
  c.existsWaitQueue = () => false;
  c.btmSaveProjectFile = async () => {};
  await assert.rejects(c.autoMultiGenerate(true), /页面/);
  assert.equal(panel.generated, false);
});
