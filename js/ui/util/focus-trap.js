// focus-trap.js - モーダル用フォーカストラップユーティリティ
var FocusTrap={
_activeTraps:[],
_focusableSelector:'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
create:function(container,closeCallback){
var trap={
container:container,
closeCallback:closeCallback,
previousFocus:null,
_keyHandler:null
};
return trap;
},
activate:function(trap){
trap.previousFocus=document.activeElement;
FocusTrap._activeTraps.push(trap);
trap._keyHandler=function(e){
FocusTrap._handleKey(e,trap);
};
trap.container.addEventListener('keydown',trap._keyHandler);
var focusable=FocusTrap._getFocusableElements(trap.container);
if(focusable.length>0){
focusable[0].focus();
}else{
trap.container.setAttribute('tabindex','-1');
trap.container.focus();
}
focusTrapLogger.debug("Focus trap activated");
},
deactivate:function(trap){
if(!trap) return;
if(trap._keyHandler){
trap.container.removeEventListener('keydown',trap._keyHandler);
trap._keyHandler=null;
}
var idx=FocusTrap._activeTraps.indexOf(trap);
if(idx!==-1){
FocusTrap._activeTraps.splice(idx,1);
}
if(trap.previousFocus&&trap.previousFocus.focus){
trap.previousFocus.focus();
}
focusTrapLogger.debug("Focus trap deactivated");
},
_getFocusableElements:function(container){
var elements=container.querySelectorAll(FocusTrap._focusableSelector);
var visible=[];
for(var i=0;i<elements.length;i++){
var el=elements[i];
if(el.offsetParent!==null||el.offsetWidth>0||el.offsetHeight>0){
visible.push(el);
}
}
return visible;
},
_handleKey:function(e,trap){
if(e.key==='Escape'){
e.preventDefault();
e.stopPropagation();
if(trap.closeCallback){
trap.closeCallback();
}
return;
}
if(e.key!=='Tab') return;
var focusable=FocusTrap._getFocusableElements(trap.container);
if(focusable.length===0){
e.preventDefault();
return;
}
var first=focusable[0];
var last=focusable[focusable.length-1];
if(e.shiftKey){
if(document.activeElement===first){
e.preventDefault();
last.focus();
}
}else{
if(document.activeElement===last){
e.preventDefault();
first.focus();
}
}
}
};
