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
});
