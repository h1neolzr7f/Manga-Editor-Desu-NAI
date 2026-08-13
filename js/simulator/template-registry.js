(function(root){
"use strict";

var templates=Object.create(null);

function clone(value){
return JSON.parse(JSON.stringify(value));
}

function validate(template){
var errors=[];
if(!template||typeof template!=='object')return ['模板必须是对象'];
if(!template.id)errors.push('模板缺少 id');
if(!template.name)errors.push('模板缺少 name');
if(!template.category)errors.push('模板缺少 category');
if(!template.schemaVersion)errors.push('模板缺少 schemaVersion');
if(!template.canvas||!Number.isFinite(Number(template.canvas.width))||!Number.isFinite(Number(template.canvas.height))){
errors.push('模板缺少有效 canvas 尺寸');
}
if(!template.theme||typeof template.theme!=='object')errors.push('模板缺少 theme');
if(!Array.isArray(template.editableFields))errors.push('模板缺少 editableFields');
if(!template.license||typeof template.license!=='object')errors.push('模板缺少 license');
return errors;
}

function register(template){
var errors=validate(template);
if(errors.length)throw new Error('无法注册模板：'+errors.join('；'));
if(templates[template.id])throw new Error('模板已注册：'+template.id);
templates[template.id]=clone(template);
return get(template.id);
}

function get(id){
return templates[id]?clone(templates[id]):null;
}

function list(category){
return Object.keys(templates).map(function(id){return templates[id];}).filter(function(template){
return !category||template.category===category;
}).map(clone);
}

var genericChatDark={
schemaVersion:1,
id:'generic-chat-dark',
name:'通用深色聊天',
category:'chat',
canvas:{width:1000,height:1800,background:'#111827'},
theme:{
fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
primaryColor:'#f8fafc',
secondaryColor:'#94a3b8',
accentColor:'#38bdf8',
leftBubble:'#243244',
rightBubble:'#075985',
systemBubble:'#334155',
background:'#111827',
headerBackground:'#0f172a',
bubbleRadius:22
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
};

register(genericChatDark);

root.NaiComicTemplateRegistry={
register:register,
get:get,
list:list,
validate:validate,
clone:clone,
GENERIC_CHAT_ID:genericChatDark.id
};
})(typeof window!=='undefined'?window:globalThis);
