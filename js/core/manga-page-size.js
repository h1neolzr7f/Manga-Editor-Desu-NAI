/* exported base */
(function(root){
"use strict";

var DPI=200;
var MAX_EDGE=4096;
var MIN_EDGE=512;
var MM_HINT=400;

// 竖页/横页プリセットの物理寸法（A4）。200dpi で 1654x2339 / 2339x1654 になる。
var PAGE_MM={
portrait:{width:210,height:297},
landscape:{width:297,height:210}
};

var EXPORT_DPI_MIN=96;
var EXPORT_DPI_MAX=1800;
var EXPORT_DPI_DEFAULT=300;

function mmToPx(mm){
return Math.max(1,Math.round((parseFloat(mm)||0)/25.4*DPI));
}

function clampEdge(width,height){
width=Math.round(width);
height=Math.round(height);
var longest=Math.max(width,height);
if(longest>MAX_EDGE){
var scale=MAX_EDGE/longest;
width=Math.max(MIN_EDGE,Math.round(width*scale));
height=Math.max(MIN_EDGE,Math.round(height*scale));
}
return {
width:Math.max(MIN_EDGE,width),
height:Math.max(MIN_EDGE,height)
};
}

function resolveMangaPageSize(width,height){
width=parseFloat(width);
height=parseFloat(height);
if(!isFinite(width)||width<=0)width=210;
if(!isFinite(height)||height<=0)height=297;
if(width<=MM_HINT&&height<=MM_HINT){
width=mmToPx(width);
height=mmToPx(height);
}
return clampEdge(width,height);
}

function defaultMangaPageSize(landscape){
return landscape?resolveMangaPageSize(297,210):resolveMangaPageSize(210,297);
}

function label(size){
if(!size)size=defaultMangaPageSize(false);
return Math.round(size.width)+"\u00d7"+Math.round(size.height);
}

function isLandscapeSize(width,height){
return (parseFloat(width)||0)>(parseFloat(height)||0);
}

function pageMillimeters(landscape){
return landscape?PAGE_MM.landscape:PAGE_MM.portrait;
}

function pageMillimetersForSize(width,height){
return pageMillimeters(isLandscapeSize(width,height));
}

function resolveExportDpi(value){
var dpi=parseFloat(value);
if(!isFinite(dpi)||dpi<=0)dpi=EXPORT_DPI_DEFAULT;
if(dpi<EXPORT_DPI_MIN)dpi=EXPORT_DPI_MIN;
if(dpi>EXPORT_DPI_MAX)dpi=EXPORT_DPI_MAX;
return dpi;
}

// UI 入力の検証用。数値として意味があり範囲内なら 0.01 刻みの値を返し、
// 空欄・負数・非数値のように「意味の無い」入力は null を返す。
// 範囲外の正数は従来どおり MIN/MAX へ丸める（打ち間違いではなく指定ミスのため）。
// null を返した時は、呼び出し側（canvas-manager）が直前の有効値へ戻す。
function normalizeExportDpi(value){
var text=String(value===undefined||value===null?"":value).trim();
if(!text)return null;
var dpi=parseFloat(text);
if(!isFinite(dpi)||dpi<=0)return null;
if(dpi<EXPORT_DPI_MIN)dpi=EXPORT_DPI_MIN;
if(dpi>EXPORT_DPI_MAX)dpi=EXPORT_DPI_MAX;
return Math.round(dpi*100)/100;
}

function pixelsForDpi(mmWidth,mmHeight,dpi){
var value=resolveExportDpi(dpi);
return {
width:Math.round((parseFloat(mmWidth)||0)/25.4*value),
height:Math.round((parseFloat(mmHeight)||0)/25.4*value)
};
}

// 画素指定から DPI を逆算する。丸めで指定値が 1px ずれない候補を優先して探す。
function dpiForPixelAxis(mmLength,typedPixels){
var length=parseFloat(mmLength)||0;
var pixels=Math.round(parseFloat(typedPixels));
if(length<=0||!isFinite(pixels)||pixels<=0)return null;
var ideal=pixels*25.4/length;
var base=Math.round(ideal*100)/100;
var candidates=[base];
var step;
for(step=1;step<=4;step++){
candidates.push(Math.round((base+step*0.01)*100)/100);
candidates.push(Math.round((base-step*0.01)*100)/100);
}
for(var i=0;i<candidates.length;i++){
var candidate=candidates[i];
if(candidate<EXPORT_DPI_MIN||candidate>EXPORT_DPI_MAX)continue;
if(Math.round(length/25.4*candidate)===pixels)return candidate;
}
return resolveExportDpi(ideal);
}

// 导出像素的上限。这里是唯一定义处（image-util.js 会引用此值；仅在未加载本文件时
// 才退避到同一默认值）。两处若不一致，预览与实际导出会不一致，因此不要在别处重定义。
var EXPORT_MAX_EDGE=8192;
var EXPORT_MAX_PIXELS=40*1000*1000;

// 目標長辺から倍率を決める。切り捨て後の長辺が必ず目標値と一致する区間の中点を採る。
function multiplierForLongEdge(baseLong,targetLong){
var longSide=Math.max(1,baseLong);
var lo=targetLong/longSide;
var hi=(targetLong+1)/longSide;
return (lo+hi)/2;
}

// 上限内に収まる最大の長辺画素を返す。倍率は区間の中点を採るため、
// 丸め前の値（切り上げ後）でも上限を超えないところまで下げておく。
// こうしておくと image-util.js 側の resolveExportMultiplier が再度縮小しない。
function exportMaxLongEdge(baseLong,baseShort){
var longSide=Math.max(1,parseFloat(baseLong)||1);
var shortSide=Math.max(1,parseFloat(baseShort)||1);
var ratio=shortSide/longSide;
var limit=Math.min(EXPORT_MAX_EDGE,Math.ceil(Math.sqrt(EXPORT_MAX_PIXELS/ratio)));
var candidate=Math.max(1,limit);
while(candidate>1){
var multiplier=multiplierForLongEdge(longSide,candidate);
var longPixels=longSide*multiplier;
var shortPixels=shortSide*multiplier;
if(Math.ceil(longPixels)<=EXPORT_MAX_EDGE&&Math.ceil(longPixels)*Math.ceil(shortPixels)<=EXPORT_MAX_PIXELS)break;
candidate--;
}
return candidate;
}

// DPI と下地の寸法から、実際の書き出し倍率と出力画素を一意に決める。
// プレビューと実書き出しが同じこの関数を通るため、表示画素は実出力と必ず一致する。
function planExportPage(dpi,baseWidth,baseHeight){
var width=Math.max(1,parseFloat(baseWidth)||1);
var height=Math.max(1,parseFloat(baseHeight)||1);
var millimeters=pageMillimetersForSize(width,height);
var baseLong=Math.max(width,height);
var baseShort=Math.min(width,height);
var longMm=Math.max(millimeters.width,millimeters.height);
var value=resolveExportDpi(dpi);
var idealLong=Math.max(1,Math.round(longMm/25.4*value));
var capLong=exportMaxLongEdge(baseLong,baseShort);
var targetLong=Math.min(idealLong,capLong);
var multiplier=multiplierForLongEdge(baseLong,targetLong);
// 丸めで上限を僅かに超えないよう、必要なときだけ倍率を下げる。
var guard=0;
while(guard<8){
var longPixels=Math.floor(baseLong*multiplier);
var shortPixels=Math.floor(baseShort*multiplier);
if(longPixels<=EXPORT_MAX_EDGE&&shortPixels<=EXPORT_MAX_EDGE&&longPixels*shortPixels<=EXPORT_MAX_PIXELS)break;
multiplier=multiplier*(1-1/baseLong);
guard++;
}
var outLong=Math.floor(baseLong*multiplier);
var outShort=Math.floor(baseShort*multiplier);
var landscape=isLandscapeSize(width,height);
return {
dpi:value,
multiplier:multiplier,
width:landscape?outLong:outShort,
height:landscape?outShort:outLong,
longPixels:outLong,
shortPixels:outShort,
idealLong:idealLong,
capLong:capLong,
capped:idealLong>capLong,
landscape:landscape,
millimeters:millimeters
};
}

// 指定 DPI での出力長辺（上限適用後）。
function exportLongEdgeForDpi(dpi,baseWidth,baseHeight){
return planExportPage(dpi,baseWidth,baseHeight).longPixels;
}

// 画素指定から DPI を逆算する。長辺/短辺どちらの入力でも使える。
// planExportPage の出力が一致する DPI を 0.01 刻みで探すため、往復しても値がぶれない。
function resolveDpiForPixelEdge(baseWidth,baseHeight,pixels,useShortEdge){
var width=Math.max(1,parseFloat(baseWidth)||1);
var height=Math.max(1,parseFloat(baseHeight)||1);
var baseLong=Math.max(width,height);
var baseShort=Math.min(width,height);
var base=useShortEdge?baseShort:baseLong;
var target=Math.round(parseFloat(pixels));
if(!isFinite(target)||target<=0)return null;
var capLong=exportMaxLongEdge(baseLong,baseShort);
var cap=useShortEdge?Math.floor(capLong*baseShort/baseLong):capLong;
if(target>cap)return null;
var floorLong=Math.max(1,Math.round(Math.max(pageMillimetersForSize(width,height).width,pageMillimetersForSize(width,height).height)/25.4*EXPORT_DPI_MIN));
var floorPixels=useShortEdge?Math.floor(floorLong*baseShort/baseLong):floorLong;
if(target<floorPixels)return null;
var steps=Math.round((EXPORT_DPI_MAX-EXPORT_DPI_MIN)/0.01);
var lo=0;
var hi=steps;
while(lo<hi){
var mid=Math.floor((lo+hi)/2);
var dpi=Math.round((EXPORT_DPI_MIN+mid*0.01)*100)/100;
var page=planExportPage(dpi,width,height);
var value=useShortEdge?page.shortPixels:page.longPixels;
if(value<target)lo=mid+1;
else hi=mid;
}
return Math.round((EXPORT_DPI_MIN+lo*0.01)*100)/100;
}

root.NaiMangaPageSize={
DPI:DPI,
MAX_EDGE:MAX_EDGE,
MIN_EDGE:MIN_EDGE,
mmToPx:mmToPx,
resolveMangaPageSize:resolveMangaPageSize,
defaultMangaPageSize:defaultMangaPageSize,
label:label,
PAGE_MM:PAGE_MM,
EXPORT_DPI_MIN:EXPORT_DPI_MIN,
EXPORT_DPI_MAX:EXPORT_DPI_MAX,
EXPORT_DPI_DEFAULT:EXPORT_DPI_DEFAULT,
isLandscapeSize:isLandscapeSize,
pageMillimeters:pageMillimeters,
pageMillimetersForSize:pageMillimetersForSize,
resolveExportDpi:resolveExportDpi,
normalizeExportDpi:normalizeExportDpi,
pixelsForDpi:pixelsForDpi,
dpiForPixelAxis:dpiForPixelAxis,
EXPORT_MAX_EDGE:EXPORT_MAX_EDGE,
EXPORT_MAX_PIXELS:EXPORT_MAX_PIXELS,
exportMaxLongEdge:exportMaxLongEdge,
planExportPage:planExportPage,
exportLongEdgeForDpi:exportLongEdgeForDpi,
resolveDpiForPixelEdge:resolveDpiForPixelEdge
};
})(typeof window!=="undefined"?window:globalThis);
