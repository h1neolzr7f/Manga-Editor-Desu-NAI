(function(root){
"use strict";

var BRUSH_NAMES={
Marker:'马克笔',
Ink:'墨水',
Crayon:'蜡笔',
Pencil:'铅笔',
OutlinePen:'描边',
Circle:'圆点',
Mosaic:'马赛克',
Eraser:'橡皮',
CustomBrush:'自定义笔刷'
};

function canvas(){
return root.canvas||(typeof window!=='undefined'?window.canvas:null);
}

function hud(){
return typeof document!=='undefined'?document.getElementById('beginnerToolHud'):null;
}

function isTypingTarget(target){
if(!target)return false;
var tag=String(target.tagName||'').toLowerCase();
if(tag==='input'||tag==='textarea'||tag==='select')return true;
if(target.isContentEditable)return true;
return false;
}

function updateHud(){
var el=hud();
if(!el)return;
var current=canvas();
var drawing=!!(current&&current.isDrawingMode);
var pencil=root.nowPencil||(typeof nowPencil!=='undefined'?nowPencil:'');
var cropping=typeof cropFrame!=='undefined'&&!!cropFrame;
var name=cropping?(cropThenCutout?'框选抠图':'框选'):(drawing?(BRUSH_NAMES[pencil]||pencil||'画笔'):'移动');
var page='';
if(current&&typeof current.getWidth==='function'){
page=' · 底图 '+Math.round(current.getWidth())+'\u00d7'+Math.round(current.getHeight());
}
el.textContent=cropping
?('当前：'+name+page+' · Enter确认 · Esc取消')
:(drawing
?('当前：'+name+page+' · 点图层退出 · Esc退出')
:('当前：'+(window.NaiPsTools&&window.NaiPsTools.name?window.NaiPsTools.name():name)+page+' · V移动 M框选 C裁剪 K刀'));
el.classList.toggle('is-drawing',drawing||cropping);
var clearBtn=typeof document!=='undefined'?document.getElementById('clearMode'):null;
if(clearBtn){
var showExit=drawing||cropping;
clearBtn.hidden=!showExit;
clearBtn.style.display=showExit?'':'none';
var exitLabel=clearBtn.querySelector('label');
if(exitLabel)exitLabel.textContent=cropping?'退出裁剪':'退出画笔';
}
if(typeof updatePageSizeBadge==='function')updatePageSizeBadge();
}

function flashHelp(message){
var help=typeof document!=='undefined'?document.getElementById('canvas-help-text'):null;
if(!help)return;
help.textContent=message;
help.classList.add('active');
clearTimeout(flashHelp.timer);
flashHelp.timer=setTimeout(function(){help.classList.remove('active');},4500);
}

function exitDrawing(){
if(typeof selectMoveTool==='function')selectMoveTool();
else{
var current=canvas();
if(current)current.isDrawingMode=false;
if(typeof nowPencil!=='undefined')nowPencil='';
}
updateHud();
}

function selectPageById(pageId){
var current=canvas();
var factory=root.NaiComicExtraRendererFactory;
if(!current||!factory||!pageId||typeof factory.selectPage!=='function')return false;
exitDrawing();
factory.selectPage(current,pageId);
flashHelp('已选中整页。拖一下就能一起移动。');
return true;
}

function selectWholePage(){
var current=canvas();
var factory=root.NaiComicExtraRendererFactory;
if(!current||!factory)return false;
var active=typeof current.getActiveObject==='function'?current.getActiveObject():null;
var pageId=active&&active.simulatorPageId;
if(!pageId&&factory.resolvePage){
var resolved=factory.resolvePage(active,current);
pageId=resolved&&resolved.simulatorPageId;
}
if(!pageId&&typeof current.getObjects==='function'){
var objects=current.getObjects();
for(var i=objects.length-1;i>=0;i--){
if(objects[i]&&objects[i].simulatorPageId){pageId=objects[i].simulatorPageId;break;}
}
}
return selectPageById(pageId);
}

function isCanvasInitPlaceholder(item){
if(!item)return true;
if(item.excludeFromLayerPanel)return true;
if(typeof initMessageText!=='undefined'&&item===initMessageText)return true;
var text=typeof item.text==='string'?item.text:'';
if(!text)return false;
if(typeof getText==='function'&&text===getText('canvasInitMessage'))return true;
return text==='拖放或生成图片';
}

function visibleCount(){
var current=canvas();
if(!current||typeof current.getObjects!=='function')return 0;
return current.getObjects().filter(function(item){return item&&!isCanvasInitPlaceholder(item);}).length;
}

var EMPTY_HINT_STORAGE_KEY='nai_empty_canvas_hint_dismissed';
var emptyHintDismissed=false;

function readEmptyHintDismissed(){
if(emptyHintDismissed)return true;
try{
if(typeof localStorage!=='undefined'&&localStorage.getItem(EMPTY_HINT_STORAGE_KEY)==='1'){
emptyHintDismissed=true;
return true;
}
}catch(e){}
return false;
}

function persistEmptyHintDismissed(){
emptyHintDismissed=true;
try{
if(typeof localStorage!=='undefined')localStorage.setItem(EMPTY_HINT_STORAGE_KEY,'1');
}catch(e){}
}

function isTutorialCompleted(){
var mgr=root.TutorialManager;
return!!(mgr&&mgr.state&&mgr.state.quickStartCompleted);
}

function emptyHintElement(){
return typeof document!=='undefined'?document.getElementById('canvasEmptyHint'):null;
}

function shouldShowEmptyHint(){
if(readEmptyHintDismissed())return false;
if(isTutorialCompleted())return false;
if(visibleCount()>0)return false;
return true;
}

function updateEmptyHint(){
var hint=emptyHintElement();
if(!hint)return;
hint.hidden=!shouldShowEmptyHint();
}

function dismissEmptyHint(options){
options=options||{};
var already=readEmptyHintDismissed();
persistEmptyHintDismissed();
updateEmptyHint();
if(options.silent)return;
if(options.fromCustomPage){
if(!already)flashHelp('自定义底图已建好。点「切割格子」自己切分镜。');
return;
}
if(options.openPageManager&&typeof toggleVisibility==='function'){
var panel=document.getElementById('panel-manager-area');
if(panel&&panel.style.display==='none')toggleVisibility('panel-manager-area');
}
flashHelp('已关掉提示。自定义页面后点「切割格子」自己切分镜。帮助菜单里的「新手教程」随时可再看。');
}

function openTemplates(){
if(typeof toggleVisibility==='function'){
var panel=document.getElementById('svg-container-template');
if(!panel||panel.style.display==='none')toggleVisibility('svg-container-template');
}
}

function openSimulator(){
if(root.NaiComicSimulatorStudio&&typeof root.NaiComicSimulatorStudio.open==='function'){
root.NaiComicSimulatorStudio.open();
return;
}
if(typeof toggleVisibility==='function'){
var panel=document.getElementById('simulator-chat-area');
if(!panel||panel.style.display==='none')toggleVisibility('simulator-chat-area');
}
}

var emptyHintActionsBound=false;

function bindEmptyHintActions(){
if(emptyHintActionsBound)return;
if(!root.EventDelegator||typeof root.EventDelegator.register!=='function')return;
emptyHintActionsBound=true;
root.EventDelegator.register('dismissEmptyCanvasHint',function(){
dismissEmptyHint();
});
root.EventDelegator.register('dismissEmptyCanvasHintCrop',function(){
dismissEmptyHint({openPageManager:true});
});
root.EventDelegator.register('openEmptyCanvasSimulator',function(){
openSimulator();
});
root.EventDelegator.register('openEmptyCanvasTemplates',function(){
openTemplates();
});
}

function bindCanvasHint(){
var current=canvas();
if(current&&typeof current.on==='function'&&!current.__naiEmptyHintBound){
current.__naiEmptyHintBound=true;
current.on('object:added',updateEmptyHint);
current.on('object:removed',updateEmptyHint);
}
bindEmptyHintActions();
updateEmptyHint();
}

function onTemplateInserted(current,placed){
exitDrawing();
var factory=root.NaiComicExtraRendererFactory;
var pageId=placed&&placed.root&&placed.root.simulatorPageId;
if(pageId&&root.NaiCanvasView)root.NaiCanvasView.lastPageId=pageId;
if(pageId&&factory&&typeof factory.selectPage==='function'&&current){
factory.selectPage(current,pageId);
flashHelp('已放到画布并选中整页。可缩放、贴到格子，或再点某个零件单独改。');
}else if(placed&&placed.root&&current&&typeof current.setActiveObject==='function'){
current.setActiveObject(placed.root);
if(typeof current.requestRenderAll==='function')current.requestRenderAll();
else current.renderAll();
flashHelp('套好了。可以直接拖动、缩放。');
}else{
if(current&&typeof current.discardActiveObject==='function')current.discardActiveObject();
if(current){
if(typeof current.requestRenderAll==='function')current.requestRenderAll();
else if(typeof current.renderAll==='function')current.renderAll();
}
flashHelp('套好了。直接拖零件，双击改字。要画画先点左侧「笔刷」。');
}
updateHud();
updateEmptyHint();
}

function onKey(event){
if(isTypingTarget(event.target))return;
var current=canvas();
var editing=current&&current.getActiveObject&&current.getActiveObject()&&current.getActiveObject().isEditing;
if(editing)return;
if(event.key==='Escape'){
var hint=emptyHintElement();
if(hint&&!hint.hidden){
event.preventDefault();
dismissEmptyHint();
return;
}
if(current&&current.isDrawingMode)event.preventDefault();
if(typeof cropModeClear==='function')cropModeClear();
exitDrawing();
return;
}
if(event.ctrlKey||event.metaKey||event.altKey)return;
var key=String(event.key||'').toLowerCase();
if(key==='v'){
event.preventDefault();
exitDrawing();
return;
}
if(key==='b'){
event.preventDefault();
if(typeof selectSidebarBrush==='function')selectSidebarBrush('Marker');
return;
}
if(key==='e'){
event.preventDefault();
if(typeof selectEraserTool==='function')selectEraserTool();
return;
}
if(key==='m'){
event.preventDefault();
if(window.NaiPsTools)window.NaiPsTools.selectObjectMarquee();
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
return;
}
if(key==='c'){
event.preventDefault();
if(window.NaiPsTools)window.NaiPsTools.selectCrop(false);
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
return;
}
if(key==='k'){
event.preventDefault();
if(window.NaiPsTools)window.NaiPsTools.selectKnife();
return;
}
if(key==='l'){
event.preventDefault();
if(window.NaiPsTools)window.NaiPsTools.placeLasso();
return;
}
if(key==='g'){
event.preventDefault();
if(window.NaiPsTools)window.NaiPsTools.placeGradient();
return;
}
}

function hasNovelaiToken(){
var el=typeof document!=='undefined'?document.getElementById('novelaiApiKey'):null;
return!!(el&&String(el.value||'').trim());
}

function panelCount(){
if(typeof getPanelObjectList==='function'){
try{return (getPanelObjectList()||[]).length;}catch(e){return 0;}
}
return 0;
}

function updateTokenBadge(){
var badge=typeof document!=='undefined'?document.getElementById('naiTokenBadge'):null;
if(!badge)return;
var ok=hasNovelaiToken();
badge.textContent=ok?'已填 Token':'未填 Token';
badge.classList.toggle('is-missing',!ok);
badge.classList.toggle('is-ready',ok);
badge.title=ok?'已填写访问令牌。点这里打开 NovelAI 设置。':'还没填 NovelAI Token，出图会失败。点这里去填写。';
}

function openNovelaiSettings(){
if(window.unifiedSettingsWindow&&typeof window.unifiedSettingsWindow.open==='function'){
window.unifiedSettingsWindow.open();
return;
}
var box=document.getElementById('view_controls_checkbox');
if(box&&!box.checked){
box.checked=true;
if(typeof changeView==='function')changeView('controls',true);
}
}

function generatePreflight(){
updateTokenBadge();
if(!hasNovelaiToken()){
if(typeof createToastError==='function')createToastError('还不能出图','请先点画布顶栏「未填 Token」，填入 NovelAI 访问令牌。',6500);
openNovelaiSettings();
return false;
}
if(!panelCount()){
var pages=typeof btmGetGuidsSize==='function'?btmGetGuidsSize():1;
if(!pages||pages<=1){
if(typeof createToastError==='function')createToastError('还没有分镜格','模拟器是假界面，不能当格子出图。请先点左侧「模板」选分镜，或在剧情里点「生成漫画分镜」。',7000);
return false;
}
}
return true;
}

function confirmSpend(actionLabel){
if(!generatePreflight())return false;
return window.confirm('将用 NovelAI '+(actionLabel||'生成这一格')+'。会花积分，确定吗？');
}

function bindTokenBadge(){
var badge=typeof document!=='undefined'?document.getElementById('naiTokenBadge'):null;
var input=typeof document!=='undefined'?document.getElementById('novelaiApiKey'):null;
if(badge&&badge.getAttribute('data-bound')!=='1'){
badge.setAttribute('data-bound','1');
badge.addEventListener('click',function(){
openNovelaiSettings();
updateTokenBadge();
});
}
if(input&&input.getAttribute('data-token-badge')!=='1'){
input.setAttribute('data-token-badge','1');
input.addEventListener('input',updateTokenBadge);
input.addEventListener('change',updateTokenBadge);
}
updateTokenBadge();
}

function bindRememberToken(){
var box=typeof document!=='undefined'?document.getElementById('novelaiRememberToken'):null;
if(!box||box.getAttribute('data-bound')==='1')return;
box.setAttribute('data-bound','1');
try{box.checked=localStorage.getItem('nai_remember_token')!=='0';}catch(e){}
box.addEventListener('change',function(){
try{localStorage.setItem('nai_remember_token',box.checked?'1':'0');}catch(e){}
if(typeof saveSettingsLocalStrage==='function')saveSettingsLocalStrage(true);
updateTokenBadge();
});
}

function bindAiPanelToggle(){
var btn=typeof document!=='undefined'?document.getElementById('toggleAiPanelButton'):null;
var box=typeof document!=='undefined'?document.getElementById('view_controls_checkbox'):null;
if(!btn||!box||btn.getAttribute('data-bound')==='1')return;
btn.setAttribute('data-bound','1');
function sync(){
btn.classList.toggle('selected',!!box.checked);
}
btn.addEventListener('click',function(){
box.checked=!box.checked;
if(typeof changeView==='function')changeView('controls',box.checked);
sync();
});
box.addEventListener('change',sync);
sync();
}

function bindSpacePan(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-nai-space-pan')==='1')return;
document.documentElement.setAttribute('data-nai-space-pan','1');
var panning=false;
var startX=0;
var startY=0;
var startLeft=0;
var startTop=0;
function parent(){
return typeof document!=='undefined'?document.getElementById('resizable-container'):null;
}
function spaceDown(event){
if(event.code!=='Space'||isTypingTarget(event.target))return;
if(event.repeat)return;
event.preventDefault();
root.naiSpacePan=true;
var box=parent();
if(box)box.style.cursor='grab';
}
function spaceUp(event){
if(event.code!=='Space')return;
root.naiSpacePan=false;
panning=false;
var box=parent();
if(box)box.style.cursor='';
}
function pointerDown(event){
if(!root.naiSpacePan)return;
var box=parent();
if(!box)return;
event.preventDefault();
panning=true;
startX=event.clientX;
startY=event.clientY;
startLeft=box.scrollLeft;
startTop=box.scrollTop;
box.style.cursor='grabbing';
}
function pointerMove(event){
if(!panning)return;
var box=parent();
if(!box)return;
box.scrollLeft=startLeft-(event.clientX-startX);
box.scrollTop=startTop-(event.clientY-startY);
}
function pointerUp(){
panning=false;
var box=parent();
if(box)box.style.cursor=root.naiSpacePan?'grab':'';
}
document.addEventListener('keydown',spaceDown);
document.addEventListener('keyup',spaceUp);
document.addEventListener('mousedown',pointerDown,true);
document.addEventListener('mousemove',pointerMove);
document.addEventListener('mouseup',pointerUp);
}

function bind(){
if(typeof document==='undefined'||document.documentElement.getAttribute('data-nai-beginner')==='1')return;
document.documentElement.setAttribute('data-nai-beginner','1');
document.addEventListener('keydown',onKey);
bindSpacePan();
updateHud();
bindCanvasHint();
bindAiPanelToggle();
bindTokenBadge();
bindRememberToken();
setTimeout(updateHud,80);
setTimeout(updateHud,500);
setTimeout(bindCanvasHint,800);
setTimeout(bindEmptyHintActions,800);
setTimeout(updateTokenBadge,1200);
var pageBtn=document.getElementById('layerSelectPageButton');
if(pageBtn&&pageBtn.getAttribute('data-bound')!=='1'){
pageBtn.setAttribute('data-bound','1');
pageBtn.addEventListener('click',function(){selectWholePage();});
}
}

root.NaiBeginnerGuide={
updateHud:updateHud,
exitDrawing:exitDrawing,
onTemplateInserted:onTemplateInserted,
selectWholePage:selectWholePage,
selectPageById:selectPageById,
flashHelp:flashHelp,
updateEmptyHint:updateEmptyHint,
dismissEmptyHint:dismissEmptyHint,
updateTokenBadge:updateTokenBadge,
generatePreflight:generatePreflight,
confirmSpend:confirmSpend,
hasNovelaiToken:hasNovelaiToken
};

if(typeof document!=='undefined'){
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
}
})(typeof window!=='undefined'?window:globalThis);
