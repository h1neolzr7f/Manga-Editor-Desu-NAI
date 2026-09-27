const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/core/util/image-util.js'),'utf8');

// image-util.js は関数定義のみをトップレベルで実行するため、DOM を最小スタブで読み込める。
const calls=[];
const selectValues={outputImageFormat:'png',outputImageQuality:'0.92',outputDpi:'300',outputBitDepth:'rgb'};
const canvasStub={
width:1654,
height:2339,
toDataURL:function(options){calls.push(options);return 'data:image/'+(options.format||'png')+';base64,AAAA';},
};

const context={
console,
canvas:canvasStub,
document:{createElement:function(){return {click:function(){},set href(v){this._href=v;},get href(){return this._href;}};}},
fabric:{},
$:function(id){return selectValues[id]===undefined?null:{value:selectValues[id]};},
createToast:function(){},
createToastError:function(){},
fetch:function(){return Promise.resolve({blob:function(){return Promise.resolve({});}});},
removeGrid:function(){},
drawGrid:function(){},
isGridVisible:false,
// 位深度変換そのものは png-bit-depth-smoke-test.cjs が検証する。
// ここでは呼び出し配線だけを見たいので、素通しのスタブを置く。
NaiPngBitDepth:{
normalizeMode:function(mode){var v=String(mode===undefined||mode===null?'':mode).trim().toLowerCase();if(v==='gray')return 'gray';if(v==='rgb')return 'rgb';return 'argb';},
encodePngDataUrl:function(dataUrl){return Promise.resolve(dataUrl);}
},
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
// 上限常量の唯一来源。実ページと同じ順序で読み込み、参照配線をそのまま検証する。
vm.runInContext(fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8'),context,{filename:'manga-page-size.js'});
vm.runInContext(source,context,{filename:'image-util.js'});

const ImageUtil=context.ImageUtil;
assert.ok(ImageUtil,'ImageUtil must be defined');

// getCropAndDownloadLink は位深度変換のため Promise を返すようになった。
const main=(async function(){

// --- 形式の正規化 ---
assert.equal(ImageUtil.resolveExportFormat('jpg'),'jpeg');
assert.equal(ImageUtil.resolveExportFormat('JPEG'),'jpeg');
assert.equal(ImageUtil.resolveExportFormat('webp'),'webp');
assert.equal(ImageUtil.resolveExportFormat('png'),'png');
assert.equal(ImageUtil.resolveExportFormat('bmp'),'png','未対応形式は png にフォールバック');
assert.equal(ImageUtil.resolveExportFormat(undefined),'png');

// --- 品質の正規化/クランプ ---
assert.equal(ImageUtil.normalizeExportQuality(0.92),0.92);
assert.equal(ImageUtil.normalizeExportQuality('0.85'),0.85);
assert.equal(ImageUtil.normalizeExportQuality(92),0.92,'パーセント指定も受け付ける');
assert.equal(ImageUtil.normalizeExportQuality(98),0.98,'2桁のパーセント指定');
assert.equal(ImageUtil.normalizeExportQuality(100),0.98,'100 は上限クランプ');
assert.equal(ImageUtil.normalizeExportQuality(0.1),0.5,'下限クランプ');
assert.equal(ImageUtil.normalizeExportQuality(5),0.5,'小さいパーセントは下限クランプ');
assert.equal(ImageUtil.normalizeExportQuality('abc'),0.92,'不正値は既定値');
assert.equal(ImageUtil.normalizeExportQuality(undefined),0.92,'未指定は既定値');

// --- 倍率の上限（長辺・総ピクセル）---
const small=ImageUtil.resolveExportMultiplier(1.5,1000,1500);
assert.equal(small,1.5,'上限内はそのまま');
const capped=ImageUtil.resolveExportMultiplier(10,4096,4096);
assert.ok(capped<10,'上限を超える倍率は縮小される');
assert.ok(4096*capped<=8192+1,'長辺上限を超えない: '+(4096*capped));
assert.ok(4096*capped*4096*capped<=40*1000*1000+1,'総ピクセル上限を超えない: '+(4096*capped*4096*capped));

// 実描画と同じ整数丸めをしても上限を超えないこと
[[1654,2339],[4096,4096],[8192,8192],[20000,20000],[60000,1200],[1200,60000],[100000,100000]].forEach(function(dim){
const m=ImageUtil.resolveExportMultiplier(50,dim[0],dim[1]);
const w=Math.round(dim[0]*m),h=Math.round(dim[1]*m);
assert.ok(Math.max(w,h)<=8192,'長辺上限: '+dim.join('x')+' -> '+w+'x'+h);
assert.ok(w*h<=40*1000*1000,'総ピクセル上限: '+dim.join('x')+' -> '+w+'x'+h+' = '+(w*h));
});
assert.ok(ImageUtil.resolveExportMultiplier(0,1000,1000)>0,'0 は既定値で処理');
assert.ok(ImageUtil.resolveExportMultiplier(NaN,1000,1000)>0,'NaN は既定値で処理');

// --- 上限は manga-page-size.js を唯一来源とする ---
// 参照が生きていれば、来源側の値を差し替えた分だけ上限も動くはず。
{
const shrinkSource=fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8')
.replace('var EXPORT_MAX_EDGE=8192;','var EXPORT_MAX_EDGE=1024;')
.replace('var EXPORT_MAX_PIXELS=40*1000*1000;','var EXPORT_MAX_PIXELS=1*1000*1000;');
const shrinkContext={console,canvas:canvasStub,document:context.document,fabric:{},$:function(){return null;},createToast:function(){},createToastError:function(){},removeGrid:function(){},drawGrid:function(){},isGridVisible:false,NaiPngBitDepth:context.NaiPngBitDepth};
shrinkContext.window=shrinkContext;
shrinkContext.globalThis=shrinkContext;
vm.createContext(shrinkContext);
vm.runInContext(shrinkSource,shrinkContext,{filename:'manga-page-size.js'});
vm.runInContext(source,shrinkContext,{filename:'image-util.js'});
const ShrinkUtil=shrinkContext.ImageUtil;
const m2=ShrinkUtil.resolveExportMultiplier(50,4096,4096);
assert.ok(4096*m2<=1024+1,'来源側の長辺上限に追随する: '+(4096*m2));
assert.ok(4096*m2*4096*m2<=1*1000*1000+1,'来源側の総ピクセル上限に追随する');
}

// --- 書き出しオプションの組み立て ---
calls.length=0;
ImageUtil.exportCanvasDataURL(1.06,'jpeg','0.9');
assert.equal(calls.length,1);
assert.equal(calls[0].format,'jpeg');
assert.equal(calls[0].quality,0.9);
assert.ok(Math.abs(calls[0].multiplier-1.06)<1e-9);

calls.length=0;
ImageUtil.exportCanvasDataURL(1.06,'png','0.9');
assert.equal(calls[0].format,'png');
assert.equal(calls[0].quality,undefined,'png に quality を渡さない');

calls.length=0;
ImageUtil.exportCanvasDataURL(50,'png');
assert.ok(calls[0].multiplier<50,'exportCanvasDataURL は倍率を上限内に収める');
assert.equal(ImageUtil.lastExportWasCapped,true,'上限に当たったことを記録する');

calls.length=0;
ImageUtil.exportCanvasDataURL(1,'png');
assert.equal(ImageUtil.lastExportWasCapped,false,'上限内なら印を付けない');

// --- ダウンロードリンクが選択中の形式を反映する ---
selectValues.outputImageFormat='webp';
selectValues.outputImageQuality='0.8';
calls.length=0;
const link=await ImageUtil.getCropAndDownloadLink();
assert.equal(calls[0].format,'webp','UI の形式選択が反映される');
assert.equal(calls[0].quality,0.8,'UI の品質選択が反映される');
assert.ok(link.download.endsWith('.webp'),'拡張子が形式に一致する: '+link.download);

selectValues.outputImageFormat='jpeg';
const jpegLink=await ImageUtil.getCropAndDownloadLink();
assert.ok(jpegLink.download.endsWith('.jpeg'),'jpeg 拡張子: '+jpegLink.download);

// --- クリップボードコピーは常に PNG（ClipboardItem が image/png 宣言のため）---
selectValues.outputImageFormat='jpeg';
calls.length=0;
await ImageUtil.clipCopy();
assert.equal(calls[calls.length-1].format,'png','clipCopy は PNG 固定');

// --- UI/翻訳の存在確認 ---
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('id="outputImageFormat"'),'形式セレクトが未定義');
assert.ok(html.includes('id="outputImageQuality"'),'品質セレクトが未定義');
assert.ok(/id="outputDpi"[^>]*max="/.test(html),'outputDpi に max 属性が必要');

const langs=['ja','en','ko','fr','zh','ru','es','de'];
langs.forEach(function(lang){
const file=fs.readFileSync(path.join(root,'js/ui/third/base-translation/base-'+lang+'.js'),'utf8');
assert.ok(file.includes('"outputImageFormat"'),lang+' に outputImageFormat が無い');
assert.ok(file.includes('"outputImageQuality"'),lang+' に outputImageQuality が無い');
});

const pageSizeSource=fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8');

// --- 設定が永続化対象に含まれる ---
const projectManagement=fs.readFileSync(path.join(root,'js/project-management.js'),'utf8');
assert.ok(projectManagement.includes("outputImageFormat:{id:'outputImageFormat'"),'形式が設定スキーマに無い');
assert.ok(projectManagement.includes("outputImageQuality:{id:'outputImageQuality'"),'品質が設定スキーマに無い');

// --- プレビュー JPEG は品質指定つきで書き出す ---
const compression=fs.readFileSync(path.join(root,'js/core/compression/project-compression.js'),'utf8');
assert.ok(/getCropAndDownloadLinkByMultiplier\(1,'jpeg',[\d.]+\)/.test(compression),'プレビュー JPEG に品質指定が必要');

// --- 形式が PNG のとき品質セレクトを無効化する ---
const canvasManager=fs.readFileSync(path.join(root,'js/canvas-manager.js'),'utf8');
assert.ok(canvasManager.includes('syncExportQualityAvailability'),'品質セレクト同期が未実装');
assert.ok(pageSizeSource.includes('normalizeExportDpi'),'DPI 正規化が manga-page-size.js に無い');
assert.ok(pageSizeSource.includes('normalizeExportDpi:normalizeExportDpi'),'DPI 正規化が公開されていない');
// 不正な DPI は保存しない。しないと次回起動時に 300 へ化ける。
assert.ok(projectManagement.includes('sanitizeSettingsValueForStorage'),'保存値の検証が無い');
assert.ok(/sanitizeSettingsValueForStorage\(cfg,el,/.test(projectManagement),'保存時に sanitize を呼んでいない');
assert.ok(projectManagement.includes("cfg.id!=='outputDpi'"),'DPI 以外を改変しない');

// --- P3/P4 の回帰: 重複定義を戻さない / canvas 监听を積み増さない ---
assert.ok(!/function restoreGrid\s*\(/.test(source),'restoreGrid が再びローカル定義されていない');
assert.ok(source.includes('function restoreGridAfterExport'),'网格復元は共通ヘルパに一本化');
assert.equal((source.match(/restoreGridAfterExport\(\)/g)||[]).length,3,'clipCopy/cropAndDownload の2経路+ヘルパ定義の3箇所');
assert.ok(!canvasManager.includes('function formatExportColorHex'),'formatExportColorHex の薄いラッパが残っていない');
assert.ok(canvasManager.includes('exportEstimateCanvasBound'),'canvas イベントは 1 回だけ登録する');
assert.ok(/if\(!exportEstimateCanvasBound&&typeof canvas/.test(canvasManager),'canvas 登録にガードがある');

// --- data URL のバイト長換算 ---
assert.equal(ImageUtil.exportDataUrlByteLength('data:image/png;base64,AAAA'),3,'4 文字は 3 バイト');
assert.equal(ImageUtil.exportDataUrlByteLength('data:image/png;base64,AAA='),2,'1 パディングは 2 バイト');
assert.equal(ImageUtil.exportDataUrlByteLength('data:image/png;base64,AA=='),1,'2 パディングは 1 バイト');
assert.equal(ImageUtil.exportDataUrlByteLength('data:image/png;base64,'),0,'空ペイロードは 0');
assert.equal(ImageUtil.exportDataUrlByteLength(''),0,'空文字列は 0');
assert.equal(ImageUtil.exportDataUrlByteLength(null),0,'null は 0');

// --- 人間向けのサイズ表記 ---
assert.equal(ImageUtil.formatByteSize(0),'0 B');
assert.equal(ImageUtil.formatByteSize(-5),'0 B');
assert.equal(ImageUtil.formatByteSize(512),'512 B');
assert.equal(ImageUtil.formatByteSize(2048),'2 KB');
assert.equal(ImageUtil.formatByteSize(5*1024*1024),'5.0 MB');
assert.equal(ImageUtil.formatByteSize(3*1024*1024*1024),'3.00 GB');
assert.equal(ImageUtil.formatByteSize(NaN),'0 B');

// --- DPI から倍率（A4 既定・長辺基準） ---
const dpiPortrait=ImageUtil.resolveExportMultiplierForDpi(300,1654,2339);
assert.ok(dpiPortrait>1.4&&dpiPortrait<1.6,'300dpi の A4 縦は約 1.5 倍: '+dpiPortrait);
assert.ok(Math.floor(2339*dpiPortrait)===3508,'長辺は A4 の 300dpi 換算 3508px: '+Math.floor(2339*dpiPortrait));
const dpiLandscape=ImageUtil.resolveExportMultiplierForDpi(300,2339,1654);
assert.ok(dpiLandscape>0,'横向きでも正の倍率');
assert.ok(ImageUtil.resolveExportMultiplierForDpi(600,1654,2339)>dpiPortrait,'高い DPI は大きい倍率');
assert.equal(ImageUtil.resolveExportMultiplierForDpi(0,1654,2339),ImageUtil.resolveExportMultiplierForDpi(300,1654,2339),'0 は既定 DPI');
assert.equal(ImageUtil.resolveExportMultiplierForDpi('abc',1654,2339),ImageUtil.resolveExportMultiplierForDpi(300,1654,2339),'不正値は既定 DPI');
assert.ok(ImageUtil.resolveExportMultiplierForDpi(1800,1654,2339)>0,'上限 DPI でも正の倍率');

// --- getCropAndDownloadLink は DPI と出力形式から倍率を決める ---
selectValues.outputDpi='300';
selectValues.outputImageFormat='png';
calls.length=0;
const dpiLink=await ImageUtil.getCropAndDownloadLink();
assert.equal(calls.length,1);
assert.ok(Math.abs(calls[0].multiplier-dpiPortrait)<1e-6,'DPI から算出した倍率を使う: '+calls[0].multiplier);
assert.ok(dpiLink.download.endsWith('.png'));

// --- 出力サイズ概算: 画素あたり一定コストなら総画素数へ正しく外挿する ---
const estimateCalls=[];
const PER_PIXEL=0.5;
const TILE_OVERHEAD=900;
const estimateCanvas={
width:1654,
height:2339,
toDataURL:function(options){
// 実装は同じ options オブジェクトを使い回すため、記録時は複製する。
estimateCalls.push(Object.assign({},options));
const scale=options.multiplier||1;
const pixels=Math.round((options.width||this.width)*scale)*Math.round((options.height||this.height)*scale);
// 行ごとに圧縮しやすさを変える。12 行の平均は 1 なので、全体の合計は画素あたり一定のまま。
const rows=12;
const rowIndex=Math.min(rows-1,Math.floor(((options.top||0)/(this.height/rows))));
const rowFactor=1+0.5*((rowIndex-((rows-1)/2))/((rows-1)/2));
const bytes=Math.round(pixels*PER_PIXEL*rowFactor)+TILE_OVERHEAD;
const base64='A'.repeat(Math.ceil(bytes/3)*4);
return 'data:image/'+(options.format||'png')+';base64,'+base64;
},
};
const estimateContext={
console,
canvas:estimateCanvas,
document:{createElement:function(){return {click:function(){}};}},
fabric:{},
$:function(){return null;},
createToast:function(){},
createToastError:function(){},
removeGrid:function(){},
drawGrid:function(){},
isGridVisible:false,
// 位深度変換そのものは png-bit-depth-smoke-test.cjs が検証する。
// ここでは呼び出し配線だけを見たいので、素通しのスタブを置く。
NaiPngBitDepth:{
normalizeMode:function(mode){var v=String(mode===undefined||mode===null?'':mode).trim().toLowerCase();if(v==='gray')return 'gray';if(v==='rgb')return 'rgb';return 'argb';},
encodePngDataUrl:function(dataUrl){return Promise.resolve(dataUrl);}
},
};
estimateContext.window=estimateContext;
estimateContext.globalThis=estimateContext;
vm.createContext(estimateContext);
vm.runInContext(fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8'),estimateContext,{filename:'manga-page-size.js'});
vm.runInContext(source,estimateContext,{filename:'image-util.js'});
const EstimateUtil=estimateContext.ImageUtil;

const multiplier=1.06;
estimateCalls.length=0;
const estimated=EstimateUtil.estimateExportSize('png','0.92',multiplier,1654,2339);
assert.ok(estimated,'概算が返る');
assert.equal(estimateCalls.length,13,'オーバーヘッド 1 回 + タイル 12 回');
const outputWidth=Math.round(1654*estimated.multiplier);
const outputHeight=Math.round(2339*estimated.multiplier);
const trueBytes=outputWidth*outputHeight*PER_PIXEL+TILE_OVERHEAD;
const estimateError=Math.abs(estimated.bytes-trueBytes)/trueBytes;
assert.ok(estimateError<0.02,'均一コストなら誤差 2% 以内: '+(estimateError*100).toFixed(2)+'%');
assert.equal(estimated.format,'png');
assert.equal(estimated.quality,null,'png に品質は無い');
assert.ok(estimated.low<=estimated.bytes&&estimated.bytes<=estimated.high,'概算は下限と上限の間');
assert.equal(estimated.capped,false,'上限内は capped にならない');

// 一様なページはばらつきが増えないため、必ず下限〜上限の幅を持たせる。
assert.ok(estimated.high-estimated.low>0,'概算は必ず幅を持つ');
assert.ok(estimated.high-estimated.low>=estimated.bytes*0.5,'幅は概算の 50% 以上を確保する');
assert.equal(estimated.upperBound,null,'ばらつきのあるページは上限扱いにしない');

// 全タイルが同じ値のページはコンテナ固定費を重複して数えるため、上限として報告する。
const uniformContext={
console,
canvas:{
width:1000,
height:1000,
toDataURL:function(options){
const scale=options.multiplier||1;
const pixels=Math.round((options.width||this.width)*scale)*Math.round((options.height||this.height)*scale);
const bytes=pixels+TILE_OVERHEAD;
const base64='A'.repeat(Math.ceil(bytes/3)*4);
return 'data:image/'+(options.format||'png')+';base64,'+base64;
},
},
document:{createElement:function(){return {click:function(){}};}},
fabric:{},
$:function(){return null;},
createToast:function(){},
createToastError:function(){},
removeGrid:function(){},
drawGrid:function(){},
isGridVisible:false,
// 位深度変換そのものは png-bit-depth-smoke-test.cjs が検証する。
// ここでは呼び出し配線だけを見たいので、素通しのスタブを置く。
NaiPngBitDepth:{
normalizeMode:function(mode){var v=String(mode===undefined||mode===null?'':mode).trim().toLowerCase();if(v==='gray')return 'gray';if(v==='rgb')return 'rgb';return 'argb';},
encodePngDataUrl:function(dataUrl){return Promise.resolve(dataUrl);}
},
};
uniformContext.window=uniformContext;
uniformContext.globalThis=uniformContext;
vm.createContext(uniformContext);
vm.runInContext(fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8'),uniformContext,{filename:'manga-page-size.js'});
vm.runInContext(source,uniformContext,{filename:'image-util.js'});
const uniformEstimate=uniformContext.ImageUtil.estimateExportSize('png','0.92',1,1000,1000);
assert.equal(uniformEstimate.upperBound,uniformEstimate.bytes,'一様なページは上限として報告する');
assert.ok(uniformEstimate.high>uniformEstimate.bytes,'上限でも幅を持つ');

// タイルは行ごとに別の列を選び、全行を覆う。
const tileCalls=estimateCalls.filter(function(options){return options.width!==8;});
assert.equal(tileCalls.length,12);
const rows=tileCalls.map(function(options){return options.top;});
assert.equal(new Set(rows).size,12,'行が重複しない');
const columns=tileCalls.map(function(options){return options.left;});
assert.equal(new Set(columns).size,12,'列が重複しない');
const expectedCellWidth=1654/12;
tileCalls.forEach(function(options){
assert.ok(Math.abs(options.width-expectedCellWidth)<1e-6,'タイル幅は 1/12');
assert.ok(options.left>=0&&options.left+options.width<=1654+1e-6,'タイルが canvas 内に収まる');
assert.ok(options.top>=0&&options.top+options.height<=2339+1e-6,'タイルが canvas 内に収まる');
});
assert.equal(estimateCalls[0].width,8,'先頭はオーバーヘッド計測用の極小タイル');
assert.equal(estimateCalls[0].height,8);

// JPEG/WebP は品質を渡し、PNG とは別の結果になる。
estimateCalls.length=0;
const jpegEstimate=EstimateUtil.estimateExportSize('jpeg','0.8',multiplier,1654,2339);
assert.equal(estimateCalls[0].quality,0.8,'jpeg は品質を渡す');
assert.equal(jpegEstimate.format,'jpeg');
assert.equal(jpegEstimate.quality,0.8);

// 上限を超える倍率は縮めてから概算し、capped を立てる。
estimateCalls.length=0;
const cappedEstimate=EstimateUtil.estimateExportSize('png','0.92',50,4096,4096);
assert.equal(cappedEstimate.capped,true,'上限超えは capped');
assert.ok(4096*cappedEstimate.multiplier<=8192+2,'概算も上限内で行う');
assert.ok(4096*cappedEstimate.multiplier*4096*cappedEstimate.multiplier<=40*1000*1000+2,'総ピクセル上限も守る');

// 極端に小さい canvas では概算できないので null を返す。
assert.equal(EstimateUtil.estimateExportSize('png','0.92',1,1,1),null,'小さすぎる canvas は null');

// --- 概算 UI の存在確認 ---
assert.ok(html.includes('id="outputImageEstimate"'),'概算表示が未定義');
assert.ok(html.includes('data-i18n="outputImageEstimate"'),'概算ラベルが未定義');
langs.forEach(function(lang){
const file=fs.readFileSync(path.join(root,'js/ui/third/base-translation/base-'+lang+'.js'),'utf8');
assert.ok(file.includes('"outputImageEstimate"'),lang+' に outputImageEstimate が無い');
['outputBitDepth','bitDepthRgb','bitDepthArgb','bitDepthGray','outputPortraitPx','outputLandscapePx','canvasBGAlphaNote','outputBitDepthHint'].forEach(function(key){
assert.ok(file.includes('"'+key+'"'),lang+' に '+key+' が無い');
});
});

// --- 概算は画布設定の変更と描画変更で更新される ---
assert.ok(canvasManager.includes('syncExportSizeEstimate'),'概算同期が未実装');
assert.ok(canvasManager.includes('scheduleExportSizeEstimate'),'概算の遅延更新が未実装');
assert.ok(canvasManager.includes('canvas.on(eventName'),'描画変更で概算を更新する');
assert.ok(canvasManager.includes('syncExportPagePlan'),'画素プレビュー同期が未実装');
assert.ok(canvasManager.includes('commitExportPixelEdge'),'画素入力からの逆算が未実装');
// 画素欄は入力中に書き戻さない。blur でだけ確定する。
assert.ok(canvasManager.includes("element.addEventListener('blur'"),'画素欄の確定が blur に繋がっていない');
assert.ok(canvasManager.includes('exportPixelEditing'),'編集中の欄を除外する仕組みが無い');
assert.ok(!canvasManager.includes('scheduleExportPixelRevert'),'周期的な値の強制戻しが残っている');
// DPI 欄も入力中に書き戻さず、blur / Enter で確定する。
assert.ok(canvasManager.includes('exportDpiEditing'),'DPI 欄の編集中判定が無い');
assert.ok(canvasManager.includes('lastValidExportDpi'),'直前の有効 DPI を覚えていない');
assert.ok(canvasManager.includes('normalizeExportDpiInput'),'DPI 入力の検証が無い');
// 負数や空欄は既定 300 ではなく直前の有効値へ戻す。
assert.ok(canvasManager.includes('exportDpiFallback'),'直前の有効値へのフォールバックが無い');
assert.ok(canvasManager.includes('notifyExportDpiRange'),'範囲外 DPI の通知が無い');
assert.ok(canvasManager.includes('commitExportDpi'),'DPI の確定処理が無い');
assert.ok(canvasManager.includes('syncExportBackgroundLabel'),'背景色ラベルの同期が未実装');
assert.ok(canvasManager.includes('syncExportBitDepthState'),'位深度の有効/無効同期が未実装');

// --- 位深度は UI と設定スキーマに載っている ---
assert.ok(html.includes('id="outputBitDepth"'),'位深度セレクトが未定義');
assert.ok(html.includes('id="exportPxPortraitWidth"')&&html.includes('id="exportPxPortraitHeight"'),'縦の画素入力が未定義');
assert.ok(html.includes('id="exportPxLandscapeWidth"')&&html.includes('id="exportPxLandscapeHeight"'),'横の画素入力が未定義');
assert.ok(html.includes('id="bgColorButton"')&&html.includes('id="bgColorValue"')&&html.includes('id="bgColorSwatch"'),'背景ボタンが未定義');
assert.ok(projectManagement.includes("outputBitDepth:{id:'outputBitDepth',default:'argb'}"),'位深度の既定値は透明度を保持する argb');

// --- 位深度の正規化と下地色の解決 ---
assert.equal(ImageUtil.resolveExportBitDepth('rgb'),'rgb');
assert.equal(ImageUtil.resolveExportBitDepth('ARGB'),'argb');
assert.equal(ImageUtil.resolveExportBitDepth('gray'),'gray');
assert.equal(ImageUtil.resolveExportBitDepth('unknown'),'argb','不明値は既定へ');
assert.equal(ImageUtil.resolveExportBitDepth(undefined),'argb');
// vm レルムをまたぐため、プロトタイプではなく値そのものを比べる。
const backgroundOf=function(value){const result=ImageUtil.resolveExportBackground(value);return result.r+','+result.g+','+result.b;};
assert.equal(backgroundOf('#102030'),'16,32,48');
assert.equal(backgroundOf('rgb(1, 2, 3)'),'1,2,3');
assert.equal(backgroundOf('rgba(4, 5, 6, 0.2)'),'4,5,6','透過値でも RGB だけ使う');
assert.equal(backgroundOf('#abc'),'170,187,204','3桁も展開する');
assert.equal(backgroundOf(''),'255,255,255','未指定は白');
assert.equal(backgroundOf('not-a-color'),'255,255,255');

// --- 位深度は PNG のときだけ適用される ---
selectValues.outputBitDepth='gray';
selectValues.outputImageFormat='jpeg';
assert.equal(ImageUtil.getExportBitDepthForFormat('jpeg'),null,'jpeg に位深度は無い');
assert.equal(ImageUtil.getExportBitDepthForFormat('png'),'gray','png は UI の位深度を使う');
selectValues.outputImageFormat='png';
selectValues.outputBitDepth='rgb';

assert.ok(canvasManager.includes("'object:added'")&&canvasManager.includes("'object:modified'")&&canvasManager.includes("'object:removed'"),'追加・変更・削除を監視する');

})();

main.then(function(){
console.log('image export smoke test passed');
}).catch(function(error){
console.error(error);
process.exit(1);
});
