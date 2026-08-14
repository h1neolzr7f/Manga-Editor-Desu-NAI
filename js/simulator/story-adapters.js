(function(root){
"use strict";

function engine(){
if(!root.NaiComicStoryEngine)throw new Error('剧情引擎尚未加载。');
return root.NaiComicStoryEngine;
}

function clone(value){
return engine().clone(value);
}

function speakerName(story,id){
var character=engine().getCharacter(story,id);
return character?character.name:(id||'旁白');
}

function nodeContent(node){
if(!node)return '';
if(node.type==='choice')return (node.choices||[]).map(function(choice){return choice.label;}).join('\n');
return node.content||'';
}

function toChat(story,templateId){
var value=engine().normalize(story);
var participants=value.characters.map(function(character,index){
return {
id:character.id,
name:character.name,
side:character.position==='right'?'right':'left',
avatar:character.avatar||''
};
});
if(!participants.length){
participants=[{id:'character_a',name:'角色A',side:'left',avatar:''}];
}
var messages=value.nodes.map(function(node,index){
var type='text';
if(node.type==='image')type='image';
else if(node.type==='narrator'||node.type==='hint'||node.type==='title'||node.type==='background')type='system';
else if(node.type==='aside')type='aside';
else if(node.type==='choice')type='choice';
else if(node.type==='speech')type='text';
return {
id:node.id||('message_'+(index+1)),
type:type,
speaker:node.speaker||(participants[0]&&participants[0].id)||'',
content:nodeContent(node),
image:node.image||'',
time:'',
status:node.type
};
}).filter(function(message){
return message.type!=='system'||message.content.trim();
});
return {
schemaVersion:1,
sceneType:'chat',
templateId:templateId||'generic-chat-dark',
title:value.title,
participants:participants,
messages:messages.length?messages:[{id:'message_1',type:'text',speaker:participants[0].id,content:value.title,image:'',time:'',status:''}],
story:value
};
}

function toVisualNovel(story,options){
var value=engine().normalize(story);
var index=options&&typeof options.activeNodeIndex==='number'?options.activeNodeIndex:value.currentIndex;
var node=value.nodes[Math.max(0,Math.min(value.nodes.length-1,index))]||value.nodes[0];
var visible=engine().visibleCharacters(value,node);
var dialogue=value.nodes.filter(function(item){
return item.type!=='background';
}).map(function(item){
return {
id:item.id,
type:item.type,
speaker:item.speaker?speakerName(value,item.speaker):'',
speakerId:item.speaker||'',
content:nodeContent(item),
image:item.image||'',
choices:item.choices||[],
effect:item.effect||'none'
};
});
return {
schemaVersion:1,
sceneType:'visual-novel',
templateId:'visual-novel-generic',
title:value.title,
background:node&&node.background||value.background,
backgroundImage:value.backgroundImage||'',
characters:value.characters.map(function(character){
return {
id:character.id,
name:character.name,
position:character.position,
avatar:character.avatar||'',
portrait:character.portrait||character.avatar||'',
nameColor:character.nameColor||'',
onStage:visible.some(function(item){return item.id===character.id;})
};
}),
dialogue:dialogue,
activeNodeIndex:index,
choices:node&&node.type==='choice'?node.choices.map(function(choice){return choice.label;}):[],
events:value.nodes.map(function(item,nodeIndex){
return {id:item.id,index:nodeIndex,type:item.type,payload:clone(item)};
}),
story:value
};
}

function toSocialFeed(story){
var value=engine().normalize(story);
var account=value.characters[0]||{name:'用户A',id:'character_a'};
var speeches=value.nodes.filter(function(node){return node.type==='speech'||node.type==='aside'||node.type==='image';});
var first=speeches[0]||value.nodes[0]||{content:value.title,speaker:account.id};
var comments=speeches.slice(1).map(function(node){
return {name:speakerName(value,node.speaker),body:nodeContent(node)};
});
return {
schemaVersion:1,
sceneType:'social-feed',
templateId:'social-feed-generic',
title:value.title,
account:{name:account.name,handle:'@'+(account.id||'user'),avatar:account.avatar||''},
body:nodeContent(first)||value.title,
image:first&&first.image||'',
time:'刚刚',
stats:{likes:12,comments:comments.length,reposts:1},
comments:comments,
following:false,
events:[],
story:value
};
}

function toForum(story){
var value=engine().normalize(story);
var speeches=value.nodes.filter(function(node){return node.type==='speech'||node.type==='narrator'||node.type==='aside';});
var first=speeches[0]||{content:value.title,speaker:value.characters[0]&&value.characters[0].id};
var replies=speeches.slice(1).map(function(node){
return {author:speakerName(value,node.speaker),body:nodeContent(node)};
});
return {
schemaVersion:1,
sceneType:'forum',
templateId:'forum-generic',
title:value.title,
category:'剧情讨论',
author:{name:speakerName(value,first.speaker),handle:first.speaker||'user_a'},
body:nodeContent(first)||value.title,
time:'今天',
replies:replies,
adminNotice:'',
events:[],
story:value
};
}

function toPhone(story){
var chat=toChat(story,'sms-chat-light');
var names=Object.create(null);
chat.participants.forEach(function(participant){names[participant.id]=participant.name;});
return {
schemaVersion:1,
sceneType:'phone',
templateId:'phone-generic',
title:chat.title,
time:'22:31',
battery:86,
signal:4,
screen:'messages',
notifications:[],
contacts:chat.participants.map(function(participant){return {name:participant.name,id:participant.id};}),
messages:chat.messages.map(function(message){
return {
sender:names[message.speaker]||'信息',
speaker:message.speaker,
content:message.content,
body:message.content,
app:'信息',
side:chat.participants.some(function(item){return item.id===message.speaker&&item.side==='right';})?'right':'left'
};
}),
events:[],
story:chat.story
};
}

function speechLike(story){
return story.nodes.filter(function(node){
return node.type==='speech'||node.type==='hint'||node.type==='aside'||node.type==='narrator';
});
}

function toLivestream(story){
var value=engine().normalize(story);
var host=value.characters[0]||{name:'主播',id:'host'};
return {
schemaVersion:1,
sceneType:'livestream',
templateId:'livestream-generic',
title:value.title,
host:{name:host.name,handle:host.id||'host_a'},
viewers:128,
live:true,
gifts:[{name:'应援',count:3}],
danmaku:speechLike(value).map(function(node){
return {name:speakerName(value,node.speaker),body:nodeContent(node),content:nodeContent(node)};
}),
messages:[],
events:[],
story:value
};
}

function toVideoTube(story){
var value=engine().normalize(story);
var rows=speechLike(value);
var channel=value.characters[0]||{name:'频道',id:'channel_a'};
return {
schemaVersion:1,
sceneType:'video-tube',
templateId:'video-tube-generic',
title:value.title,
channel:{name:channel.name,handle:channel.id||'channel_a'},
views:'128 万次播放',
related:rows.slice(1,5).map(function(node){return {title:nodeContent(node)};}),
comments:rows.map(function(node){
return {name:speakerName(value,node.speaker),body:nodeContent(node)};
}),
events:[],
story:value
};
}

function toDanmakuPlayer(story){
var value=engine().normalize(story);
var rows=speechLike(value);
var uploader=value.characters[0]||{name:'投稿者',id:'user_a'};
return {
schemaVersion:1,
sceneType:'danmaku-player',
templateId:'danmaku-player-generic',
title:value.title,
uploader:{name:uploader.name,handle:uploader.id||'user_a'},
plays:'86.2 万播放',
danmaku:rows.map(function(node){
return {name:speakerName(value,node.speaker),body:nodeContent(node),content:nodeContent(node)};
}),
related:rows.slice(1,4).map(function(node){return {title:nodeContent(node)};}),
events:[],
story:value
};
}

function toImageBoard(story){
var value=engine().normalize(story);
var rows=speechLike(value);
return {
schemaVersion:1,
sceneType:'image-board',
templateId:'image-board-generic',
title:value.title||'图区',
board:'综合',
notice:'本页为漫画用通用图区布局。',
posts:rows.map(function(node,index){
return {
title:nodeContent(node)||('帖子 '+(index+1)),
meta:(index+1)+' 图 · '+(rows.length-index)+' 评',
body:nodeContent(node)
};
}),
events:[],
story:value
};
}

var TEMPLATE_HINTS=[
{id:'discord-chat-dark',keys:['discord','频道','服务器']},
{id:'instant-chat-light',keys:['微信','line','即时','wechat']},
{id:'sms-chat-light',keys:['短信','sms','imessage','信息界面']},
{id:'night-radio-dark',keys:['电台','对讲','夜勤','radio']},
{id:'newspaper-clip',keys:['剪报','报纸','headline','newspaper']},
{id:'terminal-green',keys:['终端','控制台','terminal','hack']},
{id:'story-log-dark',keys:['剧情日志','对话log','mayertalk','叙拉古']},
{id:'social-feed-generic',keys:['推特','twitter','微博','动态','社交']},
{id:'forum-generic',keys:['论坛','帖子','楼主']},
{id:'video-tube-generic',keys:['影片站','播放页','相关推荐','tube','深色影片']},
{id:'danmaku-player-generic',keys:['弹幕播放','弹幕视频','投稿页','b站']},
{id:'image-board-generic',keys:['图区','图板','板块','帖子墙','缩略图墙']},
{id:'livestream-generic',keys:['直播','弹幕']},
{id:'phone-generic',keys:['手机','通知']},
{id:'visual-novel-generic',keys:['视觉小说','galgame','立绘','gal','剧情界面']},
{id:'generic-chat-dark',keys:['聊天','对话','气泡']}
];

function pickTemplate(text){
var value=String(text||'').toLowerCase();
for(var i=0;i<TEMPLATE_HINTS.length;i++){
var hint=TEMPLATE_HINTS[i];
if(hint.keys.some(function(key){return value.indexOf(key.toLowerCase())>=0;}))return hint.id;
}
return 'generic-chat-dark';
}

function toTemplate(story,templateId){
var id=templateId||'generic-chat-dark';
if(id==='visual-novel-generic')return toVisualNovel(story);
if(id==='social-feed-generic')return toSocialFeed(story);
if(id==='forum-generic')return toForum(story);
if(id==='phone-generic')return toPhone(story);
if(id==='livestream-generic')return toLivestream(story);
if(id==='video-tube-generic')return toVideoTube(story);
if(id==='danmaku-player-generic')return toDanmakuPlayer(story);
if(id==='image-board-generic')return toImageBoard(story);
return toChat(story,id);
}

var NODE_TYPE_SET=(function(){
var map=Object.create(null);
engine().NODE_TYPES.forEach(function(type){map[type]=true;});
return map;
})();

function fromChat(scene){
var source=scene&&typeof scene==='object'?scene:{};
var characters=(Array.isArray(source.participants)?source.participants:[]).map(function(participant,index){
return {
id:participant.id||('character_'+(index+1)),
name:participant.name||('角色'+(index+1)),
avatar:participant.avatar||'',
portrait:'',
position:participant.side==='right'?'right':'left'
};
});
var nodes=(Array.isArray(source.messages)?source.messages:[]).map(function(message){
var type=message.type==='image'?'image':(message.type==='choice'?'choice':(message.type==='aside'?'aside':(message.type==='system'||message.status==='narrator'?'narrator':'speech')));
if(message.status&&NODE_TYPE_SET[message.status])type=message.status;
return {
id:message.id,
type:type,
speaker:message.speaker||'',
content:message.content||'',
image:message.image||'',
choices:type==='choice'?String(message.content||'').split(/\r?\n/).filter(Boolean).map(function(label){return {label:label,target:''};}):[]
};
});
return engine().normalize({
title:source.title||'聊天剧情',
characters:characters,
nodes:nodes,
currentIndex:0
});
}

function fromVisualNovel(scene){
var source=scene&&typeof scene==='object'?scene:{};
return engine().normalize({
title:source.title||'视觉小说',
background:source.background||'#172033',
backgroundImage:source.backgroundImage||'',
characters:Array.isArray(source.characters)?source.characters:[],
nodes:(Array.isArray(source.dialogue)?source.dialogue:[]).map(function(line,index){
return {
id:line.id||('node_'+(index+1)),
type:line.type||'speech',
speaker:line.speakerId||'',
content:line.content||'',
image:line.image||'',
choices:line.choices||[]
};
}),
currentIndex:Number(source.activeNodeIndex)||0
});
}

function fromScene(scene){
if(!scene||typeof scene!=='object')return engine().createDefaultStory();
if(scene.story)return engine().normalize(scene.story);
if(scene.nodes&&scene.characters)return engine().normalize(scene);
if(scene.sceneType==='visual-novel'||Array.isArray(scene.dialogue))return fromVisualNovel(scene);
if(scene.sceneType==='chat'||Array.isArray(scene.messages)&&Array.isArray(scene.participants))return fromChat(scene);
if(Array.isArray(scene.messages))return fromChat(scene);
return engine().parseScript(scene.title||scene.body||scene.description||'',{title:scene.title||'导入剧情'});
}

function listTemplateOptions(){
var chat=(root.NaiComicTemplateRegistry?root.NaiComicTemplateRegistry.list('chat'):[]).map(function(template){
return {id:template.id,name:template.name,category:template.category};
});
var extra=(root.NaiComicExtraRendererRegistry?root.NaiComicExtraRendererRegistry.list():[]).map(function(item){
return {id:item.definition.id,name:item.definition.name,category:item.definition.category};
});
var seen=Object.create(null);
return chat.concat(extra).filter(function(item){
if(seen[item.id])return false;
seen[item.id]=true;
return true;
});
}

root.NaiComicStoryAdapters={
toChat:toChat,
toVisualNovel:toVisualNovel,
toSocialFeed:toSocialFeed,
toForum:toForum,
toPhone:toPhone,
toLivestream:toLivestream,
toVideoTube:toVideoTube,
toDanmakuPlayer:toDanmakuPlayer,
toImageBoard:toImageBoard,
toTemplate:toTemplate,
fromChat:fromChat,
fromVisualNovel:fromVisualNovel,
fromScene:fromScene,
pickTemplate:pickTemplate,
listTemplateOptions:listTemplateOptions,
TEMPLATE_HINTS:TEMPLATE_HINTS
};
})(typeof window!=='undefined'?window:globalThis);
