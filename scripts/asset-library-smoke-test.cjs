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

load('js/assets/original-starter-pack.js', context);
const packApi = context.NaiComicOriginalStarterPack;
if (!packApi || packApi.CATALOG.length < 40) throw new Error('starter catalog too small');
const seeded = packApi.seed(store);
if (seeded.total !== packApi.CATALOG.length) throw new Error('starter seed total mismatch');
const speed = store.get('asset_original_speed_lines');
if (!speed || speed.missing) throw new Error('bundled starter marked missing after seed');
if (!context.NaiComicAssetStore.isBundledPath(speed.path)) throw new Error('starter path is not bundled');
if (!store.hasLoadableSource(speed)) throw new Error('bundled starter not loadable');
const missing = store.detectMissing().filter((asset) => asset.id === speed.id);
if (missing.length) throw new Error('detectMissing still flags bundled starter');
const svgPath = require('path').join(__dirname, '..', 'assets', 'original', 'starter', 'speed-lines.svg');
if (!fs.existsSync(svgPath)) throw new Error('starter svg missing on disk');
packApi.CATALOG.forEach((item) => {
  const file = require('path').join(__dirname, '..', 'assets', 'original', 'starter', item.file);
  if (!fs.existsSync(file)) throw new Error('missing starter file ' + item.file);
});

load('js/assets/site-ui-pack.js', context);
const siteApi = context.NaiComicSiteUiPack;
if (!siteApi || siteApi.CATALOG.length < 20) throw new Error('site-ui catalog too small');
const families = { tube: 0, danmaku: 0, board: 0 };
siteApi.CATALOG.forEach((item) => {
  const file = require('path').join(__dirname, '..', 'assets', 'original', 'site-ui', item.file);
  if (!fs.existsSync(file)) throw new Error('missing site-ui file ' + item.file);
  item.tags.forEach((tag) => { if (families[tag] != null) families[tag] += 1; });
});
if (families.tube < 6 || families.danmaku < 6 || families.board < 6) {
  throw new Error('site-ui families too thin ' + JSON.stringify(families));
}
const siteSeeded = siteApi.seed(store);
if (siteSeeded.total !== siteApi.CATALOG.length) throw new Error('site-ui seed total mismatch');
const tubePlayer = store.get('asset_site_tube_player');
if (!tubePlayer || tubePlayer.missing) throw new Error('site-ui bundled asset marked missing');
if (!context.NaiComicAssetStore.isBundledPath(tubePlayer.path)) throw new Error('site-ui path is not bundled');

load('js/assets/github-free-pack.js', context);
const freeManifest = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'assets', 'public', 'free-pack-manifest.json'), 'utf8'));
if (!freeManifest || freeManifest.count < 400) throw new Error('free public pack too small');
const samplePath = require('path').join(__dirname, '..', freeManifest.assets[0].path);
if (!fs.existsSync(samplePath)) throw new Error('free pack file missing on disk');
const freeStore = new context.NaiComicAssetStore({ storageKey: 'smoke-free-public' });
const freeSeeded = context.NaiComicFreePack.seedFromObject(freeStore, freeManifest);
if (freeSeeded.total < 400) throw new Error('free pack seed failed');
if (!freeStore.byId || freeStore.byId.size < 400) throw new Error('asset store index not built');
const bundled = freeStore.list()[0];
if (bundled.missing || !freeStore.hasLoadableSource(bundled)) throw new Error('free pack marked missing');
if (freeStore.toJSON().assets.length !== 0) throw new Error('bundled public assets must not persist to localStorage');
if (!context.NaiComicAssetStore.isBundledPath(bundled.path)) throw new Error('free pack path not bundled');

load('js/simulator/site-ui-parts.js', context);
const parts = context.NaiComicSiteUiParts;
if (!parts || parts.list().length !== siteApi.CATALOG.length) throw new Error('site-ui part fields count mismatch');
siteApi.CATALOG.forEach((item) => {
  if (!parts.has(item.id)) throw new Error('missing editable fields for ' + item.id);
  const fields = parts.get(item.id).fields || [];
  if (!fields.length) throw new Error('no editable fields for ' + item.id);
});
const stats = parts.defaults('asset_site_tube_stats');
if (!stats.views || !stats.likes) throw new Error('tube stats defaults missing');

const persistStore = new context.NaiComicAssetStore({ storageKey: 'smoke-persist' });
const thumbOnly = persistStore.register({ name: 'thumb-only.png', hash: 'hash-thumb-only', thumbnail: 'data:image/jpeg;base64,abc' });
if (persistStore.hasLoadableSource(thumbOnly.asset)) throw new Error('thumbnail must not count as loadable source');
const imported = persistStore.register({ name: 'imported.png', hash: 'hash-imported-disk', path: 'user_data/asset_packs/imported/demo.png', sourceType: 'imported' });
if (!persistStore.hasLoadableSource(imported.asset)) throw new Error('imported persistent path should be loadable');
if (!context.NaiComicAssetStore.isPersistentPath(imported.asset.path)) throw new Error('persistent path helper failed');

console.log('asset library smoke test passed');
