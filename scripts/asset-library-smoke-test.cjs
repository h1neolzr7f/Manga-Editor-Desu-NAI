const fs = require('fs');
const vm = require('vm');

function load(file, context) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const context = {
  console,
  Date,
  Math,
  JSON,
  Promise,
  Map,
  Set,
  Array,
  Uint8Array,
  ArrayBuffer,
  crypto: undefined,
  localStorage: {
    data: new Map(),
    getItem(key) { return this.data.get(key) || null; },
    setItem(key, value) { this.data.set(key, value); }
  }
};
context.globalThis = context;
load('js/assets/asset-manifest.js', context);
load('js/assets/asset-scanner.js', context);
load('js/assets/asset-store.js', context);
load('js/assets/asset-pack.js', context);

const manifest = context.NaiComicAssetManifest;
const store = new context.NaiComicAssetStore({ storageKey: 'smoke-assets' });
const first = store.register({ name: 'dialogue.png', hash: 'hash-a', tags: ['chat', 'dark'], license: { type: 'original', publicAllowed: true } });
if (first.duplicate || !first.asset.license.publicAllowed) throw new Error('asset registration failed');
store.register({ name: 'frame.png', hash: 'hash-b', tags: ['frame'] });
if (store.search('dialogue').length !== 1) throw new Error('asset search failed');
if (store.search('', ['dark']).length !== 1) throw new Error('asset tag filter failed');
if (store.register({ name: 'duplicate.png', hash: 'hash-a' }).duplicate !== true) throw new Error('duplicate hash failed');
const pack = store.exportPack({ includeThumbnails: false });
const restored = new context.NaiComicAssetStore({ storageKey: 'smoke-assets-restored' });
if (restored.importPack(pack).imported !== 2) throw new Error('asset pack import failed');
if (!manifest.validate(restored.get(first.asset.id)).ok) throw new Error('manifest validation failed');
console.log('asset library smoke test passed');
