(function(root){
"use strict";

var renderers=Object.create(null);

function fabric(){
if(!root.fabric)throw new Error('Fabric.js 尚未加载。');
return root.fabric;
}

function isPageTemplate(definition){
if(!definition)return false;
var category=definition.category||'';
var id=definition.id||'';
return category==='video-tube'||category==='danmaku-player'||category==='image-board'||/video-tube|danmaku-player|image-board/.test(id);
}

function text(value,options){
var api=fabric();
var config=Object.assign({
fontFamily:'system-ui',
fontSize:24,
fill:'#f8fafc',
originX:'left',
originY:'top',
editable:true,
selectable:true,
evented:true,
objectCaching:false
},options||{});
var Ctor;
if(config.width&&api.Textbox)Ctor=api.Textbox;
else if(api.IText)Ctor=api.IText;
else Ctor=api.Textbox||api.Text;
return new Ctor(String(value||''),config);
}

function rect(options){
return new (fabric().Rect)(Object.assign({
originX:'left',
originY:'top',
selectable:true,
evented:true,
objectCaching:false
},options||{}));
}

function panel(options){
return rect(Object.assign({
isPanel:true,
strokeUniform:true,
simulatorRole:'panel',
name:'画面格'
},options||{}));
}

function loadImage(src){
return new Promise(function(resolve){
if(!src){resolve(null);return;}
try{
fabric().Image.fromURL(src,function(image){resolve(image||null);});
}catch(error){resolve(null);}
});
}

function fitImage(image,maxWidth,maxHeight){
var width=Number(image.width)||1,height=Number(image.height)||1,scale=Math.min(maxWidth/width,maxHeight/height,1);
image.set({scaleX:scale,scaleY:scale});
return {width:width*scale,height:height*scale};
}

function partName(item,index,payload,role){
if(item&&item.name)return item.name;
if(role==='page')return payload.name||'页面底';
if(item&&item.isPanel)return '画面格';
if(item&&item.text)return String(item.text).slice(0,16);
return '零件 '+(index+1);
}

function applyPartInteraction(item,role){
if(!item||typeof item.set!=='function')return;
var isPage=role==='page'||item.simulatorRole==='page';
item.set({
selectable:true,
evented:!isPage,
objectCaching:false,
hasControls:true,
hasBorders:true
});
}

function tagParts(items,payload,pageId,explode){
(items||[]).forEach(function(item,index){
if(!item||typeof item.set!=='function')return;
var role=item.simulatorRole||(index===0?'page':(item.isPanel?'panel':'part'));
var part={
simulatorPageId:pageId,
simulatorType:payload.simulatorType,
simulatorSchemaVersion:payload.simulatorSchemaVersion,
simulatorTemplateId:payload.simulatorTemplateId,
simulatorEditable:true,
simulatorScene:payload.simulatorScene,
simulatorPartIndex:index,
simulatorRole:role,
selectable:true,
evented:role!=='page',
objectCaching:false,
hasControls:true,
hasBorders:true,
name:partName(item,index,payload,role)
};
if(payload.simulatorStory)part.simulatorStory=payload.simulatorStory;
if(explode){
var pageType=payload.customType||'simulatorExtra';
part.customType=role==='page'?pageType:(pageType==='simulatorChat'?'simulatorChatPart':'simulatorExtraPart');
part.simulatorExplode=true;
}
item.set(part);
applyPartInteraction(item,role);
if(typeof getGUID==='function')getGUID(item);
});
}

function makeGroup(items,definition,scene){
var api=fabric();
var explode=true;
var pageId='page_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
var payload={
customType:'simulatorExtra',
simulatorType:definition.category,
simulatorSchemaVersion:1,
simulatorTemplateId:definition.id,
simulatorEditable:true,
simulatorScene:root.NaiComicSceneSerializer.serialize(scene),
simulatorPageId:pageId,
simulatorExplode:explode,
name:'模拟器：'+definition.name
};
if(scene&&scene.story)payload.simulatorStory=typeof scene.story==='string'?scene.story:JSON.stringify(scene.story);
tagParts(items,payload,pageId,explode);
var group=new api.Group(items,{left:0,top:0,originX:'left',originY:'top',objectCaching:false,subTargetCheck:true,interactive:true});
group.set(payload);
var parentGuid=typeof getGUID==='function'?getGUID(group):('simulator_'+Date.now().toString(36));
group.guids=[];
if(typeof group.getObjects==='function')group.getObjects().forEach(function(child,index){
var childGuid=typeof getGUID==='function'?getGUID(child):parentGuid+'_child_'+index;
child.simulatorParentGuid=parentGuid;
group.guids.push(childGuid);
});
return group;
}

function fitGroup(group,canvas){
if(root.NaiComicChatRenderer&&typeof root.NaiComicChatRenderer.fitGroupToCanvas==='function'){
return root.NaiComicChatRenderer.fitGroupToCanvas(group,canvas);
}
var width=Number(group.width)||1,height=Number(group.height)||1,maxWidth=(Number(canvas.width)||1000)-40,maxHeight=(Number(canvas.height)||1000)-40,scale=Math.min(maxWidth/width,maxHeight/height,1);
group.set({scaleX:scale,scaleY:scale,left:((Number(canvas.width)||1000)-width*scale)/2,top:((Number(canvas.height)||1000)-height*scale)/2});
if(typeof group.setCoords==='function')group.setCoords();
return group;
}

function pageObjects(canvas,pageId){
if(!canvas||!pageId||typeof canvas.getObjects!=='function')return [];
return canvas.getObjects().filter(function(item){return item&&item.simulatorPageId===pageId;});
}

function pageBounds(canvas,pageId){
var objects=pageObjects(canvas,pageId);
if(!objects.length)return null;
var minL=Infinity,minT=Infinity,maxR=-Infinity,maxB=-Infinity;
objects.forEach(function(obj){
var box=typeof obj.getBoundingRect==='function'?obj.getBoundingRect(true,true):{left:Number(obj.left)||0,top:Number(obj.top)||0,width:(Number(obj.width)||0)*(Number(obj.scaleX)||1),height:(Number(obj.height)||0)*(Number(obj.scaleY)||1)};
minL=Math.min(minL,box.left);
minT=Math.min(minT,box.top);
maxR=Math.max(maxR,box.left+box.width);
maxB=Math.max(maxB,box.top+box.height);
});
if(!isFinite(minL))return null;
return {left:minL,top:minT,width:Math.max(1,maxR-minL),height:Math.max(1,maxB-minT)};
}

function pageView(canvas,pageId){
var objects=pageObjects(canvas,pageId);
var bounds=pageBounds(canvas,pageId);
if(!objects.length||!bounds)return null;
var root=null;
objects.forEach(function(item){
if(item.simulatorRole==='page')root=item;
});
if(!root)objects.forEach(function(item){if(item.customType==='simulatorExtra'||item.customType==='simulatorChat')root=item;});
root=root||objects[0];
return {
left:bounds.left,
top:bounds.top,
width:bounds.width,
height:bounds.height,
scaleX:1,
scaleY:1,
guid:root.guid,
name:root.name,
simulatorPageId:pageId,
simulatorScene:root.simulatorScene,
simulatorStory:root.simulatorStory,
simulatorTemplateId:root.simulatorTemplateId,
simulatorType:root.simulatorType,
customType:'simulatorExtra',
getBoundingRect:function(){return {left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height};},
getObjects:function(){return objects;},
getScaledHeight:function(){return bounds.height;}
};
}

function removePage(canvas,pageId){
if(!canvas||!pageId||typeof canvas.getObjects!=='function')return 0;
var removed=0;
canvas.getObjects().slice().forEach(function(obj){
if(obj&&obj.simulatorPageId===pageId){
canvas.remove(obj);
removed+=1;
}
});
return removed;
}

function selectPage(canvas,pageId){
var objects=pageObjects(canvas,pageId);
if(!objects.length||!canvas)return null;
var api=fabric();
if(objects.length===1||!api.ActiveSelection){
canvas.setActiveObject(objects[0]);
}else{
var sel=new api.ActiveSelection(objects,{canvas:canvas});
canvas.setActiveObject(sel);
}
if(typeof canvas.requestRenderAll==='function')canvas.requestRenderAll();
else if(typeof canvas.renderAll==='function')canvas.renderAll();
return objects;
}

function resolvePage(object,canvas){
if(!object)return null;
if(object.type==='activeSelection'&&typeof object.getObjects==='function'){
var picked=null;
object.getObjects().some(function(item){
if(item&&(item.simulatorPageId||item.customType==='simulatorExtra'||item.customType==='simulatorExtraPart'||item.customType==='simulatorChat')){
picked=item;
return true;
}
return false;
});
if(picked)object=picked;
}
if(object.group&&(object.group.customType==='simulatorChat'||object.group.customType==='simulatorExtra'))return object.group;
if(object.customType==='simulatorChat')return object;
var pageId=object.simulatorPageId;
if(pageId&&canvas&&typeof canvas.getObjects==='function'){
var parts=pageObjects(canvas,pageId);
var root=null;
parts.forEach(function(item){
if(item.simulatorRole==='page')root=item;
});
if(!root)parts.forEach(function(item){if(item.customType==='simulatorExtra'||item.customType==='simulatorChat')root=item;});
return root||object;
}
if(object.customType==='simulatorExtra'||object.customType==='simulatorExtraPart'||object.customType==='simulatorChatPart')return object;
return null;
}

function withSkippedAdjust(fn){
var had=typeof skipForcedAdjust!=='undefined';
var previous=had?skipForcedAdjust:false;
if(had)skipForcedAdjust=true;
try{return fn();}
finally{
if(had)skipForcedAdjust=previous;
}
}

function isFabricGroup(obj){
return !!(obj&&(obj.type==='group'||obj.type==='activeSelection')&&typeof obj.getObjects==='function');
}

function inheritPageMeta(obj,parent){
if(!obj||!parent)return;
['simulatorPageId','simulatorType','simulatorSchemaVersion','simulatorTemplateId','simulatorEditable','simulatorScene','simulatorStory','simulatorExplode'].forEach(function(key){
if((obj[key]===undefined||obj[key]===null||obj[key]==='')&&parent[key]!=null&&parent[key]!=='')obj[key]=parent[key];
});
if(!obj.customType&&parent.customType){
obj.customType=parent.customType==='simulatorChat'?'simulatorChatPart':(parent.customType==='simulatorExtra'?'simulatorExtraPart':parent.customType);
}
if(typeof obj.set==='function')applyPartInteraction(obj,obj.simulatorRole);
}

function flattenGroup(group){
var objects=typeof group.getObjects==='function'?group.getObjects().concat():[];
if(typeof group.destroy==='function')group.destroy();
else if(typeof group._restoreObjectsState==='function')group._restoreObjectsState();
var flat=[];
objects.forEach(function(obj){
if(!obj)return;
if(obj.group)delete obj.group;
inheritPageMeta(obj,group);
if(isFabricGroup(obj)&&obj.getObjects().length){
flattenGroup(obj).forEach(function(child){flat.push(child);});
}else{
obj.simulatorExploded=true;
flat.push(obj);
}
});
return flat;
}

function explodeOntoCanvas(group,canvas,origin){
if(!group||!canvas)return {root:group,objects:group?[group]:[]};
if(!group.getObjects||!group.getObjects().length){
canvas.add(group);
return {root:group,objects:[group]};
}
var groupGuid=group.guid;
var groupName=group.name;
var objects=withSkippedAdjust(function(){
var flat=flattenGroup(group);
flat.forEach(function(obj){
canvas.add(obj);
if(typeof saveInitialState==='function')saveInitialState(obj);
});
return flat;
});
var root=null;
objects.forEach(function(item){
if(item.simulatorRole==='page')root=item;
});
root=root||objects[0];
if(groupGuid)root.guid=groupGuid;
if(groupName)root.name=groupName;
if(origin&&root){
var dx=(Number(origin.left)||0)-(Number(root.left)||0);
var dy=(Number(origin.top)||0)-(Number(root.top)||0);
if(dx||dy){
objects.forEach(function(obj){
obj.set({left:(Number(obj.left)||0)+dx,top:(Number(obj.top)||0)+dy});
if(typeof obj.setCoords==='function')obj.setCoords();
});
}
}
return {root:root,objects:objects};
}

function objectOnCanvas(canvas,object){
if(!canvas||!object)return false;
if(object.canvas===canvas)return true;
if(typeof canvas.getObjects==='function')return canvas.getObjects().indexOf(object)>=0;
return false;
}

function scalePage(canvas,pageId,factor,origin){
var objects=pageObjects(canvas,pageId);
if(!objects.length)return false;
var bounds=pageBounds(canvas,pageId);
if(!bounds)return false;
var ox=origin&&Number.isFinite(origin.x)?origin.x:(bounds.left+bounds.width/2);
var oy=origin&&Number.isFinite(origin.y)?origin.y:(bounds.top+bounds.height/2);
factor=Number(factor);
if(!isFinite(factor)||factor<=0)return false;
objects.forEach(function(obj){
if(!obj||typeof obj.set!=='function')return;
var left=Number(obj.left)||0;
var top=Number(obj.top)||0;
obj.set({
left:ox+(left-ox)*factor,
top:oy+(top-oy)*factor,
scaleX:(Number(obj.scaleX)||1)*factor,
scaleY:(Number(obj.scaleY)||1)*factor
});
if(typeof obj.setCoords==='function')obj.setCoords();
});
if(typeof canvas.requestRenderAll==='function')canvas.requestRenderAll();
else if(typeof canvas.renderAll==='function')canvas.renderAll();
return true;
}

function movePage(canvas,pageId,dx,dy){
var objects=pageObjects(canvas,pageId);
if(!objects.length)return false;
objects.forEach(function(obj){
if(!obj||typeof obj.set!=='function')return;
obj.set({left:(Number(obj.left)||0)+dx,top:(Number(obj.top)||0)+dy});
if(typeof obj.setCoords==='function')obj.setCoords();
});
if(typeof canvas.requestRenderAll==='function')canvas.requestRenderAll();
else if(typeof canvas.renderAll==='function')canvas.renderAll();
return true;
}

function fitPageToRect(canvas,pageId,rect){
if(!rect)return false;
var bounds=pageBounds(canvas,pageId);
if(!bounds||!bounds.width||!bounds.height)return false;
var factor=Math.min(Number(rect.width)/bounds.width,Number(rect.height)/bounds.height);
if(!isFinite(factor)||factor<=0)return false;
scalePage(canvas,pageId,factor,{x:bounds.left,y:bounds.top});
var next=pageBounds(canvas,pageId);
if(!next)return true;
movePage(canvas,pageId,(Number(rect.left)||0)-next.left,(Number(rect.top)||0)-next.top);
return true;
}

function placeOnCanvas(group,canvas,options){
options=options||{};
if(!group||!canvas)return {root:group,objects:group?[group]:[]};
var previous=options.previous;
var replacePageId=options.replacePageId||(previous&&previous.simulatorPageId)||'';
if(options.fit!==false)fitGroup(group,canvas);
if(replacePageId)removePage(canvas,replacePageId);
else if(previous){
if(previous.simulatorPageId)removePage(canvas,previous.simulatorPageId);
else if(objectOnCanvas(canvas,previous))canvas.remove(previous);
}
if(group.simulatorExplode)return explodeOntoCanvas(group,canvas,options.origin);
canvas.add(group);
return {root:group,objects:[group]};
}

function baseDefinition(definition){
return Object.assign({schemaVersion:1,canvas:{width:1000,height:1800},theme:{fontFamily:'system-ui',primaryColor:'#f8fafc',secondaryColor:'#94a3b8',background:'#111827',accentColor:'#38bdf8'},editableFields:['title','events','theme'],assets:[],license:{type:'original',source:'',publicAllowed:true}},definition);
}

function register(renderer){
var definition=baseDefinition(renderer.definition);
if(root.NaiComicTemplateRegistry){
try{root.NaiComicTemplateRegistry.register(definition);}catch(error){if(!root.NaiComicTemplateRegistry.get(definition.id))throw error;}
}
renderers[definition.id]=Object.assign({},renderer,{definition:definition});
return renderers[definition.id];
}

function get(id){return renderers[id]||null;}
function list(){return Object.keys(renderers).map(function(id){return renderers[id];});}

root.NaiComicExtraRendererFactory={
fabric:fabric,
text:text,
rect:rect,
panel:panel,
loadImage:loadImage,
fitImage:fitImage,
makeGroup:makeGroup,
isPageTemplate:isPageTemplate,
tagParts:tagParts,
fitGroup:fitGroup,
pageObjects:pageObjects,
pageBounds:pageBounds,
pageView:pageView,
removePage:removePage,
resolvePage:resolvePage,
selectPage:selectPage,
explodeOntoCanvas:explodeOntoCanvas,
flattenGroup:flattenGroup,
placeOnCanvas:placeOnCanvas,
scalePage:scalePage,
movePage:movePage,
fitPageToRect:fitPageToRect,
baseDefinition:baseDefinition,
register:register,
get:get,
list:list
};
root.NaiComicExtraRendererRegistry={get:get,list:list};
})(typeof window!=='undefined'?window:globalThis);
