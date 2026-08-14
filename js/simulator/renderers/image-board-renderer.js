(function(root){
"use strict";
var factory=root.NaiComicExtraRendererFactory;
var defaults={
sceneType:'image-board',
templateId:'image-board-generic',
title:'图区',
board:'综合',
posts:[],
notice:'本页为漫画用通用图区布局。',
events:[]
};
var definition={
id:'image-board-generic',
name:'通用图区帖子页',
category:'image-board',
canvas:{width:1000,height:1800},
theme:{background:'#f3eee4',primaryColor:'#2f2a24',secondaryColor:'#7a7368',accentColor:'#4d7c0f',fontFamily:'system-ui'},
editableFields:['title','board','posts','notice','events'],
license:{type:'original',source:'',publicAllowed:true}
};
function asList(value){return Array.isArray(value)?value:[];}
function normalize(scene){
var value=root.NaiComicSceneSerializer.normalize(scene,'image-board',defaults);
value.posts=asList(value.posts);
return value;
}
function validate(scene){
var normalized=normalize(scene);
var result=root.NaiComicSceneSerializer.validate(normalized,'image-board');
if(!normalized.title)result.errors.push('图区需要标题。');
return {ok:result.errors.length===0,errors:result.errors,scene:normalized};
}
async function render(scene){
var value=normalize(scene);
var theme=Object.assign({},definition.theme,value.theme||{});
var items=[];
items.push(factory.rect({left:0,top:0,width:1000,height:1800,fill:theme.background,simulatorRole:'page',name:'页面底'}));
items.push(factory.rect({left:0,top:0,width:1000,height:96,fill:'#3d4a32',name:'顶栏'}));
items.push(factory.rect({left:28,top:28,width:40,height:40,rx:8,ry:8,fill:theme.accentColor,name:'标志'}));
items.push(factory.text(value.title||'图区',{left:84,top:28,fontSize:30,fontWeight:'bold',fill:'#fffdf8',name:'标题'}));
items.push(factory.text('板块 · '+(value.board||'综合'),{left:84,top:62,fontSize:16,fill:'#d9e2c8',name:'板块'}));
items.push(factory.rect({left:28,top:120,width:944,height:56,rx:10,ry:10,fill:'#efe6d2',stroke:theme.accentColor,strokeWidth:1,name:'公告栏'}));
items.push(factory.text(value.notice||'本页为漫画用通用图区布局。',{left:48,top:136,width:900,fontSize:18,fill:theme.primaryColor,name:'公告'}));
var chips=['最新','热门','精华','长图'];
chips.forEach(function(label,index){
var x=28+index*120;
items.push(factory.rect({left:x,top:196,width:104,height:40,rx:8,ry:8,fill:index===0?theme.accentColor:'#fffdf8',name:'筛选 '+label}));
items.push(factory.text(label,{left:x+28,top:206,fontSize:18,fill:index===0?'#fffdf8':theme.primaryColor,name:label}));
});
var posts=value.posts.slice(0,8);
if(!posts.length)posts=[{title:'示例帖 A',meta:'12 图'},{title:'示例帖 B',meta:'4 图'},{title:'示例帖 C',meta:'8 图'},{title:'示例帖 D',meta:'2 图'}];
posts.forEach(function(post,index){
var col=index%2;
var row=Math.floor(index/2);
var x=28+col*484;
var y=260+row*280;
items.push(factory.rect({left:x,top:y,width:460,height:256,rx:14,ry:14,fill:'#fffdf8',stroke:'#d6d0c4',strokeWidth:1,name:'帖卡 '+(index+1)}));
items.push(factory.panel({left:x+18,top:y+18,width:424,height:150,rx:10,ry:10,fill:'#e7dfd0',name:'帖图 '+(index+1)}));
items.push(factory.text(post.title||post.body||'未命名帖',{left:x+18,top:y+182,width:420,fontSize:22,fontWeight:'bold',fill:theme.primaryColor,name:'帖标题 '+(index+1)}));
items.push(factory.text(post.meta||((post.images||1)+' 图 · '+(post.replies||0)+' 评'),{left:x+18,top:y+216,fontSize:16,fill:theme.accentColor,name:'帖信息 '+(index+1)}));
});
items.push(factory.rect({left:360,top:1688,width:48,height:40,rx:8,ry:8,fill:theme.accentColor,name:'页码当前'}));
items.push(factory.text('2',{left:376,top:1698,fontSize:18,fill:'#fffdf8',name:'页码'}));
items.push(factory.text('‹  1      3  4  ›',{left:250,top:1698,fontSize:18,fill:theme.primaryColor,name:'分页'}));
return factory.makeGroup(items,definition,value);
}
factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
