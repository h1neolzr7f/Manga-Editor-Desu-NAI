// 模拟器启动页与各类型单开工作区
(function(root){
"use strict";

var currentMode=null;
var currentView='home';
var currentPartId='asset_site_tube_stats';
var currentWebId='video-tube-generic';
var initialized=false;
var sessions=Object.create(null);
var previewCanvas=null;
var previewToken=0;
var previewTimer=null;
var playTimer=null;
var playIndex=-1;
var resizeBound=false;

var MODES=[
{id:'chat',kind:'chat',templateId:'generic-chat-dark',nameKey:'simModeChat',descKey:'simModeChatDesc',name:'聊天',desc:'气泡、短信、对话日志'},
{id:'video-tube',kind:'tube',templateId:'video-tube-generic',parts:'tube',nameKey:'simModeVideo',descKey:'simModeVideoDesc',name:'影片站',desc:'假播放页、相关、评论'},
{id:'danmaku',kind:'danmaku',templateId:'danmaku-player-generic',parts:'danmaku',nameKey:'simModeDanmaku',descKey:'simModeDanmakuDesc',name:'弹幕',desc:'假投稿页、弹幕、接下来播放'},
{id:'phone',kind:'phone',templateId:'phone-generic',nameKey:'simModePhone',descKey:'simModePhoneDesc',name:'手机',desc:'通知与短信列表'},
{id:'social',kind:'social',templateId:'social-feed-generic',nameKey:'simModeSocial',descKey:'simModeSocialDesc',name:'社交',desc:'账号、动态、评论'},
{id:'forum',kind:'forum',templateId:'forum-generic',nameKey:'simModeForum',descKey:'simModeForumDesc',name:'论坛',desc:'帖子楼层与回帖'},
{id:'livestream',kind:'live',templateId:'livestream-generic',nameKey:'simModeLive',descKey:'simModeLiveDesc',name:'直播',desc:'直播间与弹幕'},
{id:'image-board',kind:'board',templateId:'image-board-generic',parts:'board',nameKey:'simModeBoard',descKey:'simModeBoardDesc',name:'图区',desc:'板块与帖子墙'},
{id:'visual-novel',kind:'vn',templateId:'visual-novel-generic',nameKey:'simModeVn',descKey:'simModeVnDesc',name:'视觉小说',desc:'章节对白与立绘位'}
];

var WEB_FORMS={
'video-tube-generic':[
{key:'title',label:'影片标题'},
{key:'channel.name',label:'频道名'},
{key:'views',label:'播放量'},
{key:'related',label:'相关列表（每行一个标题）',type:'related'},
{key:'comments',label:'评论（每行 名字：内容）',type:'named'}
],
'danmaku-player-generic':[
{key:'title',label:'投稿标题'},
{key:'uploader.name',label:'投稿者'},
{key:'plays',label:'播放数'},
{key:'danmaku',label:'弹幕（每行一条，可写成 名字：内容）',type:'named'},
{key:'related',label:'接下来播放（每行一个标题）',type:'related'}
],
'image-board-generic':[
{key:'title',label:'图区标题'},
{key:'board',label:'板块'},
{key:'notice',label:'公告',type:'textarea'},
{key:'posts',label:'帖子（每行 标题｜作者）',type:'posts'}
],
'visual-novel-generic':[
{key:'title',label:'章节标题'},
{key:'dialogue',label:'对白（每行 角色：台词）',type:'dialogue'}
],
'social-feed-generic':[
{key:'title',label:'页标题'},
{key:'account.name',label:'账号名'},
{key:'account.handle',label:'账号ID'},
{key:'body',label:'正文',type:'textarea'},
{key:'time',label:'时间'},
{key:'comments',label:'评论（每行 名字：内容）',type:'named'}
],
'phone-generic':[
{key:'title',label:'界面标题'},
{key:'time',label:'时间'},
{key:'battery',label:'电量'},
{key:'messages',label:'消息（每行 名字：内容）',type:'named'}
],
'forum-generic':[
{key:'title',label:'帖子标题'},
{key:'category',label:'分区'},
{key:'author.name',label:'楼主'},
{key:'body',label:'正文',type:'textarea'},
{key:'replies',label:'回帖（每行 名字：内容）',type:'named'}
],
'livestream-generic':[
{key:'title',label:'直播间标题'},
{key:'host.name',label:'主播'},
{key:'viewers',label:'在线人数'},
{key:'danmaku',label:'弹幕（每行 名字：内容）',type:'named'}
]
};

function el(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function overlay(){return el('simulatorStudioOverlay');}
function modeById(id){
for(var i=0;i<MODES.length;i++){if(MODES[i].id===id)return MODES[i];}
return null;
}
function t(key,zh){
if(typeof getTranslation==='function')return getTranslation(key,zh);
if(typeof getText==='function'){
var value=getText(key);
if(value&&value!==key)return value;
}
return zh;
}
function logError(error){
if(typeof simulatorStudioLogger!=='undefined'&&simulatorStudioLogger&&typeof simulatorStudioLogger.error==='function'){
simulatorStudioLogger.error(error&&error.message?error.message:String(error));
}
}

function setStatus(message,isError){
var target=el('simStudioStatus');
if(!target)return;
target.textContent=message||'';
target.classList.toggle('is-error',!!isError);
}

function defaultChatScript(){
return t('simStudioChatExample','角色A：今晚还出图吗？\n角色B：先把分镜排好。');
}

function ensureChatScript(){
var scriptEl=el('simStudioChatScript');
if(!scriptEl)return;
if(String(scriptEl.value||'').trim())return;
scriptEl.value=defaultChatScript();
}

function readChatStory(){
var engine=root.NaiComicStoryEngine;
if(!engine)throw new Error('剧情编辑器未加载。');
var title=(el('simStudioChatTitle')&&el('simStudioChatTitle').value)||'未命名对话';
var script=(el('simStudioChatScript')&&el('simStudioChatScript').value)||'';
if(!String(script).trim())throw new Error(t('simStudioNeedScript','请先写对白。右侧框里按「角色：台词」每行一句。'));
var story=engine.parseScript(script,{title:title});
story.title=title;
return story;
}

function afterPlaced(message){
close();
var text=message||t('simStudioPlaced','已经放到画布上了。可以拖动、缩小。');
if(typeof createToast==='function')createToast('已放到画布',text,5200);
if(root.NaiBeginnerGuide&&typeof root.NaiBeginnerGuide.flashHelp==='function'){
root.NaiBeginnerGuide.flashHelp(text);
}
if(root.NaiBeginnerGuide&&typeof root.NaiBeginnerGuide.updateEmptyHint==='function'){
root.NaiBeginnerGuide.updateEmptyHint();
}
}

function getPath(object,path){
var value=object;
String(path||'').split('.').forEach(function(key){
if(value&&typeof value==='object')value=value[key];
else value=undefined;
});
return value;
}

function setPath(object,path,value){
var keys=String(path||'').split('.');
var cursor=object;
keys.forEach(function(key,index){
if(index===keys.length-1)cursor[key]=value;
else{
if(!cursor[key]||typeof cursor[key]!=='object')cursor[key]={};
cursor=cursor[key];
}
});
return object;
}

function parseNamed(text){
return String(text||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).map(function(line){
var match=line.match(/^([^：:]{1,24})[：:]\s*(.*)$/);
if(match)return {name:match[1],body:match[2],content:match[2]};
return {name:'观众',body:line,content:line};
});
}

function namedToText(list){
return (Array.isArray(list)?list:[]).map(function(item){
if(!item)return '';
if(typeof item==='string')return item;
var name=item.name||item.user||item.author||item.sender||'';
var body=item.body||item.content||item.title||'';
return name?name+'：'+body:body;
}).filter(Boolean).join('\n');
}

function relatedToText(list){
return (Array.isArray(list)?list:[]).map(function(item){
if(!item)return '';
if(typeof item==='string')return item;
return item.title||item.body||item.content||'';
}).filter(Boolean).join('\n');
}

function parseRelated(text){
return String(text||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).map(function(title){return {title:title};});
}

function parsePosts(text){
return String(text||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).map(function(line,index){
var parts=line.split(/[｜|]/);
return {title:(parts[0]||('帖子 '+(index+1))).trim(),meta:(parts[1]||'').trim(),body:(parts[0]||'').trim()};
});
}

function postsToText(list){
return (Array.isArray(list)?list:[]).map(function(item){
if(!item)return '';
if(typeof item==='string')return item;
return item.meta?item.title+'｜'+item.meta:(item.title||item.body||'');
}).filter(Boolean).join('\n');
}

function parseDialogue(text){
return String(text||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).map(function(line,index){
var match=line.match(/^([^：:]{1,24})[：:]\s*(.*)$/);
if(match)return {speaker:match[1],content:match[2],type:'speech',id:'line_'+(index+1)};
return {speaker:'旁白',content:line,type:'narrator',id:'line_'+(index+1)};
});
}

function dialogueToText(list){
return (Array.isArray(list)?list:[]).map(function(item){
if(!item)return '';
if(typeof item==='string')return item;
var speaker=item.speaker||'';
var content=item.content||item.body||'';
return speaker?speaker+'：'+content:content;
}).filter(Boolean).join('\n');
}

function fieldControl(field,value){
var input;
if(field.type&&field.type!=='text'){
input=document.createElement('textarea');
input.rows=field.type==='textarea'?3:5;
}else{
input=document.createElement('input');
input.type='text';
}
input.className='simulator-chat-input sim-studio-field-input';
input.setAttribute('data-field-key',field.key);
input.setAttribute('data-field-type',field.type||'text');
input.value=value==null?'':String(value);
return input;
}

function fillForm(container,fields,values){
if(!container)return;
container.innerHTML='';
(fields||[]).forEach(function(field){
var row=document.createElement('div');
row.className='simulator-chat-field sim-studio-field';
var label=document.createElement('label');
label.textContent=field.label||field.key;
row.appendChild(label);
row.appendChild(fieldControl(field,values&&values[field.key]));
container.appendChild(row);
});
}

function readForm(container){
var data=Object.create(null);
if(!container)return data;
container.querySelectorAll('.sim-studio-field-input').forEach(function(input){
data[input.getAttribute('data-field-key')]=input.value;
data['__type__'+input.getAttribute('data-field-key')]=input.getAttribute('data-field-type')||'text';
});
return data;
}

function applyWebForm(scene,form,webId){
var spec=WEB_FORMS[webId||currentWebId]||[];
spec.forEach(function(field){
var raw=form[field.key];
if(raw==null)return;
if(field.type==='named')setPath(scene,field.key,parseNamed(raw));
else if(field.type==='related')setPath(scene,field.key,parseRelated(raw));
else if(field.type==='posts')setPath(scene,field.key,parsePosts(raw));
else if(field.type==='dialogue')setPath(scene,field.key,parseDialogue(raw));
else setPath(scene,field.key,raw);
});
return scene;
}

function webFormValues(scene,webId){
var spec=WEB_FORMS[webId||currentWebId]||[];
var values=Object.create(null);
spec.forEach(function(field){
var raw=getPath(scene,field.key);
if(field.type==='named')values[field.key]=namedToText(raw)||'观众A：先收藏。\n观众B：这一段构图很好。';
else if(field.type==='related')values[field.key]=relatedToText(raw)||'相关片段 1\n相关片段 2\n相关片段 3';
else if(field.type==='posts')values[field.key]=postsToText(raw)||'今日新帖｜匿名\n热门长图｜楼主';
else if(field.type==='dialogue')values[field.key]=dialogueToText(raw)||'角色A：今晚还出图吗？\n角色B：先把分镜排好。';
else values[field.key]=raw==null?'':String(raw);
});
return values;
}

function chatTemplates(){
if(root.NaiComicTemplateRegistry&&typeof root.NaiComicTemplateRegistry.list==='function'){
return root.NaiComicTemplateRegistry.list('chat');
}
return [];
}

function fillSelect(select,options,value){
if(!select)return;
var current=value||select.value;
select.innerHTML='';
options.forEach(function(option){
var node=document.createElement('option');
node.value=option.id;
node.textContent=option.name||option.id;
select.appendChild(node);
});
if(current)select.value=current;
}

function escapeHtml(text){
return String(text||'').replace(/[&<>"']/g,function(ch){
return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
});
}

function markStore(grid,id){
if(!grid)return;
grid.querySelectorAll('.sim-store-card').forEach(function(card){
var selected=card.getAttribute('data-store-id')===id;
card.classList.toggle('is-selected',selected);
card.setAttribute('aria-selected',selected?'true':'false');
});
}

function chatPreviewHtml(template){
var theme=(template&&template.theme)||{};
var left=theme.leftBubble&&theme.leftBubble!=='transparent'?theme.leftBubble:'#243244';
var right=theme.rightBubble&&theme.rightBubble!=='transparent'?theme.rightBubble:'#075985';
return '<span class="sim-store-preview sim-store-preview-chat" style="--sim-bg:'+escapeHtml(theme.background||'#111827')+';--sim-header:'+escapeHtml(theme.headerBackground||'#0f172a')+';--sim-left:'+escapeHtml(left)+';--sim-right:'+escapeHtml(right)+';--sim-accent:'+escapeHtml(theme.accentColor||'#38bdf8')+'"><span class="sim-mini-head"></span><span class="sim-mini-row"><span class="sim-mini-bubble sim-mini-left"></span></span><span class="sim-mini-row is-right"><span class="sim-mini-bubble sim-mini-right"></span></span><span class="sim-mini-row"><span class="sim-mini-bubble sim-mini-left is-short"></span></span></span>';
}

function webPreviewHtml(kind){
return '<span class="sim-store-preview sim-store-preview-web" data-kind="'+escapeHtml(kind||'tube')+'"><span class="sim-web-bar"></span><span class="sim-web-player"></span><span class="sim-web-lines"></span></span>';
}

function partThumb(id){
var pack=root.NaiComicSiteUiPack;
if(!pack||!Array.isArray(pack.CATALOG))return '';
var found=null;
pack.CATALOG.forEach(function(item){if(item.id===id)found=item;});
return found?(pack.BASE||'assets/original/site-ui/')+found.file:'';
}

function partKind(id){
id=String(id||'');
if(/danmaku/.test(id))return 'danmaku';
if(/board/.test(id))return 'board';
return 'tube';
}

function partPreviewHtml(item){
var src=partThumb(item.id);
if(src)return '<img class="sim-store-thumb" src="'+escapeHtml(src)+'" alt="">';
return '<span class="sim-store-preview sim-store-preview-part" data-kind="'+escapeHtml(partKind(item.id))+'"></span>';
}

function makeStoreCard(id,name,previewHtml,onPick,desc){
var card=document.createElement('button');
card.type='button';
card.className='sim-store-card';
card.setAttribute('role','option');
card.setAttribute('data-store-id',id);
card.innerHTML=previewHtml+'<span class="sim-store-name">'+escapeHtml(name||id)+'</span>'+(desc?'<span class="sim-store-desc">'+escapeHtml(desc)+'</span>':'');
card.addEventListener('click',function(){onPick(id);});
return card;
}

function modeIdForTemplate(templateId){
var id=String(templateId||'');
for(var i=0;i<MODES.length;i++){
if(MODES[i].templateId===id)return MODES[i].id;
}
if(WEB_FORMS[id]){
for(var j=0;j<MODES.length;j++){
if(MODES[j].templateId===id)return MODES[j].id;
}
}
return 'chat';
}

function modeIdForPart(partId){
var id=String(partId||'');
if(id.indexOf('asset_site_danmaku_')===0)return 'danmaku';
if(id.indexOf('asset_site_board_')===0)return 'image-board';
if(id.indexOf('asset_site_tube_')===0)return 'video-tube';
return null;
}

function partsForMode(modeId){
var prefix=modeId==='video-tube'?'asset_site_tube_':modeId==='danmaku'?'asset_site_danmaku_':modeId==='image-board'?'asset_site_board_':'';
if(!prefix)return [];
return (root.NaiComicSiteUiParts?root.NaiComicSiteUiParts.list():[]).filter(function(item){return item.id.indexOf(prefix)===0;});
}

function storyToScript(story){
if(!story)return '';
var names=Object.create(null);
(story.characters||[]).forEach(function(character){names[character.id]=character.name;});
return (story.nodes||[]).map(function(node){
var name=node.speaker?names[node.speaker]||node.speaker:(node.type==='speech'?'角色':'旁白');
return name+'：'+(node.content||'');
}).filter(function(line){return /：/.test(line)&&line.split('：')[1];}).join('\n');
}

function currentChatTemplateId(){
return (el('simStudioChatTemplate')&&el('simStudioChatTemplate').value)||'generic-chat-dark';
}

function snapshotSession(){
if(!currentMode)return;
var session=sessions[currentMode]||{};
session.playIndex=playIndex;
session.partId=currentPartId;
if(currentMode==='chat'){
session.templateId=currentChatTemplateId();
session.title=el('simStudioChatTitle')?el('simStudioChatTitle').value:'';
session.script=el('simStudioChatScript')?el('simStudioChatScript').value:'';
}else{
session.templateId=currentWebId;
session.webForm=readForm(el('simStudioWebForm'));
session.partForm=readForm(el('simStudioPartForm'));
}
sessions[currentMode]=session;
}

function restoreSession(mode){
var session=sessions[mode.id]||{};
playIndex=Number.isFinite(session.playIndex)?session.playIndex:-1;
if(mode.id==='chat'){
if(el('simStudioChatTitle')&&session.title!=null)el('simStudioChatTitle').value=session.title;
if(el('simStudioChatScript')&&session.script!=null)el('simStudioChatScript').value=session.script;
if(session.templateId&&el('simStudioChatTemplate'))el('simStudioChatTemplate').value=session.templateId;
markStore(el('simStudioChatStore'),currentChatTemplateId());
return;
}
currentWebId=session.templateId||mode.templateId;
var select=el('simStudioWebTemplate');
if(select)select.value=currentWebId;
if(session.webForm){
fillForm(el('simStudioWebForm'),WEB_FORMS[currentWebId]||[],session.webForm);
}else{
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)throw new Error('模拟器未加载：'+currentWebId);
renderWebForm(item.normalize({}));
}
if(mode.parts){
currentPartId=session.partId||partsForMode(mode.id)[0]&&partsForMode(mode.id)[0].id||currentPartId;
fillPartStore(mode.id);
renderPartForm(session.partForm);
}
}

function fillHome(){
var grid=el('simStudioHomeGrid');
if(!grid)return;
grid.innerHTML='';
MODES.forEach(function(mode){
var preview=mode.id==='chat'?chatPreviewHtml(chatTemplates()[0]):webPreviewHtml(mode.kind);
grid.appendChild(makeStoreCard(mode.id,t(mode.nameKey,mode.name),preview,function(id){openMode(id);},t(mode.descKey,mode.desc)));
});
}

function fillChatStore(){
var grid=el('simStudioChatStore');
var select=el('simStudioChatTemplate');
if(!grid)return;
grid.innerHTML='';
chatTemplates().forEach(function(template){
grid.appendChild(makeStoreCard(template.id,template.name,chatPreviewHtml(template),function(id){
if(select)select.value=id;
markStore(grid,id);
playIndex=-1;
refreshPreview();
}));
});
markStore(grid,currentChatTemplateId());
}

function fillPartStore(modeId){
var grid=el('simStudioPartStore');
if(!grid)return;
grid.innerHTML='';
partsForMode(modeId).forEach(function(item){
grid.appendChild(makeStoreCard(item.id,item.name,partPreviewHtml(item),function(id){
currentPartId=id;
markStore(grid,id);
renderPartForm();
}));
});
markStore(grid,currentPartId);
}

function renderWebForm(scene){
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)throw new Error('模拟器未加载：'+currentWebId);
var normalized=typeof item.normalize==='function'?item.normalize(scene||{}):(scene||{});
fillForm(el('simStudioWebForm'),WEB_FORMS[currentWebId]||[],webFormValues(normalized,currentWebId));
}

function renderPartForm(values){
var parts=root.NaiComicSiteUiParts;
var def=parts&&parts.get(currentPartId);
fillForm(el('simStudioPartForm'),def?def.fields:[],values||(parts&&parts.defaults(currentPartId))||{});
}

function updatePlayHud(total){
var indexNode=el('simStudioPlayIndex');
var totalNode=el('simStudioPlayTotal');
var shown=playIndex<0?(total||0):Math.max(0,playIndex+1);
if(indexNode)indexNode.textContent=String(shown);
if(totalNode)totalNode.textContent=String(total||0);
}

function visibleScene(scene,index){
if(root.NaiComicPlaybackController&&typeof root.NaiComicPlaybackController.makeVisibleScene==='function'){
return root.NaiComicPlaybackController.makeVisibleScene(scene,index);
}
var value=JSON.parse(JSON.stringify(scene||{}));
if(value.sceneType==='visual-novel'||value.templateId==='visual-novel-generic'){
value.activeNodeIndex=Math.max(0,index);
return value;
}
['messages','events','dialogue','nodes','comments','danmaku','replies','posts'].forEach(function(key){
if(Array.isArray(value[key]))value[key]=value[key].slice(0,index+1);
});
if(Array.isArray(value.nodes))value.currentIndex=Math.max(0,index);
return value;
}

function eventsOf(scene){
if(root.NaiComicTimeline&&typeof root.NaiComicTimeline.eventsFromScene==='function'){
return root.NaiComicTimeline.eventsFromScene(scene);
}
return [];
}

function buildChatGroup(){
var adapters=root.NaiComicStoryAdapters;
if(!adapters||!root.NaiComicChatRenderer)return Promise.reject(new Error('聊天模拟器未加载。'));
var templateId=currentChatTemplateId();
var story=readChatStory();
var scene=adapters.toTemplate(story,templateId);
var events=eventsOf(scene);
updatePlayHud(events.length);
var visible=playIndex<0?events.length:Math.max(0,playIndex+1);
return root.NaiComicChatRenderer.renderScene(scene,root.NaiComicTemplateRegistry.get(templateId),{visibleCount:visible});
}

function buildWebGroup(){
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)return Promise.reject(new Error('模拟器未加载：'+currentWebId));
var scene=applyWebForm(item.normalize({}),readForm(el('simStudioWebForm')),currentWebId);
var events=eventsOf(scene);
updatePlayHud(events.length);
if(playIndex>=0)scene=visibleScene(scene,playIndex);
return Promise.resolve(item.render(scene));
}

function ensurePreview(){
if(!root.fabric)throw new Error('Fabric.js 尚未加载。');
var host=el('simStudioPreviewHost');
var canvasEl=el('simStudioPreview');
if(!host||!canvasEl)throw new Error('预览区域未加载。');
var width=Math.max(1,host.clientWidth||host.offsetWidth||1);
var height=Math.max(1,host.clientHeight||host.offsetHeight||1);
if(!previewCanvas){
var Ctor=root.fabric.StaticCanvas||root.fabric.Canvas;
previewCanvas=new Ctor('simStudioPreview',{enableRetinaScaling:true,renderOnAddRemove:false,selection:false});
}
previewCanvas.setWidth(width);
previewCanvas.setHeight(height);
if(typeof previewCanvas.calcOffset==='function')previewCanvas.calcOffset();
return previewCanvas;
}

function clearPreview(){
if(!previewCanvas)return;
previewCanvas.clear();
if(typeof previewCanvas.renderAll==='function')previewCanvas.renderAll();
}

function showPreviewGroup(group){
var preview=ensurePreview();
preview.clear();
var width=preview.getWidth();
var height=preview.getHeight();
var gw=Number(group.width)||1;
var gh=Number(group.height)||1;
var scale=Math.min(width/gw,height/gh);
if(!isFinite(scale)||scale<=0)throw new Error('预览尺寸无效。');
group.set({
originX:'left',
originY:'top',
left:(width-gw*scale)/2,
top:(height-gh*scale)/2,
scaleX:scale,
scaleY:scale,
selectable:false,
evented:false,
excludeFromLayerPanel:true
});
if(typeof group.setCoords==='function')group.setCoords();
preview.add(group);
preview.renderAll();
}

function refreshPreview(){
var token=++previewToken;
var task=currentMode==='chat'?buildChatGroup():buildWebGroup();
return task.then(function(group){
if(token!==previewToken)return;
if(!group)throw new Error('模拟器渲染失败，预览未更新。');
showPreviewGroup(group);
}).catch(function(error){
if(token!==previewToken)return;
clearPreview();
logError(error);
setStatus(error&&error.message?error.message:'模拟器渲染失败。',true);
});
}

function schedulePreview(){
if(previewTimer)clearTimeout(previewTimer);
previewTimer=setTimeout(function(){
previewTimer=null;
refreshPreview();
},220);
}

function stopPlay(){
if(playTimer){
clearInterval(playTimer);
playTimer=null;
}
}

function currentEvents(){
if(currentMode==='chat'){
var engine=root.NaiComicStoryEngine;
var adapters=root.NaiComicStoryAdapters;
if(!engine||!adapters)return [];
var title=(el('simStudioChatTitle')&&el('simStudioChatTitle').value)||'未命名对话';
var script=(el('simStudioChatScript')&&el('simStudioChatScript').value)||'';
var story=script.trim()?engine.parseScript(script,{title:title}):null;
if(!story)return [];
story.title=title;
return eventsOf(adapters.toTemplate(story,currentChatTemplateId()));
}
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)return [];
return eventsOf(applyWebForm(item.normalize({}),readForm(el('simStudioWebForm')),currentWebId));
}

function playAt(index){
var events=currentEvents();
if(!events.length){
setStatus('当前界面没有可逐步播放的对白或评论。',true);
updatePlayHud(0);
return;
}
playIndex=Math.max(0,Math.min(events.length-1,index));
updatePlayHud(events.length);
refreshPreview();
}

function playPrev(){
var events=currentEvents();
if(!events.length){setStatus('当前界面没有可逐步播放的对白或评论。',true);return;}
if(playIndex<0)playIndex=events.length-1;
playAt(playIndex-1);
}

function playNext(){
var events=currentEvents();
if(!events.length){setStatus('当前界面没有可逐步播放的对白或评论。',true);return;}
if(playIndex<0){playAt(0);return;}
playAt(playIndex+1);
}

function playAuto(){
stopPlay();
var events=currentEvents();
if(!events.length){setStatus('当前界面没有可逐步播放的对白或评论。',true);return;}
if(playIndex<0||playIndex>=events.length-1)playIndex=-1;
playTimer=setInterval(function(){
var next=currentEvents();
if(!next.length||playIndex>=next.length-1){
stopPlay();
setStatus('播放结束。',false);
return;
}
playAt(playIndex<0?0:playIndex+1);
},900);
setStatus('正在这个模拟器里播放。',false);
}

function viewApi(){
return root.NaiCanvasView||{};
}

function scaleWhole(factor){
var api=viewApi();
if(typeof api.scaleSelected!=='function'||!api.scaleSelected(factor,true)){
setStatus('请先去看画布，点一下刚放进去的界面，再缩小或放大。',true);
return false;
}
setStatus(factor>1?'已放大。还可以拖到格子里。':'已缩小。还可以拖到格子里。',false);
return true;
}

function fitWhole(){
var api=viewApi();
if(typeof api.fitSelected!=='function'||!api.fitSelected()){
setStatus('请先去看画布，点一下刚放进去的界面，再贴到格子。',true);
return false;
}
setStatus('已贴到格子。还可以再拖一下。',false);
return true;
}

function insertChat(){
var composer=root.NaiComicStoryComposer;
if(!composer)return Promise.reject(new Error('剧情编辑器未加载。'));
var templateId=currentChatTemplateId();
var story=readChatStory();
return composer.insertTemplate(templateId,{replace:false,story:story}).then(function(group){
afterPlaced(t('simStudioPlaced','已经放到画布上了。可以拖动、缩小。聊天界面不能直接 NAI 出图。'));
return group;
});
}

function insertWeb(){
var controller=root.NaiComicSimulatorController;
if(!controller||typeof controller.insertScene!=='function')return Promise.reject(new Error('网页模拟器未加载。'));
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)return Promise.reject(new Error('模拟器不存在：'+currentWebId));
var scene=applyWebForm(item.normalize({}),readForm(el('simStudioWebForm')),currentWebId);
return controller.insertScene(currentWebId,scene,{replace:false}).then(function(group){
afterPlaced(t('simStudioPlaced','已经放到画布上了。可以拖动、缩小。'));
return group;
});
}

function insertPart(){
var parts=root.NaiComicSiteUiParts;
if(!parts)return Promise.reject(new Error('站点零件未加载。'));
var values=readForm(el('simStudioPartForm'));
Object.keys(values).forEach(function(key){if(key.indexOf('__type__')===0)delete values[key];});
return parts.place(currentPartId,values).then(function(group){
afterPlaced('已经把零件放到画布上了。双击文字就能改播放量、评论、标题。');
return group;
});
}

function loadChatSelected(){
var composer=root.NaiComicStoryComposer;
if(!composer||typeof composer.loadSelected!=='function'){setStatus('剧情编辑器未加载。',true);return false;}
if(!composer.loadSelected()){setStatus('请先在画布上点选一个对话模拟器。',true);return false;}
var story=composer.getStory();
if(el('simStudioChatTitle'))el('simStudioChatTitle').value=story.title||'';
if(el('simStudioChatScript'))el('simStudioChatScript').value=storyToScript(story);
var current=typeof root.canvas!=='undefined'?root.canvas:(typeof canvas!=='undefined'?canvas:null);
var object=current&&current.getActiveObject&&current.getActiveObject();
var factory=root.NaiComicExtraRendererFactory;
var resolved=factory&&typeof factory.resolvePage==='function'?factory.resolvePage(object,current):object;
var templateId=resolved&&resolved.simulatorTemplateId;
if(templateId&&el('simStudioChatTemplate')){
el('simStudioChatTemplate').value=templateId;
markStore(el('simStudioChatStore'),templateId);
}
playIndex=-1;
refreshPreview();
setStatus('已从画布读回对白。改完可再放入漫画。',false);
return true;
}

function loadWebSelected(){
var controller=root.NaiComicSimulatorController;
if(!controller||typeof controller.loadSelected!=='function'){setStatus('网页模拟器未加载。',true);return false;}
if(!controller.loadSelected()){setStatus('请先点选画布上的假网页。',true);return false;}
var json=el('simulatorExtraSceneJson');
var scene={};
try{scene=root.NaiComicSceneSerializer.deserialize(json?json.value:'{}');}catch(error){scene={};}
currentWebId=scene.templateId||currentWebId;
var select=el('simStudioWebTemplate');
if(select)select.value=currentWebId;
renderWebForm(scene);
playIndex=-1;
refreshPreview();
setStatus('已从画布读回标题、播放量、评论。改完可再放入漫画。',false);
return true;
}

function loadPartSelected(){
var parts=root.NaiComicSiteUiParts;
var selected=parts&&parts.readSelected();
if(!selected||!selected.id){setStatus('请先点选画布上的站点零件。',true);return false;}
var modeId=modeIdForPart(selected.id);
if(modeId&&modeId!==currentMode){
openMode(modeId,{partId:selected.id,partValues:selected.values,message:'已读取选中零件的文字。'});
return true;
}
currentPartId=selected.id;
markStore(el('simStudioPartStore'),currentPartId);
renderPartForm(selected.values);
setStatus('已从画布读回零件文字。改完再点「把零件放到画布」。',false);
return true;
}

function hideLeftPanels(){
document.querySelectorAll('.left_area').forEach(function(panel){panel.style.display='none';});
document.querySelectorAll('#sidebar .icon-wrapper i.active').forEach(function(icon){icon.classList.remove('active');});
var studioIcon=document.querySelector('#sidebar .icon-wrapper[data-action="openSimulatorStudio"] i');
if(studioIcon)studioIcon.classList.add('active');
if(typeof adjustCanvasSize==='function')adjustCanvasSize();
}

function setView(view){
currentView=view==='work'?'work':'home';
var home=el('simStudioHome');
var work=el('simStudioWork');
var back=el('simStudioBack');
if(home)home.hidden=currentView!=='home';
if(work)work.hidden=currentView!=='work';
if(back)back.hidden=currentView!=='work';
var title=el('simStudioTitle');
var mode=modeById(currentMode);
if(title)title.textContent=currentView==='work'&&mode?t(mode.nameKey,mode.name):t('simStudioTitle','模拟器');
if(currentView==='home'){
stopPlay();
currentMode=null;
}
}

function applyStory(story,templateId){
if(!story)return;
if(currentMode==='chat'){
if(el('simStudioChatTitle'))el('simStudioChatTitle').value=story.title||'';
if(el('simStudioChatScript'))el('simStudioChatScript').value=storyToScript(story);
if(templateId&&el('simStudioChatTemplate')){
el('simStudioChatTemplate').value=templateId;
markStore(el('simStudioChatStore'),templateId);
}
return;
}
if(!root.NaiComicStoryAdapters)return;
var scene=root.NaiComicStoryAdapters.toTemplate(story,templateId||currentWebId);
currentWebId=templateId||currentWebId;
renderWebForm(scene);
}

function syncDock(mode){
var chatDock=el('simStudioChatDock');
var webDock=el('simStudioWebDock');
var partDock=el('simStudioPartDock');
var chatActions=el('simStudioChatActions');
var webActions=el('simStudioWebActions');
var partActions=el('simStudioPartActions');
if(chatDock)chatDock.hidden=mode.id!=='chat';
if(webDock)webDock.hidden=mode.id==='chat';
if(partDock)partDock.hidden=!mode.parts;
if(chatActions)chatActions.hidden=mode.id!=='chat';
if(webActions)webActions.hidden=mode.id==='chat';
if(partActions)partActions.hidden=!mode.parts;
}

function openMode(modeId,options){
options=options||{};
var mode=modeById(modeId);
if(!mode){setStatus('没有这个模拟器：'+modeId,true);return;}
if(currentMode&&currentMode!==mode.id)snapshotSession();
stopPlay();
currentMode=mode.id;
if(mode.id!=='chat')currentWebId=options.templateId||mode.templateId;
if(options.partId)currentPartId=options.partId;
hideLeftPanels();
var box=overlay();
if(box)box.hidden=false;
setView('work');
syncDock(mode);
if(options.story){
playIndex=-1;
applyStory(options.story,options.templateId||(mode.id==='chat'?currentChatTemplateId():currentWebId));
if(mode.parts){
fillPartStore(mode.id);
renderPartForm(options.partValues);
}
}else{
try{
if(options.partValues){
restoreSession(mode);
currentPartId=options.partId||currentPartId;
fillPartStore(mode.id);
renderPartForm(options.partValues);
}else{
restoreSession(mode);
}
}catch(error){
logError(error);
setStatus(error.message,true);
return;
}
}
if(mode.id==='chat')ensureChatScript();
if(typeof requestAnimationFrame==='function'){
requestAnimationFrame(function(){
try{
ensurePreview();
refreshPreview();
}catch(error){
logError(error);
setStatus(error.message,true);
}
});
}else{
try{
ensurePreview();
refreshPreview();
}catch(error){
logError(error);
setStatus(error.message,true);
}
}
setStatus(options.message||('在「'+t(mode.nameKey,mode.name)+'」里改字、播放。放入漫画是可选出口。'),false);
}

function showHome(options){
options=options||{};
if(currentMode)snapshotSession();
stopPlay();
hideLeftPanels();
var box=overlay();
if(!box){setStatus('模拟器未加载。',true);return;}
box.hidden=false;
fillHome();
setView('home');
setStatus(options.message||t('simStudioHomeHint','点一种界面，进入对应模拟器。在里面改字、播放。放入漫画是可选出口。不含真实站名。'),false);
}

function open(options){
options=options||{};
if(options.story){
var storyTemplate=options.templateId||(el('storyComposerTemplate')&&el('storyComposerTemplate').value)||'generic-chat-dark';
openMode(modeIdForTemplate(storyTemplate),{templateId:storyTemplate,story:options.story,message:options.message});
return;
}
if(options.assetId&&root.NaiComicSiteUiParts&&root.NaiComicSiteUiParts.has(options.assetId)){
var partMode=modeIdForPart(options.assetId);
if(!partMode){setStatus('这个零件没有对应的模拟器。',true);return;}
openMode(partMode,{partId:options.assetId,partValues:options.values,message:options.message||'改播放量、评论、标题后，可把零件放到画布。'});
return;
}
if(options.modeId){
openMode(options.modeId,{templateId:options.templateId,message:options.message});
return;
}
if(options.templateId&&WEB_FORMS[options.templateId]){
openMode(modeIdForTemplate(options.templateId),{templateId:options.templateId,message:options.message});
return;
}
if(options.tab==='chat'){
openMode('chat',{message:options.message});
return;
}
if(options.tab==='web'){
openMode(modeIdForTemplate(options.templateId||currentWebId),{templateId:options.templateId,message:options.message});
return;
}
if(options.tab==='part'){
showHome({message:options.message||'零件已收进影片站、弹幕、图区。请先进入对应模拟器。'});
return;
}
showHome(options);
}

function openFromStory(){
var composer=root.NaiComicStoryComposer;
if(!composer||typeof composer.getStory!=='function'){
setStatus('剧情编辑器未加载。',true);
return;
}
var story=composer.getStory();
var templateId=(el('storyComposerTemplate')&&el('storyComposerTemplate').value)||'generic-chat-dark';
open({story:story,templateId:templateId,message:'已从剧情打开对应模拟器。在这里改字、播放，需要时再放入漫画。'});
}

function close(){
stopPlay();
if(currentMode)snapshotSession();
var box=overlay();
if(box)box.hidden=true;
var studioIcon=document.querySelector('#sidebar .icon-wrapper[data-action="openSimulatorStudio"] i');
if(studioIcon)studioIcon.classList.remove('active');
}

function isOpen(){
var box=overlay();
return !!(box&&!box.hidden);
}

function bindResize(){
if(resizeBound)return;
resizeBound=true;
var host=el('simStudioPreviewHost');
function onResize(){
if(!isOpen()||currentView!=='work')return;
try{
ensurePreview();
schedulePreview();
}catch(error){
logError(error);
}
}
if(typeof ResizeObserver==='function'&&host){
new ResizeObserver(onResize).observe(host);
}
root.addEventListener('resize',onResize);
}

function bind(){
if(initialized)return;
initialized=true;
fillSelect(el('simStudioChatTemplate'),chatTemplates().map(function(item){return {id:item.id,name:item.name};}),'generic-chat-dark');
fillSelect(el('simStudioWebTemplate'),MODES.filter(function(mode){return mode.id!=='chat';}).map(function(mode){return {id:mode.templateId,name:mode.name};}),currentWebId);
fillChatStore();
fillHome();
bindResize();
var back=el('simStudioBack');
if(back)back.addEventListener('click',function(){showHome();});
var closeBtn=el('simStudioClose');
if(closeBtn)closeBtn.addEventListener('click',close);
var chatSelect=el('simStudioChatTemplate');
if(chatSelect)chatSelect.addEventListener('change',function(){
markStore(el('simStudioChatStore'),chatSelect.value);
refreshPreview();
});
var chatTitle=el('simStudioChatTitle');
if(chatTitle)chatTitle.addEventListener('input',schedulePreview);
var chatScript=el('simStudioChatScript');
if(chatScript)chatScript.addEventListener('input',schedulePreview);
var webForm=el('simStudioWebForm');
if(webForm)webForm.addEventListener('input',schedulePreview);
var chatInsert=el('simStudioChatInsert');
if(chatInsert)chatInsert.addEventListener('click',function(){insertChat().catch(function(error){setStatus(error.message,true);});});
var chatLoad=el('simStudioChatLoad');
if(chatLoad)chatLoad.addEventListener('click',loadChatSelected);
var webInsert=el('simStudioWebInsert');
if(webInsert)webInsert.addEventListener('click',function(){insertWeb().catch(function(error){setStatus(error.message,true);});});
var webLoad=el('simStudioWebLoad');
if(webLoad)webLoad.addEventListener('click',loadWebSelected);
var webExample=el('simStudioWebExample');
if(webExample)webExample.addEventListener('click',function(){
try{
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)throw new Error('模拟器未加载：'+currentWebId);
playIndex=-1;
renderWebForm(item.normalize({}));
refreshPreview();
setStatus('已载入示例文字。',false);
}catch(error){
setStatus(error.message,true);
}
});
var partInsert=el('simStudioPartInsert');
if(partInsert)partInsert.addEventListener('click',function(){insertPart().catch(function(error){setStatus(error.message,true);});});
var partLoad=el('simStudioPartLoad');
if(partLoad)partLoad.addEventListener('click',loadPartSelected);
var prev=el('simStudioPlayPrev');
if(prev)prev.addEventListener('click',playPrev);
var next=el('simStudioPlayNext');
if(next)next.addEventListener('click',playNext);
var play=el('simStudioPlay');
if(play)play.addEventListener('click',playAuto);
var stop=el('simStudioPlayStop');
if(stop)stop.addEventListener('click',function(){stopPlay();setStatus('已停止播放。',false);});
var scaleDown=el('simStudioScaleDown');
if(scaleDown)scaleDown.addEventListener('click',function(){scaleWhole(1/1.12);});
var scaleUp=el('simStudioScaleUp');
if(scaleUp)scaleUp.addEventListener('click',function(){scaleWhole(1.12);});
var fitBtn=el('simStudioFit');
if(fitBtn)fitBtn.addEventListener('click',function(){fitWhole();});
document.addEventListener('keydown',function(event){
if(event.key!=='Escape'||!isOpen())return;
var tag=String(event.target&&event.target.tagName||'').toLowerCase();
if(tag==='input'||tag==='textarea'||tag==='select')return;
if(currentView==='work')showHome();
else close();
});
}

root.NaiComicSimulatorStudio={
open:open,
close:close,
isOpen:isOpen,
openMode:openMode,
openFromStory:openFromStory,
insertChat:insertChat,
insertWeb:insertWeb,
insertPart:insertPart
};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
