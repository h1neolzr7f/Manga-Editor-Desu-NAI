// event-delegator.js - document-level event delegation utility

var EventDelegator={
_handlers:{},

register:function(action,handler){
if(typeof handler!=='function'){
delegatorLogger.warn("handler is not a function for action: "+action);
return;
}
EventDelegator._handlers[action]=handler;
},

_findActionElement:function(target){
var el=target;
while(el&&el!==document){
if(el.dataset&&el.dataset.action){
return el;
}
el=el.parentElement;
}
return null;
},

_onClick:function(e){
var actionEl=EventDelegator._findActionElement(e.target);
if(!actionEl)return;
var action=actionEl.dataset.action;
var handler=EventDelegator._handlers[action];
if(!handler){
delegatorLogger.warn("no handler registered for action: "+action);
return;
}
handler(actionEl,e);
},

init:function(){
document.addEventListener('click',EventDelegator._onClick);
delegatorLogger.debug("initialized");
}
};

document.addEventListener("DOMContentLoaded",function(){
EventDelegator.init();

EventDelegator.register('toggleVisibility',function(el){
var target=el.dataset.target;
if(target){
toggleVisibility(target);
}
});

EventDelegator.register('flipHorizontally',function(){
flipHorizontally();
});

EventDelegator.register('flipVertically',function(){
flipVertically();
});

EventDelegator.register('selectBrush',function(el){
if(typeof selectSidebarBrush==='function')selectSidebarBrush(el.dataset.brush,el.dataset.target||'tool-area');
});

EventDelegator.register('selectMove',function(){
if(typeof selectMoveTool==='function')selectMoveTool();
});

EventDelegator.register('selectEraser',function(){
if(typeof selectEraserTool==='function')selectEraserTool();
});

EventDelegator.register('selectMarquee',function(){
if(window.NaiPsTools)window.NaiPsTools.selectObjectMarquee();
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
});

EventDelegator.register('selectCrop',function(){
if(window.NaiPsTools)window.NaiPsTools.selectCrop(false);
else if(typeof selectMarqueeTool==='function')selectMarqueeTool(false);
});

EventDelegator.register('selectKnife',function(){
if(window.NaiPsTools)window.NaiPsTools.selectKnife();
else if(typeof ModeManager!=='undefined'&&ModeManager.knife)ModeManager.knife.toggle();
});

EventDelegator.register('openSimulatorStudio',function(){
var studio=window.NaiComicSimulatorStudio;
if(!studio||typeof studio.open!=='function')return;
if(typeof studio.isOpen==='function'&&studio.isOpen())studio.close();
else studio.open();
});
});
