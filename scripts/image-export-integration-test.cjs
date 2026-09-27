// 位深度と画素プレビューの統合テスト。
// canvas を「本物の PNG を返すスタブ」に差し替え、実際にダウンロードされる
// データが指定どおりのビット深度・画素になっているかを検証する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');

const root=path.resolve(__dirname,'..');

function crc32(buffer){
let crc=0xffffffff;
for(let n=0;n<buffer.length;n++){
crc=(crc^buffer[n])&0xff;
for(let k=0;k<8;k++)crc=crc&1?(0xedb88320^(crc>>>1)):(crc>>>1);
crc=(crc>>>8)^0;
}
return (crc^0xffffffff)>>>0;
}

function pngChunk(type,data){
const length=Buffer.alloc(4);
length.writeUInt32BE(data.length,0);
const body=Buffer.concat([Buffer.from(type,'ascii'),data]);
const crc=Buffer.alloc(4);
crc.writeUInt32BE(crc32(body),0);
return Buffer.concat([length,body,crc]);
}

// 4x2 の RGBA タイル。透明・半透明・不透明を混ぜて下地合成を確認できるようにする。
const SOURCE_PIXELS=Uint8Array.from([
255,0,0,255, 255,0,0,128, 0,255,0,255, 255,255,255,0,
0,0,0,255, 0,0,255,64, 10,20,30,255, 1,2,3,255
]);
const SOURCE_WIDTH=4;
const SOURCE_HEIGHT=2;

function encodePng(width,height,pixels){
const stride=width*4;
const raw=Buffer.alloc((stride+1)*height);
for(let y=0;y<height;y++){
raw[y*(stride+1)]=0;
Buffer.from(pixels.buffer,pixels.byteOffset+y*stride,stride).copy(raw,y*(stride+1)+1);
}
const ihdr=Buffer.alloc(13);
ihdr.writeUInt32BE(width,0);
ihdr.writeUInt32BE(height,4);
ihdr[8]=8;
ihdr[9]=6;
return Buffer.concat([
Buffer.from([137,80,78,71,13,10,26,10]),
pngChunk('IHDR',ihdr),
pngChunk('IDAT',zlib.deflateSync(raw)),
pngChunk('IEND',Buffer.alloc(0))
]);
}

function tiledPixels(width,height){
const pixels=new Uint8Array(width*height*4);
for(let y=0;y<height;y++){
for(let x=0;x<width;x++){
const sx=x%SOURCE_WIDTH;
const sy=y%SOURCE_HEIGHT;
const source=(sy*SOURCE_WIDTH+sx)*4;
const target=(y*width+x)*4;
pixels[target]=SOURCE_PIXELS[source];
pixels[target+1]=SOURCE_PIXELS[source+1];
pixels[target+2]=SOURCE_PIXELS[source+2];
pixels[target+3]=SOURCE_PIXELS[source+3];
}
}
return pixels;
}

function paeth(left,up,upperLeft){
const estimate=left+up-upperLeft;
const distanceLeft=Math.abs(estimate-left);
const distanceUp=Math.abs(estimate-up);
const distanceUpperLeft=Math.abs(estimate-upperLeft);
if(distanceLeft<=distanceUp&&distanceLeft<=distanceUpperLeft)return left;
if(distanceUp<=distanceUpperLeft)return up;
return upperLeft;
}

// PNG を自前で解析して IHDR と画素を読む（本番モジュールとは別実装）。
function parsePng(buffer){
assert.equal(buffer.readUInt32BE(0),0x89504e47,'PNG 署名');
let offset=8;
let header=null;
const idat=[];
let sawEnd=false;
while(offset<buffer.length){
const length=buffer.readUInt32BE(offset);
const type=buffer.toString('ascii',offset+4,offset+8);
const data=buffer.subarray(offset+8,offset+8+length);
if(type==='IHDR'){
header={width:data.readUInt32BE(0),height:data.readUInt32BE(4),bitDepth:data[8],colorType:data[9],interlace:data[12]};
}else if(type==='IDAT'){
idat.push(data);
}else if(type==='IEND'){
sawEnd=true;
}
offset+=12+length;
}
assert.ok(sawEnd,'IEND がある');
const raw=zlib.inflateSync(Buffer.concat(idat));
const channels={0:1,2:3,4:2,6:4}[header.colorType];
assert.ok(channels,'既知のカラータイプ');
const stride=header.width*channels;
assert.equal(raw.length,(stride+1)*header.height,'行の長さが一致する');
const pixels=new Uint8Array(stride*header.height);
for(let y=0;y<header.height;y++){
const filter=raw[y*(stride+1)];
const rowStart=y*(stride+1)+1;
const previousStart=(y-1)*stride;
for(let x=0;x<stride;x++){
const value=raw[rowStart+x];
const left=x>=channels?pixels[y*stride+x-channels]:0;
const up=y>0?pixels[previousStart+x]:0;
const upperLeft=(y>0&&x>=channels)?pixels[previousStart+x-channels]:0;
let restored;
if(filter===0)restored=value;
else if(filter===1)restored=value+left;
else if(filter===2)restored=value+up;
else if(filter===3)restored=value+((left+up)>>1);
else if(filter===4)restored=value+paeth(left,up,upperLeft);
else throw new Error('未知のフィルタ: '+filter);
pixels[y*stride+x]=restored&0xff;
}
}
return {header,pixels,channels};
}

function buildContext(){
const values={outputImageFormat:'png',outputImageQuality:'0.92',outputDpi:'300',outputBitDepth:'rgb'};
const probes=[];
const link={download:'',href:'',click:function(){}};
const canvasStub={
width:1654,
height:2339,
getWidth:function(){return this.width;},
getHeight:function(){return this.height;},
setBackgroundColor:function(){},
renderAll:function(){},
toDataURL:function(options){
const multiplier=options.multiplier||1;
const width=Math.max(1,Math.floor(this.width*multiplier));
const height=Math.max(1,Math.floor(this.height*multiplier));
probes.push({format:options.format,multiplier:multiplier,width:width,height:height});
// 実際に書き出す画素数は probes で確認する。ここでは小さなタイル画像を返して
// ビット深度変換の検証だけを軽く回す。MIME は本物の canvas と同じく形式に従う。
const mime=options.format==='png'?'image/png':'image/'+options.format;
const tile=options.format==='png'
?encodePng(SOURCE_WIDTH,SOURCE_HEIGHT,tiledPixels(SOURCE_WIDTH,SOURCE_HEIGHT))
:Buffer.from('tile-'+options.format);
return 'data:'+mime+';base64,'+tile.toString('base64');
}
};
const context={
console,
DecompressionStream,
CompressionStream,
Uint8Array,
Int16Array,
canvas:canvasStub,
fabric:{},
$:function(id){return values[id]===undefined?null:{value:values[id],addEventListener:function(){}};},
document:{createElement:function(){return link;}},
createToast:function(){},
createToastError:function(){},
removeGrid:function(){},
drawGrid:function(){},
isGridVisible:false,
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/core/manga-page-size.js'),'utf8'),context,{filename:'manga-page-size.js'});
vm.runInContext(fs.readFileSync(path.join(root,'js/core/util/png-bit-depth.js'),'utf8'),context,{filename:'png-bit-depth.js'});
vm.runInContext(fs.readFileSync(path.join(root,'js/core/util/image-util.js'),'utf8'),context,{filename:'image-util.js'});
return {context,values,probes,canvasStub,link};
}

const main=(async function(){
const {context,values,probes,canvasStub,link}=buildContext();
const ImageUtil=context.ImageUtil;
const PageSize=context.NaiMangaPageSize;
assert.ok(ImageUtil&&PageSize,'モジュールが読み込まれている');
assert.equal(typeof DecompressionStream,'function','DecompressionStream が必要');

// --- 実際に書き出した PNG が指定どおりのビット深度になる ---
const cases=[
{bitDepth:'rgb',colorType:2,channels:3,download:'rgb'},
{bitDepth:'argb',colorType:6,channels:4,download:'argb'},
{bitDepth:'gray',colorType:0,channels:1,download:'gray'}
];
for(const testCase of cases){
values.outputBitDepth=testCase.bitDepth;
values.outputImageFormat='png';
values.outputDpi='300';
probes.length=0;
await ImageUtil.getCropAndDownloadLink();
assert.equal(probes.length,1,'書き出しは 1 回');
const dataUrl=link.href;
assert.ok(dataUrl.indexOf('data:image/png;base64,')===0,testCase.bitDepth+' は PNG');
const parsed=parsePng(Buffer.from(dataUrl.split(',')[1],'base64'));
const descriptor=context.NaiPngBitDepth.describeMode(testCase.bitDepth);
assert.equal(parsed.header.bitDepth,descriptor.bitDepth,testCase.bitDepth+' のビット深度');
assert.equal(parsed.header.colorType,testCase.colorType,testCase.bitDepth+' のカラータイプ');
assert.equal(parsed.header.interlace,0,testCase.bitDepth+' は非インターレース');
assert.equal(parsed.channels,testCase.channels,testCase.bitDepth+' のチャンネル数');
// 先頭画素は不透明な赤。RGB/ARGB は赤のまま、グレースケールは輝度へ落ちる。
if(testCase.channels===1){
assert.equal(parsed.pixels[0],76,testCase.bitDepth+' 先頭の輝度');
}else{
assert.equal(parsed.pixels[0],255,testCase.bitDepth+' 先頭 R');
assert.equal(parsed.pixels[1],0,testCase.bitDepth+' 先頭 G');
assert.equal(parsed.pixels[2],0,testCase.bitDepth+' 先頭 B');
}
if(testCase.channels===4){
// 2 番目の画素は 50% の赤 → ARGB ではアルファが残る。
assert.equal(parsed.pixels[7],128,testCase.bitDepth+' 半透明アルファが残る');
}
}

// --- 24bit RGB は下地色で合成される（透明は白になる）---
values.outputBitDepth='rgb';
context.canvas.backgroundColor='rgba(255,255,255,1)';
await ImageUtil.getCropAndDownloadLink();
let parsedRgb=parsePng(Buffer.from(link.href.split(',')[1],'base64'));
// 4 番目の画素は完全透明 → 白。
assert.equal(parsedRgb.pixels[9],255,'透明は白へ合成 R');
assert.equal(parsedRgb.pixels[10],255,'透明は白へ合成 G');
assert.equal(parsedRgb.pixels[11],255,'透明は白へ合成 B');
// 2 番目の画素は 50% の赤 → 白との中間。
assert.equal(parsedRgb.pixels[3],255,'半透明赤 R');
assert.equal(parsedRgb.pixels[4],127,'半透明赤 G');

context.canvas.backgroundColor='rgba(0,0,0,1)';
await ImageUtil.getCropAndDownloadLink();
parsedRgb=parsePng(Buffer.from(link.href.split(',')[1],'base64'));
assert.equal(parsedRgb.pixels[9],0,'下地が黒なら透明は黒 R');
assert.equal(parsedRgb.pixels[3],128,'下地が黒なら 50% 赤は暗くなる R');

// --- グレースケールは Rec.601 ---
values.outputBitDepth='gray';
await ImageUtil.getCropAndDownloadLink();
const parsedGray=parsePng(Buffer.from(link.href.split(',')[1],'base64'));
assert.equal(parsedGray.pixels[0],76,'赤は 76');
assert.equal(parsedGray.pixels[2],150,'緑は 150');

// --- 出力画素プレビューと実書き出しが一致する ---
const size=PageSize.PAGE_MM;
for(const dpi of [96,150,200,240,300,400,600,900,1200,1800]){
values.outputDpi=String(dpi);
for(const landscape of [false,true]){
const sheet=landscape?size.landscape:size.portrait;
// 画布は 200dpi 相当の A4 画素。mm と DPI から求めた計画値を、実際に
// 書き出した画素と突き合わせて「プレビュー＝実出力」を確認する。
canvasStub.width=landscape?2339:1654;
canvasStub.height=landscape?1654:2339;
const plan=PageSize.planExportPage(dpi,canvasStub.width,canvasStub.height);
const multiplier=ImageUtil.resolveExportMultiplierForDpi(dpi,canvasStub.width,canvasStub.height);
assert.ok(Math.abs(multiplier-plan.multiplier)<1e-12,'倍率が planExportPage と一致する (dpi '+dpi+')');
probes.length=0;
await ImageUtil.getCropAndDownloadLinkByMultiplier(multiplier,'png',0.92,'argb');
assert.equal(probes[0].width,plan.width,'プレビュー幅と実出力幅が一致 (dpi '+dpi+')');
assert.equal(probes[0].height,plan.height,'プレビュー高さと実出力高さが一致 (dpi '+dpi+')');
// 上限に達していなければ、mm と DPI から求めた理想長辺と一致する。
if(!plan.capped){
assert.equal(plan.longPixels,Math.round(Math.max(sheet.width,sheet.height)/25.4*dpi),'理想長辺と一致 (dpi '+dpi+')');
}
}
}
canvasStub.width=1654;
canvasStub.height=2339;

// --- 画素指定から DPI を逆算しても同じ画素に戻る ---
for(const typed of [1654,2000,2339,2480,3508,5000,7519]){
const dpi=PageSize.resolveDpiForPixelEdge(1654,2339,typed,false);
assert.ok(dpi!==null,'長辺 '+typed+' は到達可能');
const plan=PageSize.planExportPage(dpi,1654,2339);
assert.equal(plan.longPixels,typed,'往復しても画素が変わらない ('+typed+')');
}

// --- jpeg ではビット深度を触らない ---
values.outputImageFormat='jpeg';
values.outputBitDepth='gray';
probes.length=0;
await ImageUtil.getCropAndDownloadLinkByMultiplier(1,'jpeg',0.8);
assert.equal(probes[0].format,'jpeg','jpeg はそのまま');
assert.ok(link.href.indexOf('data:image/png')!==0,'jpeg を PNG へ差し替えない');
assert.equal(ImageUtil.getExportBitDepthForFormat('jpeg'),null,'jpeg にビット深度は無い');

// --- クリップボード用は UI が RGB でも常に ARGB（透明を保つ）---
values.outputImageFormat='png';
values.outputBitDepth='rgb';
context.window.isSecureContext=true;
context.window.ClipboardItem=function(items){this.items=items;};
context.window.navigator={clipboard:{write:function(items){context.window.clipboardWrite=items;return Promise.resolve();}}};
context.fetch=function(url){return Promise.resolve({blob:function(){return Promise.resolve({type:'image/png',url:url});}});};
probes.length=0;
await ImageUtil.clipCopy();
assert.equal(probes[probes.length-1].format,'png','clipCopy は PNG');
assert.equal(probes[probes.length-1].multiplier,PageSize.planExportPage(values.outputDpi,canvasStub.width,canvasStub.height).multiplier,'clipCopy も DPI 設定に従う');
const clipboardItems=context.window.clipboardWrite;
assert.ok(clipboardItems&&clipboardItems.length===1,'クリップボードへ 1 件書き込む');
const clipboardBlob=clipboardItems[0].items['image/png'];
assert.ok(clipboardBlob&&clipboardBlob.url&&clipboardBlob.url.indexOf('data:image/png;base64,')===0,'クリップボードの中身は PNG');
const parsedClip=parsePng(Buffer.from(clipboardBlob.url.split(',')[1],'base64'));
assert.equal(parsedClip.header.colorType,6,'clipCopy は透過を保つ ARGB');
assert.equal(parsedClip.pixels[3],255,'clipCopy の不透明はそのまま');
assert.equal(parsedClip.pixels[7],128,'clipCopy の半透明が残る');
assert.equal(parsedClip.pixels[15],0,'clipCopy の完全透明が残る');
assert.deepEqual(Array.from(parsedClip.pixels.slice(12,15)),[255,255,255],'clipCopy の透明画素は白のまま');
})();

main.then(function(){
console.log('image export integration test passed');
}).catch(function(error){
console.error(error);
process.exit(1);
});
