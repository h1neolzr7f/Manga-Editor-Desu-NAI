(function(root){
"use strict";

var DPI=200;
var MAX_EDGE=4096;
var MIN_EDGE=512;
var MM_HINT=400;

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

root.NaiMangaPageSize={
DPI:DPI,
MAX_EDGE:MAX_EDGE,
MIN_EDGE:MIN_EDGE,
mmToPx:mmToPx,
resolveMangaPageSize:resolveMangaPageSize,
defaultMangaPageSize:defaultMangaPageSize,
label:label
};
})(typeof window!=="undefined"?window:globalThis);
