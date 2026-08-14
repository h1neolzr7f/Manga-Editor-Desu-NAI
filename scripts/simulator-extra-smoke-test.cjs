const fs = require('fs');
const vm = require('vm');

function load(file, context) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

function MockObject(opts) {
  Object.assign(this, opts || {});
  this.scaleX = this.scaleX || 1;
  this.scaleY = this.scaleY || 1;
  this.left = this.left || 0;
  this.top = this.top || 0;
}
MockObject.prototype.set = function (props) {
  Object.assign(this, props);
  return this;
};
MockObject.prototype.setCoords = function () {};
MockObject.prototype.getBoundingRect = function () {
  return {
    left: this.left,
    top: this.top,
    width: (this.width || 0) * (this.scaleX || 1),
    height: (this.height || 0) * (this.scaleY || 1)
  };
};

function MockText(value, opts) {
  MockObject.call(this, opts);
  this.text = value;
  this.type = opts && opts.width ? 'textbox' : 'i-text';
}
MockText.prototype = Object.create(MockObject.prototype);

function MockGroup(items, opts) {
  MockObject.call(this, opts);
  this.type = 'group';
  this._objects = items.slice();
  this.width = 1000;
  this.height = 1800;
  items.forEach(function (item) { item.group = this; }, this);
}
MockGroup.prototype = Object.create(MockObject.prototype);
MockGroup.prototype.getObjects = function () { return this._objects.slice(); };
MockGroup.prototype.getScaledWidth = function () { return this.width * (this.scaleX || 1); };
MockGroup.prototype.getScaledHeight = function () { return this.height * (this.scaleY || 1); };
MockGroup.prototype.destroy = function () {
  const self = this;
  this._objects.forEach(function (obj) {
    obj.left = (obj.left || 0) * (self.scaleX || 1) + (self.left || 0);
    obj.top = (obj.top || 0) * (self.scaleY || 1) + (self.top || 0);
    delete obj.group;
  });
  return this;
};

const context = { console, Date, Math, JSON, Promise, Object, Array, Set, Map };
context.globalThis = context;
load('js/simulator/template-registry.js', context);
load('js/simulator/scene-serializer.js', context);
load('js/simulator/extra-renderer-factory.js', context);
for (const file of [
  'js/simulator/renderers/visual-novel-renderer.js',
  'js/simulator/renderers/social-feed-renderer.js',
  'js/simulator/renderers/phone-renderer.js',
  'js/simulator/renderers/forum-renderer.js',
  'js/simulator/renderers/livestream-renderer.js',
  'js/simulator/renderers/video-tube-renderer.js',
  'js/simulator/renderers/danmaku-player-renderer.js',
  'js/simulator/renderers/image-board-renderer.js'
]) load(file, context);

const renderers = context.NaiComicExtraRendererRegistry.list();
if (renderers.length !== 8) throw new Error(`expected 8 renderers, got ${renderers.length}`);
for (const renderer of renderers) {
  const value = renderer.normalize({ title: 'Smoke' });
  const result = renderer.validate(value);
  if (!result.ok) throw new Error(`${renderer.definition.id} validation failed`);
  const exported = renderer.exportModel(value);
  if (exported.sceneType !== renderer.definition.category) throw new Error(`${renderer.definition.id} export failed`);
  if (!context.NaiComicTemplateRegistry.get(renderer.definition.id)) throw new Error(`${renderer.definition.id} registry failed`);
}

const factory = context.NaiComicExtraRendererFactory;
if (!factory.isPageTemplate({ category: 'video-tube', id: 'video-tube-generic' })) throw new Error('video-tube should be a page template');
if (!factory.isPageTemplate({ category: 'danmaku-player' })) throw new Error('danmaku should be a page template');
if (!factory.isPageTemplate({ category: 'image-board' })) throw new Error('image-board should be a page template');
if (factory.isPageTemplate({ category: 'visual-novel', id: 'visual-novel-generic' })) throw new Error('visual novel should stay grouped');

context.fabric = {
  Rect: function (opts) { return new MockObject(opts); },
  Text: function (value, opts) { return new MockText(value, opts); },
  IText: function (value, opts) { return new MockText(value, opts); },
  Textbox: function (value, opts) { return new MockText(value, opts); },
  Group: function (items, opts) { return new MockGroup(items, opts); },
  ActiveSelection: function (items, opts) {
    const sel = new MockGroup(items, opts);
    sel.type = 'activeSelection';
    return sel;
  },
  Image: { fromURL: function (src, cb) { cb(null); } }
};
context.NaiComicChatRenderer = {
  fitGroupToCanvas: function (group) {
    group.set({ left: 12, top: 24, scaleX: 0.5, scaleY: 0.5 });
    return group;
  }
};

function mockCanvas() {
  const added = [];
  return {
    width: 1000,
    height: 1800,
    add: function (obj) { added.push(obj); obj.canvas = this; },
    remove: function (obj) {
      const index = added.indexOf(obj);
      if (index >= 0) added.splice(index, 1);
    },
    getObjects: function () { return added.slice(); },
    setActiveObject: function (obj) { this._active = obj; },
    getActiveObject: function () { return this._active || null; },
    requestRenderAll: function () {},
    renderAll: function () {}
  };
}

(async function () {
  const pageIds = ['video-tube-generic', 'danmaku-player-generic', 'image-board-generic'];
  for (const id of pageIds) {
    const renderer = context.NaiComicExtraRendererRegistry.get(id);
    const group = await renderer.render(renderer.normalize({ title: '可编辑主页' }));
    if (!group.simulatorExplode) throw new Error(id + ' should explode onto canvas');
    const canvas = mockCanvas();
    const placed = factory.placeOnCanvas(group, canvas);
    const objects = canvas.getObjects();
    if (objects.length < 10) throw new Error(id + ' expected exploded parts, got ' + objects.length);
    if (!placed.root || placed.root.simulatorRole !== 'page') throw new Error(id + ' missing page root');
    if (placed.root.evented !== false) throw new Error(id + ' page background should not steal clicks');
    const pageId = placed.root.simulatorPageId;
    if (!pageId) throw new Error(id + ' missing page id');
    if (objects.some((item) => item.simulatorPageId !== pageId)) throw new Error(id + ' parts not tagged');
    if (!objects.some((item) => item.isPanel)) throw new Error(id + ' missing image panel slot');
    if (factory.pageObjects(canvas, pageId).length !== objects.length) throw new Error(id + ' pageObjects mismatch');
    if (typeof factory.selectPage !== 'function') throw new Error('selectPage missing');
    factory.selectPage(canvas, pageId);
    if (!canvas.getActiveObject() || canvas.getActiveObject().type !== 'activeSelection') throw new Error(id + ' selectPage should select the whole page');
    const replaced = await renderer.render(renderer.normalize({ title: '第二页' }));
    factory.placeOnCanvas(replaced, canvas, { previous: placed.root });
    if (canvas.getObjects().some((item) => item.simulatorPageId === pageId)) throw new Error(id + ' previous page not removed');
  }

  const vn = context.NaiComicExtraRendererRegistry.get('visual-novel-generic');
  const vnGroup = await vn.render(vn.normalize({ title: 'VN' }));
  if (!vnGroup.simulatorExplode) throw new Error('visual novel should explode onto canvas');
  const vnCanvas = mockCanvas();
  const vnPlaced = factory.placeOnCanvas(vnGroup, vnCanvas);
  if (vnCanvas.getObjects().length < 5) throw new Error('visual novel should explode into parts');
  if (!vnPlaced.root || vnPlaced.root.simulatorRole !== 'page') throw new Error('visual novel missing page root');

  const before = factory.pageBounds(vnCanvas, vnPlaced.root.simulatorPageId);
  const scaled = factory.scalePage(vnCanvas, vnPlaced.root.simulatorPageId, 0.5);
  if (!scaled) throw new Error('scalePage failed');
  const after = factory.pageBounds(vnCanvas, vnPlaced.root.simulatorPageId);
  if (!before || !after || after.width >= before.width * 0.9) throw new Error('scalePage did not shrink page');
  if (!factory.fitPageToRect(vnCanvas, vnPlaced.root.simulatorPageId, {left:10,top:10,width:400,height:600})) throw new Error('fitPageToRect failed');

  console.log('simulator extra smoke test passed');
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
