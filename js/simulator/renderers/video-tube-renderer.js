(function(root){
"use strict";
var factory=root.NaiComicExtraRendererFactory;
var defaults={
sceneType:'video-tube',
templateId:'video-tube-generic',
title:'未命名影片',
channel:{name:'频道',handle:'channel_a'},
views:'128 万次播放',
related:[],
comments:[],
events:[]
};
var definition={
id:'video-tube-generic',
name:'通用深色影片站',
category:'video-tube',
canvas:{width:1000,height:1800},
theme:{background:'#141414',primaryColor:'#f8fafc',secondaryColor:'#9ca3af',accentColor:'#f97316',fontFamily:'system-ui'},
editableFields:['title','channel','views','related','comments','events'],
license:{type:'original',source:'',publicAllowed:true}
};
function asList(value){return Array.isArray(value)?value:[];}
function normalize(scene){
var value=root.NaiComicSceneSerializer.normalize(scene,'video-tube',defaults);
if(!value.channel||typeof value.channel!=='object')value.channel={name:'频道',handle:'channel_a'};
value.related=asList(value.related);
value.comments=asList(value.comments);
return value;
}
function validate(scene){
var normalized=normalize(scene);
var result=root.NaiComicSceneSerializer.validate(normalized,'video-tube');
if(!normalized.title)result.errors.push('影片需要标题。');
return {ok:result.errors.length===0,errors:result.errors,scene:normalized};
}
async function render(scene){
var value=normalize(scene);
var theme=Object.assign({},definition.theme,value.theme||{});
var items=[];
items.push(factory.rect({left:0,top:0,width:1000,height:1800,fill:theme.background,simulatorRole:'page',name:'页面底'}));
items.push(factory.rect({left:0,top:0,width:1000,height:78,fill:'#1a1a1a',name:'顶栏'}));
items.push(factory.rect({left:28,top:18,width:42,height:42,rx:8,ry:8,fill:theme.accentColor,name:'标志'}));
items.push(factory.text('▶',{left:36,top:24,fontSize:22,fill:'#111',name:'标志图标'}));
items.push(factory.rect({left:88,top:20,width:620,height:38,rx:19,ry:19,fill:'#242424',name:'搜索框'}));
items.push(factory.text('搜索影片',{left:110,top:28,fontSize:16,fill:theme.secondaryColor,name:'搜索文字'}));
items.push(factory.rect({left:860,top:20,width:112,height:38,rx:19,ry:19,fill:'#2a2a2a',name:'登录按钮'}));
items.push(factory.text('登录',{left:892,top:28,fontSize:16,fill:theme.secondaryColor,name:'登录'}));
items.push(factory.panel({left:28,top:100,width:944,height:520,rx:12,ry:12,fill:'#0a0a0a',name:'播放器画面'}));
items.push(factory.text('▶',{left:470,top:310,fontSize:72,fill:'#f8fafc',name:'播放按钮'}));
items.push(factory.rect({left:28,top:604,width:944,height:10,rx:5,ry:5,fill:'#2a2a2a',name:'进度条底'}));
items.push(factory.rect({left:28,top:604,width:380,height:10,rx:5,ry:5,fill:theme.accentColor,name:'进度条'}));
items.push(factory.text(value.title,{left:36,top:640,width:920,fontSize:32,fontWeight:'bold',fill:theme.primaryColor,name:'标题'}));
items.push(factory.text((value.channel.name||'频道')+' · '+(value.views||''),{left:36,top:690,fontSize:20,fill:theme.secondaryColor,name:'频道信息'}));
items.push(factory.text('相关',{left:36,top:750,fontSize:22,fontWeight:'bold',fill:theme.primaryColor,name:'相关'}));
var related=value.related.slice(0,4);
if(!related.length)related=[{title:'相关片段 1'},{title:'相关片段 2'},{title:'相关片段 3'}];
related.forEach(function(item,index){
var y=790+index*92;
items.push(factory.panel({left:36,top:y,width:160,height:76,rx:8,ry:8,fill:'#242424',name:'相关封面 '+(index+1)}));
items.push(factory.rect({left:36,top:y+66,width:70,height:8,rx:3,ry:3,fill:theme.accentColor,name:'相关进度 '+(index+1)}));
items.push(factory.text(item.title||item.body||'相关影片',{left:214,top:y+18,width:740,fontSize:22,fill:theme.primaryColor,name:'相关标题 '+(index+1)}));
});
items.push(factory.text('评论',{left:36,top:1180,fontSize:22,fontWeight:'bold',fill:theme.primaryColor,name:'评论'}));
var comments=value.comments.slice(0,7);
if(!comments.length)comments=[{name:'观众A',body:'先收藏。'},{name:'观众B',body:'这一段构图很好。'}];
comments.forEach(function(item,index){
var y=1224+index*72;
items.push(factory.rect({left:36,top:y,width:44,height:44,rx:22,ry:22,fill:'#2a2a2a',name:'头像 '+(index+1)}));
items.push(factory.text((item.name||'观众')+'：'+(item.body||item.content||''),{left:96,top:y+10,width:840,fontSize:20,fill:theme.primaryColor,name:'评论 '+(index+1)}));
});
return factory.makeGroup(items,definition,value);
}
factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
