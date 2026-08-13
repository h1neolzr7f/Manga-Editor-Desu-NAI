const fs = require('fs');
const vm = require('vm');

function load(file, context) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

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
  'js/simulator/renderers/livestream-renderer.js'
]) load(file, context);

const renderers = context.NaiComicExtraRendererRegistry.list();
if (renderers.length !== 5) throw new Error(`expected 5 renderers, got ${renderers.length}`);
for (const renderer of renderers) {
  const value = renderer.normalize({ title: 'Smoke' });
  const result = renderer.validate(value);
  if (!result.ok) throw new Error(`${renderer.definition.id} validation failed`);
  const exported = renderer.exportModel(value);
  if (exported.sceneType !== renderer.definition.category) throw new Error(`${renderer.definition.id} export failed`);
  if (!context.NaiComicTemplateRegistry.get(renderer.definition.id)) throw new Error(`${renderer.definition.id} registry failed`);
}
console.log('simulator extra smoke test passed');
