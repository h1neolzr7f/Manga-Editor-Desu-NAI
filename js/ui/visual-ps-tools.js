(function(root){
"use strict";

var TOOL={
MOVE:'move',
MARQUEE:'marquee',
CROP:'crop',
LASSO:'lasso',
BRUSH:'brush',
ERASER:'eraser',
KNIFE:'knife',
SHAPE:'shape',
GRADIENT:'gradient',
BUCKET:'bucket',
CLONE:'clone',
GUIDE:'guide'
};

var SHAPE_POINTS={
square:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],
tall:[{x:0,y:0},{x:0.45,y:0},{x:0.45,y:1},{x:0,y:1}],
wide:[{x:0,y:0},{x:1,y:0},{x:1,y:0.45},{x:0,y:0.45}],
triangle:[{x:0.5,y:0},{x:1,y:1},{x:0,y:1}],
pentagon:pentagonPoints(),
hexagon:hexagonPoints(),
star:starPoints(),
heart:[{x:0.5,y:1},{x:0,y:0.35},{x:0.18,y:0},{x:0.5,y:0.22},{x:0.82,y:0},{x:1,y:0.35}]
};

var current=TOOL.MOVE;
var shapeKind='square';
var drag=null;
var lassoPts=[];
var cloneOrigin=null;
var cloneOffset=null;
var preview=null;
var historyOpen=false;

function pentagonPoints(){
var pts=[],i;
for(i=0;i<5;i++){
var a=(-90+i*72)*Math.PI/180;
pts.push({x:0.5+0.5*Math.cos(a),y:0.5+0.5*Math.sin(a)});
}
return pts;
}
function hexagonPoints(){
var pts=[],i;
for(i=0;i<6;i++){
var a=(-90+i*60)*Math.PI/180;
pts.push({x:0.5+0.5*Math.cos(a),y:0.5+0.5*Math.sin(a)});
}
return pts;
}
function starPoints(){
var pts=[],i;
for(i=0;i<10;i++){
var a=(-90+i*36)*Math.PI/180;
var r=i%2===0?0.5:0.2;
pts.push({x:0.5+r*Math.cos(a),y:0.5+r*Math.sin(a)});
}
return pts;
}

function canvas(){
return root.canvas||(typeof window!=='undefined'?window.canvas:null);
}

function $(id){
return typeof document!=='undefined'?document.getElementById(id):null;
}

function toast(title,body){
if(typeof createToast==='function')createToast(title,body||'',2800);
}

function toastErr(title,body){
if(typeof createToastError==='function')createToastError(title,body||'',3200);
}

function toolName(){
return({
move:'移动',marquee:'框选图层',crop:'裁剪',lasso:'套索',brush:'笔刷',eraser:'橡皮',
knife:'切割',shape:'形状',gradient:'渐变',bucket:'油漆桶',clone:'仿制图章',guide:'参考线'
})[current]||current;
}

function setTool(name,extra){
var currentCanvas=canvas();
current=name||TOOL.MOVE;
root.naiPsTool=current;
if(extra)shapeKind=extra;
if(name!==TOOL.CROP&&typeof cropModeClear==='function')cropModeClear();
if(name!==TOOL.KNIFE&&typeof knifeModeClear==='function')knifeModeClear();
if(name!==TOOL.BRUSH&&name!==TOOL.ERASER&&currentCanvas){
if(name!==TOOL.CLONE)currentCanvas.isDrawingMode=false;
}
if(currentCanvas){
currentCanvas.selection=name===TOOL.MOVE||name===TOOL.MARQUEE;
currentCanvas.selectionColor='rgba(56,189,248,0.18)';
currentCanvas.selectionBorderColor='#38bdf8';
currentCanvas.skipTargetFind=name===TOOL.SHAPE||name===TOOL.GRADIENT||name===TOOL.LASSO||name===TOOL.GUIDE;
}
dropPreview();
lassoPts=[];
if(name!==TOOL.CLONE){cloneOrigin=null;cloneOffset=null;}
if(window.NaiBeginnerGuide&&window.NaiBeginnerGuide.updateHud)window.NaiBeginnerGuide.updateHud();
if(window.NaiVisualStudio&&window.NaiVisualStudio.refresh)window.NaiVisualStudio.refresh();
syncSidebar();
}

function syncSidebar(){
document.querySelectorAll('#sidebar .icon-wrapper[data-ps-tool]').forEach(function(wrap){
wrap.classList.toggle('is-brush-active',wrap.getAttribute('data-ps-tool')===current);
});
}

function selectMove(){
setTool(TOOL.MOVE);
if(typeof selectMoveTool==='function')selectMoveTool();
}

function selectObjectMarquee(){
if(typeof selectMoveTool==='function')selectMoveTool();
setTool(TOOL.MARQUEE);
var currentCanvas=canvas();
if(currentCanvas){
currentCanvas.selection=true;
currentCanvas.discardActiveObject();
currentCanvas.renderAll();
}
toast('框选图层','在空白处拖出方框，框到的图层会被选中。裁剪请按 C。');
}

function selectCrop(cutoutAfter){
setTool(TOOL.CROP);
if(typeof selectMarqueeTool==='function')selectMarqueeTool(!!cutoutAfter);
}

function selectKnife(){
if(typeof isKnifeMode!=='undefined'&&isKnifeMode){
if(typeof knifeModeClear==='function')knifeModeClear();
setTool(TOOL.MOVE);
return;
}
if(typeof selectMoveTool==='function')selectMoveTool();
setTool(TOOL.KNIFE);
if(typeof ModeManager!=='undefined'&&ModeManager.knife)ModeManager.knife.enable();
toast('切割格子','在分镜格子上画一条线切开。Esc 退出。');
}

function beginShape(kind){
shapeKind=kind||'square';
if(typeof selectMoveTool==='function')selectMoveTool();
setTool(TOOL.SHAPE,shapeKind);
toast('形状','在画布上拖出大小。点一下不拖则放默认大小。');
if(typeof toggleVisibility==='function'){
var panel=$('shape-area');
if(panel&&panel.style.display!=='block')toggleVisibility('shape-area');
}
}

function dropPreview(){
var currentCanvas=canvas();
if(preview&&currentCanvas){
try{currentCanvas.remove(preview);}catch(e){}
}
preview=null;
}

function pointer(event){
var currentCanvas=canvas();
if(!currentCanvas)return{x:0,y:0};
if(event&&event.pointer)return event.pointer;
if(event&&event.e&&typeof currentCanvas.getPointer==='function')return currentCanvas.getPointer(event.e);
return{x:0,y:0};
}

function colorOf(id,fallback){
var el=$(id);
return el&&el.value?el.value:(fallback||'#000000');
}

function rgbaOf(id,alpha){
var hex=colorOf(id,'#000000').replace('#','');
if(hex.length===3)hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
var r=parseInt(hex.slice(0,2),16)||0;
var g=parseInt(hex.slice(2,4),16)||0;
var b=parseInt(hex.slice(4,6),16)||0;
return 'rgba('+r+','+g+','+b+','+(alpha===undefined?1:alpha)+')';
}

function placeShape(kind,left,top,w,h){
w=Math.max(24,w);
h=Math.max(24,h);
var unit=SHAPE_POINTS[kind]||SHAPE_POINTS.square;
var points=unit.map(function(p){return{x:p.x*w,y:p.y*h};});
if(typeof addShape==='function'){
addShape(points,{left:left,top:top,scaleX:1,scaleY:1});
return;
}
var currentCanvas=canvas();
if(!currentCanvas||!root.fabric)return;
var shape=new root.fabric.Polygon(points,{
left:left,top:top,stroke:'#111827',strokeWidth:2,fill:'rgba(255,255,255,0)',
isPanel:true,objectCaching:false,strokeUniform:true
});
currentCanvas.add(shape);
currentCanvas.setActiveObject(shape);
currentCanvas.renderAll();
}

function placeGradient(x1,y1,x2,y2){
var currentCanvas=canvas();
if(!currentCanvas||!root.fabric)return;
var left=Math.min(x1,x2),top=Math.min(y1,y2);
var w=Math.max(8,Math.abs(x2-x1)),h=Math.max(8,Math.abs(y2-y1));
var rect=new root.fabric.Rect({
left:left,top:top,width:w,height:h,objectCaching:false,selectable:true,name:'渐变'
});
rect.set('fill',new root.fabric.Gradient({
type:'linear',
coords:{x1:0,y1:0,x2:w,y2:h},
colorStops:[
{offset:0,color:rgbaOf('naiPropFill',1)},
{offset:1,color:rgbaOf('naiPropStroke',1)}
]
}));
currentCanvas.add(rect);
currentCanvas.setActiveObject(rect);
if(typeof saveStateByManual==='function')saveStateByManual();
currentCanvas.renderAll();
}

function addGuide(x,y,vertical){
var currentCanvas=canvas();
if(!currentCanvas||!root.fabric)return;
var line=vertical
?new root.fabric.Line([x,0,x,currentCanvas.getHeight()],{stroke:'#38bdf8',strokeWidth:1,selectable:true,evented:true})
:new root.fabric.Line([0,y,currentCanvas.getWidth(),y],{stroke:'#38bdf8',strokeWidth:1,selectable:true,evented:true});
line.excludeFromLayerPanel=true;
line.naiGuide=true;
line.selectable=true;
line.hasControls=false;
line.lockRotation=true;
if(vertical){line.lockMovementY=true;line.lockMovementX=false;}
else{line.lockMovementX=true;line.lockMovementY=false;}
currentCanvas.add(line);
currentCanvas.setActiveObject(line);
currentCanvas.renderAll();
}

function activeImage(){
var currentCanvas=canvas();
var obj=currentCanvas&&currentCanvas.getActiveObject&&currentCanvas.getActiveObject();
if(obj&&obj.type==='activeSelection'){
var found=null;
obj.forEachObject(function(item){if(!found&&item.type==='image')found=item;});
return found;
}
if(obj&&obj.type==='image')return obj;
return null;
}

function imageCanvas(image){
var el=(image&&typeof image.getElement==='function'&&image.getElement())||(image&&image._element);
if(!el)return null;
var c=document.createElement('canvas');
c.width=el.naturalWidth||el.width||1;
c.height=el.naturalHeight||el.height||1;
c.getContext('2d').drawImage(el,0,0,c.width,c.height);
return c;
}

function replaceImageFromCanvas(image,tmp){
var currentCanvas=canvas();
if(!currentCanvas||!root.fabric)return;
root.fabric.Image.fromURL(tmp.toDataURL('image/png'),function(next){
if(!next)return;
next.set({
left:image.left,top:image.top,angle:image.angle||0,flipX:!!image.flipX,flipY:!!image.flipY,
opacity:image.opacity===undefined?1:image.opacity,originX:image.originX,originY:image.originY,
scaleX:(image.width*(image.scaleX||1))/(next.width||1),
scaleY:(image.height*(image.scaleY||1))/(next.height||1)
});
if(image.guid)next.guid=image.guid;
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
currentCanvas.remove(image);
currentCanvas.add(next);
currentCanvas.setActiveObject(next);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
if(typeof saveStateByManual==='function')saveStateByManual();
if(typeof updateLayerPanel==='function')updateLayerPanel();
currentCanvas.renderAll();
});
}

function localToImage(image,pt){
var dispW=Math.max(1,(image.width||1)*(image.scaleX||1));
var dispH=Math.max(1,(image.height||1)*(image.scaleY||1));
var el=(image.getElement&&image.getElement())||image._element;
var natW=el?(el.naturalWidth||el.width||dispW):dispW;
var natH=el?(el.naturalHeight||el.height||dispH):dispH;
return{
x:((pt.x-(image.left||0))/dispW)*natW,
y:((pt.y-(image.top||0))/dispH)*natH
};
}

function floodFill(image,pt,hex){
var tmp=imageCanvas(image);
if(!tmp){toastErr('油漆桶','请先选中一张图片。');return;}
var ctx=tmp.getContext('2d');
var data=ctx.getImageData(0,0,tmp.width,tmp.height);
var loc=localToImage(image,pt);
var x=Math.round(loc.x),y=Math.round(loc.y);
if(x<0||y<0||x>=tmp.width||y>=tmp.height){toastErr('油漆桶','请点在图片里面。');return;}
hex=String(hex||'#ff0000').replace('#','');
if(hex.length===3)hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
var nr=parseInt(hex.slice(0,2),16),ng=parseInt(hex.slice(2,4),16),nb=parseInt(hex.slice(4,6),16);
var px=data.data;
var idx=(y*tmp.width+x)*4;
var sr=px[idx],sg=px[idx+1],sb=px[idx+2],sa=px[idx+3];
if(sr===nr&&sg===ng&&sb===nb)return;
var stack=[{x:x,y:y}],seen={},tol=36,max=tmp.width*tmp.height;
var n=0;
function same(i){
return Math.abs(px[i]-sr)+Math.abs(px[i+1]-sg)+Math.abs(px[i+2]-sb)+Math.abs(px[i+3]-sa)<tol*3;
}
while(stack.length&&n<max){
var p=stack.pop();
if(p.x<0||p.y<0||p.x>=tmp.width||p.y>=tmp.height)continue;
var key=p.y*tmp.width+p.x;
if(seen[key])continue;
var i=key*4;
if(!same(i))continue;
seen[key]=1;
px[i]=nr;px[i+1]=ng;px[i+2]=nb;px[i+3]=255;
stack.push({x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1});
n++;
}
ctx.putImageData(data,0,0);
replaceImageFromCanvas(image,tmp);
}

function cloneStampAt(image,pt,size){
if(!cloneOrigin){toast('仿制图章','先按住 Alt 在图上点一下，设取样点。');return;}
if(!cloneOffset)cloneOffset={x:pt.x-cloneOrigin.x,y:pt.y-cloneOrigin.y};
if(!drag||!drag.cloneCanvas){
var created=imageCanvas(image);
if(!created)return;
drag=drag||{kind:TOOL.CLONE,image:image};
drag.cloneCanvas=created;
var snap=document.createElement('canvas');
snap.width=created.width;
snap.height=created.height;
snap.getContext('2d').drawImage(created,0,0);
drag.cloneSource=snap;
}
var tmp=drag.cloneCanvas;
var ctx=tmp.getContext('2d');
var loc=localToImage(image,pt);
var src=localToImage(image,{x:pt.x-cloneOffset.x,y:pt.y-cloneOffset.y});
var r=Math.max(6,size||18);
try{
ctx.save();
ctx.beginPath();
ctx.arc(loc.x,loc.y,r,0,Math.PI*2);
ctx.clip();
ctx.drawImage(drag.cloneSource,loc.x-src.x,loc.y-src.y);
ctx.restore();
}catch(e){}
}

function lassoCopy(image,pts){
if(!image||!pts||pts.length<3||!root.fabric)return;
var xs=pts.map(function(p){return p.x;});
var ys=pts.map(function(p){return p.y;});
var left=Math.min.apply(null,xs),top=Math.min.apply(null,ys);
var poly=pts.map(function(p){return{x:p.x-left,y:p.y-top};});
var clip=new root.fabric.Polygon(poly,{left:0,top:0,absolutePositioned:false});
image.clone(function(cloned){
cloned.set({left:left,top:top,clipPath:clip,name:(image.name||'图片')+'（套索）'});
var currentCanvas=canvas();
currentCanvas.add(cloned);
currentCanvas.setActiveObject(cloned);
if(typeof saveStateByManual==='function')saveStateByManual();
currentCanvas.renderAll();
toast('套索','已复制选区为新图层。');
});
}

function onDown(event){
var currentCanvas=canvas();
if(!currentCanvas)return;
var pt=pointer(event);
if(currentCanvas.isDrawingMode){
var target=null;
try{target=currentCanvas.findTarget(event.e,false);}catch(e){}
currentCanvas.__naiBrushPick={x:pt.x,y:pt.y,t:Date.now(),target:target};
if(event.e&&(event.e.altKey||event.e.ctrlKey)&&target&&!target.excludeFromLayerPanel){
if(typeof selectMoveTool==='function')selectMoveTool();
setTool(TOOL.MOVE);
currentCanvas.setActiveObject(target);
currentCanvas.renderAll();
if(event.e.preventDefault)event.e.preventDefault();
}
return;
}
if(current===TOOL.CLONE){
var image=activeImage();
if(event.e&&event.e.altKey&&image){
cloneOrigin={x:pt.x,y:pt.y};
cloneOffset=null;
toast('仿制图章','已取样。松开 Alt 后在图上拖着盖章。');
return;
}
if(image&&cloneOrigin){
drag={kind:TOOL.CLONE,image:image};
cloneStampAt(image,pt,18);
}
return;
}
if(current===TOOL.BUCKET){
var img=activeImage();
if(img)floodFill(img,pt,colorOf('naiPropFill','#ff4d4f'));
else toastErr('油漆桶','先点选一张图片，再点要填的颜色区域。');
return;
}
if(current===TOOL.GUIDE){
addGuide(pt.x,pt.y,!(event.e&&event.e.shiftKey));
return;
}
if(current===TOOL.LASSO){
lassoPts=[pt];
return;
}
if(current===TOOL.SHAPE||current===TOOL.GRADIENT){
drag={x:pt.x,y:pt.y,kind:current};
dropPreview();
}
}

function onMove(event){
var currentCanvas=canvas();
if(!currentCanvas)return;
var pt=pointer(event);
if(current===TOOL.CLONE&&event.e&&event.e.buttons&&activeImage()&&cloneOrigin&&!(event.e&&event.e.altKey)){
cloneStampAt(activeImage(),pt,18);
return;
}
if(current===TOOL.LASSO&&lassoPts.length){
lassoPts.push(pt);
return;
}
if(!drag)return;
var left=Math.min(drag.x,pt.x),top=Math.min(drag.y,pt.y);
var w=Math.max(1,Math.abs(pt.x-drag.x)),h=Math.max(1,Math.abs(pt.y-drag.y));
if(!root.fabric)return;
if(!preview){
preview=new root.fabric.Rect({
left:left,top:top,width:w,height:h,
fill:'rgba(56,189,248,0.12)',stroke:'#38bdf8',strokeDashArray:[6,4],
selectable:false,evented:false,excludeFromLayerPanel:true
});
currentCanvas.add(preview);
}else{
preview.set({left:left,top:top,width:w,height:h});
}
if(typeof currentCanvas.requestRenderAll==='function')currentCanvas.requestRenderAll();
else currentCanvas.renderAll();
}

function onUp(event){
var currentCanvas=canvas();
if(!currentCanvas)return;
var pt=pointer(event);
if(currentCanvas.isDrawingMode&&currentCanvas.__naiBrushPick){
var down=currentCanvas.__naiBrushPick;
currentCanvas.__naiBrushPick=null;
var dist=Math.hypot(pt.x-down.x,pt.y-down.y);
if(dist<5&&Date.now()-down.t<280&&down.target&&!down.target.excludeFromLayerPanel){
if(typeof selectMoveTool==='function')selectMoveTool();
setTool(TOOL.MOVE);
currentCanvas.setActiveObject(down.target);
currentCanvas.renderAll();
toast('已选中','点图层就会退出画笔。要继续画再按 B。');
}
return;
}
if(current===TOOL.CLONE&&drag&&drag.cloneCanvas&&drag.image){
replaceImageFromCanvas(drag.image,drag.cloneCanvas);
drag=null;
return;
}
if(current===TOOL.LASSO&&lassoPts.length>2){
var img=activeImage();
if(img)lassoCopy(img,lassoPts);
else toast('套索','请先选中一张图片，再圈选要复制的范围。');
lassoPts=[];
return;
}
if(!drag)return;
var w=Math.abs(pt.x-drag.x),h=Math.abs(pt.y-drag.y);
var left=Math.min(drag.x,pt.x),top=Math.min(drag.y,pt.y);
var kind=drag.kind;
drag=null;
dropPreview();
if(kind===TOOL.SHAPE){
if(w<8&&h<8){w=160;h=160;left=pt.x;top=pt.y;}
placeShape(shapeKind,left,top,w,h);
setTool(TOOL.MOVE);
}else if(kind===TOOL.GRADIENT){
if(w<8&&h<8){w=220;h=80;}
placeGradient(left,top,left+w,top+h);
setTool(TOOL.MOVE);
}
}

function confirmSpend(actionLabel){
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.generatePreflight==='function'){
if(!window.NaiBeginnerGuide.generatePreflight())return false;
}
return window.confirm('将用 NovelAI '+(actionLabel||'生成这一格')+'。会花积分，确定吗？');
}

function jumpHistory(index){
if(typeof jumpToHistoryIndex==='function')jumpToHistoryIndex(index);
}

function renderHistory(){
var box=$('naiHistoryList');
if(!box)return;
box.innerHTML='';
if(typeof stateStack==='undefined'){
box.textContent='还没有历史。';
return;
}
var i,cur=typeof currentStateIndex==='number'?currentStateIndex:-1;
for(i=stateStack.length-1;i>=0;i--){
var btn=document.createElement('button');
btn.type='button';
btn.className='nai-history-item'+(i===cur?' is-current':'');
btn.textContent=(i===0?'开始':('步骤 '+i))+(i===cur?'（当前）':'');
btn.setAttribute('data-history-index',String(i));
box.appendChild(btn);
}
}

function toggleHistory(){
var panel=$('naiHistoryPanel');
if(!panel)return;
historyOpen=!historyOpen;
panel.hidden=!historyOpen;
if(historyOpen)renderHistory();
}

function applyLayerStyle(style){
var currentCanvas=canvas();
var obj=currentCanvas&&currentCanvas.getActiveObject&&currentCanvas.getActiveObject();
if(!obj){toastErr('图层样式','请先选中一个图层。');return;}
if(style==='shadow'){
obj.set('shadow',new root.fabric.Shadow({color:'rgba(0,0,0,0.45)',blur:18,offsetX:6,offsetY:8}));
}else if(style==='glow'){
obj.set('shadow',new root.fabric.Shadow({color:'rgba(255,255,255,0.85)',blur:22,offsetX:0,offsetY:0}));
}else if(style==='stroke'){
obj.set({stroke:colorOf('naiPropStroke','#111827'),strokeWidth:Math.max(2,obj.strokeWidth||2)});
}else if(style==='clear'){
obj.set('shadow',null);
}
currentCanvas.renderAll();
if(typeof saveStateByManual==='function')saveStateByManual();
}

function bindCanvas(){
var currentCanvas=canvas();
if(!currentCanvas||typeof currentCanvas.on!=='function'||currentCanvas.__naiPsBound)return;
currentCanvas.__naiPsBound=true;
currentCanvas.on('mouse:down',onDown);
currentCanvas.on('mouse:move',onMove);
currentCanvas.on('mouse:up',onUp);
}

function bind(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-nai-ps')==='1')return;
document.documentElement.setAttribute('data-nai-ps','1');
var close=$('naiHistoryClose');
if(close)close.addEventListener('click',function(){historyOpen=false;var panel=$('naiHistoryPanel');if(panel)panel.hidden=true;});
bindCanvas();
var hist=$('naiHistoryList');
if(hist)hist.addEventListener('click',function(event){
var btn=event.target.closest('[data-history-index]');
if(!btn)return;
jumpHistory(parseInt(btn.getAttribute('data-history-index'),10));
renderHistory();
});
setTimeout(bindCanvas,800);
setTimeout(bindCanvas,1800);
}

root.NaiPsTools={
TOOL:TOOL,
setTool:setTool,
current:function(){return current;},
name:toolName,
selectMove:selectMove,
selectObjectMarquee:selectObjectMarquee,
selectCrop:selectCrop,
selectKnife:selectKnife,
beginShape:beginShape,
confirmSpend:confirmSpend,
toggleHistory:toggleHistory,
renderHistory:renderHistory,
applyLayerStyle:applyLayerStyle,
placeGradient:function(){setTool(TOOL.GRADIENT);toast('渐变','拖出一块矩形，从填充色过渡到描边色。');},
placeBucket:function(){setTool(TOOL.BUCKET);toast('油漆桶','先选中图片，再点要换色的区域。');},
placeClone:function(){setTool(TOOL.CLONE);toast('仿制图章','Alt+点击取样，再拖着盖到别处。');},
placeLasso:function(){setTool(TOOL.LASSO);toast('套索','选中图片后圈出范围，松开复制为新图层。');},
placeGuide:function(){setTool(TOOL.GUIDE);toast('参考线','点击画布放竖线，按住 Shift 放横线。');}
};

if(typeof document!=='undefined'){
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
}
})(typeof window!=='undefined'?window:globalThis);
