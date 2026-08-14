// mode-change.js - グローバル変数、ダークモード切替、cropモードUI

var nowMode="";

var isKnifeDrawing=false;
var isKnifeMode=false;

const MODE_PEN_PENCIL='Pencil';
const MODE_PEN_OUTLINE='OutlinePen';
const MODE_PEN_CIRCLE='Circle';
const MODE_PEN_SQUARE='Square';
const MODE_PEN_TEXTURE='Texture';
const MODE_PEN_CRAYON='Crayon';
const MODE_PEN_INK='Ink';
const MODE_PEN_MARKER='Marker';
const MODE_PEN_ERASER='Eraser';
const MODE_PEN_HLINE='Hline';
const MODE_PEN_VLINE='Vline';
const MODE_PEN_MOSAIC='Mosaic';
const MODE_PEN_CUSTOM='CustomBrush';

var isMosaicBrushActive=false;
var cropFrame;
var cropActiveObject;
var cropThenCutout=false;
let nowPencil="";

function showCanvasHelpText(text,highlightKey){
var el=$("canvas-help-text");
if(!el)return;
var escaped=text.replace(highlightKey,'<span class="help-key">'+highlightKey+'</span>');
el.innerHTML=escaped;
el.classList.add("active");
}
function hideCanvasHelpText(){
var el=$("canvas-help-text");
if(!el)return;
el.classList.remove("active");
el.innerHTML="";
}

function toggleMode() {
const isDarkMode=document.body.classList.toggle('dark-mode');
const logo=$('navbar-logo');

document.documentElement.classList.remove('light-mode');
document.documentElement.classList.add('dark-mode');
document.body.classList.remove('light-mode');
document.body.classList.add('dark-mode');
document.documentElement.classList.remove('light-mode');
document.documentElement.classList.add('dark-mode');
localStorage.setItem('mode','dark-mode');
logo.src='02_images_svg/Logo/black_mode_logo.webp';

updateLayerPanel();
}

document.addEventListener('DOMContentLoaded',function() {
$('mode-toggle').addEventListener('change',toggleMode);
});

function initializeMode() {
const mode='dark-mode';
document.documentElement.classList.add(mode);
document.body.classList.add(mode);
document.documentElement.classList.add(mode);
const logo=$('navbar-logo');
if (mode==='dark-mode') {
$('mode-toggle').checked=true;
logo.src='02_images_svg/Logo/black_mode_logo.webp';
} else {
logo.src='02_images_svg/Logo/light_mode_logo.webp';
}
}

document.addEventListener('DOMContentLoaded',function() {
initializeMode();
});

function getCssValue(key){
var currentModeElement=document.body;
var rootStyles=getComputedStyle(currentModeElement);
return rootStyles.getPropertyValue(key).trim();
}

function getCropFrameRect(){
if(!cropFrame)return null;
return {
left:cropFrame.left,
top:cropFrame.top,
width:Math.abs((cropFrame.width||0)*(cropFrame.scaleX||1)),
height:Math.abs((cropFrame.height||0)*(cropFrame.scaleY||1))
};
}

function completeCrop(){
if(!cropFrame||!cropActiveObject)return false;
var image=cropActiveObject;
var rect=getCropFrameRect();
var doCutout=!!cropThenCutout;
cropThenCutout=false;
if(doCutout){
cropModeClear();
if(window.NaiBackgroundRemovalClient&&typeof window.NaiBackgroundRemovalClient.processRegion==="function"){
window.NaiBackgroundRemovalClient.processRegion(image,rect,"new").catch(function(){});
}else if(typeof createToastError==="function"){
createToastError("抠图不可用","本地抠图还没就绪，请用一键启动后再试。");
}
return true;
}
ImageUtil.cropImage(
image,
rect.left,
rect.top,
parseInt(rect.height,10),
parseInt(rect.width,10)
);
cropModeClear();
return true;
}

function startCropMode(targetImage,cutoutAfter){
var previousImage=cropActiveObject;
if(typeof cropModeClear==="function")cropModeClear();
if(!targetImage){
targetImage=canvas.getActiveObject();
}
if(targetImage&&targetImage.naiCropFrame)targetImage=previousImage;
if(!targetImage&&previousImage)targetImage=previousImage;
if(!targetImage||!isImage(targetImage)){
if(typeof createToast==='function')createToast('裁剪需要图片','请先点一张图再按 C。分镜格子请用左侧「刀」切开，不要用裁剪。',4200);
else if(typeof createToastError==='function')createToastError('裁剪需要图片','请先点一张图再按 C。分镜格子请用刀切开。');
return;
}
if(typeof selectMoveTool==="function"&&canvas&&canvas.isDrawingMode)selectMoveTool();
cropThenCutout=!!cutoutAfter;
cropActiveObject=targetImage;
cropFrame=new fabric.Rect({
fill:"rgba(54,253,0,0.08)",
originX:"left",
originY:"top",
stroke:"rgba(54,253,0,0.95)",
strokeWidth:2,
strokeDashArray:[8,4],
width:1,
height:1,
borderColor:"#36fd00",
cornerColor:"#36fd00",
cornerSize:10,
transparentCorners:false,
hasRotatingPoint:false,
lockRotation:true,
selectable:true,
evented:true,
naiCropFrame:true,
excludeFromExport:true
});
cropFrame.left=cropActiveObject.left;
cropFrame.top=cropActiveObject.top;
cropFrame.width=cropActiveObject.width*cropActiveObject.scaleX;
cropFrame.height=cropActiveObject.height*cropActiveObject.scaleY;
canvas.add(cropFrame);
canvas.setActiveObject(cropFrame);
canvas.renderAll();
showCanvasHelpText(getText(cutoutAfter?"cutoutRegionHelpText":"cropHelpText"),"Enter");
if(typeof createToast==="function"){
createToast(cutoutAfter?"框选抠图":"框选裁剪",cutoutAfter?"拖绿框选区域，按 Enter 抠图（本地，不花积分）。":"拖绿框选区域，按 Enter 裁剪。",3200);
}
}

function startCutoutRegionMode(targetImage){
return startCropMode(targetImage,true);
}
