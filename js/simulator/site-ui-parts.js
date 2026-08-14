(function(root){
"use strict";

var FONT='Microsoft YaHei, Noto Sans SC, system-ui, sans-serif';

var PARTS=[
{id:'asset_site_tube_top_bar',name:'影片站顶栏',width:420,height:72,bg:'#141414',
chrome:[{left:12,top:16,width:40,height:40,rx:8,fill:'#f97316'},{left:64,top:20,width:260,height:32,rx:16,fill:'#242424'},{left:336,top:20,width:72,height:32,rx:16,fill:'#1c1c1c'}],
fields:[{key:'search',label:'搜索框',default:'搜索影片',x:80,y:28,fontSize:13,fill:'#9ca3af'},{key:'login',label:'右侧按钮',default:'登录',x:352,y:28,fontSize:13,fill:'#9ca3af'}]},
{id:'asset_site_tube_player',name:'深色播放器',width:480,height:280,bg:'#141414',
chrome:[{left:12,top:12,width:456,height:228,rx:8,fill:'#0a0a0a'},{left:12,top:248,width:456,height:8,rx:4,fill:'#2e2e2e'},{left:12,top:248,width:186,height:8,rx:4,fill:'#f97316'}],
fields:[{key:'play',label:'播放钮',default:'▶',x:226,y:100,fontSize:48,fill:'#f8fafc'},{key:'time',label:'进度时间',default:'12:04 / 28:41',x:20,y:258,fontSize:11,fill:'#9ca3af'}]},
{id:'asset_site_tube_related',name:'相关列表',width:220,height:360,bg:'#141414',
fields:[{key:'heading',label:'栏目标题',default:'相关',x:12,y:8,fontSize:14,fill:'#f8fafc',fontWeight:'bold'},{key:'items',label:'相关标题（每行一条）',type:'related-rows',default:'相关片段 1\n相关片段 2\n相关片段 3\n相关片段 4\n相关片段 5',x:110,y:44,rowHeight:64,thumb:{x:12,y:36,w:88,h:52,fill:'#242424'},fontSize:13,fill:'#f8fafc',width:96}]},
{id:'asset_site_tube_comments',name:'播放页评论',width:360,height:280,bg:'#141414',
chrome:[{left:14,top:36,width:332,height:36,rx:8,fill:'#1c1c1c'}],
fields:[{key:'heading',label:'评论标题',default:'评论 128',x:14,y:10,fontSize:14,fill:'#f8fafc',fontWeight:'bold'},{key:'placeholder',label:'输入框提示',default:'写一条评论…',x:26,y:46,fontSize:12,fill:'#6b7280'},{key:'comments',label:'评论（每行 名字：内容）',type:'comments',default:'观众A：先收藏。\n观众B：这一段构图很好。\n观众C：再来一遍。',x:38,y:84,rowHeight:32,fontSize:12,fill:'#f8fafc',width:300}]},
{id:'asset_site_tube_chips',name:'影片分类圆片',width:420,height:56,bg:'#141414',
fields:[{key:'chips',label:'分类（逗号或换行）',type:'chips',default:'推荐,新作,热门,系列,短片',x:10,y:12,chipWidth:68,gap:10,height:32,activeFill:'#f97316',fill:'#1c1c1c',activeColor:'#111',color:'#9ca3af',fontSize:12}]},
{id:'asset_site_tube_stats',name:'播放数据行',width:420,height:48,bg:'#141414',
fields:[{key:'views',label:'播放量',default:'128 万次播放',x:14,y:16,fontSize:13,fill:'#f8fafc',fontWeight:'bold'},{key:'likes',label:'点赞',default:'赞 8.2k',x:150,y:16,fontSize:13,fill:'#f97316'},{key:'save',label:'收藏',default:'收藏',x:230,y:16,fontSize:13,fill:'#9ca3af'},{key:'share',label:'分享',default:'分享',x:290,y:16,fontSize:13,fill:'#9ca3af'},{key:'list',label:'列表',default:'列表',x:350,y:16,fontSize:13,fill:'#9ca3af'}]},
{id:'asset_site_tube_thumb_card',name:'影片卡片',width:220,height:160,bg:'#141414',
chrome:[{left:8,top:8,width:204,height:108,rx:8,fill:'#242424'}],
fields:[{key:'play',label:'播放钮',default:'▶',x:98,y:44,fontSize:22,fill:'#f8fafc'},{key:'duration',label:'时长',default:'12:08',x:158,y:96,fontSize:9,fill:'#f8fafc'},{key:'title',label:'标题',default:'未命名影片',x:8,y:122,fontSize:12,fill:'#f8fafc',width:200},{key:'meta',label:'副标题',default:'频道 · 3.2万次播放',x:8,y:140,fontSize:10,fill:'#9ca3af',width:200}]},
{id:'asset_site_tube_home_grid',name:'影片首页宫格',width:420,height:280,bg:'#141414',
fields:[{key:'items',label:'卡片标题（每行一条）',type:'grid',default:'热门推荐\n新作速看\n系列合集\n短片精选\n收藏回顾\n稍后观看',cells:[{x:12,y:12},{x:148,y:12},{x:284,y:12},{x:12,y:118},{x:148,y:118},{x:284,y:118}],cellW:124,cellH:76,thumbFill:'#242424',accent:'#f97316',fontSize:12,fill:'#f8fafc'}]},
{id:'asset_site_tube_hd_badge',name:'清晰度角标',width:72,height:32,bg:'#f97316',
fields:[{key:'label',label:'角标文字',default:'HD',x:22,y:8,fontSize:16,fill:'#111',fontWeight:'bold'}]},
{id:'asset_site_tube_controls',name:'播放控件',width:420,height:52,bg:'#141414',
chrome:[{left:12,top:18,width:28,height:16,rx:3,fill:'#f8fafc'},{left:52,top:22,width:220,height:8,rx:4,fill:'#2e2e2e'},{left:52,top:22,width:88,height:8,rx:4,fill:'#f97316'}],
fields:[{key:'play',label:'播放',default:'▶',x:16,y:16,fontSize:14,fill:'#111'},{key:'speed',label:'倍速',default:'1x',x:360,y:18,fontSize:12,fill:'#9ca3af'}]},
{id:'asset_site_danmaku_player',name:'弹幕播放器',width:480,height:280,bg:'#0b1220',
chrome:[{left:10,top:10,width:460,height:230,rx:8,fill:'#081018'},{left:10,top:248,width:460,height:8,rx:4,fill:'#1b2a40'},{left:10,top:248,width:160,height:8,rx:4,fill:'#22d3ee'}],
fields:[{key:'play',label:'播放钮',default:'▶',x:226,y:100,fontSize:42,fill:'#22d3ee'},{key:'danmaku',label:'弹幕（每行一条）',type:'flying',default:'好喜欢这一段\n前方高能\n字幕组辛苦了\n再来亿遍\n这个构图绝了\n收藏了',spots:[{x:24,y:28,fill:'#e2e8f0'},{x:160,y:54,fill:'#e11d48'},{x:40,y:84,fill:'#22d3ee'},{x:220,y:106,fill:'#e2e8f0'},{x:80,y:138,fill:'#22d3ee'},{x:250,y:164,fill:'#e11d48'}]}]},
{id:'asset_site_danmaku_input',name:'弹幕输入条',width:420,height:52,bg:'#0b1220',
chrome:[{left:10,top:10,width:300,height:32,rx:16,fill:'#152033'},{left:320,top:10,width:90,height:32,rx:16,fill:'#e11d48'}],
fields:[{key:'placeholder',label:'输入提示',default:'发一条弹幕…',x:24,y:18,fontSize:12,fill:'#94a3b8'},{key:'send',label:'发送按钮',default:'发送',x:346,y:18,fontSize:13,fill:'#e2e8f0',fontWeight:'bold'}]},
{id:'asset_site_danmaku_stats',name:'投稿数据行',width:420,height:56,bg:'#0b1220',
fields:[{key:'plays',label:'播放',default:'播放 86.2万',x:16,y:18,fontSize:13,fill:'#e2e8f0',fontWeight:'bold'},{key:'coin',label:'投币',default:'投币 1.2万',x:140,y:18,fontSize:13,fill:'#22d3ee'},{key:'save',label:'收藏',default:'收藏 3.8万',x:250,y:18,fontSize:13,fill:'#e11d48'},{key:'share',label:'分享',default:'分享',x:360,y:18,fontSize:13,fill:'#94a3b8'}]},
{id:'asset_site_danmaku_cards',name:'接下来播放',width:420,height:160,bg:'#0b1220',
fields:[{key:'heading',label:'栏目标题',default:'接下来播放',x:12,y:8,fontSize:13,fill:'#e2e8f0',fontWeight:'bold'},{key:'items',label:'卡片标题（每行一条）',type:'grid',default:'下一话预告\n相关投稿\n系列合集',cells:[{x:12,y:34},{x:148,y:34},{x:284,y:34}],cellW:124,cellH:72,thumbFill:'#1b2a40',accent:'#22d3ee',fontSize:12,fill:'#e2e8f0'}]},
{id:'asset_site_danmaku_nav',name:'分区导航',width:420,height:48,bg:'#0b1220',
fields:[{key:'chips',label:'分区（逗号或换行）',type:'chips',default:'推荐,动画,音乐,游戏,知识',x:8,y:8,chipWidth:72,gap:8,height:32,activeFill:'#152033',fill:'#0b1220',activeColor:'#22d3ee',color:'#94a3b8',fontSize:13,activeWeight:'bold'}]},
{id:'asset_site_danmaku_follow',name:'关注按钮',width:140,height:40,bg:'#152033',
fields:[{key:'label',label:'按钮文字',default:'+ 关注',x:42,y:10,fontSize:14,fill:'#e2e8f0',fontWeight:'bold'}]},
{id:'asset_site_danmaku_chapters',name:'章节轴',width:420,height:44,bg:'#0b1220',
chrome:[{left:12,top:24,width:396,height:6,rx:3,fill:'#1b2a40'},{left:12,top:24,width:120,height:6,rx:3,fill:'#22d3ee'}],
fields:[{key:'label',label:'章节标题',default:'章节',x:12,y:4,fontSize:10,fill:'#94a3b8'}]},
{id:'asset_site_danmaku_submit_badge',name:'投稿角标',width:72,height:28,bg:'#22d3ee',
fields:[{key:'label',label:'角标文字',default:'投稿',x:22,y:6,fontSize:13,fill:'#082f3a',fontWeight:'bold'}]},
{id:'asset_site_danmaku_cover',name:'投稿封面卡',width:220,height:150,bg:'#0b1220',
chrome:[{left:8,top:8,width:204,height:96,rx:8,fill:'#1b2a40'}],
fields:[{key:'play',label:'播放钮',default:'▶',x:96,y:40,fontSize:22,fill:'#e2e8f0'},{key:'title',label:'标题',default:'未命名投稿',x:8,y:112,fontSize:12,fill:'#e2e8f0',width:200},{key:'meta',label:'副标题',default:'投稿者 · 86.2万播放',x:8,y:130,fontSize:10,fill:'#94a3b8',width:200}]},
{id:'asset_site_board_header',name:'图区顶栏',width:420,height:64,bg:'#3d4a32',
chrome:[{left:14,top:16,width:32,height:32,rx:6,fill:'#4d7c0f'},{left:250,top:16,width:156,height:32,rx:16,fill:'#2f3828'}],
fields:[{key:'title',label:'站点标题',default:'图区',x:58,y:20,fontSize:18,fill:'#fffdf8',fontWeight:'bold'},{key:'search',label:'搜索提示',default:'搜索帖子',x:266,y:24,fontSize:12,fill:'#d9e2c8'}]},
{id:'asset_site_board_grid',name:'帖子宫格',width:420,height:280,bg:'#f3eee4',
fields:[{key:'items',label:'帖子标题（每行一条）',type:'grid',default:'今日新帖\n热门长图\n系列合集\n精华收藏\n讨论串\n素材交换\n作业练习\n公告区',cells:[{x:12,y:12},{x:114,y:12},{x:216,y:12},{x:318,y:12},{x:12,y:144},{x:114,y:144},{x:216,y:144},{x:318,y:144}],cellW:92,cellH:92,thumbFill:'#fffdf8',stroke:'#d6d0c4',innerFill:'#e7dfd0',fontSize:11,fill:'#2f2a24',titleY:96}]},
{id:'asset_site_board_card',name:'图帖卡片',width:180,height:220,bg:'#fffdf8',
chrome:[{left:10,top:10,width:160,height:130,rx:8,fill:'#e7dfd0'}],
fields:[{key:'title',label:'标题',default:'未命名帖子',x:10,y:148,fontSize:13,fill:'#2f2a24',width:160,fontWeight:'bold'},{key:'meta',label:'副标题',default:'匿名 · 今天',x:10,y:168,fontSize:11,fill:'#7a7368',width:160},{key:'stats',label:'统计',default:'12 图 · 48 评',x:10,y:188,fontSize:12,fill:'#4d7c0f',fontWeight:'bold'}]},
{id:'asset_site_board_thread',name:'帖子楼层',width:360,height:240,bg:'#f3eee4',
fields:[{key:'op',label:'楼主',default:'楼主：先放构图。',x:22,y:22,fontSize:12,fill:'#4d7c0f',fontWeight:'bold',width:310},{key:'floor2',label:'2 楼',default:'2 楼：这一段很好。',x:22,y:92,fontSize:11,fill:'#2f2a24',width:310},{key:'floor3',label:'3 楼',default:'3 楼：收藏了。',x:22,y:140,fontSize:11,fill:'#2f2a24',width:310},{key:'floor4',label:'4 楼',default:'4 楼：求后续。',x:22,y:188,fontSize:11,fill:'#2f2a24',width:310}],
chrome:[{left:10,top:10,width:340,height:64,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'},{left:10,top:86,width:340,height:40,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'},{left:10,top:134,width:340,height:40,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'},{left:10,top:182,width:340,height:40,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'}]},
{id:'asset_site_board_tags',name:'板块标签',width:360,height:56,bg:'#f3eee4',
fields:[{key:'chips',label:'标签（逗号或换行）',type:'chips',default:'最新,热门,精华,长图,系列',x:8,y:12,chipWidth:64,gap:8,height:32,activeFill:'#4d7c0f',fill:'#fffdf8',activeColor:'#fffdf8',color:'#2f2a24',fontSize:12}]},
{id:'asset_site_board_pager',name:'翻页条',width:320,height:40,bg:'#f3eee4',
fields:[{key:'pages',label:'页码（逗号）',type:'chips',default:'‹,1,2,3,…,12,›',x:8,y:4,chipWidth:36,gap:6,height:32,activeFill:'#4d7c0f',fill:'#fffdf8',activeColor:'#fffdf8',color:'#2f2a24',fontSize:13,activeIndex:2}]},
{id:'asset_site_board_filters',name:'图区筛选',width:420,height:44,bg:'#f3eee4',
chrome:[{left:48,top:8,width:88,height:28,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'},{left:148,top:8,width:88,height:28,rx:8,fill:'#fffdf8',stroke:'#d6d0c4'},{left:248,top:8,width:88,height:28,rx:8,fill:'#4d7c0f'}],
fields:[{key:'label',label:'左侧文字',default:'排序',x:12,y:14,fontSize:12,fill:'#7a7368'},{key:'sort',label:'排序项',default:'最新回复',x:58,y:14,fontSize:12,fill:'#2f2a24'},{key:'range',label:'范围',default:'今日',x:174,y:14,fontSize:12,fill:'#2f2a24'},{key:'post',label:'发帖按钮',default:'发帖',x:274,y:14,fontSize:12,fill:'#fffdf8',fontWeight:'bold'}]},
{id:'asset_site_board_reply',name:'回帖框',width:360,height:120,bg:'#fffdf8',
chrome:[{left:14,top:36,width:332,height:44,rx:6,fill:'#f3eee4',stroke:'#d6d0c4'},{left:248,top:88,width:98,height:24,rx:6,fill:'#4d7c0f'}],
fields:[{key:'heading',label:'标题',default:'回帖',x:14,y:10,fontSize:13,fill:'#2f2a24',fontWeight:'bold'},{key:'placeholder',label:'输入提示',default:'写下回复…',x:22,y:48,fontSize:12,fill:'#7a7368'},{key:'submit',label:'按钮',default:'发表',x:278,y:92,fontSize:12,fill:'#fffdf8',fontWeight:'bold'}]},
{id:'asset_site_board_banner',name:'图区公告条',width:420,height:48,bg:'#efe6d2',
fields:[{key:'notice',label:'公告',default:'公告：本页为漫画用通用图区布局，不含真实站点标识。',x:16,y:16,fontSize:12,fill:'#2f2a24',width:390}]}
];

var BY_ID=Object.create(null);
PARTS.forEach(function(item){BY_ID[item.id]=item;});

function canvas(){
return root.canvas||(typeof window!=='undefined'?window.canvas:null);
}

function factory(){
return root.NaiComicExtraRendererFactory;
}

function splitLines(value){
return String(value==null?'':value).split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
}

function splitChips(value){
return String(value==null?'':value).split(/[\n,，]/).map(function(line){return line.trim();}).filter(Boolean);
}

function get(id){return BY_ID[id]||null;}
function has(id){return !!BY_ID[id];}
function list(){return PARTS.slice();}

function defaults(id){
var def=get(id);
var data=Object.create(null);
if(!def)return data;
(def.fields||[]).forEach(function(field){data[field.key]=field.default||'';});
return data;
}

function valuesOf(id,values){
return Object.assign(defaults(id),values&&typeof values==='object'?values:{});
}

function addChrome(items,api,chrome){
(chrome||[]).forEach(function(box,index){
items.push(api.rect({
left:box.left||0,
top:box.top||0,
width:box.width||10,
height:box.height||10,
rx:box.rx||0,
ry:box.ry||box.rx||0,
fill:box.fill||'#222',
stroke:box.stroke||null,
strokeWidth:box.stroke?1:0,
name:'装饰 '+(index+1)
}));
});
}

function addLabel(items,api,text,field,extra){
var opts=Object.assign({
left:Number(field.x)||0,
top:Number(field.y)||0,
fontSize:Number(field.fontSize)||13,
fill:field.fill||'#f8fafc',
fontFamily:FONT,
fontWeight:field.fontWeight||'normal',
name:field.label||field.key
},extra||{});
if(field.width)opts.width=field.width;
if(field.align)opts.textAlign=field.align;
items.push(api.text(String(text||''),opts));
}

function render(id,values){
var def=get(id);
var api=factory();
if(!def)throw new Error('没有这件站点零件：'+id);
if(!api)throw new Error('模拟器渲染器尚未加载。');
var data=valuesOf(id,values);
var items=[];
items.push(api.rect({
left:0,
top:0,
width:def.width,
height:def.height,
rx:def.rx||0,
ry:def.ry||0,
fill:def.bg||'#111',
stroke:def.stroke||null,
strokeWidth:def.stroke?1:0,
simulatorRole:'page',
name:def.name+' 底'
}));
addChrome(items,api,def.chrome);
(def.fields||[]).forEach(function(field){
var type=field.type||'text';
var raw=data[field.key];
if(type==='chips'){
var chips=splitChips(raw);
var active=field.activeIndex==null?0:Number(field.activeIndex);
chips.forEach(function(label,index){
var x=(Number(field.x)||0)+index*((Number(field.chipWidth)||68)+(Number(field.gap)||8));
var on=index===active;
items.push(api.rect({
left:x,
top:Number(field.y)||0,
width:Number(field.chipWidth)||68,
height:Number(field.height)||32,
rx:16,
ry:16,
fill:on?(field.activeFill||'#f97316'):(field.fill||'#1c1c1c'),
name:'分类底 '+label
}));
addLabel(items,api,label,field,{
left:x+6,
top:(Number(field.y)||0)+8,
width:(Number(field.chipWidth)||68)-12,
textAlign:'center',
fill:on?(field.activeColor||'#111'):(field.color||'#9ca3af'),
fontWeight:on?(field.activeWeight||'bold'):'normal',
name:label
});
});
return;
}
if(type==='related-rows'){
var rows=splitLines(raw);
var thumb=field.thumb||{x:12,y:36,w:88,h:52,fill:'#242424'};
rows.forEach(function(title,index){
var y=(Number(thumb.y)||36)+index*(Number(field.rowHeight)||64);
items.push(api.rect({left:thumb.x||12,top:y,width:thumb.w||88,height:thumb.h||52,rx:6,ry:6,fill:thumb.fill||'#242424',name:'相关封面 '+(index+1)}));
items.push(api.rect({left:thumb.x||12,top:y+(thumb.h||52)-8,width:40,height:6,rx:2,ry:2,fill:'#f97316',name:'相关进度 '+(index+1)}));
addLabel(items,api,title,field,{left:Number(field.x)||110,top:y+8,width:field.width||96,name:'相关标题 '+(index+1)});
});
return;
}
if(type==='comments'){
splitLines(raw).forEach(function(line,index){
var y=(Number(field.y)||80)+index*(Number(field.rowHeight)||32);
items.push(api.rect({left:16,top:y,width:16,height:16,rx:8,ry:8,fill:'#242424',name:'头像 '+(index+1)}));
addLabel(items,api,line,field,{left:Number(field.x)||38,top:y,width:field.width||300,name:'评论 '+(index+1)});
});
return;
}
if(type==='flying'){
var spots=field.spots||[];
splitLines(raw).forEach(function(line,index){
var spot=spots[index]||{x:24+index*18,y:28+index*28,fill:field.fill||'#e2e8f0'};
addLabel(items,api,line,field,{left:spot.x,top:spot.y,fill:spot.fill||field.fill,name:'弹幕 '+(index+1)});
});
return;
}
if(type==='grid'){
var cells=field.cells||[];
var titles=splitLines(raw);
cells.forEach(function(cell,index){
var x=Number(cell.x)||0;
var y=Number(cell.y)||0;
var w=Number(field.cellW)||124;
var h=Number(field.cellH)||76;
items.push(api.rect({left:x,top:y,width:w,height:h,rx:6,ry:6,fill:field.thumbFill||'#242424',stroke:field.stroke||null,strokeWidth:field.stroke?1:0,name:'卡片 '+(index+1)}));
if(field.innerFill)items.push(api.rect({left:x+10,top:y+14,width:w-20,height:Math.max(24,h-48),rx:4,ry:4,fill:field.innerFill,name:'缩略 '+(index+1)}));
else items.push(api.rect({left:x,top:y+h-10,width:Math.round(w*0.4),height:6,rx:2,ry:2,fill:field.accent||'#f97316',name:'进度 '+(index+1)}));
addLabel(items,api,titles[index]||('卡片 '+(index+1)),field,{
left:x+4,
top:y+(field.titleY!=null?field.titleY:h+6),
width:w-8,
fill:field.fill||'#f8fafc',
fontSize:field.fontSize||12,
name:'卡片标题 '+(index+1)
});
});
return;
}
addLabel(items,api,raw,field);
});
var scene={
sceneType:'site-ui-part',
templateId:def.id,
assetId:def.id,
fields:data
};
return api.makeGroup(items,{
id:def.id,
name:def.name,
category:'site-ui-part',
canvas:{width:def.width,height:def.height},
editableFields:(def.fields||[]).map(function(field){return field.key;}),
license:{type:'original',source:'',publicAllowed:true}
},scene);
}

function currentPart(current){
var api=factory();
var object=current&&typeof current.getActiveObject==='function'?current.getActiveObject():null;
var resolved=api&&typeof api.resolvePage==='function'?api.resolvePage(object,current):null;
if(resolved&&resolved.simulatorType==='site-ui-part')return resolved;
if(object&&object.simulatorType==='site-ui-part')return object;
if(object&&object.group&&object.group.simulatorType==='site-ui-part')return object.group;
return null;
}

function place(id,values,options){
options=options||{};
var current=options.canvas||canvas();
var api=factory();
if(!current)return Promise.reject(new Error('Canvas 尚未初始化。'));
if(!api||typeof api.placeOnCanvas!=='function')return Promise.reject(new Error('模拟器渲染器尚未加载。'));
var group=render(id,values);
var previous=options.previous;
if(previous===undefined){
previous=currentPart(current);
if(previous&&previous.simulatorTemplateId!==id)previous=null;
}
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
var placed=api.placeOnCanvas(group,current,{
previous:previous,
fit:false,
origin:options.origin||{left:Number(options.left)||48,top:Number(options.top)||80}
});
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
if(root.NaiBeginnerGuide&&typeof root.NaiBeginnerGuide.onTemplateInserted==='function'){
root.NaiBeginnerGuide.onTemplateInserted(current,placed);
}else if(current){
if(placed.root)current.setActiveObject(placed.root);
if(typeof current.requestRenderAll==='function')current.requestRenderAll();
else if(typeof current.renderAll==='function')current.renderAll();
}
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
return Promise.resolve(placed.root);
}

function readSelected(current){
var part=currentPart(current||canvas());
if(!part)return null;
var scene={};
try{scene=root.NaiComicSceneSerializer?root.NaiComicSceneSerializer.deserialize(part.simulatorScene||'{}'):JSON.parse(part.simulatorScene||'{}');}catch(error){scene={};}
return {
id:part.simulatorTemplateId||part.assetId||'',
values:scene.fields||defaults(part.simulatorTemplateId),
object:part
};
}

root.NaiComicSiteUiParts={
PARTS:PARTS,
list:list,
get:get,
has:has,
defaults:defaults,
valuesOf:valuesOf,
render:render,
place:place,
readSelected:readSelected,
currentPart:currentPart
};
})(typeof window!=='undefined'?window:globalThis);
