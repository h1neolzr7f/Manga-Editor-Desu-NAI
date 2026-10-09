// Regression: "Load project" only added page thumbnails; when the canvas was empty
// (fresh start or just cleared) nothing visible happened. The first loaded page must
// now open in that case, and a page with user content must never be replaced.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/core/compression/project-compression.js'), 'utf8');

function run(objects, loaded, mapKeys) {
  const opened = [];
  const ctx = {
    console, window: {},
    btmProjectsMap: new Map(mapKeys.map(k => [k, { blob: 'b-' + k }])),
    chengeCanvasByGuid: async g => { opened.push(g); },
    btmUpdateHandleText: () => {},
    canvas: { getObjects: () => objects },
    getObjectCount: () => objects.length,
    isPlaceholderCanvasObject: o => !!o.placeholder,
    userObjectCount: () => objects.filter(o => !o.placeholder).length,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.openFirstLoadedPageIfCanvasEmpty(loaded).then(r => ({ r, opened }));
}

(async () => {
  let t = await run([], ['g1', 'g2'], ['g1', 'g2']);
  assert.deepStrictEqual([t.r, t.opened], [true, ['g1']], 'empty canvas opens the first loaded page');
  t = await run([{ placeholder: true }], ['g1'], ['g1']);
  assert.deepStrictEqual([t.r, t.opened], [true, ['g1']], 'placeholder-only page counts as empty');
  t = await run([{ type: 'image' }], ['g1'], ['g0', 'g1']);
  assert.deepStrictEqual([t.r, t.opened], [false, []], 'never replaces a page with user content');
  t = await run([], [], ['g0']);
  assert.deepStrictEqual([t.r, t.opened], [false, []], 'nothing loaded, nothing opened');
  t = await run([], ['gx'], ['g0']);
  assert.deepStrictEqual([t.r, t.opened], [false, []], 'unknown guid is ignored');
  for (const fn of ['multiLoadLz4', 'multiLoadZip']) {
    assert.ok(new RegExp('async function ' + fn + '[\\s\\S]*?return loadedGuids;').test(src), fn + ' returns loaded guids');
  }
  const pm = fs.readFileSync(path.join(__dirname, '..', 'js/project-management.js'), 'utf8');
  assert.ok(/openFirstLoadedPageIfCanvasEmpty\(await multiLoadLz4\(/.test(pm), 'lz4 load opens page');
  assert.ok(/openFirstLoadedPageIfCanvasEmpty\(await multiLoadZip\(/.test(pm), 'zip load opens page');
  console.log('project-load-open-page-test: 8 checks PASS');
})().catch(e => { console.error(e); process.exit(1); });
