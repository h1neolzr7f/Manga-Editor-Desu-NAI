/* exported blobUrlToDataUrl, clipCopy, createCanvasFromFabricImage, cropAndDownload, cropImage, enhanceDarkImage, estimateExportSize, exportCanvasDataURL, exportDataUrlByteLength, flipHorizontally, flipVertically, formatByteSize, getCropAndDownloadLink, getCropAndDownloadLinkByMultiplier, getHeight, getLink, getWidth, hexToRgba, imageObject2Base64ImageEffectKeep, imageObject2DataURL, imageObject2DataURLByCrop, imgFile2webpFile, normalizeExportQuality, resolveExportBackground, resolveExportBitDepth, resolveExportFormat, resolveExportMultiplier, resolveExportMultiplierForDpi, rgbToHex, rgbaToHex, sendHtmlCanvas2FabricCanvas */
// image-util.js - Fabric.js画像オブジェクトの処理（変換、WebP、クロップ、反転、色変換など）

// 导出上限は manga-page-size.js の NaiMangaPageSize を唯一の来源とする
// （プレビューと実書き出しで同じ値を使うため）。未読込の単体テストだけ、
// 同じ既定値へ退避する。EXPORT_MAX_EDGE: 長辺 / EXPORT_MAX_PIXELS: 総画素の上限
var EXPORT_MAX_EDGE=typeof NaiMangaPageSize!=="undefined"&&NaiMangaPageSize.EXPORT_MAX_EDGE
?NaiMangaPageSize.EXPORT_MAX_EDGE
:8192;
var EXPORT_MAX_PIXELS=typeof NaiMangaPageSize!=="undefined"&&NaiMangaPageSize.EXPORT_MAX_PIXELS
?NaiMangaPageSize.EXPORT_MAX_PIXELS
:40*1000*1000;
var EXPORT_FORMATS=['png','jpeg','webp'];
var EXPORT_BIT_DEPTH_DEFAULT='argb';
var EXPORT_QUALITY_MIN=0.5;
var EXPORT_QUALITY_MAX=0.98;
var EXPORT_QUALITY_DEFAULT=0.92;
var EXPORT_ESTIMATE_GRID=12;
var EXPORT_ESTIMATE_MIN_TILE=64;
var EXPORT_ESTIMATE_ERROR_MARGIN=1.6;
var EXPORT_ESTIMATE_OVERHEAD_TILE=8;
var EXPORT_ESTIMATE_MIN_RATIO=0.5;
var EXPORT_ESTIMATE_UNIFORM_RATIO=0.1;

// 导出前会先移除网格，这里把网格恢复到导出前的可见状态。
// clipCopy / cropAndDownload 需要相同的收尾处理，因此统一到这一处。
function restoreGridAfterExport(){
if(isGridVisible){
drawGrid();
isGridVisible=true;
}
}

var ImageUtil={
createCanvasFromFabricImage:function(fabricImage){
var tempCanvas=document.createElement('canvas');
tempCanvas.width=canvas.width;
tempCanvas.height=canvas.height;
var tempCtx=tempCanvas.getContext('2d');
tempCtx.save();
tempCtx.translate(fabricImage.left,fabricImage.top);
tempCtx.rotate(fabricImage.angle*Math.PI/180);
tempCtx.scale(fabricImage.scaleX,fabricImage.scaleY);
if(fabricImage.type==='image'){
tempCtx.drawImage(fabricImage._element,0,0,fabricImage.width,fabricImage.height);
}else if(fabricImage.type==='rect'){
if(typeof fabricImage.fill==='string'){
tempCtx.fillStyle=fabricImage.fill;
tempCtx.fillRect(0,0,fabricImage.width,fabricImage.height);
}else if(fabricImage.fill instanceof fabric.Gradient){
var coords=fabricImage.fill.coords;
var x1,y1,x2,y2;
if(fabricImage.fill.gradientUnits==='percentage'){
x1=coords.x1*fabricImage.width;
y1=coords.y1*fabricImage.height;
x2=coords.x2*fabricImage.width;
y2=coords.y2*fabricImage.height;
}else{
x1=coords.x1;
y1=coords.y1;
x2=coords.x2;
y2=coords.y2;
}
var grad=tempCtx.createLinearGradient(x1,y1,x2,y2);
fabricImage.fill.colorStops.forEach(function(stop){
grad.addColorStop(stop.offset,stop.color);
});
tempCtx.fillStyle=grad;
tempCtx.fillRect(0,0,fabricImage.width,fabricImage.height);
}
}
tempCtx.restore();
return tempCanvas;
},

fabricImage2ImageData:async function(fabricImage){
var img=fabricImage.getElement();
var tempCanvas=document.createElement('canvas');
tempCanvas.width=img.naturalWidth;
tempCanvas.height=img.naturalHeight;
var tempCtx=tempCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
tempCtx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight);
return tempCtx.getImageData(0,0,img.naturalWidth,img.naturalHeight);
},

imageObject2Base64Image:function(object,scale){
scale=scale||1.0;
try{
var src=object.getSrc();
if(!src){
throw new Error("Image source is not defined.");
}
var imageFormat=src.split('.').pop().toLowerCase();
var supportedFormats=['png','jpeg','jpg','webp'];
var format=supportedFormats.includes(imageFormat)?imageFormat:'png';
var base64Image=object.toDataURL({format:format,quality:scale});
return base64Image;
}catch(error){
imageLogger.error("Error converting image object to Base64:",error);
return null;
}
},

imageObject2Base64ImageEffectKeep:function(layer,scaleFactor){
scaleFactor=scaleFactor||1;
if(layer.type==='image'&&layer._element){
var imgElement=layer._element;
var originalWidth=imgElement.naturalWidth||imgElement.width;
var originalHeight=imgElement.naturalHeight||imgElement.height;
var offscreenCanvas=HtmlCanvasUtil.createOffscreenCanvas(originalWidth,originalHeight);
var ctx=offscreenCanvas.getContext('2d');
ctx.drawImage(imgElement,0,0,originalWidth,originalHeight);
return offscreenCanvas.toDataURL('image/png');
}else{
var width=layer.width;
var height=layer.height;
var scaleX=layer.scaleX;
var scaleY=layer.scaleY;
var left=layer.left;
var top=layer.top;
var pixelRatio=window.devicePixelRatio||1;
var enhancedScaleFactor=scaleFactor*2*pixelRatio;
offscreenCanvas=HtmlCanvasUtil.createOffscreenCanvas(
Math.ceil(width*scaleX*enhancedScaleFactor),
Math.ceil(height*scaleY*enhancedScaleFactor)
);
HtmlCanvasUtil.renderLayerToCanvas(offscreenCanvas,layer,enhancedScaleFactor,left,top);
return offscreenCanvas.toDataURL('image/png');
}
},

imageObject2DataURL:function(activeObject){
if(activeObject&&activeObject.type==='image'){
var originalWidth=activeObject.width;
var originalHeight=activeObject.height;
var tempCanvas=document.createElement('canvas');
var tempContext=tempCanvas.getContext('2d');
tempCanvas.width=originalWidth;
tempCanvas.height=originalHeight;
tempContext.drawImage(activeObject.getElement(),0,0,originalWidth,originalHeight);
return tempCanvas.toDataURL('image/png');
}
return null;
},

imageObject2DataURLByCrop:function(activeObject){
imageLogger.debug("Function start: imageObject2DataURLByCrop");
imageLogger.debug("activeObject:",activeObject);
if(activeObject&&activeObject.isPanel){
var dataURL=ImageUtil.canvas2DataURL(3,"png");
return new Promise(function(resolve,reject){
var image=new Image();
image.crossOrigin="Anonymous";
image.src=dataURL;
image.onload=function(){
var tempCanvas=document.createElement('canvas');
var context=tempCanvas.getContext('2d');
tempCanvas.width=image.width;
tempCanvas.height=image.height;
context.drawImage(image,0,0);
var objectWidth=activeObject.width*activeObject.scaleX;
var objectHeight=activeObject.height*activeObject.scaleY;
var objectLeft=activeObject.left;
var objectTop=activeObject.top;
imageLogger.debug("objectWidth activeObject.strokeWidth",objectWidth,activeObject.strokeWidth);
imageLogger.debug("objectHeight activeObject.strokeWidth",objectHeight,activeObject.strokeWidth);
var scaleX=tempCanvas.width/activeObject.canvas.width;
var scaleY=tempCanvas.height/activeObject.canvas.height;
var cropX=(objectLeft)*scaleX;
var cropY=(objectTop)*scaleY;
var cropWidth=(objectWidth*scaleX)+(activeObject.strokeWidth*scaleX);
var cropHeight=(objectHeight*scaleY)+(activeObject.strokeWidth*scaleX);
var cropCanvas=document.createElement('canvas');
var cropContext=cropCanvas.getContext('2d');
cropCanvas.width=cropWidth;
cropCanvas.height=cropHeight;
cropContext.drawImage(tempCanvas,cropX,cropY,cropWidth,cropHeight,0,0,cropWidth,cropHeight);
var croppedDataURL=cropCanvas.toDataURL("image/png");
resolve(croppedDataURL);
};
image.onerror=function(err){
imageLogger.error("Image loading error:",err);
reject(err);
};
});
}
imageLogger.debug("Function end: imageObject2DataURLByCrop (no valid activeObject)");
return Promise.resolve(null);
},

img2webp:async function(i){
var blob=await fetch(i._element.src).then(function(response){return response.blob();});
var fileType=blob.type;
var fileName='image.'+fileType.split('/')[1];
var file=new File([blob],fileName,{type:fileType});
var webpFile=await ImageUtil.imgFile2webpFile(file);
var webpBlob=webpFile.slice(0,webpFile.size,'image/webp');
var reader=new FileReader();
return new Promise(function(resolve,reject){
reader.onloadend=function(){
var webpDataUrl=reader.result;
var webpImgElement=new Image();
webpImgElement.src=webpDataUrl;
webpImgElement.onload=function(){
var webpImg={};
Object.assign(webpImg,i);
webpImg._element=webpImgElement;
webpImg._originalElement=webpImgElement;
webpImg.cacheKey='webp_texture';
Object.setPrototypeOf(webpImg,Object.getPrototypeOf(i));
resolve(webpImg);
};
};
reader.onerror=reject;
reader.readAsDataURL(webpBlob);
});
},

imgFile2webpFile:async function(file){
if(file.type==='image/webp'){
return file;
}
var options={
fileType:'image/webp',
initialQuality:webpQuality
};
try{
var compressedFile=await imageCompression(file,options);
return compressedFile;
}catch(error){
imageLogger.error(error);
throw error;
}
},

cropImage:function(png,left,top,height,width){
if(top<png.top){
height=height-(png.top-top);
top=png.top;
}
if(left<png.left){
width=width-(png.left-left);
left=png.left;
}
if(top+height>png.top+png.height*png.scaleY){
height=png.top+png.height*png.scaleY-top;
}
if(left+width>png.left+png.width*png.scaleX){
width=png.left+png.width*png.scaleX-left;
}
var tempCanvas=new fabric.Canvas(document.createElement("canvas"));
tempCanvas.setWidth(png.width*png.scaleX);
tempCanvas.setHeight(png.height*png.scaleY);
var clonedObject=fabric.util.object.clone(png);
clonedObject.set({left:0,top:0});
if(clonedObject.clipPath){
clonedObject.clipPath=clonedObject.clipPath.clone();
}
tempCanvas.add(clonedObject);
tempCanvas.renderAll();
fabric.Image.fromURL(
tempCanvas.toDataURL({format:"webp",multiplier:2}),
function(img){
var scaledLeft=(left-png.left)*2;
var scaledTop=(top-png.top)*2;
var scaledWidth=width*2;
var scaledHeight=height*2;
img.set("left",-scaledLeft);
img.set("top",-scaledTop);
var canvasCrop=new fabric.Canvas("canvasCrop");
canvasCrop.setHeight(scaledHeight);
canvasCrop.setWidth(scaledWidth);
canvasCrop.add(img);
canvasCrop.renderAll();
fabric.Image.fromURL(
canvasCrop.toDataURL({format:"webp",multiplier:1}),
function(croppedImg){
croppedImg.set({left:left,top:top,scaleX:0.5,scaleY:0.5});
if(png.clipPath){
var clonedClipPath=fabric.util.object.clone(png.clipPath);
if(clonedClipPath){
croppedImg.clipPath=clonedClipPath;
}
}
replaceGuids(png.guid,croppedImg);
canvas.add(croppedImg).renderAll();
canvas.remove(cropActiveObject);
canvas.setActiveObject(croppedImg);
canvas.renderAll();
updateLayerPanel();
}
);
}
);
},

flipHorizontally:function(){
var activeObject=canvas.getActiveObject();
if(isImage(activeObject)){
activeObject.set("flipX",!activeObject.flipX);
canvas.renderAll();
}
},

flipVertically:function(){
var activeObject=canvas.getActiveObject();
if(isImage(activeObject)){
activeObject.set("flipY",!activeObject.flipY);
canvas.renderAll();
}
},

enhanceDarkImage:async function(){
var loading=OP_showLoading({icon:'process',step:'Step1',substep:'Start up',progress:0});
await new Promise(function(resolve){setTimeout(resolve,10);});
try{
var activeObject=canvas.getActiveObject();
var img=activeObject.getElement();
var originalScaleX=activeObject.scaleX||1;
var originalScaleY=activeObject.scaleY||1;
var intensity=parseFloat($('effectEnhanceDarkIntensity').value);
var originalImageData=await ImageUtil.fabricImage2ImageData(activeObject);
OP_updateLoadingState(loading,{icon:'process',step:'Step2',substep:'Dark enhance',progress:25});
await new Promise(function(resolve){setTimeout(resolve,10);});
var processedImageData=HtmlCanvasUtil.enhanceDarkRegionsCPU(originalImageData,intensity);
OP_updateLoadingState(loading,{icon:'process',step:'Step3',substep:'Image marge',progress:90});
await new Promise(function(resolve){setTimeout(resolve,10);});
var tempCanvas=document.createElement('canvas');
tempCanvas.width=img.naturalWidth;
tempCanvas.height=img.naturalHeight;
var tempCtx=tempCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
tempCtx.imageSmoothingEnabled=true;
tempCtx.imageSmoothingQuality='high';
tempCtx.putImageData(processedImageData,0,0);
var webpDataUrl=tempCanvas.toDataURL('image/webp',1.0);
await new Promise(function(resolve){
fabric.Image.fromURL(webpDataUrl,function(img){
img.set({left:activeObject.left,top:activeObject.top,scaleX:originalScaleX,scaleY:originalScaleY});
copy(activeObject,img);
changeDoNotSaveHistory();
canvas.remove(activeObject);
canvas.add(img);
changeDoSaveHistory();
canvas.setActiveObject(img);
canvas.renderAll();
updateLayerPanel();
saveStateByManual();
resolve();
});
});
}catch(err){
imageLogger.error('Process error:',err);
}finally{
OP_hideLoading(loading);
}
},

sendHtmlCanvas2FabricCanvas:function(blendedCanvas,quality){
quality=quality||0.98;
var ctx=blendedCanvas.getContext('2d');
var imageData=ctx.getImageData(0,0,blendedCanvas.width,blendedCanvas.height);
var bounds=HtmlCanvasUtil.findNonTransparentBounds(imageData);
if(bounds.minX>bounds.maxX||bounds.minY>bounds.maxY){
imageLogger.warn('The image is completely transparent');
return;
}
var clippedCanvas=HtmlCanvasUtil.createClippedCanvas(blendedCanvas,bounds);
var webpDataUrl=clippedCanvas.toDataURL('image/webp',quality);
fabric.Image.fromURL(webpDataUrl,function(img){
img.scaleToWidth(canvas.width);
canvas.add(img);
canvas.setActiveObject(img);
canvas.renderAll();
},{crossOrigin:'anonymous'});
},

blobUrlToDataUrl:async function(blobUrl){
try{
var response=await fetch(blobUrl);
var blob=await response.blob();
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onloadend=function(){resolve(reader.result);};
reader.onerror=reject;
reader.readAsDataURL(blob);
});
}catch(e){
imageLogger.error("Failed to convert blob URL:",blobUrl,e);
return null;
}
},

canvas2DataURL:function(multiplier,format){
return ImageUtil.exportCanvasDataURL(multiplier,format);
},

resolveExportFormat:function(format){
format=String(format||'').toLowerCase();
if(format==='jpg')format='jpeg';
return EXPORT_FORMATS.indexOf(format)>=0?format:'png';
},

// 竖页/横页プリセット（A4）を指定 DPI で出したときの倍率（長辺基準）。
// 倍率は NaiMangaPageSize.planExportPage と同一の計算で求めるため、
// 「画布」メニューに出る画素プレビューと実際の書き出し寸法が必ず一致する。
resolveExportMultiplierForDpi:function(dpi,width,height){
var baseWidth=Math.max(1,width||canvas.width);
var baseHeight=Math.max(1,height||canvas.height);
if(typeof NaiMangaPageSize!=="undefined"&&typeof NaiMangaPageSize.planExportPage==="function"){
return NaiMangaPageSize.planExportPage(dpi,baseWidth,baseHeight).multiplier;
}
var a5WidthInches=148/25.4;
var a5HeightInches=210/25.4;
var value=parseFloat(dpi);
if(!isFinite(value)||value<=0)value=300;
var targetWidth=a5WidthInches*value;
var targetHeight=a5HeightInches*value;
if(baseWidth>baseHeight){
targetWidth=a5HeightInches*value;
targetHeight=a5WidthInches*value;
}
return Math.max(targetWidth/baseWidth,targetHeight/baseHeight);
},

// 位深度は PNG のみ意味を持つ。jpeg/webp では無視する。
resolveExportBitDepth:function(mode){
if(typeof NaiPngBitDepth!=="undefined"&&typeof NaiPngBitDepth.normalizeMode==="function"){
return NaiPngBitDepth.normalizeMode(mode);
}
var value=String(mode===undefined||mode===null?"":mode).trim().toLowerCase();
if(value==="gray"||value==="grey"||value==="grayscale"||value==="greyscale")return "gray";
if(value==="argb"||value==="rgba")return "argb";
return EXPORT_BIT_DEPTH_DEFAULT;
},

// 位深度を落とすときに合成する下地色（#rrggbb / rgb() / rgba() いずれも受ける）。
// argb 以外は不透明前提なので、透過値はここでは使わない。
resolveExportBackground:function(color){
var fallback={r:255,g:255,b:255};
var value=String(color===undefined||color===null?"":color).trim();
if(!value)return fallback;
var match=value.match(/rgba?\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/i);
if(match){
return {r:parseInt(match[1],10)||0,g:parseInt(match[2],10)||0,b:parseInt(match[3],10)||0};
}
if(typeof fabric!=="undefined"&&fabric.Color&&typeof fabric.Color.fromHex==="function"){
try{
// fromHex は解釈できない文字列でも例外を投げないため、結果が hex かどうかで判定する。
var parsed=fabric.Color.fromHex(value);
if(parsed&&typeof parsed.toHex==="function"){
var hexSource=parsed.getSource();
return {r:hexSource[0],g:hexSource[1],b:hexSource[2]};
}
}catch(error){/* 解釈できない値は下の手動パースへ */}
}
var hex=value.replace("#","");
if(hex.length===3)hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
if(hex.length!==6||!/^[0-9a-f]{6}$/i.test(hex))return fallback;
return {
r:parseInt(hex.substring(0,2),16),
g:parseInt(hex.substring(2,4),16),
b:parseInt(hex.substring(4,6),16)
};
},

// 書き出した PNG を指定のビット深度へ変換する。実データの色種別が変わる。
encodeExportPng:function(dataUrl,mode,background){
if(typeof NaiPngBitDepth==="undefined"||typeof NaiPngBitDepth.encodePngDataUrl!=="function"){
return Promise.reject(new Error("位深度转换模块未加载，请强制刷新页面后重试。"));
}
return NaiPngBitDepth.encodePngDataUrl(dataUrl,{
mode:ImageUtil.resolveExportBitDepth(mode),
background:ImageUtil.resolveExportBackground(background)
});
},

normalizeExportQuality:function(quality){
var value=parseFloat(quality);
if(!isFinite(value))value=EXPORT_QUALITY_DEFAULT;
// 1 より大きい値はパーセント指定（例: 92 → 0.92）として扱う。
if(value>1)value=value/100;
if(!isFinite(value))value=EXPORT_QUALITY_DEFAULT;
if(value<EXPORT_QUALITY_MIN)value=EXPORT_QUALITY_MIN;
if(value>EXPORT_QUALITY_MAX)value=EXPORT_QUALITY_MAX;
return value;
},

// multiplier を上限つきで解決する。長辺・総ピクセルの両方を超えないよう縮小する。
resolveExportMultiplier:function(multiplier,width,height){
var m=parseFloat(multiplier);
if(!isFinite(m)||m<=0)m=1;
var baseWidth=Math.max(1,width||canvas.width);
var baseHeight=Math.max(1,height||canvas.height);
var w=baseWidth*m;
var h=baseHeight*m;
var shrink=1;
if(Math.max(w,h)>EXPORT_MAX_EDGE)shrink=Math.min(shrink,EXPORT_MAX_EDGE/Math.max(w,h));
if(w*h>EXPORT_MAX_PIXELS)shrink=Math.min(shrink,Math.sqrt(EXPORT_MAX_PIXELS/(w*h)));
// ブラウザ側の丸めで上限を僅かに超えないよう、長辺 1px 分の余裕を取る。
var safe=m*shrink;
if(shrink<1)safe=safe*(1-1/Math.max(baseWidth,baseHeight));
return safe;
},

// data URL の payload 長から実バイト数を見積もる。
exportDataUrlByteLength:function(dataUrl){
if(typeof dataUrl!=='string')return 0;
var comma=dataUrl.indexOf(',');
if(comma<0)return 0;
var payload=dataUrl.length-comma-1;
var padding=0;
if(dataUrl.charAt(dataUrl.length-1)==='='){
padding=dataUrl.charAt(dataUrl.length-2)==='='?2:1;
}
var bytes=Math.floor(payload*3/4)-padding;
return bytes>0?bytes:0;
},

formatByteSize:function(bytes){
if(!isFinite(bytes)||bytes<=0)return '0 B';
if(bytes>=1024*1024*1024)return (bytes/(1024*1024*1024)).toFixed(2)+' GB';
if(bytes>=1024*1024)return (bytes/(1024*1024)).toFixed(1)+' MB';
if(bytes>=1024)return (bytes/1024).toFixed(0)+' KB';
return Math.round(bytes)+' B';
},

// 出力サイズの概算。目標倍率で数タイルだけ実際に書き出し、平均を全体へ外挿する。
// PNG などは 1 タイルあたりのコンテナ固定費を持つため、極小タイルの実測値を差し引いて内容量だけを数える。
estimateExportSize:function(format,quality,multiplier,width,height){
var baseWidth=Math.max(1,width||canvas.width);
var baseHeight=Math.max(1,height||canvas.height);
var safeMultiplier=ImageUtil.resolveExportMultiplier(multiplier,baseWidth,baseHeight);
var normalizedFormat=ImageUtil.resolveExportFormat(format);
var normalizedQuality=ImageUtil.normalizeExportQuality(quality);
// タイルは目標解像度で切り出すため、小さい canvas では枚数を減らして 1 枚を潰さない。
var minEdgeAtTarget=Math.min(baseWidth,baseHeight)*safeMultiplier;
var grid=Math.floor(minEdgeAtTarget/EXPORT_ESTIMATE_MIN_TILE);
if(!isFinite(grid)||grid<2)grid=2;
if(grid>EXPORT_ESTIMATE_GRID)grid=EXPORT_ESTIMATE_GRID;
var samplesPerGrid=grid;
var cellWidth=baseWidth/grid;
var cellHeight=baseHeight/grid;
if(Math.min(cellWidth,cellHeight)*safeMultiplier<1)return null;
var tileOptions={format:normalizedFormat,multiplier:safeMultiplier,left:0,top:0,width:cellWidth,height:cellHeight};
if(normalizedFormat!=='png')tileOptions.quality=normalizedQuality;
var overheadOptions={format:normalizedFormat,multiplier:safeMultiplier,left:0,top:0,width:EXPORT_ESTIMATE_OVERHEAD_TILE,height:EXPORT_ESTIMATE_OVERHEAD_TILE};
if(normalizedFormat!=='png')overheadOptions.quality=normalizedQuality;
var overhead=ImageUtil.exportDataUrlByteLength(canvas.toDataURL(overheadOptions));
var samples=[];
var usedColumns=[];
var goldenRatio=0.6180339887498949;
for(var i=0;i<samplesPerGrid;i++){
// 行ごとに別の列を選び、縦横へ散らして偏りを減らす。衝突したら隣の列へずらす。
var column=Math.round(i*grid*goldenRatio)%grid;
var guard=0;
while(usedColumns.indexOf(column)>=0&&guard<grid){
column=(column+1)%grid;
guard++;
}
usedColumns.push(column);
tileOptions.left=column*cellWidth;
tileOptions.top=i*cellHeight;
var bytes=ImageUtil.exportDataUrlByteLength(canvas.toDataURL(tileOptions))-overhead;
samples.push(bytes>0?bytes:0);
}
var mean=0;
samples.forEach(function(value){mean+=value;});
mean=mean/samples.length;
var variance=0;
samples.forEach(function(value){variance+=(value-mean)*(value-mean);});
var standardError=samples.length>1?Math.sqrt(variance/(samples.length-1))/Math.sqrt(samples.length):0;
var tileCount=grid*grid;
var estimate=mean*tileCount+overhead;
// タイルは数枚の標本でしかないため、統計的なばらつきだけでは足りない。最低限の幅を必ず確保する。
var margin=standardError*EXPORT_ESTIMATE_ERROR_MARGIN*tileCount;
var minimumMargin=estimate*EXPORT_ESTIMATE_MIN_RATIO;
if(margin<minimumMargin)margin=minimumMargin;
var low=estimate-margin;
if(low<0)low=0;
// 一様なページは全タイルがほぼ同じ値になり、ばらつきから誤差を推定できない。
// その場合はタイルごとのコンテナ固定費を重複して数える分だけ必ず過大になるため、上限として扱う。
var deviation=samples.length>1?Math.sqrt(variance/(samples.length-1)):0;
var uniform=mean>0&&deviation/mean<EXPORT_ESTIMATE_UNIFORM_RATIO;
return {
bytes:estimate,
low:low,
high:estimate+margin,
upperBound:uniform?estimate:null,
format:normalizedFormat,
quality:normalizedFormat==='png'?null:normalizedQuality,
multiplier:safeMultiplier,
capped:safeMultiplier<multiplier-1e-9
};
},

// 画面全体を指定形式で書き出す。quality は jpeg/webp のみ有効。
exportCanvasDataURL:function(multiplier,format,quality){
var normalizedFormat=ImageUtil.resolveExportFormat(format);
var safeMultiplier=ImageUtil.resolveExportMultiplier(multiplier);
ImageUtil.lastExportWasCapped=safeMultiplier<multiplier-1e-9;
var options={format:normalizedFormat,multiplier:safeMultiplier};
if(normalizedFormat!=='png')options.quality=ImageUtil.normalizeExportQuality(quality);
return canvas.toDataURL(options);
},

// 上限に当たって解像度が落ちたときだけ利用者に知らせる。二重表示はしない。
notifyExportLimitReached:function(){
if(!ImageUtil.lastExportWasCapped)return;
ImageUtil.lastExportWasCapped=false;
if(typeof createToast!=='function')return;
createToast('导出上限','已按上限自动缩小导出尺寸以免文件过大。可在「画布 → 下载 DPI / 导出格式」调整。',5000);
},

// 位深度は PNG のときだけ適用する。jpeg/webp はもともと 24bit 相当なのでそのまま。
getExportBitDepthForFormat:function(format){
var normalizedFormat=ImageUtil.resolveExportFormat(format);
if(normalizedFormat!=="png")return null;
var element=$("outputBitDepth");
return ImageUtil.resolveExportBitDepth(element?element.value:EXPORT_BIT_DEPTH_DEFAULT);
},

getExportBackgroundColor:function(){
if(typeof canvas!=="undefined"&&canvas){
var canvasBackground=canvas.backgroundColor;
if(typeof canvasBackground==="string"&&canvasBackground)return canvasBackground;
}
var element=$("bg-color");
return element?element.value:"";
},

// bitDepthOverride を渡すと UI の位深度設定より優先する（クリップボードの ARGB 固定など）。
getCropAndDownloadLinkByMultiplier:function(multiplier,format,quality,bitDepthOverride){
var normalizedFormat=ImageUtil.resolveExportFormat(format);
var cropped=ImageUtil.exportCanvasDataURL(multiplier,normalizedFormat,quality);
var bitDepth=(bitDepthOverride!==undefined&&bitDepthOverride!==null)
?ImageUtil.resolveExportBitDepth(bitDepthOverride)
:ImageUtil.getExportBitDepthForFormat(normalizedFormat);
if(bitDepth&&bitDepth!=="argb"){
return ImageUtil.encodeExportPng(cropped,bitDepth,ImageUtil.getExportBackgroundColor()).then(function(converted){
return ImageUtil.buildDownloadLink(converted,normalizedFormat);
});
}
return Promise.resolve(ImageUtil.buildDownloadLink(cropped,normalizedFormat));
},

buildDownloadLink:function(dataUrl,format){
function getFormattedDateTime(){
var date=new Date();
var yyyy=date.getFullYear();
var MM=('0'+(date.getMonth()+1)).slice(-2);
var dd=('0'+date.getDate()).slice(-2);
var hh=('0'+date.getHours()).slice(-2);
var mm=('0'+date.getMinutes()).slice(-2);
var ss=('0'+date.getSeconds()).slice(-2);
var SSS=('00'+date.getMilliseconds()).slice(-3);
return yyyy+MM+dd+'_'+hh+mm+ss+'_'+SSS;
}
var link=document.createElement('a');
link.download='DESU-nai学长魔改-'+getFormattedDateTime()+'.'+format;
link.href=dataUrl;
return link;
},

// forcedFormat を渡すと UI の形式選択を無視する（クリップボード等の固定形式用）。
// 位深度変換が入るため Promise<HTMLAnchorElement> を返す。
getCropAndDownloadLink:function(forcedFormat){
var dpiElement=$('outputDpi');
var multiplier=ImageUtil.resolveExportMultiplierForDpi(
dpiElement?dpiElement.value:300,
canvas.width,
canvas.height
);
var formatElement=$('outputImageFormat');
var qualityElement=$('outputImageQuality');
var format=forcedFormat||(formatElement?formatElement.value:'png');
var quality=qualityElement?qualityElement.value:EXPORT_QUALITY_DEFAULT;
return ImageUtil.getCropAndDownloadLinkByMultiplier(multiplier,format,quality);
},

clipCopy:function(){
removeGrid();
// クリップボードは元の画素を保つため、位深度を落とさない 32bit ARGB 固定で書き出す。
return ImageUtil.getCropAndDownloadLinkByMultiplier(
ImageUtil.resolveExportMultiplierForDpi(
($('outputDpi')||{value:300}).value,
canvas.width,
canvas.height
),
'png',
EXPORT_QUALITY_DEFAULT,
'argb'
).then(function(link){
if(link.href&&link.href.indexOf('data:')===0){
return fetch(link.href).then(function(res){return res.blob();});
}
return null;
}).then(function(blob){
if(!blob)throw new Error('没有可复制的画面。');
if(!(window.isSecureContext&&navigator.clipboard&&navigator.clipboard.write&&window.ClipboardItem)){
throw new Error('当前页面不是安全上下文。请用 http://127.0.0.1:8000 打开后再复制到剪贴板。');
}
return navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
}).then(function(){
createToast("已复制","画面已复制到剪贴板。");
}).catch(function(error){
createToastError("复制失败",(error&&error.message)||"无法写入剪贴板。");
}).then(restoreGridAfterExport);
},

cropAndDownload:function(){
removeGrid();
return ImageUtil.getCropAndDownloadLink().then(function(link){
link.click();
ImageUtil.notifyExportLimitReached();
ImageUtil.notifyExportSize(link);
restoreGridAfterExport();
}).catch(function(error){
restoreGridAfterExport();
createToastError('导出失败',(error&&error.message)||'无法生成导出图片。',5000);
});
},

// Beginners could not tell what resolution 下载图片 produced (a 1200px page comes out ~2480px at
// 300 DPI). Read the real pixel size of what was downloaded and say where to change it.
notifyExportSize:function(link){
if(!link||!link.href||typeof createToast!=='function')return;
var img=new Image();
img.onload=function(){
var dpiInput=document.getElementById('outputDpi');
var dpi=dpiInput&&dpiInput.value?dpiInput.value:'300';
var ext=String(link.download||'').split('.').pop().toUpperCase()||'PNG';
createToast('已下载图片',img.naturalWidth+'\u00d7'+img.naturalHeight+' 像素 '+ext+'（'+dpi+' DPI）。想改大小：菜单「画布 › 下载 DPI」。',5000);
};
img.src=link.href;
},

getLink:function(dataURL){
var link=document.createElement('a');
link.href=dataURL;
link.download='selected-image.png';
return link;
},

getObjLeft:function(objWidth){
return canvas.getWidth()/2-objWidth/2;
},

getObjTop:function(objHeight){
return canvas.getHeight()/2-objHeight/2;
},

getWidth:function(fabricImage){
var img=fabricImage.getElement();
if(img.naturalWidth){
return img.naturalWidth;
}else{
return fabricImage.width;
}
},

getHeight:function(fabricImage){
var img=fabricImage.getElement();
if(img.naturalHeight){
return img.naturalHeight;
}else{
return fabricImage.height;
}
},

hexToRgba:function(hex,opacity){
opacity=opacity===undefined?1:opacity;
if(hex.startsWith('rgba')){
var match=hex.match(/\d+/g);
return 'rgba('+match[0]+', '+match[1]+', '+match[2]+', '+opacity+')';
}
if(hex.startsWith('rgb')){
match=hex.match(/\d+/g);
return 'rgba('+match[0]+', '+match[1]+', '+match[2]+', '+opacity+')';
}
hex=hex.replace('#','');
var r=parseInt(hex.substring(0,2),16);
var g=parseInt(hex.substring(2,4),16);
var b=parseInt(hex.substring(4,6),16);
return 'rgba('+r+', '+g+', '+b+', '+opacity+')';
},

rgbToHex:function(color){
if(!color){
return '#000000';
}
if(typeof color!=='string'){
return '#000000';
}
if(color.startsWith('#')){
return color;
}
var match=color.match(/^rgba?\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/);
if(!match){
return color;
}
function convert(c){
var hex=parseInt(c).toString(16);
return hex.length===1?'0'+hex:hex;
}
return '#'+convert(match[1])+convert(match[2])+convert(match[3]);
},

rgbaToHex:function(color){
if(!color)return '#000000';
if(typeof color!=='string')return '#000000';
if(color.startsWith('#'))return color;
var match=color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
if(!match)return '#000000';
var r=parseInt(match[1]);
var g=parseInt(match[2]);
var b=parseInt(match[3]);
var toHex=function(n){
var hex=n.toString(16);
return hex.length===1?'0'+hex:hex;
};
return '#'+toHex(r)+toHex(g)+toHex(b);
}
};

var createCanvasFromFabricImage=ImageUtil.createCanvasFromFabricImage;
var fabricImage2ImageData=ImageUtil.fabricImage2ImageData;
var imageObject2Base64Image=ImageUtil.imageObject2Base64Image;
var imageObject2Base64ImageEffectKeep=ImageUtil.imageObject2Base64ImageEffectKeep;
var imageObject2DataURL=ImageUtil.imageObject2DataURL;
var imageObject2DataURLByCrop=ImageUtil.imageObject2DataURLByCrop;
var img2webp=ImageUtil.img2webp;
var imgFile2webpFile=ImageUtil.imgFile2webpFile;
var cropImage=ImageUtil.cropImage;
var flipHorizontally=ImageUtil.flipHorizontally;
var flipVertically=ImageUtil.flipVertically;
var enhanceDarkImage=ImageUtil.enhanceDarkImage;
var sendHtmlCanvas2FabricCanvas=ImageUtil.sendHtmlCanvas2FabricCanvas;
var blobUrlToDataUrl=ImageUtil.blobUrlToDataUrl;
var canvas2DataURL=ImageUtil.canvas2DataURL;
var resolveExportFormat=ImageUtil.resolveExportFormat;
var normalizeExportQuality=ImageUtil.normalizeExportQuality;
var resolveExportMultiplier=ImageUtil.resolveExportMultiplier;
var resolveExportMultiplierForDpi=ImageUtil.resolveExportMultiplierForDpi;
var resolveExportBitDepth=ImageUtil.resolveExportBitDepth;
var resolveExportBackground=ImageUtil.resolveExportBackground;
var encodeExportPng=ImageUtil.encodeExportPng;
var exportDataUrlByteLength=ImageUtil.exportDataUrlByteLength;
var formatByteSize=ImageUtil.formatByteSize;
var estimateExportSize=ImageUtil.estimateExportSize;
var exportCanvasDataURL=ImageUtil.exportCanvasDataURL;
var getCropAndDownloadLinkByMultiplier=ImageUtil.getCropAndDownloadLinkByMultiplier;
var getCropAndDownloadLink=ImageUtil.getCropAndDownloadLink;
var clipCopy=ImageUtil.clipCopy;
var cropAndDownload=ImageUtil.cropAndDownload;
var getLink=ImageUtil.getLink;
var getObjLeft=ImageUtil.getObjLeft;
var getObjTop=ImageUtil.getObjTop;
var getWidth=ImageUtil.getWidth;
var getHeight=ImageUtil.getHeight;
var hexToRgba=ImageUtil.hexToRgba;
var rgbToHex=ImageUtil.rgbToHex;
var rgbaToHex=ImageUtil.rgbaToHex;
