const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const context={console};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8'),context,{filename:'manga-page-size.js'});

const api=context.NaiMangaPageSize;
assert.equal(api.DPI,200);
const portrait=api.defaultMangaPageSize(false);
const landscape=api.defaultMangaPageSize(true);
assert.equal(portrait.width,1654);
assert.equal(portrait.height,2339);
assert.equal(landscape.width,2339);
assert.equal(landscape.height,1654);
assert.deepEqual(api.resolveMangaPageSize(210,297),portrait);
assert.deepEqual(api.resolveMangaPageSize(1654,2339),portrait);
assert.ok(api.resolveMangaPageSize(8000,8000).width<=4096);
assert.equal(api.label(portrait),'1654×2339');

console.log('manga page size smoke test passed');
