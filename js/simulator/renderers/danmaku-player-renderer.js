(function(root){
"use strict";
var factory=root.NaiComicExtraRendererFactory;
var defaults={
sceneType:'danmaku-player',
templateId:'danmaku-player-generic',
title:'未命名投稿',
uploader:{name:'投稿者',handle:'user_a'},
plays:'86.2 万播放',
danmaku:[],
related:[],
events:[]
};
var definition={
id:'danmaku-player-generic',
name:'通用弹幕播放页',
category:'danmaku-player',
canvas:{width:1000,height:1800},
theme:{background:'#0b1220',primaryColor:'#e2e8f0',secondaryColor:'#94a3b8',accentColor:'#22d3ee',fontFamily:'system-ui'},
editableFields:['title','uploader','plays','danmaku','related','events'],
license:{type:'original',source:'',publicAllowed:true}
};
function asList(value){return Array.isArray(value)?value:[];}
function normalize(scene){
var value=root.NaiComicSceneSerializer.normalize(scene,'danmaku-player',defaults);
if(!value.uploader||typeof value.uploader!=='object')value.uploader={name:'投稿者',handle:'user_a'};
value.danmaku=asList(value.danmaku);
value.related=asList(value.related);
return value;
}
function validate(scene){
var normalized=normalize(scene);
var result=root.NaiComicSceneSerializer.validate(normalized,'danmaku-player');
if(!normalized.title)result.errors.push('投稿需要标题。');
return {ok:result.errors.length===0,errors:result.errors,scene:normalized};
}
async function render(scene){
var value=normalize(scene);
var theme=Object.assign({},definition.theme,value.theme||{});
var rose='#e11d48';
var items=[];
items.push(factory.rect({left:0,top:0,width:1000,height:1800,fill:theme.background,simulatorRole:'page',name:'页面底'}));
items.push(factory.rect({left:0,top:0,width:1000,height:72,fill:'#152033',name:'顶栏'}));
items.push(factory.text('分区 · 推荐 · 动画',{left:36,top:24,fontSize:20,fill:theme.accentColor,name:'分区'}));
items.push(factory.panel({left:28,top:92,width:944,height:520,rx:16,ry:16,fill:'#081018',name:'播放器画面'}));
var flying=value.danmaku.slice(0,8);
if(!flying.length)flying=[{body:'好喜欢这一段'},{body:'前方高能'},{body:'再来亿遍'},{body:'收藏了'}];
flying.forEach(function(item,index){
var y=130+index*52;
var x=48+(index%3)*90;
items.push(factory.text(item.body||item.content||'',{left:x,top:y,fontSize:22,fill:index%3===1?rose:(index%3===2?theme.accentColor:theme.primaryColor),name:'弹幕 '+(index+1)}));
});
items.push(factory.text('▶',{left:470,top:300,fontSize:64,fill:theme.accentColor,name:'播放按钮'}));
items.push(factory.rect({left:28,top:596,width:944,height:10,rx:5,ry:5,fill:'#1b2a40',name:'进度条底'}));
items.push(factory.rect({left:28,top:596,width:300,height:10,rx:5,ry:5,fill:theme.accentColor,name:'进度条'}));
items.push(factory.text(value.title,{left:36,top:630,width:700,fontSize:32,fontWeight:'bold',fill:theme.primaryColor,name:'标题'}));
items.push(factory.rect({left:780,top:628,width:180,height:44,rx:22,ry:22,fill:rose,name:'关注按钮'}));
items.push(factory.text('+ 关注',{left:830,top:638,fontSize:20,fill:'#fff',name:'关注'}));
items.push(factory.text((value.uploader.name||'投稿者')+' · '+(value.plays||''),{left:36,top:690,fontSize:20,fill:theme.secondaryColor,name:'投稿信息'}));
items.push(factory.rect({left:36,top:740,width:928,height:56,rx:28,ry:28,fill:'#152033',name:'弹幕输入框'}));
items.push(factory.text('发一条弹幕…',{left:60,top:754,fontSize:18,fill:theme.secondaryColor,name:'弹幕占位'}));
items.push(factory.rect({left:820,top:748,width:128,height:40,rx:20,ry:20,fill:rose,name:'发送按钮'}));
items.push(factory.text('发送',{left:858,top:756,fontSize:18,fill:'#fff',name:'发送'}));
items.push(factory.text('接下来播放',{left:36,top:830,fontSize:22,fontWeight:'bold',fill:theme.primaryColor,name:'接下来播放'}));
var related=value.related.slice(0,3);
if(!related.length)related=[{title:'相关投稿 1'},{title:'相关投稿 2'},{title:'相关投稿 3'}];
related.forEach(function(item,index){
var x=36+index*312;
items.push(factory.panel({left:x,top:870,width:292,height:160,rx:12,ry:12,fill:'#1b2a40',name:'相关封面 '+(index+1)}));
items.push(factory.rect({left:x,top:1018,width:120,height:8,rx:3,ry:3,fill:theme.accentColor,name:'相关进度 '+(index+1)}));
items.push(factory.text(item.title||item.body||'相关投稿',{left:x,top:1048,width:292,fontSize:18,fill:theme.primaryColor,name:'相关标题 '+(index+1)}));
});
items.push(factory.text('评论',{left:36,top:1140,fontSize:22,fontWeight:'bold',fill:theme.primaryColor,name:'评论'}));
var comments=value.danmaku.slice(0,8);
comments.forEach(function(item,index){
items.push(factory.text((item.name||'观众')+'：'+(item.body||item.content||''),{left:36,top:1184+index*64,width:920,fontSize:20,fill:theme.primaryColor,name:'评论 '+(index+1)}));
});
return factory.makeGroup(items,definition,value);
}
factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
