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

register({
schemaVersion:1,
id:'story-log-dark',
name:'剧情对话日志',
category:'chat',
layout:'story-log',
canvas:{width:1000,height:1800,background:'#0b1220'},
theme:{
fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
primaryColor:'#f8fafc',
secondaryColor:'#94a3b8',
accentColor:'#fbbf24',
leftBubble:'#1e293b',
rightBubble:'#1e293b',
systemBubble:'#334155',
background:'#0b1220',
headerBackground:'#020617',
bubbleRadius:8,
showName:true,
layout:'story-log'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'discord-chat-dark',
name:'类频道聊天',
category:'chat',
layout:'discord',
canvas:{width:1000,height:1800,background:'#313338'},
theme:{
fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
primaryColor:'#f2f3f5',
secondaryColor:'#b5bac1',
accentColor:'#5865f2',
leftBubble:'transparent',
rightBubble:'transparent',
systemBubble:'#3f4147',
background:'#313338',
headerBackground:'#2b2d31',
bubbleRadius:8,
showName:true,
layout:'discord'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'instant-chat-light',
name:'类即时通讯',
category:'chat',
layout:'bubble',
canvas:{width:1000,height:1800,background:'#ededed'},
theme:{
fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
primaryColor:'#111827',
secondaryColor:'#6b7280',
accentColor:'#07c160',
leftBubble:'#ffffff',
rightBubble:'#95ec69',
systemBubble:'#d1d5db',
background:'#ededed',
headerBackground:'#f7f7f7',
bubbleRadius:8,
showName:false,
layout:'bubble'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'sms-chat-light',
name:'手机短信',
category:'chat',
layout:'sms',
canvas:{width:1000,height:1800,background:'#0f172a'},
theme:{
fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
primaryColor:'#111827',
secondaryColor:'#6b7280',
accentColor:'#1982fc',
leftBubble:'#e5e5ea',
rightBubble:'#1982fc',
systemBubble:'#d1d5db',
background:'#f2f2f7',
headerBackground:'#ffffff',
bubbleRadius:22,
showName:false,
layout:'sms'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'night-radio-dark',
name:'夜间电台日志',
category:'chat',
layout:'story-log',
canvas:{width:1000,height:1800,background:'#07140f'},
theme:{
fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
primaryColor:'#bbf7d0',
secondaryColor:'#4ade80',
accentColor:'#86efac',
leftBubble:'#052e16',
rightBubble:'#052e16',
systemBubble:'#14532d',
background:'#07140f',
headerBackground:'#022c22',
bubbleRadius:4,
showName:true,
layout:'story-log'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'newspaper-clip',
name:'剪报栏',
category:'chat',
layout:'story-log',
canvas:{width:1000,height:1800,background:'#f4ecd4'},
theme:{
fontFamily:'Georgia, "Times New Roman", serif',
primaryColor:'#1c1917',
secondaryColor:'#57534e',
accentColor:'#b45309',
leftBubble:'#fff7ed',
rightBubble:'#fff7ed',
systemBubble:'#e7e5e4',
background:'#f4ecd4',
headerBackground:'#e7dcc0',
bubbleRadius:2,
showName:true,
layout:'story-log'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

register({
schemaVersion:1,
id:'terminal-green',
name:'终端记录',
category:'chat',
layout:'story-log',
canvas:{width:1000,height:1800,background:'#020617'},
theme:{
fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
primaryColor:'#4ade80',
secondaryColor:'#86efac',
accentColor:'#22c55e',
leftBubble:'#022c22',
rightBubble:'#022c22',
systemBubble:'#14532d',
background:'#020617',
headerBackground:'#052e16',
bubbleRadius:0,
showName:true,
layout:'story-log'
},
editableFields:['title','participants','messages','theme'],
assets:[],
license:{type:'original',source:'',publicAllowed:true}
});

root.NaiComicTemplateRegistry={
register:register,
get:get,
list:list,
validate:validate,
clone:clone,
GENERIC_CHAT_ID:genericChatDark.id,
STORY_LOG_ID:'story-log-dark'
};
})(typeof window!=='undefined'?window:globalThis);
