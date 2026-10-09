// png-bit-depth.js - PNG のビット深度変換（グレースケール / 24bit RGB / 32bit ARGB）を行うブラウザ向けエンコーダ
// canvas.toDataURL は常に 32bit RGBA を返すため、PNG を自前でデコードし直し、
// 指定の色種別（0/2/6）で再エンコードして実データとしてのビット深度を保証する。
(function(root){
"use strict";

var MODES={GRAY:'gray',RGB:'rgb',ARGB:'argb'};
var DEFAULT_MODE=MODES.ARGB;
var PNG_SIGNATURE=[137,80,78,71,13,10,26,10];

// gray モードは Rec.601 の輝度係数で単一チャンネルへ落とす（係数は仕様として固定）。
var LUMA_RED=0.299;
var LUMA_GREEN=0.587;
var LUMA_BLUE=0.114;

// channels は describeMode の返り値には含めない（外部仕様は bitDepth/colorType/hasAlpha のみ）。
var MODE_TABLE={
gray:{label:'Grayscale',bitDepth:8,colorType:0,hasAlpha:false},
rgb:{label:'24-bit RGB',bitDepth:8,colorType:2,hasAlpha:false},
argb:{label:'32-bit ARGB',bitDepth:8,colorType:6,hasAlpha:true}
};

// PNG の対応カラータイプ。0=gray,2=RGB,4=gray+alpha,6=RGBA（いずれも 8bit のみ対応）。
var SOURCE_COLOR_TYPES={
0:{channels:1,hasAlpha:false},
2:{channels:3,hasAlpha:false},
4:{channels:2,hasAlpha:true},
6:{channels:4,hasAlpha:true}
};

var BASE64_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var BASE64_LOOKUP=null;
var CRC_TABLE=null;

var ERROR_PREFIX='PNG ビット深度変換に失敗しました: ';

function normalizeMode(mode){
var value=mode===undefined||mode===null?'':String(mode).trim().toLowerCase().replace(/[\s_-]+/g,'');
if(value==='gray'||value==='grey'||value==='grayscale'||value==='greyscale'||value==='8')return MODES.GRAY;
if(value==='argb'||value==='rgba'||value==='32'||value==='32bit'||value==='argb32')return MODES.ARGB;
if(value==='rgb'||value==='24'||value==='24bit'||value==='rgb24')return MODES.RGB;
return DEFAULT_MODE;
}

function describeMode(mode){
var key=normalizeMode(mode);
var spec=MODE_TABLE[key];
return {
mode:key,
label:spec.label,
bitDepth:spec.bitDepth,
colorType:spec.colorType,
hasAlpha:spec.hasAlpha
};
}

function toUint8(source){
if(source instanceof Uint8Array)return source;
if(source&&typeof source.byteLength==='number'){
return new Uint8Array(source.buffer,source.byteOffset||0,source.byteLength);
}
throw new Error(ERROR_PREFIX+'バイト列として解釈できません。');
}

function concatBytes(chunks){
var total=0;
var i;
for(i=0;i<chunks.length;i++)total+=chunks[i].length;
var merged=new Uint8Array(total);
var offset=0;
for(i=0;i<chunks.length;i++){
merged.set(chunks[i],offset);
offset+=chunks[i].length;
}
return merged;
}

function base64Lookup(){
if(BASE64_LOOKUP)return BASE64_LOOKUP;
var table=new Int16Array(256);
var i;
for(i=0;i<256;i++)table[i]=-1;
for(i=0;i<BASE64_ALPHABET.length;i++)table[BASE64_ALPHABET.charCodeAt(i)]=i;
BASE64_LOOKUP=table;
return BASE64_LOOKUP;
}

function bytesToBase64(bytes){
var out='';
var index;
for(index=0;index<bytes.length;index+=3){
var first=bytes[index];
var hasSecond=index+1<bytes.length;
var hasThird=index+2<bytes.length;
var second=hasSecond?bytes[index+1]:0;
var third=hasThird?bytes[index+2]:0;
out+=BASE64_ALPHABET.charAt(first>>2);
out+=BASE64_ALPHABET.charAt(((first&3)<<4)|(second>>4));
out+=hasSecond?BASE64_ALPHABET.charAt(((second&15)<<2)|(third>>6)):'=';
out+=hasThird?BASE64_ALPHABET.charAt(third&63):'=';
}
return out;
}

function base64ToBytes(base64){
var lookup=base64Lookup();
var text=String(base64===undefined||base64===null?'':base64);
var estimate=Math.floor(text.length*3/4);
var out=new Uint8Array(estimate>0?estimate:0);
var accumulator=0;
var bits=0;
var offset=0;
var index;
for(index=0;index<text.length;index++){
// base64 以外の文字（改行・空白・パディングの '='）は読み飛ばす。
var value=lookup[text.charCodeAt(index)&0xff];
if(value<0)continue;
accumulator=(accumulator<<6)|value;
bits+=6;
if(bits>=8){
bits-=8;
out[offset++]=(accumulator>>bits)&0xff;
}
}
if(offset===out.length)return out;
return out.subarray(0,offset);
}

function crcTable(){
if(CRC_TABLE)return CRC_TABLE;
var table=new Int32Array(256);
var n;
for(n=0;n<256;n++){
var value=n;
var bit;
for(bit=0;bit<8;bit++){
value=(value&1)?(0xedb88320^(value>>>1)):(value>>>1);
}
table[n]=value;
}
CRC_TABLE=table;
return CRC_TABLE;
}

function crc32(bytes,start,end){
var table=crcTable();
var crc=-1;
var from=start===undefined?0:start;
var to=end===undefined?bytes.length:end;
var index;
for(index=from;index<to;index++){
crc=(crc>>>8)^table[(crc^bytes[index])&0xff];
}
return (crc^-1)>>>0;
}

function paeth(left,up,upperLeft){
var estimate=left+up-upperLeft;
var distanceLeft=Math.abs(estimate-left);
var distanceUp=Math.abs(estimate-up);
var distanceUpperLeft=Math.abs(estimate-upperLeft);
if(distanceLeft<=distanceUp&&distanceLeft<=distanceUpperLeft)return left;
if(distanceUp<=distanceUpperLeft)return up;
return upperLeft;
}

// フィルタ解除。filter 0..4 は PNG 仕様の None/Sub/Up/Average/Paeth。
// Sub/Average/Paeth は左バイトを bpp 前（＝直前のピクセル）から参照する。
function unfilter(raw,width,height,channels){
var bpp=channels;
var stride=width*bpp;
var expected=(stride+1)*height;
if(raw.length<expected){
throw new Error(ERROR_PREFIX+'展開後のデータ長が不足しています（必要 '+expected+' バイト / 実際 '+raw.length+' バイト）。');
}
var out=new Uint8Array(stride*height);
var position=0;
var y;
for(y=0;y<height;y++){
var filter=raw[position++];
if(filter<0||filter>4){
throw new Error(ERROR_PREFIX+'未対応のフィルタ型です: '+filter);
}
var rowStart=y*stride;
var prevStart=(y-1)*stride;
var x;
for(x=0;x<stride;x++){
var value=raw[position+x];
var left=x>=bpp?out[rowStart+x-bpp]:0;
var up=y>0?out[prevStart+x]:0;
if(filter===0){
out[rowStart+x]=value;
}else if(filter===1){
out[rowStart+x]=(value+left)&0xff;
}else if(filter===2){
out[rowStart+x]=(value+up)&0xff;
}else if(filter===3){
out[rowStart+x]=(value+((left+up)>>1))&0xff;
}else{
var upperLeft=(x>=bpp&&y>0)?out[prevStart+x-bpp]:0;
out[rowStart+x]=(value+paeth(left,up,upperLeft))&0xff;
}
}
position+=stride;
}
return {pixels:out,width:width,height:height,channels:channels};
}

function readUint32(bytes,offset){
return ((bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3])>>>0;
}

function writeUint32(bytes,offset,value){
bytes[offset]=(value>>>24)&0xff;
bytes[offset+1]=(value>>>16)&0xff;
bytes[offset+2]=(value>>>8)&0xff;
bytes[offset+3]=value&0xff;
}

function parseIhdr(bytes,start){
var width=readUint32(bytes,start);
var height=readUint32(bytes,start+4);
var bitDepth=bytes[start+8];
var colorType=bytes[start+9];
var compression=bytes[start+10];
var filterMethod=bytes[start+11];
var interlace=bytes[start+12];
if(width<=0||height<=0)throw new Error(ERROR_PREFIX+'画像サイズが不正です。');
if(interlace!==0)throw new Error(ERROR_PREFIX+'インターレース PNG には対応していません。');
if(compression!==0||filterMethod!==0)throw new Error(ERROR_PREFIX+'未対応の圧縮/フィルタ方式です。');
if(bitDepth!==8)throw new Error(ERROR_PREFIX+'8bit 以外の PNG には対応していません: '+bitDepth);
var spec=SOURCE_COLOR_TYPES[colorType];
if(!spec)throw new Error(ERROR_PREFIX+'未対応のカラータイプです: '+colorType);
return {
width:width,
height:height,
bitDepth:bitDepth,
colorType:colorType,
channels:spec.channels,
hasAlpha:spec.hasAlpha
};
}

function parsePng(source){
if(typeof source==='string'){
var comma=source.indexOf(',');
if(comma<0)throw new Error(ERROR_PREFIX+'data URL の形式が不正です。');
if(source.slice(0,comma).indexOf('base64')<0)throw new Error(ERROR_PREFIX+'base64 の data URL 以外は解釈できません。');
return parsePngBytes(base64ToBytes(source.slice(comma+1)));
}
if(source&&typeof source.byteLength==='number')return parsePngBytes(toUint8(source));
throw new Error(ERROR_PREFIX+'PNG の data URL かバイト列を渡してください。');
}

function parsePngBytes(bytes){
var index;
for(index=0;index<PNG_SIGNATURE.length;index++){
if(bytes[index]!==PNG_SIGNATURE[index])throw new Error(ERROR_PREFIX+'PNG シグネチャが一致しません。');
}
var offset=PNG_SIGNATURE.length;
var header=null;
var dataChunks=[];
while(offset+8<=bytes.length){
var length=readUint32(bytes,offset);
var type=String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7]);
var dataStart=offset+8;
var dataEnd=dataStart+length;
if(dataEnd+4>bytes.length)throw new Error(ERROR_PREFIX+'チャンク長が不正です: '+type);
if(type==='IHDR'){
if(length!==13)throw new Error(ERROR_PREFIX+'IHDR の長さが不正です。');
header=parseIhdr(bytes,dataStart);
}else if(type==='IDAT'){
// IDAT は複数チャンクに分割され得るため、展開前にすべて連結する。
if(!header)throw new Error(ERROR_PREFIX+'IHDR より先に IDAT が現れました。');
dataChunks.push(bytes.subarray(dataStart,dataEnd));
}else if(type==='IEND'){
break;
}
offset=dataEnd+4;
}
if(!header)throw new Error(ERROR_PREFIX+'IHDR が見つかりません。');
if(!dataChunks.length)throw new Error(ERROR_PREFIX+'IDAT が見つかりません。');
header.data=concatBytes(dataChunks);
return header;
}

function nodeZlib(){
if(typeof require!=='function')return null;
try{
return require('zlib');
}catch(error){
return null;
}
}

function streamBytes(stream,input){
var writer=stream.writable.getWriter();
var pump=writer.write(input).then(function(){
return writer.close();
}).catch(function(){
// 展開/圧縮に失敗した場合は reader 側のエラーとして通知されるため、ここでは握りつぶす。
return null;
});
var chunks=[];
var reader=stream.readable.getReader();
function pumpNext(){
return reader.read().then(function(result){
if(result.done)return pump;
chunks.push(toUint8(result.value));
return pumpNext();
});
}
return pumpNext().then(function(){
return pump;
}).then(function(){
return concatBytes(chunks);
});
}

function inflateBytes(input){
var bytes=toUint8(input);
if(typeof DecompressionStream==='function'){
return streamBytes(new DecompressionStream('deflate'),bytes).catch(function(error){
throw new Error(ERROR_PREFIX+'IDAT の展開に失敗しました（'+(error&&error.message||error)+'）。');
});
}
var zlib=nodeZlib();
if(zlib&&typeof zlib.inflateSync==='function'){
try{
return Promise.resolve(toUint8(zlib.inflateSync(bytes)));
}catch(error){
return Promise.reject(new Error(ERROR_PREFIX+'IDAT の展開に失敗しました（'+(error&&error.message||error)+'）。'));
}
}
return Promise.reject(new Error(ERROR_PREFIX+'DecompressionStream が利用できないため IDAT を展開できません。'));
}

function deflateBytes(input){
var bytes=toUint8(input);
if(typeof CompressionStream==='function'){
return streamBytes(new CompressionStream('deflate'),bytes).catch(function(error){
throw new Error(ERROR_PREFIX+'IDAT の圧縮に失敗しました（'+(error&&error.message||error)+'）。');
});
}
var zlib=nodeZlib();
if(zlib&&typeof zlib.deflateSync==='function'){
try{
return Promise.resolve(toUint8(zlib.deflateSync(bytes)));
}catch(error){
return Promise.reject(new Error(ERROR_PREFIX+'IDAT の圧縮に失敗しました（'+(error&&error.message||error)+'）。'));
}
}
return Promise.reject(new Error(ERROR_PREFIX+'CompressionStream が利用できないため IDAT を圧縮できません。'));
}

function normalizeBackground(background){
var source=background||{};
function channel(value){
var number=value===undefined||value===null?NaN:parseFloat(value);
if(!isFinite(number))return 255;
number=Math.round(number);
if(number<0)return 0;
if(number>255)return 255;
return number;
}
return {r:channel(source.r),g:channel(source.g),b:channel(source.b)};
}

function toRgba(image){
var width=image.width;
var height=image.height;
var channels=image.channels;
var pixels=image.pixels;
var count=width*height;
var rgba=new Uint8Array(count*4);
var index;
if(channels===4){
rgba.set(pixels.subarray(0,count*4));
}else if(channels===3){
for(index=0;index<count;index++){
rgba[index*4]=pixels[index*3];
rgba[index*4+1]=pixels[index*3+1];
rgba[index*4+2]=pixels[index*3+2];
rgba[index*4+3]=255;
}
}else if(channels===2){
for(index=0;index<count;index++){
var gray=pixels[index*2];
rgba[index*4]=gray;
rgba[index*4+1]=gray;
rgba[index*4+2]=gray;
rgba[index*4+3]=pixels[index*2+1];
}
}else{
for(index=0;index<count;index++){
var value=pixels[index];
rgba[index*4]=value;
rgba[index*4+1]=value;
rgba[index*4+2]=value;
rgba[index*4+3]=255;
}
}
return {pixels:rgba,width:width,height:height,channels:4};
}

function luma(red,green,blue){
return Math.round(LUMA_RED*red+LUMA_GREEN*green+LUMA_BLUE*blue);
}

// argb 以外は alpha チャンネルが無いため、透明ピクセルを背景色へ source-over で合成してから落とす。
// 単に alpha を捨てると透明部分が黒に寄るため、必ず合成する（背景色の既定は白・不透明）。
function convertPixels(image,mode,background){
var pixels=image.pixels;
var width=image.width;
var height=image.height;
var count=width*height;
if(mode===MODES.ARGB){
return {pixels:pixels,width:width,height:height,channels:4};
}
var isGray=mode===MODES.GRAY;
var out=new Uint8Array(count*(isGray?1:3));
var index;
for(index=0;index<count;index++){
var red=pixels[index*4];
var green=pixels[index*4+1];
var blue=pixels[index*4+2];
var alpha=pixels[index*4+3]/255;
if(alpha<1){
red=Math.round(red*alpha+background.r*(1-alpha));
green=Math.round(green*alpha+background.g*(1-alpha));
blue=Math.round(blue*alpha+background.b*(1-alpha));
}
if(isGray){
out[index]=luma(red,green,blue);
}else{
out[index*3]=red;
out[index*3+1]=green;
out[index*3+2]=blue;
}
}
return {pixels:out,width:width,height:height,channels:isGray?1:3};
}

// フィルタ型 0..4 を 1 行ずつ試し、符号付きバイトの絶対値和が最小の型を採用する（一般的な圧縮向けヒューリスティック）。
function filterScanlines(image){
var width=image.width;
var height=image.height;
var bpp=image.channels;
var stride=width*bpp;
var pixels=image.pixels;
var rows=new Uint8Array((stride+1)*height);
var previous=new Uint8Array(stride);
// 5 種のフィルタ候補を 1 パスでまとめて作り、分岐を内側から追い出す。
var candidates=new Uint8Array(stride*5);
var y;
for(y=0;y<height;y++){
var rowStart=y*stride;
var noneOffset=0;
var subOffset=stride;
var upOffset=stride*2;
var averageOffset=stride*3;
var paethOffset=stride*4;
var x;
for(x=0;x<stride;x++){
var raw=pixels[rowStart+x];
var left=x>=bpp?pixels[rowStart+x-bpp]:0;
var up=previous[x];
var upperLeft=x>=bpp?previous[x-bpp]:0;
candidates[noneOffset+x]=raw;
candidates[subOffset+x]=(raw-left)&0xff;
candidates[upOffset+x]=(raw-up)&0xff;
candidates[averageOffset+x]=(raw-((left+up)>>1))&0xff;
candidates[paethOffset+x]=(raw-paeth(left,up,upperLeft))&0xff;
}
var bestFilter=0;
var bestScore=Infinity;
var bestOffset=0;
var filter;
for(filter=0;filter<5;filter++){
var offset=filter*stride;
var score=0;
for(x=0;x<stride;x++){
var value=candidates[offset+x];
score+=value<128?value:256-value;
// 最小値を更新できないと確定した時点で打ち切る（選択結果は変わらない）。
if(score>=bestScore)break;
}
if(score<bestScore){
bestScore=score;
bestFilter=filter;
bestOffset=offset;
}
}
rows[rowStart+y]=bestFilter;
rows.set(candidates.subarray(bestOffset,bestOffset+stride),rowStart+y+1);
previous.set(pixels.subarray(rowStart,rowStart+stride));
}
return rows;
}

function buildChunk(type,data){
var dataLength=data.length;
var chunk=new Uint8Array(dataLength+12);
writeUint32(chunk,0,dataLength);
chunk[4]=type.charCodeAt(0);
chunk[5]=type.charCodeAt(1);
chunk[6]=type.charCodeAt(2);
chunk[7]=type.charCodeAt(3);
chunk.set(data,8);
writeUint32(chunk,dataLength+8,crc32(chunk,4,dataLength+8));
return chunk;
}

function buildIhdr(width,height,bitDepth,colorType){
var data=new Uint8Array(13);
writeUint32(data,0,width);
writeUint32(data,4,height);
data[8]=bitDepth;
data[9]=colorType;
data[10]=0;
data[11]=0;
data[12]=0;
return buildChunk('IHDR',data);
}

function encodePngBytes(sourcePngDataUrl,options){
var settings=options||{};
var mode=normalizeMode(settings.mode);
var background=normalizeBackground(settings.background);
var descriptor=describeMode(mode);
return Promise.resolve().then(function(){
var parsed=parsePng(sourcePngDataUrl);
return inflateBytes(parsed.data).then(function(inflated){
var decoded=unfilter(inflated,parsed.width,parsed.height,parsed.channels);
// canvas 由来の RGBA 入力はそのまま使う（toRgba の複製を避けて大きなページのメモリと時間を節約）。
var converted=convertPixels(decoded.channels===4?decoded:toRgba(decoded),mode,background);
return deflateBytes(filterScanlines(converted)).then(function(compressed){
var ihdr=buildIhdr(converted.width,converted.height,descriptor.bitDepth,descriptor.colorType);
var idat=buildChunk('IDAT',compressed);
var iend=buildChunk('IEND',new Uint8Array(0));
var total=PNG_SIGNATURE.length+ihdr.length+idat.length+iend.length;
var out=new Uint8Array(total);
var offset=0;
out.set(PNG_SIGNATURE,offset);
offset+=PNG_SIGNATURE.length;
out.set(ihdr,offset);
offset+=ihdr.length;
out.set(idat,offset);
offset+=idat.length;
out.set(iend,offset);
return out;
});
});
});
}

function encodePngDataUrl(sourcePngDataUrl,options){
return encodePngBytes(sourcePngDataUrl,options).then(function(bytes){
return 'data:image/png;base64,'+bytesToBase64(bytes);
});
}

root.NaiPngBitDepth={
MODES:MODES,
DEFAULT_MODE:DEFAULT_MODE,
normalizeMode:normalizeMode,
resolveExportMode:normalizeMode,
describeMode:describeMode,
encodePngBytes:encodePngBytes,
encodePngDataUrl:encodePngDataUrl,
__internals:{
crc32:crc32,
paeth:paeth,
unfilter:unfilter,
filterScanlines:filterScanlines,
resolveMode:normalizeMode,
luma:luma,
parsePngBytes:parsePngBytes,
base64ToBytes:base64ToBytes,
bytesToBase64:bytesToBase64
}
};
})(typeof window!=="undefined"?window:globalThis);