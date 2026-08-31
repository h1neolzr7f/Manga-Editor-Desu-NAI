
async function loadBookSize(width,height,addPanel,newPage=false) {
panelLogger.info("[loadBookSize] START w="+width+" h="+height+" addPanel="+addPanel+" newPage="+newPage);
panelLogger.info("[loadBookSize] stateStack.length="+stateStack.length+" btmProjectsMap.size="+btmProjectsMap.size+" canvasGUID="+getCanvasGUID()+" objectCount="+getObjectCount());
const loading=OP_showLoading({
icon: 'process',step: '正在新建页面',substep: '准备',progress: 0
});
try{
var shouldSave=(addPanel||newPage)&&stateStack.length>=2;
panelLogger.info("[loadBookSize] shouldSave="+shouldSave+" (addPanel||newPage)="+(addPanel||newPage)+" stateStack.length>=2="+(stateStack.length>=2));
if (shouldSave) {
panelLogger.info("[loadBookSize] IF branch: saving current page to bottom bar");
OP_updateLoadingState(loading,{
icon: 'process',step: '正在新建页面',substep: '保存当前页',progress: 40
});

await btmSaveProjectFile().then(()=>{
panelLogger.info("[loadBookSize] btmSaveProjectFile done, calling setCanvasGUID. btmProjectsMap.size="+btmProjectsMap.size);
setCanvasGUID();
panelLogger.info("[loadBookSize] new canvasGUID="+getCanvasGUID());
});
OP_updateLoadingState(loading,{
icon: 'process',step: '正在新建页面',substep: '完成',progress: 90
});

changeDoNotSaveHistory();
resizeCanvasToObject(width,height);
if (addPanel) {
addSquareBySize(width,height);
} else {
initImageHistory();
saveState();
}
changeDoSaveHistory();
panelLogger.info("[loadBookSize] IF branch done. stateStack.length="+stateStack.length+" btmProjectsMap.size="+btmProjectsMap.size);
} else {
panelLogger.info("[loadBookSize] ELSE branch: NOT saving current page (stateStack too short or no user action)");
setCanvasGUID();
panelLogger.info("[loadBookSize] ELSE new canvasGUID="+getCanvasGUID());
changeDoNotSaveHistory();
resizeCanvasToObject(width,height);
if (addPanel) {
addSquareBySize(width,height);
} else {
initImageHistory();
saveState();
}
changeDoSaveHistory();
panelLogger.info("[loadBookSize] ELSE branch done. stateStack.length="+stateStack.length);
}
}finally{
OP_hideLoading(loading);
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.updateHud==='function')window.NaiBeginnerGuide.updateHud();
}

}

function addSquareBySize(width,height) {
panelLogger.info("[addSquareBySize] START w="+width+" h="+height+" stateStack.length="+stateStack.length+" canvasGUID="+getCanvasGUID());
initImageHistory();
saveState();
panelLogger.info("[addSquareBySize] after initImageHistory+saveState stateStack.length="+stateStack.length);

var strokeWidthScale=canvas.width/700;
var strokeWidth=2*strokeWidthScale;

var widthScale=canvas.width/width;
var heightScale=canvas.height/height;

var svgPaggingWidth=svgPagging*widthScale;
var svgPaggingHeight=svgPagging*heightScale;

var svgPaggingHalfWidth=svgPaggingWidth/2;
var svgPaggingHalfHeight=svgPaggingHeight/2;

var newWidth=width*widthScale-svgPaggingWidth-strokeWidth;
var newHeight=height*heightScale-svgPaggingHeight-strokeWidth;

// console.log("addSquareBySize height", height);
// console.log("addSquareBySize svgPaggingWidth", svgPaggingWidth);
// console.log("addSquareBySize svgPaggingHeight", svgPaggingHeight);
// console.log("addSquareBySize heightScale", heightScale);
// console.log("addSquareBySize newHeight", newHeight);

var square=new fabric.Polygon(
[
{x: 0,y: 0},
{x: newWidth,y: 0},
{x: newWidth,y: newHeight},
{x: 0,y: newHeight},
],
{
left: svgPaggingHalfWidth,
top: svgPaggingHalfHeight,
scaleX: 1,
scaleY: 1,
strokeWidth: strokeWidth,
strokeUniform: true,
stroke: "black",
objectCaching: false,
transparentCorners: false,
cornerColor: "Blue",
isPanel: true
}
);

setText2ImageInitPrompt(square);
setPanelValue(square);
canvas.add(square);

square.selectable=false;
updateLayerPanel();
}

function isPlaceholderCanvasObject(item){
if(!item)return true;
if(item.excludeFromLayerPanel)return true;
if(typeof initMessageText!=='undefined'&&item===initMessageText)return true;
var text=typeof item.text==='string'?item.text:'';
if(text==='拖放或生成图片')return true;
if(typeof getText==='function'&&text===getText('canvasInitMessage'))return true;
return false;
}

function dismissEmptyHintAfterUserPage(){
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.dismissEmptyHint==='function'){
window.NaiBeginnerGuide.dismissEmptyHint({fromCustomPage:true});
}
}

function ensurePanelForKnife(){
if(typeof getPanelObjectList!=='function'){
if(typeof createToastError==='function')createToastError('还没有格子','请先到「页面」点「自定义页面」或「竖页 A4」，再切割格子。');
return false;
}
if(getPanelObjectList().length)return true;
if(typeof canvas==='undefined'||!canvas||typeof canvas.getObjects!=='function'||typeof addSquareBySize!=='function'){
if(typeof createToastError==='function')createToastError('还没有格子','请先到「页面」点「自定义页面」或「竖页 A4」，再切割格子。');
return false;
}
var hasContent=canvas.getObjects().some(function(item){return !isPlaceholderCanvasObject(item);});
if(hasContent){
if(typeof createToastError==='function')createToastError('还没有格子','切割格子需要整页分镜框。请到「页面」点「自定义页面」或「竖页 A4」，或点左侧「模板」选分镜。');
return false;
}
addSquareBySize(canvas.getWidth(),canvas.getHeight());
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.flashHelp==='function'){
window.NaiBeginnerGuide.flashHelp('已铺满整页格子。在格子上画线即可切开。');
}
return true;
}

document.addEventListener('DOMContentLoaded',function () {

$("CustomPanelButton").addEventListener("click",function () {
var x=$("customPanelSizeX").value;
var y=$("customPanelSizeY").value;
loadBookSize(x,y,true).then(dismissEmptyHintAfterUserPage);
canvas.renderAll();
adjustCanvasSize();
});
$on($("page-portrait"),"click",function(){loadBookSize(210,297,true).then(dismissEmptyHintAfterUserPage);});
$on($("page-landscape"),"click",function(){loadBookSize(297,210,true).then(dismissEmptyHintAfterUserPage);});
});

// 灵活生成尺寸控制（严格NSFW PM：让每页分镜尺寸灵活，不死板，适配原故事预设 + 日漫多样分镜）
function applyFlexGenSizeToPanels(targetW,targetH) {
if (typeof getPanelObjectList!=='function') {
createToastError('灵活尺寸','未找到分镜列表接口',2000);
return;
}
var panels=getPanelObjectList()||[];
if (!panels.length) {
createToastError('灵活尺寸','当前页没有分镜，先点「页面」建自定义页面并切割格子，或套用模板。',3000);
return;
}
var w=parseInt(targetW,10)||1024;
var h=parseInt(targetH,10)||1024;
var pixelBudget=Math.max(64*64,Math.min(1536*1536,w*h));
var applied=0;
panels.forEach(function(p) {
if (p&&p.isPanel) {
var bounds=p.getBoundingRect?p.getBoundingRect(true):null;
var panelW=bounds?bounds.width:(p.width||w)*(p.scaleX||1);
var panelH=bounds?bounds.height:(p.height||h)*(p.scaleY||1);
var aspect=panelW&&panelH?panelW/panelH:w/h;
if(!isFinite(aspect)||aspect<=0)aspect=1;
var nextH=Math.sqrt(pixelBudget/aspect);
var nextW=nextH*aspect;
nextW=Math.max(64,Math.min(1536,Math.round(nextW/64)*64));
nextH=Math.max(64,Math.min(1536,Math.round(nextH/64)*64));
while(nextW*nextH>pixelBudget&&nextW*nextH>64*64){
if(nextW/Math.max(1,nextH)>aspect&&nextW>64)nextW-=64;
else if(nextH>64)nextH-=64;
else break;
}
p.text2img_width=nextW;
p.text2img_height=nextH;
applied++;
}
});
if (typeof updateLayerPanel==='function') updateLayerPanel();
createToast('灵活尺寸','已按每个分镜比例应用 '+w+'x'+h+' 的像素预算，共 '+applied+' 格。',3000);
}

function resetFlexGenSizeForPanels() {
if (typeof getPanelObjectList!=='function') return;
var panels=getPanelObjectList()||[];
var reset=0;
panels.forEach(function(p) {
if (p) {
delete p.text2img_width;
delete p.text2img_height;
reset++;
}
});
if (typeof updateLayerPanel==='function') updateLayerPanel();
createToast('灵活尺寸','已重置 '+reset+' 个分镜为跟随画布/面板实际尺寸',2000);
}

document.addEventListener('DOMContentLoaded',function() {
var applyBtn=$('applyFlexGenSizeBtn');
if (applyBtn) {
applyBtn.addEventListener('click',function() {
var w=$('flexGenW') ? $('flexGenW').value : 1024;
var h=$('flexGenH') ? $('flexGenH').value : 1024;
applyFlexGenSizeToPanels(w,h);
});
}
var resetBtn=$('resetFlexGenSizeBtn');
if (resetBtn) {
resetBtn.addEventListener('click',function() {
resetFlexGenSizeForPanels();
});
}
// 可选：当切换页时可同步显示当前选中分镜的尺寸（简化版，依赖updateLayerPanel扩展）
});

if(typeof window!=='undefined'){
window.applyFlexGenSizeToPanels=applyFlexGenSizeToPanels;
window.resetFlexGenSizeForPanels=resetFlexGenSizeForPanels;
}



function addArRect() {
var width=parseFloat($("ar_width").value);
var height=parseFloat($("ar_height").value);

if (isNaN(width)||isNaN(height)||width<=0||height<=0) {
return;
}
var canvasWidth=canvas.getWidth();
var canvasHeight=canvas.getHeight();
var canvasSize=Math.min(canvasWidth,canvasHeight)*0.25;
var aspectRatio=width/height;
if (width>height) {
width=canvasSize;
height=canvasSize/aspectRatio;
} else {
height=canvasSize;
width=canvasSize*aspectRatio;
}
var points=[
{x: 0,y: 0},
{x: width,y: 0},
{x: width,y: height},
{x: 0,y: height},
];
addShape(points);
}

function addShape(points,options={}) {
var canvasWidth=canvas.width;
var canvasHeight=canvas.height;

var minX=Math.min(...points.map((p)=>p.x));
var maxX=Math.max(...points.map((p)=>p.x));
var minY=Math.min(...points.map((p)=>p.y));
var maxY=Math.max(...points.map((p)=>p.y));

var shapeWidth=maxX-minX;
var shapeHeight=maxY-minY;

var scaleX=canvasWidth/3/shapeWidth;
var scaleY=canvasHeight/3/shapeHeight;
var scale=Math.min(scaleX,scaleY);

options.strokeWidth=2*(canvas.width/700);
options.strokeUniform=true;
options.stroke=options.stroke||"black";
options.objectCaching=false;
options.transparentCorners=false;
options.isPanel=true;
options.left=options.left||50;
options.top=options.top||50;
if(options.scaleX===undefined)options.scaleX=scale;
if(options.scaleY===undefined)options.scaleY=scale;

var shape=new fabric.Polygon(points,options);
setText2ImageInitPrompt(shape);
canvas.add(shape);
canvas.setActiveObject(shape);
setPanelValue(shape);
updateLayerPanel();
}

function addSquare() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('square');
return;
}
var points=[
{x: 0,y: 0},
{x: 200,y: 0},
{x: 200,y: 200},
{x: 0,y: 200},
];
addShape(points);
}

function addPentagon() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('pentagon');
return;
}
var side=150;
var angle=54;
var points=[];
for (var i=0;i<5;i++) {
var x=side*Math.cos((Math.PI/180)*(angle+i*72));
var y=side*Math.sin((Math.PI/180)*(angle+i*72));
points.push({x: x,y: y});
}
addShape(points);
}

function addTallRect() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('tall');
return;
}
var points=[
{x: 0,y: 0},
{x: 100,y: 0},
{x: 100,y: 400},
{x: 0,y: 400},
];
addShape(points);
}

function addTallTrap() {
var points=[
{x: 50,y: 0},
{x: 150,y: 0},
{x: 100,y: 400},
{x: 0,y: 400},
];
addShape(points);
}

function addWideRect() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('wide');
return;
}
var points=[
{x: 0,y: 0},
{x: 400,y: 0},
{x: 400,y: 100},
{x: 0,y: 100},
];
addShape(points);
}

function addWideTrap() {
var points=[
{x: 0,y: 0},
{x: 400,y: 0},
{x: 350,y: 100},
{x: 50,y: 100},
];
addShape(points);
}

function addTrapezoid() {
var points=[
{x: 50,y: 0},
{x: 200,y: 0},
{x: 150,y: 100},
{x: 0,y: 100},
];
addShape(points);
}

function addTriangle() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('triangle');
return;
}
var points=[
{x: 100,y: 0},
{x: 200,y: 200},
{x: 0,y: 200},
];
addShape(points);
}

function addCircle() {
var circle=new fabric.Circle({
radius: 100,
left: 50,
top: 50,
strokeWidth: (canvas.width/700)*2,
strokeUniform: true,
stroke: "black",
objectCaching: false,
transparentCorners: false,
cornerColor: "Blue",
isPanel: true,
});
setText2ImageInitPrompt(circle);
setPanelValue(circle);
canvas.add(circle);
updateLayerPanel();
}

function addHexagon() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('hexagon');
return;
}
var side=100;
var points=[];
for (var i=0;i<6;i++) {
var x=side*Math.cos((Math.PI/180)*(60*i));
var y=side*Math.sin((Math.PI/180)*(60*i));
points.push({x: x,y: y});
}
addShape(points);
}

function addEllipse() {
var ellipse=new fabric.Ellipse({
rx: 100,
ry: 50,
left: 50,
top: 50,
strokeWidth: (canvas.width/700)*2,
strokeUniform: true,
stroke: "black",
objectCaching: false,
transparentCorners: false,
cornerColor: "Blue",
isPanel: true,
});
setText2ImageInitPrompt(ellipse);
setPanelValue(ellipse);
canvas.add(ellipse);
updateLayerPanel();
}

function addRhombus() {
var points=[
{x: 0,y: 100},
{x: 100,y: 0},
{x: 200,y: 100},
{x: 100,y: 200},
];
addShape(points);
}

function addStar() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('star');
return;
}
var points=[];
var outerRadius=100;
var innerRadius=50;
for (var i=0;i<10;i++) {
var radius=i%2===0 ? outerRadius : innerRadius;
var angle=(Math.PI/5)*i;
points.push({
x: radius*Math.sin(angle),
y:-radius*Math.cos(angle),
});
}
addShape(points);
}

function addHeart() {
if(window.NaiPsTools&&typeof window.NaiPsTools.beginShape==='function'){
window.NaiPsTools.beginShape('heart');
return;
}
var points=[];
var numPoints=30;
for (var i=0;i<numPoints;i++) {
var t=(2*Math.PI/numPoints)*i;
var x=16*Math.pow(Math.sin(t),3);
var y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));
points.push({x:x*10,y:y*10});
}
addShape(points);
}




function addSmartphone() {
const canvasWidth=canvas.width;
const canvasHeight=canvas.height;

const originalWidth=300;
const originalHeight=600;

const scale=canvasInScale(originalWidth,originalHeight);

const frame=new fabric.Rect({
width: originalWidth,
height: originalHeight,
rx: 30,
ry: 30,
fill: '#333333',
stroke: '#222222',
strokeWidth: 2
});

const screen=new fabric.Rect({
width: originalWidth-20,
height: originalHeight-100,// 画面の高さを調整
fill: '#000000',
left: 10,
top: 40
});

const homeButtonOuter=new fabric.Circle({
radius: 25,
fill: 'transparent',
stroke: '#FFFFFF',
strokeWidth: 2,
left: originalWidth/2-25,
top: originalHeight-55  // 位置を調整
});

const homeButtonInner=new fabric.Circle({
radius: 23,
fill: 'rgba(100, 100, 100, 0.5)',
left: originalWidth/2-23,
top: originalHeight-53  // 外側の円に合わせて調整
});

const camera=new fabric.Circle({
radius: 5,
fill: '#666666',
left: originalWidth/2-5,
top: 20
});

const speaker=new fabric.Rect({
width: 50,
height: 5,
rx: 2,
ry: 2,
fill: '#666666',
left: originalWidth/2-25,
top: 10
});

const smartphone=new fabric.Group([
frame,screen,homeButtonOuter,homeButtonInner,camera,speaker
],{
left: (canvasWidth-originalWidth*scale)/2,
top: (canvasHeight-originalHeight*scale)/2,
scaleX: scale,
scaleY: scale
});

canvas.add(smartphone);
}

function addOctagon() {
var side=100;
var points=[];
for (var i=0;i<8;i++) {
var x=side*Math.cos((Math.PI/180)*(45*i));
var y=side*Math.sin((Math.PI/180)*(45*i));
points.push({x: x,y: y});
}
addShape(points);
}

function addTallRightLeaningTrapezoid() {
var points=[
{x: 0,y: 0},
{x: 100,y: 50},
{x: 100,y: 300},
{x: 0,y: 300},
];
addShape(points);
}

function addRightSlantingTrapezoid() {
var points=[
{x: 0,y: 0},
{x: 300,y: 0},
{x: 350,y: 100},
{x: 0,y: 100},
];
addShape(points);
}
