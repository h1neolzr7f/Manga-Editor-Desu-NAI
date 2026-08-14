var initialCanvasWidth=0;
var initialCanvasHeight=0;
var aspectRatio=0;
var viewUserScale=1;
var resizableContainer=0;

let resizeTimer;
function initResizeCanvas(event) {
canvasLogger.debug("initResizeCanvas");
if(event){
event.stopPropagation();
event.preventDefault();
}
var parent=getCanvasViewParent();
if(!parent)return;
var containerWidth=parent.clientWidth;
var containerHeight=parent.clientHeight;

if (
containerWidth<minCanvasSizeWidth||
containerHeight<minCanvasSizeHeight
) {
return;
}

if (resizeTimer) {
clearTimeout(resizeTimer);
}
resizeTimer=setTimeout(function () {
if(typeof canvas==="undefined"||!canvas||!canvas.getWidth()){
if(typeof loadBookSize==="function"){
var page=typeof NaiMangaPageSize!=="undefined"?NaiMangaPageSize.defaultMangaPageSize(false):{width:1654,height:2339};
loadBookSize(page.width,page.height,false);
}
}
fitCanvasViewToContainer(true);
if(typeof initMessage==="function")initMessage();
},15);
}

function getCanvasViewParent(){
return $("resizable-container")||$("canvas-container");
}

function resolvePagePixels(width,height){
if(typeof NaiMangaPageSize!=="undefined"&&typeof NaiMangaPageSize.resolveMangaPageSize==="function"){
return NaiMangaPageSize.resolveMangaPageSize(width,height);
}
return {width:parseFloat(width)||1654,height:parseFloat(height)||2339};
}

function updatePageSizeBadge(){
var badge=$("naiPageSizeBadge");
if(!badge||typeof canvas==="undefined"||!canvas)return;
var w=Math.round(canvas.getWidth()||0);
var h=Math.round(canvas.getHeight()||0);
badge.textContent=w&&h?("底图 "+w+"\u00d7"+h):"底图";
badge.title="组装漫画用的页面分辨率。出图单格仍按 NovelAI 安全尺寸，不会因为底图变大而多花积分。";
}

function fitCanvasViewToContainer(forced){
var parent=getCanvasViewParent();
var container=$("canvas-container");
if(!parent||!container||typeof canvas==="undefined"||!canvas)return;
var cw=canvas.getWidth();
var ch=canvas.getHeight();
var pw=parent.clientWidth;
var ph=parent.clientHeight;
if(!cw||!ch||!pw||!ph)return;
var fit=Math.min(pw/cw,ph/ch);
if(!isFinite(fit)||fit<=0)fit=1;
if(!viewUserScale||viewUserScale<0.2)viewUserScale=1;
var scale=fit*viewUserScale;
if(!forced&&Math.abs((canvasContinerScale||0)-scale)<0.0005){
updatePageSizeBadge();
updateZoomLabel();
return;
}
canvasContinerScale=scale;
container.style.maxWidth="none";
container.style.maxHeight="none";
container.style.width=cw+"px";
container.style.height=ch+"px";
container.style.transformOrigin="top left";
container.style.transform="scale("+scale+")";
container.style.marginRight=(cw*(scale-1))+"px";
container.style.marginBottom=(ch*(scale-1))+"px";
updatePageSizeBadge();
updateZoomLabel();
}

function resizeCanvasByNum(newWidth,newHeight) {
var size=resolvePagePixels(newWidth,newHeight);
canvas.setWidth(size.width);
canvas.setHeight(size.height);
initialCanvasWidth=canvas.getWidth();
initialCanvasHeight=canvas.getHeight();
aspectRatio=initialCanvasWidth/initialCanvasHeight;
canvas.renderAll();
fitCanvasViewToContainer(true);
}

function resizeCanvas(newWidth,newHeight) {
if(!newWidth||!newHeight||isNaN(newWidth)||isNaN(newHeight)){
return;
}
canvas.setDimensions({width: newWidth,height: newHeight});
canvas.getObjects().forEach((obj)=>{
if(!obj||!obj.initial)return;

var scaleX=newWidth/obj.initial.canvasWidth;
var scaleY=newHeight/obj.initial.canvasHeight;

obj.set({
scaleX: obj.initial.scaleX*scaleX,
scaleY: obj.initial.scaleY*scaleY,
left: obj.initial.left*scaleX,
top: obj.initial.top*scaleY,
strokeWidth: obj.initial.strokeWidth*scaleX,
});

if (obj.clipPath&&obj.clipPath.initial) {
scaleX=newWidth/obj.clipPath.initial.canvasWidth;
scaleY=newHeight/obj.clipPath.initial.canvasHeight;
const clipPath=obj.clipPath;
clipPath.set({
scaleX: obj.clipPath.initial.scaleX*scaleX,
scaleY: obj.clipPath.initial.scaleY*scaleY,
left: obj.clipPath.initial.left*scaleX,
top: obj.clipPath.initial.top*scaleY,
});
clipPath.setCoords();
}
saveInitialState(obj);
obj.setCoords();
});
canvas.renderAll();
fitCanvasViewToContainer(true);
}

function forcedAdjustCanvasSize() {
adjustCanvasSize(true);
}


function adjustCanvasSize(forced) {
if(typeof canvas==="undefined"||!canvas||!canvas.getWidth())return;
aspectRatio=canvas.getWidth()/Math.max(1,canvas.getHeight());
initialCanvasWidth=canvas.getWidth();
initialCanvasHeight=canvas.getHeight();
fitCanvasViewToContainer(!!forced);
}

window.addEventListener("resize",function(){
adjustCanvasSize(true);
});

function adjustCanvasSizeWithContainer(windowWidth,windowHeight) {
fitCanvasViewToContainer(true);
}

function addInitialImageToCanvas(img) {
resizeCanvasByNum(img.width,img.height);
initialPutImage(img);
fitCanvasViewToContainer(true);
}


function resizeCanvasToObject(objectWidth,objectHeight) {
var size=resolvePagePixels(objectWidth,objectHeight);
if(!size.width||!size.height)return;
canvas.setDimensions({width:size.width,height:size.height});
initialCanvasWidth=size.width;
initialCanvasHeight=size.height;
aspectRatio=initialCanvasWidth/initialCanvasHeight;
canvas.renderAll();
viewUserScale=1;
fitCanvasViewToContainer(true);
}

document.addEventListener('DOMContentLoaded',function() {
$('bg-color').addEventListener('input',function (event) {
var color=event.target.value;
canvas.setBackgroundColor(color,canvas.renderAll.bind(canvas));
});
$('bg-color').addEventListener('input',function (event) {
resizableContainer=getCanvasViewParent();
});
resizableContainer=getCanvasViewParent();
});


let canvasContinerScale=1;

function zoomPercent(){
return Math.round((viewUserScale||1)*100);
}

function updateZoomLabel(){
var pct=zoomPercent();
var text=pct+"%";
["naiZoomLabel","naiZoomLabelHeader"].forEach(function(id){
var node=$(id);
if(!node)return;
node.textContent=text;
node.title=pct===100?"当前是适应窗口。Ctrl+滚轮或 + − 可放大。不是原图像素 100%。":"画布缩放 "+pct+"%（相对适应窗口）";
});
}

function zoomBy(step,event){
var parent=getCanvasViewParent();
var container=$("canvas-container");
var oldScale=canvasContinerScale||1;
var canvasX=0;
var canvasY=0;
if(event&&container){
var box=container.getBoundingClientRect();
canvasX=(event.clientX-box.left)/oldScale;
canvasY=(event.clientY-box.top)/oldScale;
}
viewUserScale=Math.min(4,Math.max(0.25,(viewUserScale||1)+step));
fitCanvasViewToContainer(true);
if(event&&parent&&container){
var next=container.getBoundingClientRect();
parent.scrollLeft+=(next.left+canvasX*(canvasContinerScale||oldScale))-event.clientX;
parent.scrollTop+=(next.top+canvasY*(canvasContinerScale||oldScale))-event.clientY;
}
}

function zoomIn() {
zoomBy(0.15);
}

function zoomFit() {
viewUserScale=1;
fitCanvasViewToContainer(true);
var parent=getCanvasViewParent();
if(parent){
parent.scrollLeft=0;
parent.scrollTop=0;
}
}

function zoomOut() {
zoomBy(-0.15);
}

function currentCanvas(){
return typeof canvas!=="undefined"&&canvas?canvas:window.canvas;
}

function selectedPageId(current){
var object=current&&typeof current.getActiveObject==="function"?current.getActiveObject():null;
if(!object)return "";
if(object.simulatorPageId)return object.simulatorPageId;
if(object.type==="activeSelection"&&typeof object.getObjects==="function"){
var found="";
object.getObjects().some(function(item){
if(item&&item.simulatorPageId){found=item.simulatorPageId;return true;}
return false;
});
return found;
}
if(object.group&&object.group.simulatorPageId)return object.group.simulatorPageId;
return "";
}

function rememberPageId(pageId){
if(pageId&&window.NaiCanvasView)window.NaiCanvasView.lastPageId=pageId;
}

function rememberActiveContext(current){
if(!current)return;
var object=current.getActiveObject&&current.getActiveObject();
if(!object)return;
if(isMangaPanel(object)&&window.NaiCanvasView)window.NaiCanvasView.lastPanel=object;
var pageId=selectedPageId(current);
if(pageId)rememberPageId(pageId);
}

function resolveScalePageId(current,allowFallback){
var pageId=selectedPageId(current);
if(pageId){
rememberPageId(pageId);
return pageId;
}
if(!allowFallback){
var active=current&&current.getActiveObject&&current.getActiveObject();
if(active)return "";
}
var fallback=window.NaiCanvasView&&window.NaiCanvasView.lastPageId;
if(!fallback)return "";
var factory=window.NaiComicExtraRendererFactory;
if(factory&&typeof factory.pageObjects==="function"&&factory.pageObjects(current,fallback).length)return fallback;
return "";
}

function hintNeedSelection(message){
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.flashHelp==="function"){
window.NaiBeginnerGuide.flashHelp(message||"先点选画布上的模拟器或图层。");
}
}

function reselectPage(current,pageId){
var factory=window.NaiComicExtraRendererFactory;
if(current&&pageId&&factory&&typeof factory.selectPage==="function")factory.selectPage(current,pageId);
}

function scaleOneObject(obj,factor){
if(!obj||typeof obj.set!=="function")return;
var box=typeof obj.getBoundingRect==="function"?obj.getBoundingRect(true,true):null;
var ox=box?box.left+box.width/2:(Number(obj.left)||0);
var oy=box?box.top+box.height/2:(Number(obj.top)||0);
var left=Number(obj.left)||0;
var top=Number(obj.top)||0;
obj.set({
left:ox+(left-ox)*factor,
top:oy+(top-oy)*factor,
scaleX:(Number(obj.scaleX)||1)*factor,
scaleY:(Number(obj.scaleY)||1)*factor
});
if(typeof obj.setCoords==="function")obj.setCoords();
}

function scaleSelected(factor,allowFallback){
var current=currentCanvas();
if(!current)return false;
rememberActiveContext(current);
var factory=window.NaiComicExtraRendererFactory;
var pageId=resolveScalePageId(current,allowFallback===true);
if(typeof changeDoNotSaveHistory==="function")changeDoNotSaveHistory();
var ok=false;
if(pageId&&factory&&typeof factory.scalePage==="function"){
ok=factory.scalePage(current,pageId,factor);
if(ok)reselectPage(current,pageId);
}else{
var object=current.getActiveObject&&current.getActiveObject();
if(object&&object.type==="activeSelection"&&typeof object.getObjects==="function"){
object.getObjects().forEach(function(item){scaleOneObject(item,factor);});
ok=true;
}else if(object){
scaleOneObject(object,factor);
ok=true;
}
if(ok){
if(typeof current.requestRenderAll==="function")current.requestRenderAll();
else current.renderAll();
}
}
if(typeof changeDoSaveHistory==="function")changeDoSaveHistory();
if(ok&&typeof saveStateByManual==="function")saveStateByManual();
if(!ok)hintNeedSelection("先点选画布上的模拟器或图层，再放大缩小。");
return ok;
}

function isMangaPanel(item){
return !!(item&&item.isPanel&&!item.simulatorPageId&&item.simulatorRole!=="panel");
}

function panelBox(item){
if(!item)return null;
if(typeof item.getBoundingRect==="function")return item.getBoundingRect(true,true);
return null;
}

function resolveFitPanel(current,pageId){
var active=current.getActiveObject&&current.getActiveObject();
if(isMangaPanel(active))return active;
if(active&&active.type==="activeSelection"&&typeof active.getObjects==="function"){
var selectedPanel=null;
active.getObjects().some(function(item){
if(isMangaPanel(item)){selectedPanel=item;return true;}
return false;
});
if(selectedPanel)return selectedPanel;
}
var remembered=window.NaiCanvasView&&window.NaiCanvasView.lastPanel;
if(remembered&&typeof current.getObjects==="function"&&current.getObjects().indexOf(remembered)>=0&&isMangaPanel(remembered))return remembered;
return nearestMangaPanel(current,pageId);
}

function nearestMangaPanel(current,pageId){
var objects=typeof current.getObjects==="function"?current.getObjects():[];
var panels=objects.filter(isMangaPanel);
if(!panels.length)return null;
var factory=window.NaiComicExtraRendererFactory;
var bounds=pageId&&factory&&typeof factory.pageBounds==="function"?factory.pageBounds(current,pageId):null;
if(!bounds)return panels[0];
var cx=bounds.left+bounds.width/2;
var cy=bounds.top+bounds.height/2;
var best=null;
var bestScore=Infinity;
panels.forEach(function(panel){
var box=panelBox(panel);
if(!box)return;
var contained=cx>=box.left&&cx<=box.left+box.width&&cy>=box.top&&cy<=box.top+box.height;
var dx=(box.left+box.width/2)-cx;
var dy=(box.top+box.height/2)-cy;
var score=(dx*dx+dy*dy)+(contained?0:100000000);
if(score<bestScore){bestScore=score;best=panel;}
});
return best||panels[0];
}

function fitRectForPage(current,pageId){
var target=resolveFitPanel(current,pageId);
if(target){
var box=panelBox(target);
if(box&&box.width&&box.height){
var pad=Math.min(8,box.width*0.04,box.height*0.04);
return {left:box.left+pad,top:box.top+pad,width:Math.max(8,box.width-pad*2),height:Math.max(8,box.height-pad*2)};
}
}
return {left:40,top:40,width:Math.max(80,(Number(current.width)||1000)-80),height:Math.max(80,(Number(current.height)||1000)-80)};
}

function moveObjectToRect(object,rect,box){
if(!object||!rect||!box)return;
object.set({
left:(Number(object.left)||0)+(rect.left-box.left),
top:(Number(object.top)||0)+(rect.top-box.top)
});
if(typeof object.setCoords==="function")object.setCoords();
}

function fitSelected(){
var current=currentCanvas();
if(!current)return false;
rememberActiveContext(current);
var factory=window.NaiComicExtraRendererFactory;
var pageId=resolveScalePageId(current,true);
if(typeof changeDoNotSaveHistory==="function")changeDoNotSaveHistory();
var ok=false;
if(pageId&&factory&&typeof factory.fitPageToRect==="function"){
ok=factory.fitPageToRect(current,pageId,fitRectForPage(current,pageId));
if(ok)reselectPage(current,pageId);
}else{
var object=current.getActiveObject&&current.getActiveObject();
if(object){
var box=typeof object.getBoundingRect==="function"?object.getBoundingRect(true,true):null;
var rect=fitRectForPage(current,"");
if(box&&box.width&&box.height){
scaleOneObject(object,Math.min(rect.width/box.width,rect.height/box.height));
var next=typeof object.getBoundingRect==="function"?object.getBoundingRect(true,true):null;
if(next)moveObjectToRect(object,rect,next);
else object.set({left:rect.left,top:rect.top});
if(typeof object.setCoords==="function")object.setCoords();
ok=true;
if(typeof current.requestRenderAll==="function")current.requestRenderAll();
else current.renderAll();
}
}
}
if(typeof changeDoSaveHistory==="function")changeDoSaveHistory();
if(ok&&typeof saveStateByManual==="function")saveStateByManual();
if(!ok)hintNeedSelection("先点选画布上的模拟器，再贴合分镜。");
return ok;
}

function bindCanvasViewControls(){
var parent=getCanvasViewParent();
var host=$("canvas-area")||parent;
if(host&&host.getAttribute("data-nai-zoom-bound")!=="1"){
host.setAttribute("data-nai-zoom-bound","1");
host.addEventListener("wheel",function(event){
if(!(event.ctrlKey||event.metaKey))return;
if(event.target&&event.target.closest&&event.target.closest(".sim-studio-overlay,input,textarea,select"))return;
event.preventDefault();
if(event.altKey){
scaleSelected(event.deltaY<0?1.08:1/1.08);
return;
}
zoomBy(event.deltaY<0?0.12:-0.12,event);
},{passive:false});
}
if(document.documentElement.getAttribute("data-nai-zoom-doc")!=="1"){
document.documentElement.setAttribute("data-nai-zoom-doc","1");
document.addEventListener("wheel",function(event){
if(!(event.ctrlKey||event.metaKey))return;
if(!event.target||!event.target.closest||!event.target.closest(".sim-studio-overlay"))return;
event.preventDefault();
},{passive:false,capture:true});
}
var current=currentCanvas();
if(current&&typeof current.on==="function"&&current.__naiScaleBound!==true){
current.__naiScaleBound=true;
current.on("selection:created",function(){rememberActiveContext(current);});
current.on("selection:updated",function(){rememberActiveContext(current);});
}
function onClick(id,handler){
var node=$(id);
if(!node||node.getAttribute("data-bound")==="1")return;
node.setAttribute("data-bound","1");
node.addEventListener("click",handler);
}
onClick("naiZoomInBtn",function(){zoomIn();});
onClick("naiZoomOutBtn",function(){zoomOut();});
onClick("naiZoomFitBtn",function(){zoomFit();});
onClick("naiObjectBiggerBtn",function(){scaleSelected(1.12);});
onClick("naiObjectSmallerBtn",function(){scaleSelected(1/1.12);});
onClick("naiObjectFitBtn",function(){fitSelected();});
updateZoomLabel();
}

document.addEventListener("DOMContentLoaded",bindCanvasViewControls);

window.NaiCanvasView={
zoomIn:zoomIn,
zoomOut:zoomOut,
zoomFit:zoomFit,
zoomBy:zoomBy,
scaleSelected:scaleSelected,
fitSelected:fitSelected,
zoomPercent:zoomPercent,
updateZoomLabel:updateZoomLabel,
lastPageId:"",
lastPanel:null
};

function inputImageFile() {
$('imageInput').click();
}

document.addEventListener('DOMContentLoaded',function() {
$('imageInput').addEventListener('change',function(e) {
var files=e.target.files;
for (var i=0;i<files.length;i++) {
(function(file) {
var reader=new FileReader();
reader.onload=function(f) {
var data=f.target.result;
fabric.Image.fromURL(data,function(img) {

if (stateStack.length>2) {
canvasLogger.debug("imageInput stateStack.length > 2");
var scaleFactor=Math.min(canvas.width/img.width,canvas.height/img.height);
img.scale(scaleFactor);
canvas.add(img);
canvas.renderAll();
}else{
canvasLogger.debug("imageInput resizeCanvasByNum ");
addInitialImageToCanvas(img);
}
});
};
reader.readAsDataURL(file);
})(files[i]);
}
});
});



function changeView(elementId,isVisible) {
var element=$(elementId);
if (isVisible) {
element.style.display="block";
} else {
element.style.display="none";
}
adjustCanvasSize(true);
}
