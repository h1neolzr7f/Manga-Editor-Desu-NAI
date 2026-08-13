canvas.isDrawingMode=false;
let currentPaths=[];

function switchPencilType(type) {
switchPencilTypeUi(type);

if (type===nowPencil) {
pencilModeClear(type);
currentPaths=[];
clearPenActiveButton();
nonActiveClearButton();
return;
} else {
pencilModeClear(type);
canvas.isDrawingMode=true;
currentPaths=[];
nowPencil=type;
}


activeClearButton();
if (type!==MODE_PEN_MOSAIC) {
changeCursor("editPen");
}

if (type===MODE_PEN_MOSAIC) {
isMosaicBrushActive=true;
canvas.freeDrawingBrush=getMosaicBrush();
canvas.freeDrawingBrush.mosaicSize=parseInt(drawingMosaicSize.value);
canvas.freeDrawingBrush.circleSize=parseInt(drawingMosaicCircleSize.value);
canvas.freeDrawingBrush.drawPreviewCircle({x: canvas.width/2,y: canvas.height/2});

} else if (type===MODE_PEN_PENCIL) {
setupContextTopBrush(new fabric.PencilBrush(canvas));

} else if (type===MODE_PEN_OUTLINE) {
canvas.freeDrawingBrush=new fabric.DoubleOutlineBrush(canvas);

} else if (type===MODE_PEN_TEXTURE) {
setupContextTopBrush(new fabric.PatternBrush(canvas));

} else if (type===MODE_PEN_VLINE) {
setupContextTopBrush(getVLinePatternBrush());

} else if (type===MODE_PEN_HLINE) {
setupContextTopBrush(getHLinePatternBrush());

} else if (type===MODE_PEN_CRAYON) {
setupContextTopBrush(enhanceBrush(getCrayonBrush(),true));

} else if (type===MODE_PEN_CIRCLE) {
canvas.freeDrawingBrush=new fabric.CircleBrush(canvas);

} else if (type===MODE_PEN_INK) {
canvas.freeDrawingBrush=enhanceBrush(getInkBrush(),true);

} else if (type===MODE_PEN_MARKER) {
canvas.freeDrawingBrush=enhanceBrush(getMarkerBrush(),true);

} else if (type===MODE_PEN_ERASER) {
canvas.freeDrawingBrush=getEraserBrush();

} else if (type===MODE_PEN_CUSTOM) {
canvas.freeDrawingBrush=getActiveCustomBrush();

} else {
canvas.freeDrawingBrush=new fabric[type+"Brush"](canvas);

}
clearPenActiveButton();

$(type+'Button').classList.add('active-button');
applyBrushSettings();
}

var drawingColor=null;
var drawingWidth=null;
var drawingOpacity=null;
var drawingShadowColor=null;
var drawingShadowWidth=null;
var drawingShadowOffsetX=null;
var drawingShadowOffsetY=null;
var drawingLineStyle=null;
var drawingMosaicSize=null;
var drawingMosaicCircleSize=null;
var drawingMainOpacity=null;
var drawingOutline1Opacity=null;
var drawingOutline2Opacity=null;
var drawingMainColor=null;
var drawingOutline1Color=null;
var drawingOutline2Color=null;
var drawingMainWidth=null;
var drawingOutline1Width=null;
var drawingOutline2Width=null;


function switchPencilTypeUi(type) {
clearPenSettings();
let settingsHTML='';
switch (type) {
case MODE_PEN_PENCIL:
settingsHTML+=addColor(MODE_PEN_PENCIL+'-color','color',sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_PENCIL+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-line-width',5));
settingsHTML+=addSlider(MODE_PEN_PENCIL+'-opacity','opacity',1,100,sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-opacity',100));
settingsHTML+=addColor(MODE_PEN_PENCIL+'-shadow-color','shadow',sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-shadow-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_PENCIL+'-shadow-line-width','size',0,150,sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-shadow-line-width',0));
settingsHTML+=addSlider(MODE_PEN_PENCIL+'-shadow-offset-x','svg_icon_shadow_offset_x',1,150,sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-shadow-offset-x',5));
settingsHTML+=addSlider(MODE_PEN_PENCIL+'-shadow-offset-y','svg_icon_shadow_offset_y',1,150,sidebarValueMap.getOrDefault(MODE_PEN_PENCIL+'-shadow-offset-y',5));
settingsHTML+=addDropDownByStyle('line-style','lineStyle');
$('tool-settings').innerHTML=settingsHTML;

drawingColor=$(MODE_PEN_PENCIL+'-color');
drawingWidth=$(MODE_PEN_PENCIL+'-line-width');
drawingOpacity=$(MODE_PEN_PENCIL+'-opacity');
drawingShadowColor=$(MODE_PEN_PENCIL+'-shadow-color');
drawingShadowWidth=$(MODE_PEN_PENCIL+'-shadow-line-width');
drawingShadowOffsetX=$(MODE_PEN_PENCIL+'-shadow-offset-x');
drawingShadowOffsetY=$(MODE_PEN_PENCIL+'-shadow-offset-y');
drawingLineStyle=$("line-style");

break;
case MODE_PEN_OUTLINE:
settingsHTML+=addColor(MODE_PEN_OUTLINE+'-main-color','color',sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-color','#000000'));
settingsHTML+=addColor(MODE_PEN_OUTLINE+'-outline1-color','outline1-color',sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline1-color','#FFFFFF'));
settingsHTML+=addColor(MODE_PEN_OUTLINE+'-outline2-color','outline2-color',sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline2-color','#FF0000'));

settingsHTML+=addSlider(MODE_PEN_OUTLINE+'-main-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-main-width',10));
settingsHTML+=addSlider(MODE_PEN_OUTLINE+'-outline1-width','outline1-size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline1-width',2));
settingsHTML+=addSlider(MODE_PEN_OUTLINE+'-outline2-width','outline2-size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline2-width',1));

settingsHTML+=addSlider(MODE_PEN_OUTLINE+'-outline1-opacity','outline1-opacity',1,100,sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline1-opacity',100));
settingsHTML+=addSlider(MODE_PEN_OUTLINE+'-outline2-opacity','outline2-opacity',1,100,sidebarValueMap.getOrDefault(MODE_PEN_OUTLINE+'-outline2-opacity',100));
$('tool-settings').innerHTML=settingsHTML;

drawingMainColor=$(MODE_PEN_OUTLINE+'-main-color');
drawingOutline1Color=$(MODE_PEN_OUTLINE+'-outline1-color');
drawingOutline2Color=$(MODE_PEN_OUTLINE+'-outline2-color');
drawingMainWidth=$(MODE_PEN_OUTLINE+'-main-width');
drawingOutline1Width=$(MODE_PEN_OUTLINE+'-outline1-width');
drawingOutline2Width=$(MODE_PEN_OUTLINE+'-outline2-width');

drawingOutline1Opacity=$(MODE_PEN_OUTLINE+'-outline1-opacity');
drawingOutline2Opacity=$(MODE_PEN_OUTLINE+'-outline2-opacity');
break;
case MODE_PEN_CIRCLE:
settingsHTML+=addColor(MODE_PEN_CIRCLE+'-color','color',sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_CIRCLE+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-line-width',5));
settingsHTML+=addColor(MODE_PEN_CIRCLE+'-shadow-color','shadow',sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-shadow-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_CIRCLE+'-shadow-line-width','size',0,150,sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-shadow-line-width',0));
settingsHTML+=addSlider(MODE_PEN_CIRCLE+'-shadow-offset-x','svg_icon_shadow_offset_x',1,150,sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-shadow-offset-x',5));
settingsHTML+=addSlider(MODE_PEN_CIRCLE+'-shadow-offset-y','svg_icon_shadow_offset_y',1,150,sidebarValueMap.getOrDefault(MODE_PEN_CIRCLE+'-shadow-offset-y',5));
$('tool-settings').innerHTML=settingsHTML;

drawingColor=$(MODE_PEN_CIRCLE+'-color');
drawingWidth=$(MODE_PEN_CIRCLE+'-line-width');
drawingShadowColor=$(MODE_PEN_CIRCLE+'-shadow-color');
drawingShadowWidth=$(MODE_PEN_CIRCLE+'-shadow-line-width');
drawingShadowOffsetX=$(MODE_PEN_CIRCLE+'-shadow-offset-x');
drawingShadowOffsetY=$(MODE_PEN_CIRCLE+'-shadow-offset-y');
break;
case MODE_PEN_CRAYON:
settingsHTML+=addColor(MODE_PEN_CRAYON+'-color','color',sidebarValueMap.getOrDefault(MODE_PEN_CRAYON+'-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_CRAYON+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_CRAYON+'-line-width',5));
settingsHTML+=addSlider(MODE_PEN_CRAYON+'-opacity','opacity',1,100,sidebarValueMap.getOrDefault(MODE_PEN_CRAYON+'-opacity',100));
$('tool-settings').innerHTML=settingsHTML;

drawingColor=$(MODE_PEN_CRAYON+'-color');
drawingWidth=$(MODE_PEN_CRAYON+'-line-width');
drawingOpacity=$(MODE_PEN_CRAYON+'-opacity');
break;
case MODE_PEN_INK:
settingsHTML+=addColor(MODE_PEN_INK+'-color','color',sidebarValueMap.getOrDefault(MODE_PEN_INK+'-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_INK+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_INK+'-line-width',5));
$('tool-settings').innerHTML=settingsHTML;

drawingColor=$(MODE_PEN_INK+'-color');
drawingWidth=$(MODE_PEN_INK+'-line-width');
break;
case MODE_PEN_MARKER:
settingsHTML+=addColor(MODE_PEN_MARKER+'-color','color',sidebarValueMap.getOrDefault(MODE_PEN_MARKER+'-color','#000000'));
settingsHTML+=addSlider(MODE_PEN_MARKER+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_MARKER+'-line-width',5));
settingsHTML+=addSlider(MODE_PEN_MARKER+'-opacity','opacity',1,100,sidebarValueMap.getOrDefault(MODE_PEN_MARKER+'-opacity',100));
$('tool-settings').innerHTML=settingsHTML;

drawingColor=$(MODE_PEN_MARKER+'-color');
drawingWidth=$(MODE_PEN_MARKER+'-line-width');
drawingOpacity=$(MODE_PEN_MARKER+'-opacity');
break;
case MODE_PEN_MOSAIC:
settingsHTML+=addSlider(MODE_PEN_MOSAIC+'-circle-size','circle-size',1,250,sidebarValueMap.getOrDefault(MODE_PEN_MOSAIC+'-circle-size',40));
settingsHTML+=addSlider(MODE_PEN_MOSAIC+'-size','mosaic-size',1,250,sidebarValueMap.getOrDefault(MODE_PEN_MOSAIC+'-size',8));
$('tool-settings').innerHTML=settingsHTML;

drawingMosaicSize=$(MODE_PEN_MOSAIC+'-size');
drawingMosaicCircleSize=$(MODE_PEN_MOSAIC+'-circle-size');
break;
case MODE_PEN_ERASER:
settingsHTML+=addSlider(MODE_PEN_ERASER+'-line-width','size',1,150,sidebarValueMap.getOrDefault(MODE_PEN_ERASER+'-line-width',5));
$('tool-settings').innerHTML=settingsHTML;

drawingWidth=$(MODE_PEN_ERASER+'-line-width');
break;
case MODE_PEN_CUSTOM:
$('tool-settings').innerHTML=renderCustomBrushSettings();
bindCustomBrushSettings();
break;
}

jsColorSet();

const sliders2=document.querySelectorAll('.input-container-leftSpace input[type="range"]');
sliders2.forEach(slider=>{
setupSlider(slider,'.input-container-leftSpace')
});
addPenEventListener();
}

function clearPenSettings() {
const elements=[
drawingColor,drawingWidth,drawingOpacity,
drawingShadowColor,drawingShadowWidth,drawingShadowOffsetX,drawingShadowOffsetY,
drawingLineStyle,drawingMainColor,drawingOutline1Color,drawingOutline2Color,
drawingMainWidth,drawingOutline1Width,drawingOutline2Width,
drawingMainOpacity,drawingOutline1Opacity,drawingOutline2Opacity
];
elements.forEach(el=>{
if (el) {
el.removeEventListener('change',applyBrushSettings);
el.removeEventListener('change',saveValueMap);
}
});
[drawingColor,drawingWidth,drawingOpacity,drawingShadowColor,drawingShadowWidth,
drawingShadowOffsetX,drawingShadowOffsetY,drawingLineStyle,drawingMainColor,
drawingOutline1Color,drawingOutline2Color,drawingMainWidth,drawingOutline1Width,
drawingOutline2Width,drawingMainOpacity,drawingOutline1Opacity,
drawingOutline2Opacity,drawingMosaicSize,drawingMosaicCircleSize]=Array(20).fill(null);
}


function addPenEventListener(){
const elements=[drawingColor,drawingWidth,drawingOpacity,drawingShadowColor,
drawingShadowWidth,drawingShadowOffsetX,drawingShadowOffsetY,drawingLineStyle,
drawingMainOpacity,drawingOutline1Opacity,drawingOutline2Opacity,drawingMainColor,drawingOutline1Color,
drawingOutline2Color,drawingMainWidth,drawingOutline1Width,drawingOutline2Width,];

elements.forEach(element=>{
if (element) {
element.addEventListener('change',()=>{
applyBrushSettings();
saveValueMap(element);
});
}
});

if(drawingWidth){
drawingWidth.addEventListener('input',function() {
const size=parseInt(this.value);
drawCircle(size);
});
}
if(drawingMainWidth){
drawingMainWidth.addEventListener('input',function() {
const size=parseInt(this.value);
drawCircle(size);
});
}


if(drawingMosaicSize){
drawingMosaicSize.addEventListener('input',function () {
var value=this.value;
if (isMosaicBrushActive&&canvas.freeDrawingBrush) {
canvas.freeDrawingBrush.mosaicSize=parseInt(value);
updatePreview();
}
});
drawingMosaicSize.onchange=()=>saveValueMap(drawingMosaicSize);
}

if(drawingMosaicCircleSize){
drawingMosaicCircleSize.addEventListener('change',function () {
var value=this.value;
if (isMosaicBrushActive&&canvas.freeDrawingBrush) {
canvas.freeDrawingBrush.circleSize=parseInt(value);
updatePreview();
}
});
drawingMosaicCircleSize.onchange=()=>saveValueMap(drawingMosaicCircleSize);
}
}


function applyBrushSettings() {

if (canvas.freeDrawingBrush) {
var brush=canvas.freeDrawingBrush;

if(drawingMainColor){
brush.color=drawingMainColor.value;
brush.outline1Color=drawingOutline1Color.value;
brush.outline2Color=drawingOutline2Color.value;
brush.width=parseInt(drawingMainWidth.value);
brush.outline1Width=parseInt(drawingOutline1Width.value);
brush.outline2Width=parseInt(drawingOutline2Width.value);
brush.outline1Opacity=parseInt(drawingOutline1Opacity.value)/100;
brush.outline2Opacity=parseInt(drawingOutline2Opacity.value)/100;
}

if (drawingWidth) {
brush.width=parseInt(drawingWidth.value,10)||1;
}else{
canvasLogger.debug("drawingWidth is null");
}

if (drawingColor) {
var color=new fabric.Color(drawingColor.value);
if (drawingOpacity) {
color.setAlpha(parseFloat(drawingOpacity.value/100)||1);
}
brush.color=color.toRgba();
brush.opacity=1;
}

if (brush.getPatternSrc) {
brush.source=brush.getPatternSrc.call(brush);
brush.strokeLineCap='round';
brush.strokeLineJoin='round';
brush.strokeDashArray=null;
}

if (drawingShadowWidth) {
if(drawingShadowWidth.value>0){
brush.shadow=new fabric.Shadow({
affectStroke: true,
blur: parseInt(drawingShadowWidth.value,10)||0,
offsetX: parseInt(drawingShadowOffsetX.value,10)||0,
offsetY: parseInt(drawingShadowOffsetY.value,10)||0,
color: drawingShadowColor.value
});
}
} else {
brush.shadow=null;
}

if (drawingLineStyle) {
const lineStyle=drawingLineStyle.value;
var brushWidth=parseInt(drawingWidth.value,10)||1;
if (lineStyle==="solid") {
canvas.freeDrawingBrush.strokeDashArray=null;
} else if (lineStyle==="dashed") {
canvas.freeDrawingBrush.strokeDashArray=[
brushWidth*4,
brushWidth*4,
];
} else if (lineStyle==="dotted") {
canvas.freeDrawingBrush.strokeDashArray=[brushWidth,brushWidth*4];
}
}

}
}



function clearPenActiveButton() {
uiLogger.debug("clearPenActiveButton is call");
$(MODE_PEN_PENCIL+'Button').classList.remove('active-button');
$(MODE_PEN_OUTLINE+'Button').classList.remove('active-button');
$(MODE_PEN_CIRCLE+'Button').classList.remove('active-button');
$(MODE_PEN_CRAYON+'Button').classList.remove('active-button');
$(MODE_PEN_INK+'Button').classList.remove('active-button');
$(MODE_PEN_MARKER+'Button').classList.remove('active-button');
$(MODE_PEN_ERASER+'Button').classList.remove('active-button');
$(MODE_PEN_MOSAIC+'Button').classList.remove('active-button');
if($(MODE_PEN_CUSTOM+'Button'))$(MODE_PEN_CUSTOM+'Button').classList.remove('active-button');
}

function setupContextTopBrush(brush) {
canvas.freeDrawingBrush=brush;
canvas.freeDrawingBrush._render=function () {
var ctx=this.canvas.contextTop;
var color=new fabric.Color(this.color);
var opacity=color.getAlpha();
color.setAlpha(opacity*this.opacity);
ctx.strokeStyle=this.color;
ctx.lineWidth=this.width;
ctx.lineCap=ctx.lineJoin='round';

ctx.beginPath();
for (var i=0;i<this._points.length;i++) {
var point=this._points[i];
ctx.moveTo(point.x,point.y);
var midPoint=point.midPointFrom(this._points[i+1]||point);
ctx.quadraticCurveTo(point.x,point.y,midPoint.x,midPoint.y);
}
ctx.stroke();
};
}
function finalizeGroup() {
if (currentPaths.length>0) {
const existingPaths=currentPaths.filter(path=>canvas.contains(path));

if (existingPaths.length>0) {
let minX=Infinity;
let minY=Infinity;
let maxX=-Infinity;
let maxY=-Infinity;

existingPaths.forEach(path=>{
const bounds=path.getBoundingRect();
minX=Math.min(minX,bounds.left);
minY=Math.min(minY,bounds.top);
maxX=Math.max(maxX,bounds.left+bounds.width);
maxY=Math.max(maxY,bounds.top+bounds.height);
});

const offsetX=minX;
const offsetY=minY;

existingPaths.forEach(path=>{
path.set({
left: path.left-offsetX,
top: path.top-offsetY
});
});

let group=new fabric.Group(existingPaths,{
left: offsetX,
top: offsetY,
selectable: false,
evented: true
});

changeDoNotSaveHistory();
canvas.remove(...existingPaths);
canvas.add(group);
changeDoSaveHistory();
canvas.renderAll();
updateLayerPanel();
}
currentPaths=currentPaths.filter(path=>!existingPaths.includes(path));
}
}


function getMosaicBrush() {
const mosaicBrush=new fabric.MosaicBrush(canvas);
return enhanceBrush(mosaicBrush,false);
}

function getEraserBrush() {
const eraserBrush=new fabric.EraserBrush(canvas);
eraserBrush.width=parseInt(drawingWidth.value,10)||10;
return eraserBrush;
}

function getCrayonBrush() {
return new fabric.CrayonBrush(canvas,{
width: 70,
opacity: 0.6,
color: "#ff0000"
});
}

function getInkBrush() {
return new fabric.InkBrush(canvas,{
width: 70,
opacity: 0.6,
color: "#ff0000"
});
}

function getMarkerBrush() {
return new fabric.MarkerBrush(canvas,{
width: 70,
opacity: 0.6,
color: "#ff0000"
}
);
}

var customBrushTipDataUrl="";

function collectCustomBrushSettings(){
var selected=document.getElementById("customBrushPresetSelect");
var base=window.NaiBrushPresets?window.NaiBrushPresets.get(selected&&selected.value):{engine:"taper"};
return window.NaiBrushPresets.normalize({
id:selected&&selected.value,
name:(document.getElementById("customBrushName")||{}).value||base.name||"自定义笔刷",
engine:(document.getElementById("customBrushEngine")||{}).value||base.engine,
size:parseFloat((document.getElementById("customBrushSize")||{}).value||base.size||16),
opacity:parseFloat((document.getElementById("customBrushOpacity")||{}).value||90)/100,
color:(document.getElementById("customBrushColor")||{}).value||base.color||"#111111",
spacing:parseFloat((document.getElementById("customBrushSpacing")||{}).value||16)/100,
hardness:parseFloat((document.getElementById("customBrushHardness")||{}).value||75)/100,
scatter:parseFloat((document.getElementById("customBrushScatter")||{}).value||0)/100,
angleJitter:parseFloat((document.getElementById("customBrushAngle")||{}).value||0),
taperStart:parseFloat((document.getElementById("customBrushTaperStart")||{}).value||10)/100,
taperEnd:parseFloat((document.getElementById("customBrushTaperEnd")||{}).value||40)/100,
smoothing:parseFloat((document.getElementById("customBrushSmoothing")||{}).value||45)/100,
followPath:!!(document.getElementById("customBrushFollowPath")&&document.getElementById("customBrushFollowPath").checked),
shape:base.shape||"",
tip:customBrushTipDataUrl||base.tip||""
});
}

function renderCustomBrushSettings(){
var presets=window.NaiBrushPresets?window.NaiBrushPresets.list():[];
var current=presets[0]||{id:"ink-taper",name:"尖头墨笔",engine:"taper",size:16,opacity:0.9,color:"#111111",spacing:0.12,hardness:0.8,scatter:0,angleJitter:0,taperStart:0.1,taperEnd:0.4,smoothing:0.5,followPath:true};
var options=presets.map(function(preset){
return '<option value="'+preset.id+'">'+(preset.builtin?"[内置] ":"")+preset.name+"</option>";
}).join("");
return '<div class="custom-brush-panel">'+
'<div class="simulator-chat-help">参考 fabric-brush 印章笔和 perfect-freehand 的起收笔。可保存自己的笔刷 JSON。</div>'+
'<div class="simulator-chat-field"><label for="customBrushPresetSelect">预设</label><select id="customBrushPresetSelect" class="simulator-chat-input">'+options+"</select></div>"+
'<div class="simulator-chat-field"><label for="customBrushName">名称</label><input id="customBrushName" class="simulator-chat-input" type="text" value="'+current.name+'"></div>'+
'<div class="simulator-chat-field"><label for="customBrushEngine">引擎</label><select id="customBrushEngine" class="simulator-chat-input"><option value="taper">尖头/压力笔</option><option value="stamp">印章/纹理笔</option></select></div>'+
'<div class="simulator-chat-field"><label for="customBrushColor">颜色</label><input id="customBrushColor" type="color" value="'+current.color+'"></div>'+
addSlider("customBrushSize","size",1,180,current.size)+
addSlider("customBrushOpacity","opacity",5,100,Math.round(current.opacity*100))+
addSlider("customBrushSpacing","spacing",4,150,Math.round(current.spacing*100))+
addSlider("customBrushHardness","hardness",0,100,Math.round(current.hardness*100))+
addSlider("customBrushScatter","scatter",0,150,Math.round(current.scatter*100))+
addSlider("customBrushAngle","angle",0,180,current.angleJitter)+
addSlider("customBrushTaperStart","taper-start",0,100,Math.round(current.taperStart*100))+
addSlider("customBrushTaperEnd","taper-end",0,100,Math.round(current.taperEnd*100))+
addSlider("customBrushSmoothing","smoothing",0,100,Math.round(current.smoothing*100))+
'<label class="cutout-check"><input id="customBrushFollowPath" type="checkbox" '+(current.followPath?"checked":"")+"> 笔尖跟随笔势</label>"+
'<div class="simulator-chat-field"><label for="customBrushTipInput">自定义笔尖</label><input id="customBrushTipInput" type="file" accept="image/*"></div>'+
'<div class="custom-brush-actions">'+
'<button id="customBrushApplyButton" type="button" class="nai-character-mini-button">应用到画笔</button>'+
'<button id="customBrushSaveButton" type="button" class="nai-character-mini-button">保存为我的笔刷</button>'+
'<button id="customBrushDeleteButton" type="button" class="nai-character-mini-button">删除自定义笔刷</button>'+
'<button id="customBrushExportButton" type="button" class="nai-character-mini-button">导出 JSON</button>'+
'<label class="nai-character-mini-button" for="customBrushImportInput">导入 JSON</label>'+
'<input id="customBrushImportInput" type="file" accept="application/json" hidden>'+
"</div></div>";
}

function fillCustomBrushForm(preset){
if(!preset)return;
var map={
customBrushName:preset.name,
customBrushEngine:preset.engine,
customBrushColor:preset.color,
customBrushSize:preset.size,
customBrushOpacity:Math.round(preset.opacity*100),
customBrushSpacing:Math.round(preset.spacing*100),
customBrushHardness:Math.round(preset.hardness*100),
customBrushScatter:Math.round(preset.scatter*100),
customBrushAngle:preset.angleJitter,
customBrushTaperStart:Math.round(preset.taperStart*100),
customBrushTaperEnd:Math.round(preset.taperEnd*100),
customBrushSmoothing:Math.round(preset.smoothing*100)
};
Object.keys(map).forEach(function(id){
var target=document.getElementById(id);
if(target)target.value=map[id];
});
var follow=document.getElementById("customBrushFollowPath");
if(follow)follow.checked=preset.followPath!==false;
customBrushTipDataUrl=preset.tip||"";
}

function getActiveCustomBrush(){
var preset=collectCustomBrushSettings();
return window.NaiCustomBrush.getCustomBrush(preset);
}

function applyCustomBrushLive(){
if(nowPencil!==MODE_PEN_CUSTOM)return;
canvas.freeDrawingBrush=getActiveCustomBrush();
applyBrushSettings();
}

function bindCustomBrushSettings(){
var select=document.getElementById("customBrushPresetSelect");
if(select){
select.addEventListener("change",function(){
var preset=window.NaiBrushPresets.get(select.value);
fillCustomBrushForm(preset);
applyCustomBrushLive();
});
}
["customBrushEngine","customBrushColor","customBrushSize","customBrushOpacity","customBrushSpacing","customBrushHardness","customBrushScatter","customBrushAngle","customBrushTaperStart","customBrushTaperEnd","customBrushSmoothing","customBrushFollowPath"].forEach(function(id){
var target=document.getElementById(id);
if(!target)return;
target.addEventListener("change",applyCustomBrushLive);
target.addEventListener("input",applyCustomBrushLive);
});
var tipInput=document.getElementById("customBrushTipInput");
if(tipInput){
tipInput.addEventListener("change",function(){
var file=tipInput.files&&tipInput.files[0];
if(!file)return;
var reader=new FileReader();
reader.onload=function(){
customBrushTipDataUrl=String(reader.result||"");
applyCustomBrushLive();
};
reader.readAsDataURL(file);
});
}
var applyButton=document.getElementById("customBrushApplyButton");
if(applyButton)applyButton.addEventListener("click",applyCustomBrushLive);
var saveButton=document.getElementById("customBrushSaveButton");
if(saveButton)saveButton.addEventListener("click",function(){
var preset=collectCustomBrushSettings();
var saved=window.NaiBrushPresets.saveUserPreset(preset);
$("tool-settings").innerHTML=renderCustomBrushSettings();
bindCustomBrushSettings();
var next=document.getElementById("customBrushPresetSelect");
if(next)next.value=saved.id;
fillCustomBrushForm(saved);
applyCustomBrushLive();
});
var deleteButton=document.getElementById("customBrushDeleteButton");
if(deleteButton)deleteButton.addEventListener("click",function(){
var selectEl=document.getElementById("customBrushPresetSelect");
var preset=window.NaiBrushPresets.get(selectEl&&selectEl.value);
if(!preset||preset.builtin)return;
window.NaiBrushPresets.removeUserPreset(preset.id);
$("tool-settings").innerHTML=renderCustomBrushSettings();
bindCustomBrushSettings();
applyCustomBrushLive();
});
var exportButton=document.getElementById("customBrushExportButton");
if(exportButton)exportButton.addEventListener("click",function(){
var blob=new Blob([window.NaiBrushPresets.exportPack()],{type:"application/json"});
var url=URL.createObjectURL(blob);
var link=document.createElement("a");
link.href=url;
link.download="brush-presets.json";
link.click();
URL.revokeObjectURL(url);
});
var importInput=document.getElementById("customBrushImportInput");
if(importInput)importInput.addEventListener("change",function(){
var file=importInput.files&&importInput.files[0];
if(!file)return;
file.text().then(function(text){
window.NaiBrushPresets.importPack(text);
$("tool-settings").innerHTML=renderCustomBrushSettings();
bindCustomBrushSettings();
applyCustomBrushLive();
});
});
}

document.addEventListener("DOMContentLoaded",function () {
fabric.Object.prototype.transparentCorners=false;
});

function updatePreview() {
if (isMosaicBrushActive&&canvas.freeDrawingBrush) {
canvas.freeDrawingBrush.drawPreviewCircle({x: canvas.width/2,y: canvas.height/2});
}
}





let currentCircle=null;
let removeTimeout=null;

function createCheckeredPattern(size) {
const patternCanvas=document.createElement('canvas');
const patternContext=patternCanvas.getContext('2d');
const patternSize=10;
patternCanvas.width=patternSize*2;
patternCanvas.height=patternSize*2;

patternContext.fillStyle='white';
patternContext.fillRect(0,0,patternSize*2,patternSize*2);

patternContext.fillStyle='#E0E0E0';// 薄いグレー
patternContext.fillRect(0,0,patternSize,patternSize);
patternContext.fillRect(patternSize,patternSize,patternSize,patternSize);

return new fabric.Pattern({
source: patternCanvas,
repeat: 'repeat'
});
}

function drawCircle(size) {
if (currentCircle) {
canvas.remove(currentCircle);
}

if (removeTimeout) {
clearTimeout(removeTimeout);
}

const checkeredPattern=createCheckeredPattern(size);

currentCircle=new fabric.Circle({
radius: size/2,
fill: checkeredPattern,
stroke: 'green',
strokeWidth: 2,
left: canvas.width/2,
top: canvas.height/2,
originX: 'center',
originY: 'center',
opacity: 0.5
});

canvas.add(currentCircle);
canvas.renderAll();

removeTimeout=setTimeout(()=>{
if (currentCircle) {
canvas.remove(currentCircle);
canvas.renderAll();
currentCircle=null;
}
},1000);
}

