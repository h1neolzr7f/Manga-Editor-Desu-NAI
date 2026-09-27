const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/core/util/png-bit-depth.js'),'utf8');

// --- テスト側の独立実装（モジュールの実装には依存しない） ---
const CRC_TABLE=(function(){
const table=new Int32Array(256);
for(let n=0;n<256;n++){
let value=n;
for(let bit=0;bit<8;bit++)value=(value&1)?(0xedb88320^(value>>>1)):(value>>>1);
table[n]=value;
}
return table;
})();
function crc32(buf){
let crc=-1;
for(let i=0;i<buf.length;i++)crc=(crc>>>8)^CRC_TABLE[(crc^buf[i])&0xff];
return (crc^-1)>>>0;
}
function chunk(type,data){
const head=Buffer.alloc(8);
head.writeUInt32BE(data.length,0);
head.write(type,4,'latin1');
const body=Buffer.concat([head,data]);
// CRC は length を除いた type+data にかける（PNG 仕様）。
const crc=Buffer.alloc(4);
crc.writeUInt32BE(crc32(body.subarray(4)),0);
return Buffer.concat([body,crc]);
}
function paeth(a,b,c){
const p=a+b-c;
const pa=Math.abs(p-a);
const pb=Math.abs(p-b);
const pc=Math.abs(p-c);
if(pa<=pb&&pa<=pc)return a;
if(pb<=pc)return b;
return c;
}
// テスト側でフィルタをかけて PNG を組み立てる。filters は行ごとのフィルタ型。
function buildPng(width,height,rgba,options){
const settings=options||{};
const colorType=settings.colorType===undefined?6:settings.colorType;
const bitDepth=settings.bitDepth===undefined?8:settings.bitDepth;
const interlace=settings.interlace===undefined?0:settings.interlace;
const channels=colorType===6?4:colorType===2?3:colorType===4?2:1;
const bpp=channels;
const stride=width*bpp;
const filters=settings.filters||[];
const raw=Buffer.alloc((stride+1)*height);
const previous=Buffer.alloc(stride);
for(let y=0;y<height;y++){
const filter=filters.length?filters[y%filters.length]:0;
const rowStart=y*stride;
raw[y*(stride+1)]=filter;
for(let x=0;x<stride;x++){
const value=rgba[rowStart+x];
const left=x>=bpp?rgba[rowStart+x-bpp]:0;
const up=previous[x];
const upperLeft=x>=bpp?previous[x-bpp]:0;
let filtered;
if(filter===0)filtered=value;
else if(filter===1)filtered=value-left;
else if(filter===2)filtered=value-up;
else if(filter===3)filtered=value-((left+up)>>1);
else filtered=value-paeth(left,up,upperLeft);
raw[y*(stride+1)+1+x]=filtered&0xff;
}
rgba.copy(previous,0,rowStart,rowStart+stride);
}
const ihdr=Buffer.alloc(13);
ihdr.writeUInt32BE(width,0);
ihdr.writeUInt32BE(height,4);
ihdr[8]=bitDepth;
ihdr[9]=colorType;
ihdr[10]=0;
ihdr[11]=0;
ihdr[12]=interlace;
const compressed=zlib.deflateSync(raw);
const split=settings.splitIdat||1;
const parts=[];
const perPart=Math.ceil(compressed.length/split)||1;
for(let i=0;i<split;i++)parts.push(chunk('IDAT',compressed.subarray(i*perPart,(i+1)*perPart)));
return Buffer.concat([
Buffer.from([137,80,78,71,13,10,26,10]),
chunk('IHDR',ihdr),
...parts.filter(function(part){return part.length>12;}),
chunk('IEND',Buffer.alloc(0))
]);
}
function toDataUrl(png){
return 'data:image/png;base64,'+png.toString('base64');
}
// 生成された PNG を自前で解析する（モジュールには頼らない）。
function parseChunks(png){
assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10],'PNG シグネチャ');
const chunks=[];
let offset=8;
while(offset+8<=png.length){
const length=png.readUInt32BE(offset);
const type=png.toString('latin1',offset+4,offset+8);
const data=png.subarray(offset+8,offset+8+length);
const stored=png.readUInt32BE(offset+8+length);
const body=png.subarray(offset+4,offset+8+length);
assert.equal(stored,crc32(body),type+' の CRC が一致する');
chunks.push({type,data,signature:stored});
offset=offset+12+length;
}
assert.equal(offset,png.length,'チャンク列が末尾まで整合する');
return chunks;
}
function inflatedPixels(png){
const chunks=parseChunks(png);
const ihdr=chunks[0].data;
const idat=Buffer.concat(chunks.filter(function(c){return c.type==='IDAT';}).map(function(c){return c.data;}));
return {width:ihdr.readUInt32BE(0),height:ihdr.readUInt32BE(4),bitDepth:ihdr[8],colorType:ihdr[9],raw:zlib.inflateSync(idat),chunks};
}
function unfilterTestSide(raw,width,height,channels){
const bpp=channels;
const stride=width*bpp;
const out=Buffer.alloc(stride*height);
let position=0;
for(let y=0;y<height;y++){
const filter=raw[position++];
const rowStart=y*stride;
const prevStart=(y-1)*stride;
for(let x=0;x<stride;x++){
const value=raw[position+x];
const left=x>=bpp?out[rowStart+x-bpp]:0;
const up=y>0?out[prevStart+x]:0;
const upperLeft=(x>=bpp&&y>0)?out[prevStart+x-bpp]:0;
let result;
if(filter===0)result=value;
else if(filter===1)result=value+left;
else if(filter===2)result=value+up;
else if(filter===3)result=value+((left+up)>>1);
else result=value+paeth(left,up,upperLeft);
out[rowStart+x]=result&0xff;
}
position+=stride;
}
return out;
}
function loadApi(extra){
const context={console};
if(extra)Object.keys(extra).forEach(function(key){context[key]=extra[key];});
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'png-bit-depth.js'});
assert.ok(context.NaiPngBitDepth,'NaiPngBitDepth must be defined');
return context.NaiPngBitDepth;
}

const streams={DecompressionStream,CompressionStream,require};
const api=loadApi(streams);
const fallbackApi=loadApi({require});

(async function(){
// --- MODES / DEFAULT_MODE ---
assert.deepEqual({...api.MODES},{GRAY:'gray',RGB:'rgb',ARGB:'argb'});
assert.equal(api.DEFAULT_MODE,'argb');
assert.equal(api.resolveExportMode,api.normalizeMode,'resolveExportMode は normalizeMode の別名');

// --- normalizeMode ---
assert.equal(api.normalizeMode('gray'),'gray');
assert.equal(api.normalizeMode('grey'),'gray');
assert.equal(api.normalizeMode('GRAYSCALE'),'gray');
assert.equal(api.normalizeMode('rgb'),'rgb');
assert.equal(api.normalizeMode('RGB'),'rgb');
assert.equal(api.normalizeMode(' 24-bit '),'rgb');
assert.equal(api.normalizeMode('argb'),'argb');
assert.equal(api.normalizeMode('ARGB'),'argb');
assert.equal(api.normalizeMode('RGBA'),'argb');
assert.equal(api.normalizeMode(''),'argb','空文字は argb');
assert.equal(api.normalizeMode('   '),'argb','空白のみは argb');
assert.equal(api.normalizeMode(undefined),'argb');
assert.equal(api.normalizeMode(null),'argb');
assert.equal(api.normalizeMode('bmp'),'argb','未知の値は argb');
assert.equal(api.normalizeMode(42),'argb');

// --- describeMode ---
assert.deepEqual({...api.describeMode('gray')},{mode:'gray',label:'Grayscale',bitDepth:8,colorType:0,hasAlpha:false});
assert.deepEqual({...api.describeMode('rgb')},{mode:'rgb',label:'24-bit RGB',bitDepth:8,colorType:2,hasAlpha:false});
assert.deepEqual({...api.describeMode('argb')},{mode:'argb',label:'32-bit ARGB',bitDepth:8,colorType:6,hasAlpha:true});
assert.equal(api.describeMode('nope').mode,'argb','未知は argb の説明を返す');

// --- crc32 / paeth / base64 の内部実装 ---
assert.equal(api.__internals.crc32(Buffer.from('123456789','latin1')),0xcbf43926,'CRC32 の既知値');
assert.equal(api.__internals.paeth(10,20,15),15,'p=15 で c を選ぶ');
assert.equal(api.__internals.paeth(30,20,15),30,'pa が最小なら a');
assert.equal(api.__internals.paeth(10,40,50),10,'p=0 で a を選ぶ');
assert.equal(api.__internals.luma(255,0,0),76,'純赤の Rec.601 輝度');
assert.equal(api.__internals.luma(0,255,0),150,'純緑の Rec.601 輝度');
assert.equal(api.__internals.luma(0,0,255),29,'純青の Rec.601 輝度');
const roundTripBytes=Buffer.from([0,1,2,253,254,255,7]);
assert.equal(api.__internals.bytesToBase64(roundTripBytes),roundTripBytes.toString('base64'));
assert.deepEqual([...api.__internals.base64ToBytes(roundTripBytes.toString('base64'))],[...roundTripBytes]);

// --- unfilter: filter 0..4 ---
const sourcePixels=Buffer.from([
10,20,30,255, 40,50,60,128,
70,80,90,255, 100,110,120,64,
]);
const filtered=buildPng(2,2,sourcePixels,{filters:[1,4]});
const filteredChunks=parseChunks(filtered);
const filteredRaw=zlib.inflateSync(Buffer.concat(filteredChunks.filter(function(c){return c.type==='IDAT';}).map(function(c){return c.data;})));
const unfiltered=api.__internals.unfilter(new Uint8Array(filteredRaw),2,2,4).pixels;
assert.deepEqual([...unfiltered],[...sourcePixels],'Sub/Paeth のフィルタ解除');
const averageRow=buildPng(2,2,sourcePixels,{filters:[3,2]});
const averageChunks=parseChunks(averageRow);
const averageRaw=zlib.inflateSync(Buffer.concat(averageChunks.filter(function(c){return c.type==='IDAT';}).map(function(c){return c.data;})));
assert.deepEqual([...api.__internals.unfilter(new Uint8Array(averageRaw),2,2,4).pixels],[...sourcePixels],'Average/Up のフィルタ解除');
assert.deepEqual([...unfilterTestSide(filteredRaw,2,2,4)],[...sourcePixels],'テスト側のフィルタ解除と一致');

// --- ラウンドトリップ: colorType 6 -> gray / rgb / argb ---
const pixels=Buffer.from([
255,0,0,128, 0,255,0,255, 0,0,255,0, 255,255,255,255,
10,20,30,64, 128,128,128,200, 0,0,0,1, 200,100,50,255,
]);
const sourcePng=buildPng(4,2,pixels,{filters:[0,1,2,3,4]});
const sourceDataUrl=toDataUrl(sourcePng);

const rgbUrl=await api.encodePngDataUrl(sourceDataUrl,{mode:'rgb',background:{r:255,g:255,b:255}});
assert.ok(rgbUrl.indexOf('data:image/png;base64,')===0,'rgb は PNG の data URL');
const rgb=inflatedPixels(Buffer.from(rgbUrl.split(',')[1],'base64'));
assert.equal(rgb.colorType,2,'rgb は colorType 2');
assert.equal(rgb.bitDepth,8,'rgb は 8bit');
assert.deepEqual(rgb.chunks.map(function(c){return c.type;}),['IHDR','IDAT','IEND'],'rgb のチャンク順');
assert.deepEqual([...unfilterTestSide(rgb.raw,rgb.width,rgb.height,3)].slice(0,12),
[255,127,127, 0,255,0, 255,255,255, 255,255,255],'rgb は白背景で合成し alpha を落とす');
assert.equal(rgb.raw.length,(rgb.width*3+1)*rgb.height,'rgb の行長');

const argbUrl=await api.encodePngDataUrl(sourceDataUrl,{mode:'argb'});
const argb=inflatedPixels(Buffer.from(argbUrl.split(',')[1],'base64'));
assert.equal(argb.colorType,6,'argb は colorType 6');
assert.equal(argb.bitDepth,8,'argb は 8bit');
assert.deepEqual([...unfilterTestSide(argb.raw,argb.width,argb.height,4)],[...pixels],'argb は alpha を含め完全一致');
assert.equal(argb.raw.length,(argb.width*4+1)*argb.height,'argb の行長');

const grayUrl=await api.encodePngDataUrl(sourceDataUrl,{mode:'GRAY'});
const gray=inflatedPixels(Buffer.from(grayUrl.split(',')[1],'base64'));
assert.equal(gray.colorType,0,'gray は colorType 0');
assert.equal(gray.bitDepth,8,'gray は 8bit');
const grayValues=[...unfilterTestSide(gray.raw,gray.width,gray.height,1)];
assert.equal(grayValues[0],api.__internals.luma(255,127,127),'gray も背景合成してから輝度化');
assert.equal(grayValues[1],150,'純緑は 150');
assert.equal(grayValues[2],api.__internals.luma(255,255,255),'透過した青は白背景で 255');
assert.equal(grayValues[3],255,'純白は 255');
assert.equal(gray.raw.length,(gray.width*1+1)*gray.height,'gray の行長');

// --- 既定値: mode 未指定は argb（透明度保持） ---
const defaulted=inflatedPixels(Buffer.from((await api.encodePngDataUrl(sourceDataUrl)).split(',')[1],'base64'));
assert.equal(defaulted.colorType,6,'既定は argb');
assert.deepEqual([...unfilterTestSide(defaulted.raw,defaulted.width,defaulted.height,4)],[...pixels],'既定は透明度を保持する');
const customBackground=inflatedPixels(Buffer.from((await api.encodePngDataUrl(sourceDataUrl,{mode:'rgb',background:{r:0,g:0,b:0}})).split(',')[1],'base64'));
assert.deepEqual([...unfilterTestSide(customBackground.raw,4,2,3)].slice(0,3),[128,0,0],'黒背景なら半透明赤は 128');
const argbIgnoresBackground=inflatedPixels(Buffer.from((await api.encodePngDataUrl(sourceDataUrl,{mode:'argb',background:{r:0,g:0,b:0}})).split(',')[1],'base64'));
assert.deepEqual([...unfilterTestSide(argbIgnoresBackground.raw,4,2,4)],[...pixels],'argb は背景色を無視する');

// --- 生成側のフィルタ型は常に有効値（0..4）で、行長も宣言チャンネル数と一致する ---
function assertScanlineShape(png,channels,label){
const parsed=inflatedPixels(png);
assert.equal(parsed.raw.length,(parsed.width*channels+1)*parsed.height,label+": 行長が width*channels+1");
const stride=parsed.width*channels;
for(let y=0;y<parsed.height;y++){
const filter=parsed.raw[y*(stride+1)];
assert.ok(filter>=0&&filter<=4,label+": フィルタ型 "+filter+" は有効範囲");
}
return parsed;
}
assertScanlineShape(Buffer.from(rgbUrl.split(',')[1],'base64'),3,'rgb');
assertScanlineShape(Buffer.from(argbUrl.split(',')[1],'base64'),4,'argb');
assertScanlineShape(Buffer.from(grayUrl.split(',')[1],'base64'),1,'gray');
assert.deepEqual(rgb.chunks.map(function(c){return c.type;}),['IHDR','IDAT','IEND'],'チャンクは IHDR/IDAT/IEND の順');
assert.equal(rgb.chunks[rgb.chunks.length-1].data.length,0,'IEND は空');
assert.equal(rgb.chunks[0].data.length,13,'IHDR は 13 バイト');
assert.equal(rgb.chunks[0].data[12],0,'interlace は 0');
assert.equal(rgb.chunks[0].data[10],0,'圧縮方式は 0');
assert.equal(rgb.chunks[0].data[11],0,'フィルタ方式は 0');
assert.equal(api.__internals.crc32(Buffer.alloc(0)),0,'空入力の CRC は 0');

// --- 複数 IDAT チャンクの連結 ---
const splitPng=buildPng(4,2,pixels,{splitIdat:3});
const splitResult=await api.encodePngDataUrl(toDataUrl(splitPng),{mode:'argb'});
assert.deepEqual([...unfilterTestSide(inflatedPixels(Buffer.from(splitResult.split(',')[1],'base64')).raw,4,2,4)],[...pixels],'複数 IDAT を連結して展開する');

// --- 入力カラータイプ 0/2/4 も受け付ける ---
const grayInput=Buffer.from([255,0,128,255,20,240]);
const graySource=buildPng(3,2,grayInput,{colorType:0});
const grayFromGray=inflatedPixels(Buffer.from((await api.encodePngDataUrl(toDataUrl(graySource),{mode:'argb'})).split(',')[1],'base64'));
assert.deepEqual([...unfilterTestSide(grayFromGray.raw,3,2,4)].filter(function(value,index){return index%4===0;}),
[255,0,128,255,20,240],'colorType 0 の入力');
const rgbInput=Buffer.from([255,0,0,0,255,0,0,0,255,9,9,9]);
const rgbSource=buildPng(2,2,rgbInput,{colorType:2});
const rgbFromRgb=inflatedPixels(Buffer.from((await api.encodePngDataUrl(toDataUrl(rgbSource),{mode:'gray'})).split(',')[1],'base64'));
assert.deepEqual([...unfilterTestSide(rgbFromRgb.raw,2,2,1)],[76,150,29,9],'colorType 2 の入力');
const gaInput=Buffer.from([255,255, 14,7]);
const gaSource=buildPng(2,1,gaInput,{colorType:4});
const gaResult=inflatedPixels(Buffer.from((await api.encodePngDataUrl(toDataUrl(gaSource),{mode:'argb'})).split(',')[1],'base64'));
assert.deepEqual([...unfilterTestSide(gaResult.raw,2,1,4)],[255,255,255,255,14,14,14,7],'colorType 4 の入力');

// --- Node フォールバック経路（DecompressionStream 無し）でも同じ結果 ---
assert.equal(typeof fallbackApi.__internals, 'object');
const fallbackUrl=await fallbackApi.encodePngDataUrl(sourceDataUrl,{mode:'argb'});
assert.equal(fallbackUrl,argbUrl,'Node zlib 経路でも同一バイト列');

// --- 非対応入力は Error で reject ---
await assert.rejects(function(){return api.encodePngDataUrl(toDataUrl(buildPng(2,1,gaInput,{colorType:4,interlace:1})));},
function(error){return !!error&&/インターレース/.test(error.message);},'interlace=1 は reject');
await assert.rejects(function(){return api.encodePngDataUrl('data:image/png;base64,AAAA');},function(error){return !!error&&/シグネチャ/.test(error.message);},'PNG でないデータは reject');
await assert.rejects(function(){return api.encodePngDataUrl('not a data url');},function(error){return !!error&&/data URL/.test(error.message);},'data URL でない文字列は reject');
await assert.rejects(function(){return api.encodePngDataUrl(toDataUrl(buildPng(2,1,Buffer.from([1,2]),{colorType:6,bitDepth:16})));},
function(error){return !!error&&/8bit/.test(error.message);},'16bit は reject');
await assert.rejects(function(){return api.encodePngDataUrl(toDataUrl(buildPng(2,1,Buffer.from([1,2,3]),{colorType:3})));},
function(error){return !!error&&/カラータイプ/.test(error.message);},'未対応カラータイプは reject');
await assert.rejects(function(){return api.encodePngDataUrl(null);},function(error){return !!error&&/PNG の data URL/.test(error.message);},'null は reject');

// --- filterScanlines: 生成する行ヘッダは常に 0..4 で、行長は stride+1 ---
const filteredRows=api.__internals.filterScanlines({pixels:new Uint8Array([1,2,3,4,5,6,7,8]),width:2,height:1,channels:4});
assert.equal(filteredRows.length,2*4+1,'フィルタ結果の行長は stride+1');
assert.ok(filteredRows[0]>=0&&filteredRows[0]<=4,'行ヘッダは有効なフィルタ型');
// 全ピクセル同一の行は Sub が最小スコアになる（先頭ピクセルは絶対値のまま）
const flatRows=api.__internals.filterScanlines({pixels:new Uint8Array([9,9,9,9,9,9,9,9]),width:2,height:1,channels:4});
assert.notEqual(flatRows[0],0,'平坦な行で None は選ばない');

// --- 壊れた IDAT / 途中で切れたチャンクも reject ---
const corruptIhdr=Buffer.alloc(13);
corruptIhdr.writeUInt32BE(2,0);
corruptIhdr.writeUInt32BE(1,4);
corruptIhdr[8]=8;
corruptIhdr[9]=6;
const corruptPng=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',corruptIhdr),chunk('IDAT',Buffer.from([1,2,3,4,5,6,7,8])),chunk('IEND',Buffer.alloc(0))]);
await assert.rejects(function(){return api.encodePngDataUrl(toDataUrl(corruptPng),{mode:'rgb'});},function(error){return !!error&&/展開/.test(error.message);},'壊れた IDAT は reject');
const truncatedPng=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',corruptIhdr),Buffer.from([0,0,0,50,73,68,65,84]),Buffer.from([1,2,3])]);
await assert.rejects(function(){return api.encodePngDataUrl(toDataUrl(truncatedPng),{mode:'rgb'});},function(error){return !!error&&/チャンク長/.test(error.message);},'切れたチャンクは reject');

// --- encodePngBytes は data URL ではなくバイト列を返す ---
const bytesResult=await api.encodePngBytes(sourceDataUrl,{mode:'argb'});
assert.equal(typeof bytesResult.byteLength,'number','encodePngBytes returns bytes');
assert.equal(Buffer.from(bytesResult).toString('base64'),argbUrl.split(',')[1],'encodePngBytes と encodePngDataUrl は同一バイト列');

console.log('png bit depth smoke test passed');
})().catch(function(error){
console.error(error);
process.exitCode=1;
});
