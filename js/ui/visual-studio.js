(function(root){
"use strict";

var TONE_NAMES={
Tone:'网点',
ToneNoise:'噪点',
ToneSnow:'雪点',
ToneRain:'雨线',
SpeedLine:'速度线',
FocusingLine:'集中线'
};
var EFFECT_NAMES={
Color2BlackWhiteLight:'浅色网点化',
Color2BlackWhiteDark:'深色网点化',
Color2BlackWhiteRough:'粗网点化',
Color2BlackWhiteSimple:'简网点化',
Color2BlackLightColor:'浅色去色',
EnhanceDark:'压暗增强',
EffectBlend:'混合',
EffectGlow:'发光',
EffectGLFX:'滤镜'
};
var TEXT2_NAMES={
shadow:'阴影字',
wild:'爆炸字',
scratch:'刮痕字',
broken:'碎裂字',
cloud:'云朵字',
layered:'层叠字',
mesh:'网点字',
thrill:'震动字',
zebra:'条纹字'
};

function canvas(){
return root.canvas||(typeof window!=='undefined'?window.canvas:null);
}

function $(id){
return typeof document!=='undefined'?document.getElementById(id):null;
}

function openPanel(){
var panels=document.querySelectorAll('#head-id .left_area');
for(var i=0;i<panels.length;i++){
if(panels[i].style.display==='block')return panels[i].id;
}
return '';
}

function activeObject(){
var current=canvas();
return current&&typeof current.getActiveObject==='function'?current.getActiveObject():null;
}

function isImageObj(obj){
if(!obj)return false;
if(typeof isImage==='function')return isImage(obj);
return obj.type==='image';
}

function brushWidth(){
var current=canvas();
if(current&&current.freeDrawingBrush&&current.freeDrawingBrush.width)return current.freeDrawingBrush.width;
var range=document.querySelector('#tool-settings input[type="range"]');
return range?parseFloat(range.value)||12:12;
}

function setBrushWidth(value){
value=Math.max(1,Math.min(150,parseFloat(value)||12));
var current=canvas();
if(current&&current.freeDrawingBrush)current.freeDrawingBrush.width=value;
var ranges=document.querySelectorAll('#tool-settings input[type="range"]');
if(ranges[0]){
ranges[0].value=String(Math.round(value));
ranges[0].dispatchEvent(new Event('input',{bubbles:true}));
}
if(typeof applyBrushSettings==='function')applyBrushSettings();
}

function markSelectedThumbs(container,clicked){
if(!container)return;
container.querySelectorAll('.svg-preview,.visual-thumb,.sfx-chip,.brush-preset-chip').forEach(function(node){
node.classList.toggle('is-selected',node===clicked);
});
}

function enhanceGalleries(){
[
['svg-preview-area-vertical','点分镜即可套到画布'],
['svg-preview-area-landscape','点分镜即可套到画布'],
['speech-bubble-preview','点气泡放到画布，再双击改字'],
['sfxPaletteList','点拟声词插入当前文字样式'],
['brushPresetGrid','点笔刷预设立刻能画']
].forEach(function(item){
var el=$(item[0]);
if(!el||el.getAttribute('data-visual')==='1')return;
el.setAttribute('data-visual','1');
el.classList.add('visual-thumb-grid');
el.addEventListener('click',function(event){
var thumb=event.target.closest('.svg-preview,.sfx-chip,button,.visual-thumb');
if(thumb){
markSelectedThumbs(el,thumb);
thumb.classList.add('is-flash');
setTimeout(function(){thumb.classList.remove('is-flash');},280);
refresh();
}
});
});
document.querySelectorAll('#manga-tone-buttons button, #manga-effect-buttons button, #pen-tool-buttons button, #image-text-tool-buttons button, .visual-shape-grid button, .visual-text-grid button').forEach(function(button){
if(button.getAttribute('data-visual-card')==='1')return;
button.setAttribute('data-visual-card','1');
button.classList.add('visual-preset-card');
var key=button.id.replace(/Button$/,'');
var label=TONE_NAMES[key]||EFFECT_NAMES[key]||TEXT2_NAMES[key]||(button.querySelector('span')&&button.querySelector('span').textContent)||'';
if(label){
button.title=label+' · 点一下就能在画布上用';
var span=button.querySelector('span');
if(span&&/^[A-Za-z0-9_]+$/.test((span.textContent||'').trim()))span.textContent=label;
}
});
}

function cursorEl(){
var el=$('naiBrushCursor');
if(el)return el;
el=document.createElement('div');
el.id='naiBrushCursor';
el.className='nai-brush-cursor';
el.hidden=true;
document.body.appendChild(el);
return el;
}

function onMouseMove(event){
var current=canvas();
if(!(current&&current.isDrawingMode&&event&&event.e)){
var ring=cursorEl();
if(!ring.hidden)ring.hidden=true;
return;
}
root.__naiBrushEvt=event.e;
if(root.__naiBrushRaf)return;
root.__naiBrushRaf=requestAnimationFrame(function(){
root.__naiBrushRaf=0;
var e=root.__naiBrushEvt;
var live=canvas();
var el=cursorEl();
if(!(live&&live.isDrawingMode&&e)){el.hidden=true;return;}
var size=brushWidth()*(root.canvasContinerScale||1);
el.hidden=false;
el.style.width=size+'px';
el.style.height=size+'px';
el.style.left=(e.clientX-size/2)+'px';
el.style.top=(e.clientY-size/2)+'px';
el.classList.toggle('is-eraser',(root.nowPencil||nowPencil)==='Eraser');
});
}

function toHex(color){
if(!color)return '#111827';
if(typeof color==='string'&&color.charAt(0)==='#'){
if(color.length===4)return '#'+color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
return color.slice(0,7);
}
var m=String(color).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
if(!m)return '#111827';
function h(n){n=Math.max(0,Math.min(255,parseInt(n,10)));return ('0'+n.toString(16)).slice(-2);}
return '#'+h(m[1])+h(m[2])+h(m[3]);
}

function applyFill(value){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return;
if(obj.type==='activeSelection'){obj.forEachObject(function(item){item.set('fill',value);});}
else obj.set('fill',value);
var current=canvas();
if(current)current.renderAll();
}

function applyStroke(value){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return;
if(obj.type==='activeSelection'){obj.forEachObject(function(item){item.set('stroke',value);});}
else obj.set('stroke',value);
var current=canvas();
if(current)current.renderAll();
}

function applyStrokeW(value){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return;
value=Math.max(0,parseFloat(value)||0);
if(obj.type==='activeSelection'){obj.forEachObject(function(item){item.set('strokeWidth',value);});}
else obj.set('strokeWidth',value);
var current=canvas();
if(current)current.renderAll();
}

function applyOpacity(value){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return;
value=Math.max(0,Math.min(100,parseFloat(value)||0))/100;
if(obj.type==='activeSelection'){obj.forEachObject(function(item){item.set('opacity',value);});}
else obj.set('opacity',value);
var current=canvas();
if(current)current.renderAll();
}

function applyShadow(on){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return;
if(on){
obj.set('shadow',typeof fabric!=='undefined'?new fabric.Shadow({color:'rgba(0,0,0,0.45)',blur:16,offsetX:5,offsetY:7}):null);
}else obj.set('shadow',null);
var current=canvas();
if(current)current.renderAll();
}

function updatePropStrip(){
var strip=$('naiPropStrip');
if(!strip)return;
var obj=activeObject();
var show=!!(obj&&!obj.naiCropFrame);
strip.hidden=!show;
if(!show)return;
var fill=$('naiPropFill'),stroke=$('naiPropStroke'),sw=$('naiPropStrokeW'),op=$('naiPropOpacity'),sh=$('naiPropShadow');
if(fill&&document.activeElement!==fill)fill.value=toHex(obj.fill);
if(stroke&&document.activeElement!==stroke)stroke.value=toHex(obj.stroke);
if(sw&&document.activeElement!==sw)sw.value=String(Math.round(obj.strokeWidth||0));
if(op&&document.activeElement!==op)op.value=String(Math.round((obj.opacity===undefined?1:obj.opacity)*100));
if(sh)sh.checked=!!obj.shadow;
}

function bindPropStrip(){
if(document.documentElement.getAttribute('data-nai-prop')==='1')return;
document.documentElement.setAttribute('data-nai-prop','1');
var fill=$('naiPropFill'),stroke=$('naiPropStroke'),sw=$('naiPropStrokeW'),op=$('naiPropOpacity'),sh=$('naiPropShadow');
if(fill)fill.addEventListener('input',function(){applyFill(fill.value);});
if(stroke)stroke.addEventListener('input',function(){applyStroke(stroke.value);});
if(sw)sw.addEventListener('input',function(){applyStrokeW(sw.value);});
if(op)op.addEventListener('input',function(){applyOpacity(op.value);});
if(sh)sh.addEventListener('change',function(){applyShadow(sh.checked);});
var strip=$('naiPropStrip');
if(strip)strip.addEventListener('click',function(event){
var btn=event.target.closest('[data-align]');
if(!btn)return;
alignActive(btn.getAttribute('data-align'));
});
}

function alignActive(where){
var current=canvas();
var obj=activeObject();
if(!current||!obj||obj.naiCropFrame)return;
var br=typeof obj.getBoundingRect==='function'?obj.getBoundingRect(true):null;
if(!br)return;
var cw=current.getWidth(),ch=current.getHeight();
var dx=0,dy=0;
if(where==='left')dx=-br.left;
else if(where==='center')dx=(cw-br.width)/2-br.left;
else if(where==='right')dx=cw-br.width-br.left;
else if(where==='top')dy=-br.top;
else if(where==='middle')dy=(ch-br.height)/2-br.top;
else if(where==='bottom')dy=ch-br.height-br.top;
obj.set({left:(obj.left||0)+dx,top:(obj.top||0)+dy});
if(typeof obj.setCoords==='function')obj.setCoords();
current.renderAll();
if(typeof saveStateByManual==='function')saveStateByManual();
}

function inspectorText(){
var obj=activeObject();
if(!obj||obj.naiCropFrame)return '';
var w=Math.round((obj.width||0)*(obj.scaleX||1));
var h=Math.round((obj.height||0)*(obj.scaleY||1));
var op=Math.round((obj.opacity===undefined?1:obj.opacity)*100);
var kind=obj.isPanel?'格子':(isImageObj(obj)?'图片':(obj.text?'文字':'图层'));
return kind+' '+w+'\u00d7'+h+' · 透明 '+op+'%';
}

var refreshRaf=0;

function fillOptions(){
var bar=$('naiToolOptionsBar');
var main=$('naiToolOptionsMain');
var controls=$('naiToolOptionsControls');
if(!bar||!main||!controls)return;
var current=canvas();
var drawing=!!(current&&current.isDrawingMode);
var pencil=root.nowPencil||(typeof nowPencil!=='undefined'?nowPencil:'');
var cropping=typeof cropFrame!=='undefined'&&!!cropFrame;
var panel=openPanel();
var tone=typeof nowTone!=='undefined'?nowTone:null;
var effect=typeof nowEffect!=='undefined'?nowEffect:null;
var knife=typeof isKnifeMode!=='undefined'&&isKnifeMode;
var html='';
var hint='';

if(cropping){
hint=(typeof cropThenCutout!=='undefined'&&cropThenCutout)?'框选抠图 · 拖绿框，Enter 抠选区（不花积分）':'框选裁剪 · 拖绿框，Enter 裁剪';
html='<button type="button" data-visual-act="crop">确认裁剪</button><button type="button" data-visual-act="cutout">框选抠图</button><button type="button" data-visual-act="cancel">取消</button>';
}else if(drawing){
var name=pencil==='Eraser'?'橡皮':(pencil==='Marker'?'马克笔':(pencil||'笔刷'));
hint=name+' · 在画布上拖着画，Esc / V 回到移动';
html='<label>大小 <input id="naiOptBrushSize" type="range" min="1" max="80" value="'+Math.round(brushWidth())+'"></label>';
}else if(knife){
hint='切割格子 · 在分镜上画线切开';
html='<button type="button" data-visual-act="cancel">退出切割</button>';
}else if(tone){
hint=(TONE_NAMES[tone]||tone)+' · 左侧改参数，画布上会马上看到';
html='<button type="button" data-visual-act="cancel">退出网点</button>';
}else if(effect){
hint=(EFFECT_NAMES[effect]||effect)+' · 先选中一张图再点特效';
}else if(panel==='svg-container-template'){
hint='分镜模板 · 点缩略图套到画布，格子才能出图。Ctrl+滚轮可缩放画布方便贴合';
}else if(panel==='speech-bubble-area'){
hint='气泡 · 点模板放到画布，双击里面的字就能改';
}else if(panel==='text-area'){
hint='文本 · 点横排/竖排放到画布，再改字体颜色';
html='<button type="button" data-visual-act="htext">横排字</button><button type="button" data-visual-act="vtext">竖排字</button>';
}else if(panel==='text-area2'){
hint='图文 / 拟声词 · 点样式或拟声词，立刻套到当前文字';
}else if(panel==='manga-tone-area'){
hint='网点 · 点一种，画布上会出现可调的网点层';
}else if(panel==='manga-effect-area'){
hint='特效 · 先点选一张图片，再点效果看变化';
}else if(panel==='shape-area'||panel==='panel-manager-area'){
hint='形状 · 点一种再在画布上拖出大小。整页下雨请用「更多 → 页面」，格子网点用侧栏「网点」。';
}else if(panel==='ps-tools-area'){
hint='画具 · 套索/渐变/油漆桶/仿制都不花积分';
html='<button type="button" data-visual-act="lasso">套索</button><button type="button" data-visual-act="gradient">渐变</button><button type="button" data-visual-act="history">历史</button>';
}else if(panel==='cutout-area'){
hint='抠图 · 选中图片后点运行，或右键「框选抠图」';
html='<button type="button" data-visual-act="cutout-run">抠选中图</button><button type="button" data-visual-act="marquee-cutout">框选抠图</button>';
}else if(panel==='asset-library-area'){
hint='素材 · 点缩略图放到画布，可再右键抠图';
}else if(panel==='tool-area'){
hint='笔刷库 · 点一种笔或预设，画布上会跟着变';
}else{
var ps=root.NaiPsTools&&root.NaiPsTools.current?root.NaiPsTools.current():'move';
if(ps==='marquee')hint='框选图层 · 空白处拖方框，选中多个图层';
else if(ps==='lasso')hint='套索 · 圈选图片范围，松开复制为新图层';
else if(ps==='gradient')hint='渐变 · 拖出矩形，从填充色过渡到描边色';
else if(ps==='bucket')hint='油漆桶 · 点图片上要换色的区域';
else if(ps==='clone')hint='仿制图章 · Alt+点击取样，再拖着盖章';
else if(ps==='guide')hint='参考线 · 点击放竖线，Shift+点击放横线';
else if(ps==='shape')hint='形状 · 在画布上拖出大小';
else hint='移动 · 拖图层对齐格子。Ctrl+滚轮缩放画布，工具栏右侧有 + −。空格拖画布，V移动 M框选 C裁剪 K刀';
html='<button type="button" data-visual-act="marquee">框选</button><button type="button" data-visual-act="crop">裁剪</button><button type="button" data-visual-act="brush">笔刷</button><button type="button" data-visual-act="eraser">橡皮</button><button type="button" data-visual-act="knife">刀</button>';
}
var info=inspectorText();
if(info)hint+='  ·  '+info;
if(main.textContent!==hint)main.textContent=hint;
if(controls.innerHTML!==html){
controls.innerHTML=html;
var size=$('naiOptBrushSize');
if(size&&size.getAttribute('data-bound')!=='1'){
size.setAttribute('data-bound','1');
size.addEventListener('input',function(){setBrushWidth(size.value);});
}
}
updatePropStrip();
}

function onOptionsClick(event){
var btn=event.target.closest('[data-visual-act]');
if(!btn)return;
var act=btn.getAttribute('data-visual-act');
if(act==='crop'&&typeof cropFrame!=='undefined'&&cropFrame&&typeof completeCrop==='function')completeCrop();
else if(act==='crop'){
if(root.NaiPsTools)root.NaiPsTools.selectCrop(false);
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
}else if(act==='cutout'){
if(typeof cropFrame!=='undefined'&&cropFrame&&typeof completeCrop==='function'){
if(typeof cropThenCutout!=='undefined')cropThenCutout=true;
completeCrop();
}else if(typeof selectMarqueeTool==='function'){
if(typeof startCutoutRegionMode==='function')startCutoutRegionMode(activeObject());
else selectMarqueeTool(true);
}
}else if(act==='marquee-cutout'){
if(typeof startCutoutRegionMode==='function')startCutoutRegionMode(activeObject());
}else if(act==='cutout-run'){
if(root.NaiBackgroundRemovalClient&&root.NaiBackgroundRemovalClient.processLayer){
root.NaiBackgroundRemovalClient.processLayer(activeObject()).catch(function(){});
}
}else if(act==='cancel'){
if(typeof operationModeClear==='function')operationModeClear();
else if(typeof selectMoveTool==='function')selectMoveTool();
}else if(act==='htext'&&typeof createTextbox==='function')createTextbox();
else if(act==='vtext'){
var vertical=$('verticalText');
if(vertical)vertical.click();
}else if(act==='marquee'){
if(root.NaiPsTools)root.NaiPsTools.selectObjectMarquee();
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
}else if(act==='knife'){
if(root.NaiPsTools)root.NaiPsTools.selectKnife();
}else if(act==='lasso'&&root.NaiPsTools)root.NaiPsTools.placeLasso();
else if(act==='gradient'&&root.NaiPsTools)root.NaiPsTools.placeGradient();
else if(act==='history'&&root.NaiPsTools)root.NaiPsTools.toggleHistory();
else if(act==='brush'&&typeof selectSidebarBrush==='function')selectSidebarBrush('Marker');
else if(act==='eraser'&&typeof selectEraserTool==='function')selectEraserTool();
refresh();
}

function refreshNow(){
enhanceGalleries();
fillOptions();
var current=canvas();
if(!(current&&current.isDrawingMode)){
var ring=$('naiBrushCursor');
if(ring)ring.hidden=true;
}
document.querySelectorAll('#sidebar .icon-wrapper[data-target]').forEach(function(wrap){
var id=wrap.getAttribute('data-target');
var panel=id?$(id):null;
wrap.classList.toggle('is-panel-open',!!(panel&&panel.style.display==='block'));
});
}

function refresh(){
if(refreshRaf)return;
refreshRaf=requestAnimationFrame(function(){
refreshRaf=0;
refreshNow();
});
}

function wrapFn(name){
var orig=root[name];
if(typeof orig!=='function'||orig.__naiVisualWrapped)return;
var wrapped=function(){
var result=orig.apply(this,arguments);
refresh();
return result;
};
wrapped.__naiVisualWrapped=true;
root[name]=wrapped;
if(typeof window!=='undefined')window[name]=wrapped;
}

function bindCanvas(){
var current=canvas();
if(!current||typeof current.on!=='function'||current.__naiVisualBound)return;
current.__naiVisualBound=true;
current.on('mouse:move',onMouseMove);
current.on('mouse:out',function(){cursorEl().hidden=true;});
current.on('selection:created',refresh);
current.on('selection:updated',refresh);
current.on('selection:cleared',refresh);
current.on('object:modified',updatePropStrip);
current.on('object:added',function(){
if(current.__naiVisualAddTimer)clearTimeout(current.__naiVisualAddTimer);
current.__naiVisualAddTimer=setTimeout(refresh,50);
});
}

function bind(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-nai-visual')==='1')return;
document.documentElement.setAttribute('data-nai-visual','1');
var controls=$('naiToolOptionsControls');
if(controls)controls.addEventListener('click',onOptionsClick);
bindPropStrip();
[
'toggleVisibility','selectMoveTool','selectEraserTool','selectMarqueeTool','selectSidebarBrush',
'switchMangaTone','switchMangaEffect','operationModeClear','startCropMode','completeCrop',
'switchText2','createTextbox','addSquare','addTallRect','addWideRect','addTriangle',
'addPentagon','addHexagon','addStar','addHeart','changeSpeechBubble','loadSpeechBubbleSVGReadOnly'
].forEach(wrapFn);
bindCanvas();
enhanceGalleries();
refresh();
setTimeout(bindCanvas,800);
setTimeout(function(){
['toggleVisibility','selectMoveTool','switchMangaTone','switchMangaEffect','switchText2','createTextbox','addSquare','loadSpeechBubbleSVGReadOnly'].forEach(wrapFn);
bindCanvas();
refresh();
},1600);
}

root.NaiVisualStudio={refresh:refresh,enhanceGalleries:enhanceGalleries};

if(typeof document!=='undefined'){
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
}
})(typeof window!=='undefined'?window:globalThis);
