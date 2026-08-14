(function(root){
"use strict";

var PAPER_PRESETS=[
{id:'white',name:'白纸',tint:'#f7f4ee'},
{id:'aged',name:'旧纸',tint:'#e4d3b0'},
{id:'kraft',name:'牛皮纸',tint:'#c4a574'},
{id:'night',name:'夜色底',tint:'#1b2433'},
{id:'blueprint',name:'蓝图纸',tint:'#d7e4f2'},
{id:'halftone',name:'浅网点',tint:'#f3f1ea'},
{id:'newsprint',name:'新闻纸',tint:'#ece6d4'},
{id:'pink',name:'淡粉纸',tint:'#f6e4ea'},
{id:'mint',name:'薄荷纸',tint:'#dceee4'},
{id:'graphite',name:'石墨纸',tint:'#2a2e33'}
];

var EFFECT_PRESETS=[
{id:'rain',name:'下雨',density:420,angle:18,opacity:0.55,length:42,color:'rgba(180,200,220,0.7)'},
{id:'snow',name:'飘雪',density:280,angle:12,opacity:0.7,length:8,color:'rgba(255,255,255,0.9)'},
{id:'fog',name:'雾气',density:18,angle:0,opacity:0.35,length:120,color:'rgba(210,220,230,0.45)'},
{id:'speed',name:'速度线',density:90,angle:0,opacity:0.55,length:220,color:'rgba(15,23,42,0.55)'},
{id:'vignette',name:'暗角',density:1,angle:0,opacity:0.45,length:0,color:'rgba(0,0,0,0.65)'},
{id:'sparkle',name:'闪光',density:70,angle:0,opacity:0.8,length:10,color:'rgba(255,252,220,0.95)'},
{id:'heat',name:'热浪',density:22,angle:0,opacity:0.4,length:80,color:'rgba(248,180,120,0.45)'}
];

var BORDER_PRESETS=[
{id:'manga',name:'标准漫画框',stroke:'rgba(0,0,0,1)',strokeWidth:2,strokeDashArray:null},
{id:'thick',name:'粗框',stroke:'rgba(0,0,0,1)',strokeWidth:6,strokeDashArray:null},
{id:'thin',name:'细框',stroke:'rgba(0,0,0,1)',strokeWidth:0.8,strokeDashArray:null},
{id:'dashed',name:'虚线框',stroke:'rgba(0,0,0,1)',strokeWidth:2,strokeDashArray:[14,8]},
{id:'dotted',name:'点线框',stroke:'rgba(0,0,0,1)',strokeWidth:2.2,strokeDashArray:[2,7]},
{id:'double',name:'双线框',stroke:'rgba(0,0,0,1)',strokeWidth:3.2,strokeDashArray:null},
{id:'none',name:'无框',stroke:'rgba(0,0,0,0)',strokeWidth:0,strokeDashArray:null}
];

function currentCanvas(){
return root.canvas||(typeof canvas!=='undefined'?canvas:null);
}

function clamp(value,min,max,fallback){
var number=Number(value);
if(!isFinite(number))number=fallback;
return Math.max(min,Math.min(max,number));
}

function parseColor(color){
var value=String(color||'#000000');
var m=value.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)/);
if(m)return{r:parseInt(m[1],10),g:parseInt(m[2],10),b:parseInt(m[3],10),a:parseFloat(m[4])};
m=value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
if(m)return{r:parseInt(m[1],10),g:parseInt(m[2],10),b:parseInt(m[3],10),a:1};
m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
if(m)return{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16),a:1};
return{r:0,g:0,b:0,a:1};
}

function makeCanvas(width,height){
if(typeof document==='undefined'||!document.createElement)return null;
var el=document.createElement('canvas');
el.width=Math.max(8,Math.round(width||1000));
el.height=Math.max(8,Math.round(height||1400));
return el;
}

function hash(seed){
var x=Math.sin(seed)*10000;
return x-Math.floor(x);
}

function drawPaper(ctx,width,height,presetId){
var preset=PAPER_PRESETS.filter(function(item){return item.id===presetId;})[0]||PAPER_PRESETS[0];
var tint=parseColor(preset.tint);
var i,x,y;
ctx.fillStyle='rgb('+tint.r+','+tint.g+','+tint.b+')';
ctx.fillRect(0,0,width,height);
var i;
if(preset.id==='aged'||preset.id==='kraft'){
for(i=0;i<Math.floor(width*height/90);i++){
var n=hash(i*17.13);
ctx.fillStyle='rgba(80,50,20,'+(0.015+n*0.04)+')';
ctx.fillRect(hash(i*3.1)*width,hash(i*5.7)*height,1+n*2,1+n*2);
}
}
if(preset.id==='halftone'){
ctx.fillStyle='rgba(20,20,20,0.08)';
for(var y=6;y<height;y+=10){
for(var x=6;x<width;x+=10){
ctx.beginPath();
ctx.arc(x+(y/10)%2*4,y,1.1,0,Math.PI*2);
ctx.fill();
}
}
}
if(preset.id==='blueprint'){
ctx.strokeStyle='rgba(70,110,160,0.18)';
ctx.lineWidth=1;
for(x=0;x<width;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
for(y=0;y<height;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
}
if(preset.id==='night'){
var glow=ctx.createRadialGradient(width*0.5,height*0.15,40,width*0.5,height*0.4,Math.max(width,height));
glow.addColorStop(0,'rgba(80,110,160,0.28)');
glow.addColorStop(1,'rgba(8,12,20,0)');
ctx.fillStyle=glow;
ctx.fillRect(0,0,width,height);
}
if(preset.id==='newsprint'){
ctx.strokeStyle='rgba(80,70,50,0.08)';
ctx.lineWidth=1;
for(y=4;y<height;y+=5){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
}
if(preset.id==='graphite'){
for(i=0;i<Math.floor(width*height/70);i++){
var n=hash(i*11.7);
ctx.fillStyle='rgba(220,230,240,'+(0.02+n*0.05)+')';
ctx.fillRect(hash(i*2.4)*width,hash(i*6.1)*height,1+n*2,1+n*2);
}
}
}

function drawEffect(ctx,width,height,options){
var opt=normalizeEffect(options);
var i,x,y,len,rgb=parseColor(opt.color);
ctx.clearRect(0,0,width,height);
if(opt.id==='vignette'){
var vg=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*0.28,width/2,height/2,Math.max(width,height)*0.72);
vg.addColorStop(0,'rgba(0,0,0,0)');
vg.addColorStop(1,'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+opt.opacity+')');
ctx.fillStyle=vg;
ctx.fillRect(0,0,width,height);
return;
}
if(opt.id==='fog'){
for(i=0;i<opt.density;i++){
ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.08+hash(i)*0.18))+')';
ctx.beginPath();
ctx.ellipse(hash(i*1.7)*width,hash(i*4.2)*height,80+hash(i*2)*160,30+hash(i*3)*50,0,0,Math.PI*2);
ctx.fill();
}
return;
}
if(opt.id==='heat'){
for(i=0;i<opt.density;i++){
y=hash(i*3.3)*height;
ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.18+hash(i)*0.4))+')';
ctx.lineWidth=2+hash(i*2)*6;
ctx.beginPath();
ctx.moveTo(0,y);
for(x=0;x<=width;x+=24){
ctx.lineTo(x,y+Math.sin((x+i*18)/40)*12);
}
ctx.stroke();
}
return;
}
ctx.save();
if(opt.id==='speed'){
ctx.translate(width/2,height/2);
for(i=0;i<opt.density;i++){
var ang=(hash(i)*Math.PI*2);
var inner=40+hash(i*2)*80;
ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.25+hash(i*3)*0.6))+')';
ctx.lineWidth=0.6+hash(i*5)*2.4;
ctx.beginPath();
ctx.moveTo(Math.cos(ang)*inner,Math.sin(ang)*inner);
ctx.lineTo(Math.cos(ang)*(inner+opt.length+hash(i)*120),Math.sin(ang)*(inner+opt.length+hash(i)*120));
ctx.stroke();
}
ctx.restore();
return;
}
for(i=0;i<opt.density;i++){
x=hash(i*2.2)*width;
y=hash(i*7.1)*height;
if(opt.id==='sparkle'){
ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.4+hash(i)*0.6))+')';
ctx.fillRect(x,y,1.5,opt.length);
ctx.fillRect(x-opt.length/2,y+opt.length/2,opt.length,1.5);
continue;
}
ctx.save();
ctx.translate(x,y);
ctx.rotate((opt.angle*Math.PI)/180+(hash(i)-0.5)*0.12);
if(opt.id==='snow'){
ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.35+hash(i)*0.65))+')';
ctx.beginPath();
ctx.arc(0,0,1+hash(i*3)*3.5,0,Math.PI*2);
ctx.fill();
}else{
len=opt.length*(0.4+hash(i*4)*1.2);
ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opt.opacity*(0.25+hash(i)*0.7))+')';
ctx.lineWidth=0.6+hash(i*6)*1.4;
ctx.beginPath();
ctx.moveTo(0,0);
ctx.lineTo(0,len);
ctx.stroke();
}
ctx.restore();
}
}

function normalizeEffect(options){
var source=options&&typeof options==='object'?options:{};
var preset=EFFECT_PRESETS.filter(function(item){return item.id===source.id;})[0]||EFFECT_PRESETS[0];
return {
id:preset.id,
name:preset.name,
density:clamp(source.density,1,2000,preset.density),
angle:clamp(source.angle,0,180,preset.angle),
opacity:clamp(source.opacity,0.05,1,preset.opacity),
length:clamp(source.length,2,400,preset.length),
color:source.color||preset.color,
behindPanels:!!source.behindPanels
};
}

function generatePaperDataUrl(width,height,presetId){
var el=makeCanvas(width,height);
if(!el)return '';
drawPaper(el.getContext('2d'),el.width,el.height,presetId);
return el.toDataURL('image/png');
}

function generateEffectDataUrl(width,height,options){
var el=makeCanvas(width,height);
if(!el)return '';
drawEffect(el.getContext('2d'),el.width,el.height,options);
return el.toDataURL('image/png');
}

function findByType(type){
var current=currentCanvas();
if(!current||typeof current.getObjects!=='function')return [];
return current.getObjects().filter(function(object){return object&&object.customType===type;});
}

function removeByType(type){
var current=currentCanvas();
if(!current)return 0;
var list=findByType(type);
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
list.forEach(function(object){current.remove(object);});
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
return list.length;
}

function finishHistory(){
var current=currentCanvas();
if(current&&typeof current.renderAll==='function')current.renderAll();
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
}

function attachPageStudioRenderer(object){
if(!object||typeof object._render!=='function')return object;
if(object._pageStudioBound)return object;
object._pageStudioBound=true;
object.objectCaching=false;
var original=object._render.bind(object);
object._render=function(ctx){
var width=this.width||1;
var height=this.height||1;
ctx.save();
ctx.translate(-width/2,-height/2);
if(this.customType==='pageBackground'&&this.pageStudioKind!=='image'){
drawPaper(ctx,width,height,this.pageStudioPreset||'white');
}else if(this.customType==='pageEffect'){
drawEffect(ctx,width,height,this.pageStudioEffect||{id:this.pageStudioPreset||'rain'});
}else if(this.customType==='pageGrid'){
drawGridPattern(ctx,width,height,this.pageStudioGridSize||10);
}else{
original(ctx);
}
ctx.restore();
};
return object;
}

function drawGridPattern(ctx,width,height,size){
size=Math.max(4,Number(size)||10);
var i;
ctx.clearRect(0,0,width,height);
for(i=0;i<=width/size;i++){
ctx.strokeStyle=i%(50/size)===0?'rgba(226,74,74,0.45)':'rgba(74,144,226,0.28)';
ctx.beginPath();
ctx.moveTo(i*size,0);
ctx.lineTo(i*size,height);
ctx.stroke();
}
for(i=0;i<=height/size;i++){
ctx.strokeStyle=i%(50/size)===0?'rgba(226,74,74,0.45)':'rgba(74,144,226,0.28)';
ctx.beginPath();
ctx.moveTo(0,i*size);
ctx.lineTo(width,i*size);
ctx.stroke();
}
}

function hydratePageStudioObject(object){
if(!object)return object;
if(object.customType==='pageBackground'||object.customType==='pageEffect'||object.customType==='pageGrid'){
if(object.type==='rect'||!object.type)attachPageStudioRenderer(object);
}
return object;
}

function hydrateAll(){
var current=currentCanvas();
if(!current||typeof current.getObjects!=='function')return 0;
var count=0;
current.getObjects().forEach(function(object){
if(object&&(object.customType==='pageBackground'||object.customType==='pageEffect'||object.customType==='pageGrid')){
hydratePageStudioObject(object);
count+=1;
}
});
return count;
}

function placeProcedural(meta,behindPanels){
var current=currentCanvas();
if(!current||!root.fabric)return Promise.reject(new Error('Canvas 尚未初始化。'));
var width=Number(current.width)||1000;
var height=Number(current.height)||1400;
var skipHistory=!!meta.skipHistory;
var object=new root.fabric.Rect({
left:0,
top:0,
width:width,
height:height,
fill:'transparent',
stroke:null,
originX:'left',
originY:'top',
selectable:meta.customType!=='pageGrid',
evented:meta.customType!=='pageGrid',
excludeFromLayerPanel:meta.customType==='pageGrid',
objectCaching:false,
customType:meta.customType,
pageStudioKind:meta.kind,
pageStudioPreset:meta.preset||'',
pageStudioEffect:meta.effect||null,
pageStudioGridSize:meta.gridSize||10,
name:meta.name
});
attachPageStudioRenderer(object);
if(!skipHistory&&typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
if(meta.replaceType){
findByType(meta.replaceType).forEach(function(existing){current.remove(existing);});
}
current.add(object);
if(behindPanels||meta.customType==='pageBackground'||meta.customType==='pageGrid'){
current.sendToBack(object);
findByType('pageBackground').forEach(function(bg){current.sendToBack(bg);});
findByType('pageGrid').forEach(function(grid){
current.sendToBack(grid);
findByType('pageBackground').forEach(function(bg){current.sendToBack(bg);});
});
}else{
current.bringToFront(object);
}
if(!skipHistory&&typeof changeDoSaveHistory==='function')changeDoSaveHistory();
if(!skipHistory)finishHistory();
else if(current&&typeof current.renderAll==='function')current.renderAll();
return Promise.resolve(object);
}
function placeImage(dataUrl,meta,behindPanels){
var current=currentCanvas();
if(!current||!root.fabric)return Promise.reject(new Error('Canvas 尚未初始化。'));
return new Promise(function(resolve,reject){
root.fabric.Image.fromURL(dataUrl,function(image){
if(!image){reject(new Error('底页图片加载失败。'));return;}
var width=Number(current.width)||1000;
var height=Number(current.height)||1400;
var scale=Math.max(width/(image.width||1),height/(image.height||1));
image.set({
left:0,
top:0,
scaleX:scale,
scaleY:scale,
originX:'left',
originY:'top',
selectable:true,
evented:true,
objectCaching:false,
customType:meta.customType,
pageStudioKind:meta.kind,
pageStudioPreset:meta.preset||'',
name:meta.name
});
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
if(meta.replaceType){
findByType(meta.replaceType).forEach(function(object){current.remove(object);});
}
current.add(image);
if(behindPanels){
current.sendToBack(image);
findByType('pageBackground').forEach(function(bg){current.sendToBack(bg);});
}else if(meta.customType==='pageBackground'){
current.sendToBack(image);
}else{
current.bringToFront(image);
}
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
finishHistory();
resolve(image);
});
});
}

function applyPaper(presetId){
var preset=PAPER_PRESETS.filter(function(item){return item.id===presetId;})[0]||PAPER_PRESETS[0];
return placeProcedural({customType:'pageBackground',replaceType:'pageBackground',kind:'paper',preset:preset.id,name:'底页：'+preset.name},true).then(function(object){
if(typeof isGridVisible!=='undefined'&&isGridVisible)syncGridOverlay(true);
return object;
});
}

function applyPaperImage(dataUrl){
return placeImage(dataUrl,{customType:'pageBackground',replaceType:'pageBackground',kind:'image',preset:'custom',name:'底页：自定义图片'},true).then(function(object){
if(typeof isGridVisible!=='undefined'&&isGridVisible)syncGridOverlay(true);
return object;
});
}

function applyEffect(options){
var opt=normalizeEffect(options);
return placeProcedural({customType:'pageEffect',replaceType:'pageEffect',kind:'effect',preset:opt.id,effect:opt,name:'画面效果：'+opt.name},opt.behindPanels);
}

function syncGridOverlay(visible){
var current=currentCanvas();
if(!current)return 0;
removeByType('pageGrid');
if(!visible||!findByType('pageBackground').length)return 0;
var size=(typeof gridSize==='number'&&gridSize>0)?gridSize:10;
placeProcedural({customType:'pageGrid',replaceType:'pageGrid',kind:'grid',preset:'grid',gridSize:size,name:'网格',skipHistory:true},true);
return 1;
}

function revealPanels(transparent){
var current=currentCanvas();
if(!current)return 0;
var count=0;
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.getObjects().forEach(function(object){
if(typeof isPanel!=='function'||!isPanel(object))return;
if(transparent){
if(object.pageStudioPrevFill===undefined)object.pageStudioPrevFill=object.fill;
object.set('fill','rgba(255,255,255,0)');
}else{
object.set('fill',object.pageStudioPrevFill||'rgba(255,255,255,1)');
}
count+=1;
});
var fillInput=typeof document!=='undefined'?document.getElementById('panelFillColor'):null;
if(fillInput)fillInput.value=transparent?'rgba(255,255,255,0)':'rgba(255,255,255,1)';
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
finishHistory();
return count;
}

function applyBorderPreset(id){
var preset=BORDER_PRESETS.filter(function(item){return item.id===id;})[0];
if(!preset)throw new Error('未知边框预设：'+id);
var current=currentCanvas();
if(!current)throw new Error('Canvas 尚未初始化。');
var strokeInput=typeof document!=='undefined'?document.getElementById('panelStrokeColor'):null;
var widthInput=typeof document!=='undefined'?document.getElementById('panelStrokeWidth'):null;
if(strokeInput)strokeInput.value=preset.stroke;
if(widthInput)widthInput.value=String(preset.strokeWidth);
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
current.getObjects().forEach(function(object){
if(typeof isPanel==='function'&&isPanel(object)){
object.set({
stroke:preset.stroke,
strokeWidth:preset.strokeWidth,
strokeDashArray:preset.strokeDashArray,
strokeUniform:true
});
}
});
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
finishHistory();
return preset;
}

function el(id){return typeof document!=='undefined'?document.getElementById(id):null;}

function readCustomEffect(){
return normalizeEffect({
id:(el('pageEffectPreset')&&el('pageEffectPreset').value)||'rain',
density:el('pageEffectDensity')&&el('pageEffectDensity').value,
angle:el('pageEffectAngle')&&el('pageEffectAngle').value,
opacity:el('pageEffectOpacity')&&(Number(el('pageEffectOpacity').value)/100),
length:el('pageEffectLength')&&el('pageEffectLength').value,
color:el('pageEffectColor')&&el('pageEffectColor').value,
behindPanels:el('pageEffectBehind')&&el('pageEffectBehind').checked
});
}

function bind(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-page-studio')==='1')return;
document.documentElement.setAttribute('data-page-studio','1');
var paperSelect=el('pagePaperPreset');
if(paperSelect&&!paperSelect.options.length){
PAPER_PRESETS.forEach(function(item){
var option=document.createElement('option');
option.value=item.id;
option.textContent=item.name;
paperSelect.appendChild(option);
});
}
var effectSelect=el('pageEffectPreset');
if(effectSelect&&!effectSelect.options.length){
EFFECT_PRESETS.forEach(function(item){
var option=document.createElement('option');
option.value=item.id;
option.textContent=item.name;
effectSelect.appendChild(option);
});
}
function syncEffectDefaults(){
var preset=normalizeEffect({id:effectSelect&&effectSelect.value});
if(el('pageEffectDensity'))el('pageEffectDensity').value=String(preset.density);
if(el('pageEffectAngle'))el('pageEffectAngle').value=String(preset.angle);
if(el('pageEffectOpacity'))el('pageEffectOpacity').value=String(Math.round(preset.opacity*100));
if(el('pageEffectLength'))el('pageEffectLength').value=String(preset.length);
}
if(effectSelect)effectSelect.addEventListener('change',syncEffectDefaults);
syncEffectDefaults();
var applyPaperBtn=el('pagePaperApply');
if(applyPaperBtn)applyPaperBtn.addEventListener('click',function(){
applyPaper(paperSelect&&paperSelect.value||'white').catch(function(error){
if(typeof createToastError==='function')createToastError('底页',error.message,4000);
});
});
var file=el('pagePaperFile');
if(file)file.addEventListener('change',function(){
var picked=file.files&&file.files[0];
if(!picked)return;
var reader=new FileReader();
reader.onload=function(){applyPaperImage(String(reader.result||'')).catch(function(error){if(typeof createToastError==='function')createToastError('底页',error.message,4000);});};
reader.readAsDataURL(picked);
});
var clearPaper=el('pagePaperClear');
if(clearPaper)clearPaper.addEventListener('click',function(){removeByType('pageBackground');finishHistory();});
var reveal=el('pagePaperReveal');
if(reveal)reveal.addEventListener('change',function(){revealPanels(reveal.checked);});
var applyEffectBtn=el('pageEffectApply');
if(applyEffectBtn)applyEffectBtn.addEventListener('click',function(){
applyEffect(readCustomEffect()).catch(function(error){
if(typeof createToastError==='function')createToastError('画面效果',error.message,4000);
});
});
var clearEffect=el('pageEffectClear');
if(clearEffect)clearEffect.addEventListener('click',function(){removeByType('pageEffect');finishHistory();});
if(typeof document.querySelectorAll==='function'){
Array.prototype.forEach.call(document.querySelectorAll('[data-page-effect]'),function(button){
button.addEventListener('click',function(){
if(effectSelect)effectSelect.value=button.getAttribute('data-page-effect');
syncEffectDefaults();
applyEffect(readCustomEffect()).catch(function(error){
if(typeof createToastError==='function')createToastError('画面效果',error.message,4000);
});
});
});
Array.prototype.forEach.call(document.querySelectorAll('[data-panel-border]'),function(button){
button.addEventListener('click',function(){
try{applyBorderPreset(button.getAttribute('data-panel-border'));}
catch(error){if(typeof createToastError==='function')createToastError('边框',error.message,4000);}
});
});
}
var paperSwatches=el('pagePaperSwatches');
if(paperSwatches&&!paperSwatches.getAttribute('data-filled')){
paperSwatches.setAttribute('data-filled','1');
PAPER_PRESETS.forEach(function(item){
var button=document.createElement('button');
button.type='button';
button.className='page-studio-swatch';
button.setAttribute('data-page-paper',item.id);
button.title=item.name;
button.style.background=item.tint;
button.appendChild(document.createTextNode(item.name));
button.addEventListener('click',function(){
if(paperSelect)paperSelect.value=item.id;
applyPaper(item.id).catch(function(error){
if(typeof createToastError==='function')createToastError('底页',error.message,4000);
});
});
paperSwatches.appendChild(button);
});
}
var current=currentCanvas();
if(current&&typeof current.on==='function'&&!current._pageStudioHydrateBound){
current._pageStudioHydrateBound=true;
current.on('object:added',function(event){
if(event&&event.target)hydratePageStudioObject(event.target);
});
}
hydrateAll();
}

root.NaiPageStudio={
PAPER_PRESETS:PAPER_PRESETS,
EFFECT_PRESETS:EFFECT_PRESETS,
BORDER_PRESETS:BORDER_PRESETS,
normalizeEffect:normalizeEffect,
drawPaper:drawPaper,
drawEffect:drawEffect,
generatePaperDataUrl:generatePaperDataUrl,
generateEffectDataUrl:generateEffectDataUrl,
applyPaper:applyPaper,
applyPaperImage:applyPaperImage,
applyEffect:applyEffect,
applyBorderPreset:applyBorderPreset,
revealPanels:revealPanels,
hydrateAll:hydrateAll,
hydratePageStudioObject:hydratePageStudioObject,
syncGridOverlay:syncGridOverlay,
clearPaper:function(){removeByType('pageGrid');return removeByType('pageBackground');},
clearEffect:function(){return removeByType('pageEffect');}
};

if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
