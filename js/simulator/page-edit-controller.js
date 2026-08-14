(function(root){
"use strict";

var initialized=false;

function canvas(){
return root.canvas||(typeof window!=='undefined'?window.canvas:null);
}

function isEditableText(object){
if(!object)return false;
var type=object.type;
return type==='i-text'||type==='textbox'||type==='text'||typeof object.enterEditing==='function';
}

function bindPageDrag(current){
current.on('mouse:down',function(opt){
var target=opt&&opt.target;
if(!target||target.type==='activeSelection')return;
if(target.simulatorRole!=='page'||!target.simulatorPageId)return;
target.__naiPageDrag={
left:Number(target.left)||0,
top:Number(target.top)||0,
peers:current.getObjects().filter(function(item){
return item&&item!==target&&item.simulatorPageId===target.simulatorPageId;
}).map(function(item){
return {obj:item,left:Number(item.left)||0,top:Number(item.top)||0};
})
};
});
current.on('object:moving',function(opt){
var target=opt&&opt.target;
var drag=target&&target.__naiPageDrag;
if(!drag)return;
var dx=(Number(target.left)||0)-drag.left;
var dy=(Number(target.top)||0)-drag.top;
drag.peers.forEach(function(peer){
peer.obj.set({left:peer.left+dx,top:peer.top+dy});
if(typeof peer.obj.setCoords==='function')peer.obj.setCoords();
});
});
current.on('mouse:up',function(opt){
var target=opt&&opt.target;
if(target)target.__naiPageDrag=null;
});
current.on('mouse:dblclick',function(opt){
var target=opt&&opt.target;
if(!target||!target.simulatorPageId)return;
if(isEditableText(target)){
current.setActiveObject(target);
if(typeof target.enterEditing==='function')target.enterEditing();
if(typeof target.selectAll==='function')target.selectAll();
if(typeof current.requestRenderAll==='function')current.requestRenderAll();
else current.renderAll();
return;
}
var factory=root.NaiComicExtraRendererFactory;
if(factory&&typeof factory.selectPage==='function')factory.selectPage(current,target.simulatorPageId);
});
current.on('selection:created',expandPageSelection);
current.on('selection:updated',expandPageSelection);
}

function expandPageSelection(opt){
var current=canvas();
var target=opt&&opt.target;
if(!current||!target||target.type==='activeSelection')return;
if(target.simulatorRole!=='page'||!target.simulatorPageId)return;
var factory=root.NaiComicExtraRendererFactory;
if(factory&&typeof factory.selectPage==='function')factory.selectPage(current,target.simulatorPageId);
}

function bind(){
if(initialized)return;
var current=canvas();
if(!current||typeof current.on!=='function')return;
initialized=true;
current.__naiPageEditBound=true;
bindPageDrag(current);
}

root.NaiComicPageEditController={bind:bind};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
