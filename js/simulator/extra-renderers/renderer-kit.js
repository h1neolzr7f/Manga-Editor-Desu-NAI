(function(root){
"use strict";

var SCHEMA_VERSION=1;
var guidCounter=0;

function getSceneApi(){
if(!root.NaiComicChatScene||typeof root.NaiComicChatScene.clone!=='function')throw new Error('NaiComicChatScene 尚未加载，无法使用扩展模拟器。');
return root.NaiComicChatScene;
}

function clone(value){
return getSceneApi().clone(value);
}

function readScene(scene){
if(typeof scene==='string'){
try{return readScene(JSON.parse(scene));}catch(error){throw new Error('扩展模拟器场景数据无效：'+error.message);}
}
if(scene&&typeof scene==='object')return clone(scene);
return {};
}

function textValue(value,fallback){
if(typeof value==='string')return value;
if(value===undefined||value===null)return fallback||'';
return String(value);
}

function numberValue(value,fallback){
var number=Number(value);
return Number.isFinite(number)?number:fallback;
}

function integerValue(value,fallback){
var number=numberValue(value,fallback);
return Math.max(0,Math.round(number));
}

function normalizeParticipant(participant,index){
participant=participant&&typeof participant==='object'?participant:{};
return {
id:textValue(participant.id,'character_'+(index+1)),
name:textValue(participant.name,'角色'+(index+1)),
side:participant.side==='right'?'right':'left',
avatar:textValue(participant.avatar,'')
};
}

function normalizeParticipants(value,defaults){
var source=Array.isArray(value)?value:(Array.isArray(defaults)?defaults:[]);
return source.map(normalizeParticipant);
}

function normalizeMessage(message,index,types,defaultType){
message=message&&typeof message==='object'?message:{};
var type=textValue(message.type,defaultType);
if(types.indexOf(type)<0)type=defaultType;
return {
id:textValue(message.id,'message_'+(index+1)),
type:type,
speaker:textValue(message.speaker,''),
content:textValue(message.content,''),
image:textValue(message.image,''),
time:textValue(message.time,''),
status:textValue(message.status,'')
};
}

function normalizeBaseScene(scene,options){
var source=readScene(scene);
var defaults=options.defaults||{};
var rawMessages=Array.isArray(source.messages)?source.messages:(Array.isArray(defaults.messages)?defaults.messages:[]);
var normalized={
schemaVersion:SCHEMA_VERSION,
sceneType:options.sceneType,
templateId:options.templateId,
title:textValue(source.title,options.title),
participants:normalizeParticipants(source.participants,defaults.participants),
messages:rawMessages.map(function(message,index){
return normalizeMessage(message,index,options.messageTypes,options.defaultMessageType);
})
};
if(source.theme&&typeof source.theme==='object')normalized.theme=clone(source.theme);
return normalized;
}

function validateParticipantsAndMessages(scene,options){
var errors=[];
var warnings=[];
var participantIds=Object.create(null);
var messageIds=Object.create(null);
var speakerTypes=options.speakerTypes||[];
if(scene.participants.length===0)errors.push('至少需要一个角色');
scene.participants.forEach(function(participant){
if(participantIds[participant.id])errors.push('角色 ID 重复：'+participant.id);
participantIds[participant.id]=true;
if(!participant.name.trim())warnings.push('存在未命名角色：'+participant.id);
});
scene.messages.forEach(function(message,index){
var label='第 '+(index+1)+' 条内容';
var requiresSpeaker=speakerTypes.indexOf(message.type)>=0;
if(messageIds[message.id])errors.push('消息 ID 重复：'+message.id);
messageIds[message.id]=true;
if(requiresSpeaker&&!message.speaker)errors.push(label+'缺少角色');
if(message.speaker&&!participantIds[message.speaker])errors.push(label+'引用了已删除角色：'+message.speaker);
if(!message.content.trim()&&!options.allowEmptyTypes.includes(message.type))warnings.push(label+'内容为空');
});
return {ok:errors.length===0,errors:errors,warnings:warnings,scene:scene};
}

function getTheme(template,scene){
return Object.assign({},template.theme,scene.theme||{});
}

function getTemplate(template){
if(!root.NaiComicTemplateRegistry||typeof root.NaiComicTemplateRegistry.get!=='function')throw new Error('NaiComicTemplateRegistry 尚未加载，无法注册扩展模板。');
var registered=root.NaiComicTemplateRegistry.get(template.id);
if(!registered)throw new Error('扩展模板未注册：'+template.id);
return registered;
}

function registerTemplate(template){
if(!root.NaiComicTemplateRegistry||typeof root.NaiComicTemplateRegistry.get!=='function'||typeof root.NaiComicTemplateRegistry.register!=='function')throw new Error('NaiComicTemplateRegistry 尚未加载，无法注册扩展模板。');
var registered=root.NaiComicTemplateRegistry.get(template.id);
return registered||root.NaiComicTemplateRegistry.register(template);
}

function getFabric(){
if(!root.fabric||typeof root.fabric.Group!=='function')throw new Error('Fabric.js 尚未加载，无法渲染扩展模拟器。');
return root.fabric;
}

function setProperties(object,properties){
if(typeof object.set==='function')object.set(properties);else Object.assign(object,properties);
return object;
}

function makeRect(fabric,options){
if(typeof fabric.Rect!=='function')throw new Error('Fabric.js Rect 不可用。');
return new fabric.Rect(options);
}

function makeCircle(fabric,options){
if(typeof fabric.Circle!=='function')throw new Error('Fabric.js Circle 不可用。');
return new fabric.Circle(options);
}

function makeText(fabric,value,options){
var config=Object.assign({fontFamily:'system-ui, sans-serif',fontSize:24,fill:'#fff',originX:'left',originY:'top'},options||{});
if(typeof fabric.Textbox==='function')return new fabric.Textbox(textValue(value,''),config);
if(typeof fabric.Text==='function')return new fabric.Text(textValue(value,''),config);
throw new Error('Fabric.js Text/Textbox 不可用。');
}

function makeGroup(fabric,items,options){
if(typeof fabric.Group!=='function')throw new Error('Fabric.js Group 不可用。');
return new fabric.Group(items,options||{});
}

function ensureGuid(object,prefix){
if(typeof root.getGUID==='function')return root.getGUID(object);
if(object.guid)return object.guid;
guidCounter+=1;
object.guid=prefix+'_'+guidCounter.toString(36);
return object.guid;
}

function attachMetadata(group,scene,template,rendererId){
var metadata={
customType:'simulatorExtra',
simulatorType:rendererId,
simulatorRenderer:rendererId,
simulatorSchemaVersion:SCHEMA_VERSION,
simulatorTemplateId:template.id,
simulatorEditable:true,
simulatorScene:JSON.stringify(scene),
name:'模拟器：'+scene.title
};
setProperties(group,metadata);
var parentGuid=ensureGuid(group,'simulator_'+rendererId.replace(/[^a-z0-9]/gi,'_'));
var childGuids=[];
if(typeof group.getObjects==='function')group.getObjects().forEach(function(child,index){
var childGuid=ensureGuid(child,parentGuid+'_child_'+index);
setProperties(child,{simulatorParentGuid:parentGuid});
childGuids.push(childGuid);
});
setProperties(group,{guids:childGuids});
if(typeof group.toObject==='function'&&!group.__naiExtraToObjectWrapped){
var originalToObject=group.toObject.bind(group);
group.toObject=function(properties){
var serialized=originalToObject(properties);
Object.keys(metadata).forEach(function(key){serialized[key]=metadata[key];});
serialized.guid=group.guid;
serialized.guids=group.guids.slice();
return serialized;
};
group.__naiExtraToObjectWrapped=true;
}
return group;
}

function addToCanvas(canvas,group){
if(canvas&&typeof canvas.add==='function'){
canvas.add(group);
if(typeof canvas.requestRenderAll==='function')canvas.requestRenderAll();
else if(typeof canvas.renderAll==='function')canvas.renderAll();
}
return group;
}

function registerRenderer(renderer){
if(!renderer||!renderer.id)throw new Error('扩展 renderer 缺少 id。');
var map=root.NaiComicExtraRenderers||(root.NaiComicExtraRenderers=Object.create(null));
if(!map[renderer.id])map[renderer.id]=renderer;
if(!root.NaiComicExtraRendererRegistry){
root.NaiComicExtraRendererRegistry={
register:registerRenderer,
get:function(id){return map[id]||null;},
list:function(){return Object.keys(map).map(function(id){return map[id];});}
};
}
return map[renderer.id];
}

root.NaiComicExtraRendererKit={
SCHEMA_VERSION:SCHEMA_VERSION,
clone:clone,
readScene:readScene,
textValue:textValue,
numberValue:numberValue,
integerValue:integerValue,
normalizeBaseScene:normalizeBaseScene,
validateParticipantsAndMessages:validateParticipantsAndMessages,
getTheme:getTheme,
getTemplate:getTemplate,
registerTemplate:registerTemplate,
getFabric:getFabric,
setProperties:setProperties,
makeRect:makeRect,
makeCircle:makeCircle,
makeText:makeText,
makeGroup:makeGroup,
attachMetadata:attachMetadata,
addToCanvas:addToCanvas,
registerRenderer:registerRenderer
};
})(typeof window!=='undefined'?window:globalThis);
