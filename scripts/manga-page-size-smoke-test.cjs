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

// --- DPI 入力の正規化: 負数・空欄は null（呼び出し側が直前の有効値へ戻す） ---
assert.equal(api.normalizeExportDpi(-5),null,'負数は不正値');
assert.equal(api.normalizeExportDpi('-5'),null,'負数の文字列も不正値');
assert.equal(api.normalizeExportDpi(0),null,'0 は不正値');
assert.equal(api.normalizeExportDpi('0'),null);
assert.equal(api.normalizeExportDpi(''),null,'空欄は不正値');
assert.equal(api.normalizeExportDpi('   '),null,'空白のみも不正値');
assert.equal(api.normalizeExportDpi('abc'),null,'非数値は不正値');
assert.equal(api.normalizeExportDpi(null),null);
assert.equal(api.normalizeExportDpi(undefined),null);
assert.equal(api.normalizeExportDpi(NaN),null);
assert.equal(api.normalizeExportDpi(300),300,'有効値はそのまま');
assert.equal(api.normalizeExportDpi('420.5'),420.5,'小数も受け付ける');
assert.equal(api.normalizeExportDpi(96),96);
assert.equal(api.normalizeExportDpi(1800),1800);
assert.equal(api.normalizeExportDpi(3000),1800,'範囲外の正数は上限へ丸める');
assert.equal(api.normalizeExportDpi(10),96,'範囲外の正数は下限へ丸める');
// 不正値でも resolveExportDpi は従来どおり既定 300（起動直後の既定として使う）。
assert.equal(api.resolveExportDpi(-5),300,'resolveExportDpi の既定は据え置き');
assert.equal(api.resolveExportDpi(undefined),300);

console.log('manga page size smoke test passed');
