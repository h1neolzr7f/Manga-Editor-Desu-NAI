(function(root){
"use strict";

var SCHEMA_VERSION=1;
var idCounter=0;

function clone(value){
return JSON.parse(JSON.stringify(value));
}

function createId(prefix){
idCounter+=1;
return prefix+'_'+Date.now().toString(36)+'_'+idCounter.toString(36);
}

function createDefaultScene(){
return {
schemaVersion:SCHEMA_VERSION,
sceneType:'chat',
templateId:'generic-chat-dark',
title:'夜间对话',
participants:[
{id:'character_a',name:'角色A',side:'left',avatar:''},
{id:'character_b',name:'角色B',side:'right',avatar:''}
],
messages:[
{id:'message_1',type:'text',speaker:'character_a',content:'你终于来了。',time:'22:31',image:'',status:''},
{id:'message_2',type:'text',speaker:'character_b',content:'我就在楼下。',time:'22:32',image:'',status:''}
]
};
}

function normalizeParticipant(participant,index){
participant=participant&&typeof participant==='object'?participant:{};
return {
id:String(participant.id||'character_'+(index+1)),
name:String(participant.name||('角色'+(index+1))),
side:participant.side==='right'?'right':'left',
avatar:typeof participant.avatar==='string'?participant.avatar:''
};
}

function normalizeMessage(message,index){
message=message&&typeof message==='object'?message:{};
var type=['text','image','system'].indexOf(message.type)>=0?message.type:'text';
return {
id:String(message.id||createId('message')),
type:type,
speaker:typeof message.speaker==='string'?message.speaker:'character_a',
content:typeof message.content==='string'?message.content:'',
image:typeof message.image==='string'?message.image:'',
time:typeof message.time==='string'?message.time:'',
status:typeof message.status==='string'?message.status:''
};
}

function normalizeScene(scene){
var source=scene&&typeof scene==='object'?clone(scene):createDefaultScene();
var defaults=createDefaultScene();
var participants=Array.isArray(source.participants)?source.participants:defaults.participants;
var messages=Array.isArray(source.messages)?source.messages:defaults.messages;
return {
schemaVersion:SCHEMA_VERSION,
sceneType:'chat',
templateId:String(source.templateId||defaults.templateId),
title:String(source.title||defaults.title),
theme:source.theme&&typeof source.theme==='object'?clone(source.theme):undefined,
participants:participants.map(normalizeParticipant),
messages:messages.map(normalizeMessage)
};
}

function validateScene(scene){
var normalized=normalizeScene(scene);
var errors=[];
var warnings=[];
var ids=Object.create(null);
if(normalized.participants.length===0)errors.push('至少需要一个角色');
normalized.participants.forEach(function(participant){
if(ids[participant.id])errors.push('角色 ID 重复：'+participant.id);
ids[participant.id]=true;
if(!participant.name.trim())warnings.push('存在未命名角色：'+participant.id);
});
normalized.messages.forEach(function(message,index){
if(message.type!=='system'&&!ids[message.speaker])errors.push('第 '+(index+1)+' 条消息引用了已删除角色：'+message.speaker);
if(message.type==='image'&&!message.image)warnings.push('第 '+(index+1)+' 条图片消息还没有图片资源');
if(message.type!=='image'&&!message.content.trim())warnings.push('第 '+(index+1)+' 条消息内容为空');
});
return {ok:errors.length===0,errors:errors,warnings:warnings,scene:normalized};
}

function getParticipant(scene,id){
var normalized=normalizeScene(scene);
return normalized.participants.find(function(participant){return participant.id===id;})||null;
}

function getMissingSpeakerIds(scene){
var normalized=normalizeScene(scene);
var ids=Object.create(null);
normalized.participants.forEach(function(participant){ids[participant.id]=true;});
return normalized.messages.map(function(message){return message.speaker;}).filter(function(id,index,array){
return id&&!ids[id]&&array.indexOf(id)===index;
});
}

function serialize(scene){
return JSON.stringify(normalizeScene(scene));
}

function deserialize(value){
if(typeof value==='object'&&value!==null)return normalizeScene(value);
try{return normalizeScene(JSON.parse(value));}catch(error){throw new Error('聊天场景数据无效：'+error.message);}
}

root.NaiComicChatScene={
SCHEMA_VERSION:SCHEMA_VERSION,
clone:clone,
createDefaultScene:createDefaultScene,
normalize:normalizeScene,
validate:validateScene,
getParticipant:getParticipant,
getMissingSpeakerIds:getMissingSpeakerIds,
serialize:serialize,
deserialize:deserialize
};
})(typeof window!=='undefined'?window:globalThis);
