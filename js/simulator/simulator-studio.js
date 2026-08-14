(function(root){
"use strict";

var currentTab='chat';
var currentPartId='asset_site_tube_stats';
var currentWebId='video-tube-generic';
var initialized=false;

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

function setStatus(message,isError){
var target=el('simStudioStatus');
if(!target)return;
target.textContent=message||'';
target.classList.toggle('is-error',!!isError);
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

function applyWebForm(scene,form){
var spec=WEB_FORMS[currentWebId]||[];
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

function webFormValues(scene){
var spec=WEB_FORMS[currentWebId]||[];
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

function webTemplates(){
if(!root.NaiComicExtraRendererRegistry)return [];
return root.NaiComicExtraRendererRegistry.list().filter(function(item){
return item&&item.definition&&item.definition.category!=='site-ui-part';
});
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

function webKind(id){
id=String(id||'');
if(/danmaku/.test(id))return 'danmaku';
if(/image-board|board/.test(id))return 'board';
if(/visual-novel/.test(id))return 'vn';
if(/social/.test(id))return 'social';
if(/phone/.test(id))return 'phone';
if(/forum/.test(id))return 'forum';
if(/livestream/.test(id))return 'live';
return 'tube';
}

function webPreviewHtml(id){
return '<span class="sim-store-preview sim-store-preview-web" data-kind="'+escapeHtml(webKind(id))+'"><span class="sim-web-bar"></span><span class="sim-web-player"></span><span class="sim-web-lines"></span></span>';
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

function makeStoreCard(id,name,previewHtml,onPick){
var card=document.createElement('button');
card.type='button';
card.className='sim-store-card';
card.setAttribute('role','option');
card.setAttribute('data-store-id',id);
card.innerHTML=previewHtml+'<span class="sim-store-name">'+escapeHtml(name||id)+'</span>';
card.addEventListener('click',function(){onPick(id);});
return card;
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
}));
});
markStore(grid,(select&&select.value)||'generic-chat-dark');
}

function fillWebStore(){
var grid=el('simStudioWebStore');
var select=el('simStudioWebTemplate');
if(!grid)return;
grid.innerHTML='';
webTemplates().forEach(function(item){
var id=item.definition.id;
var name=item.definition.name;
grid.appendChild(makeStoreCard(id,name,webPreviewHtml(id),function(picked){
currentWebId=picked;
if(select)select.value=picked;
markStore(grid,picked);
renderWebForm({});
}));
});
markStore(grid,currentWebId);
}

function fillPartStore(){
var grid=el('simStudioPartStore');
var select=el('simStudioPartSelect');
if(!grid)return;
grid.innerHTML='';
(root.NaiComicSiteUiParts?root.NaiComicSiteUiParts.list():[]).forEach(function(item){
grid.appendChild(makeStoreCard(item.id,item.name,partPreviewHtml(item),function(id){
currentPartId=id;
if(select)select.value=id;
markStore(grid,id);
renderPartForm();
}));
});
markStore(grid,currentPartId);
}

function viewApi(){
return root.NaiCanvasView||{};
}

function scaleWhole(factor){
var api=viewApi();
if(typeof api.scaleSelected!=='function'||!api.scaleSelected(factor,true)){
setStatus('请先在画布上点选模拟器或图层，再放大缩小。',true);
return false;
}
setStatus(factor>1?'已放大整页。可继续拖动贴合分镜。':'已缩小整页。可继续拖动贴合分镜。',false);
return true;
}

function fitWhole(){
var api=viewApi();
if(typeof api.fitSelected!=='function'||!api.fitSelected()){
setStatus('请先点选画布上的模拟器，再贴合分镜。',true);
return false;
}
setStatus('已贴合到分镜或画布。可再拖动微调。',false);
return true;
}

function setTab(tab){
currentTab=tab||'chat';
var bar=el('simStudioTabs');
if(bar){
bar.querySelectorAll('[data-studio-tab]').forEach(function(button){
button.classList.toggle('is-active',button.getAttribute('data-studio-tab')===currentTab);
});
}
document.querySelectorAll('[data-studio-panel]').forEach(function(panel){
panel.hidden=panel.getAttribute('data-studio-panel')!==currentTab;
});
}

function renderWebForm(scene){
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
var normalized=item&&typeof item.normalize==='function'?item.normalize(scene||{}):(scene||{});
fillForm(el('simStudioWebForm'),WEB_FORMS[currentWebId]||[],webFormValues(normalized));
}

function renderPartForm(values){
var parts=root.NaiComicSiteUiParts;
var def=parts&&parts.get(currentPartId);
fillForm(el('simStudioPartForm'),def?def.fields:[],values||(parts&&parts.defaults(currentPartId))||{});
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

function insertChat(){
var engine=root.NaiComicStoryEngine;
var composer=root.NaiComicStoryComposer;
if(!engine||!composer)return Promise.reject(new Error('剧情编辑器未加载。'));
var title=(el('simStudioChatTitle')&&el('simStudioChatTitle').value)||'未命名对话';
var script=(el('simStudioChatScript')&&el('simStudioChatScript').value)||'';
var templateId=(el('simStudioChatTemplate')&&el('simStudioChatTemplate').value)||'generic-chat-dark';
var story=script.trim()?engine.parseScript(script,{title:title}):composer.getStory();
story.title=title;
return composer.insertTemplate(templateId,{replace:false,story:story}).then(function(group){
setStatus('已把对话皮肤放到画布。整页已选中，可缩小贴合分镜。这是聊天界面，不能直接 NAI 出图。',false);
return group;
});
}

function insertWeb(){
var controller=root.NaiComicSimulatorController;
if(!controller||typeof controller.insertScene!=='function')return Promise.reject(new Error('网页模拟器未加载。'));
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
if(!item)return Promise.reject(new Error('模板不存在：'+currentWebId));
var scene=applyWebForm(item.normalize({}),readForm(el('simStudioWebForm')));
return controller.insertScene(currentWebId,scene,{replace:false}).then(function(group){
setStatus('已插入可改字的假网页。整页已选中，可缩小贴合分镜。不含真实站名。',false);
return group;
});
}

function insertPart(){
var parts=root.NaiComicSiteUiParts;
if(!parts)return Promise.reject(new Error('站点零件未加载。'));
var values=readForm(el('simStudioPartForm'));
Object.keys(values).forEach(function(key){if(key.indexOf('__type__')===0)delete values[key];});
return parts.place(currentPartId,values).then(function(group){
setStatus('已添加可改字零件。双击文字就能改播放量、评论、标题。',false);
return group;
});
}

function loadChatSelected(){
var composer=root.NaiComicStoryComposer;
if(!composer||typeof composer.loadSelected!=='function'){setStatus('剧情编辑器未加载。',true);return false;}
if(!composer.loadSelected()){setStatus('请先在画布上点选一个对话/网页模拟器。',true);return false;}
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
setStatus('已读取选中对象里的对白。',false);
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
markStore(el('simStudioWebStore'),currentWebId);
renderWebForm(scene);
setStatus('已读取选中网页的标题、播放量、评论等数据。',false);
return true;
}

function loadPartSelected(){
var parts=root.NaiComicSiteUiParts;
var selected=parts&&parts.readSelected();
if(!selected||!selected.id){setStatus('请先点选画布上的站点零件。',true);return false;}
currentPartId=selected.id;
var select=el('simStudioPartSelect');
if(select)select.value=currentPartId;
markStore(el('simStudioPartStore'),currentPartId);
renderPartForm(selected.values);
setStatus('已读取选中零件的文字。改完再点「更新到画布」。',false);
return true;
}

function hideLeftPanels(){
document.querySelectorAll('.left_area').forEach(function(panel){panel.style.display='none';});
document.querySelectorAll('#sidebar .icon-wrapper i.active').forEach(function(icon){icon.classList.remove('active');});
var studioIcon=document.querySelector('#sidebar .icon-wrapper[data-action="openSimulatorStudio"] i');
if(studioIcon)studioIcon.classList.add('active');
if(typeof adjustCanvasSize==='function')adjustCanvasSize();
}

function open(options){
options=options||{};
var box=overlay();
if(!box){setStatus('模拟器工作台未加载。',true);return;}
hideLeftPanels();
box.hidden=false;
if(options.tab)setTab(options.tab);
else setTab(currentTab);
if(options.templateId&&WEB_FORMS[options.templateId]){
currentWebId=options.templateId;
var webSelect=el('simStudioWebTemplate');
if(webSelect)webSelect.value=currentWebId;
markStore(el('simStudioWebStore'),currentWebId);
renderWebForm({});
if(!options.tab)setTab('web');
}
if(options.assetId&&root.NaiComicSiteUiParts&&root.NaiComicSiteUiParts.has(options.assetId)){
currentPartId=options.assetId;
var partSelect=el('simStudioPartSelect');
if(partSelect)partSelect.value=currentPartId;
markStore(el('simStudioPartStore'),currentPartId);
renderPartForm(options.values);
if(!options.tab||options.tab==='part')setTab('part');
}
setStatus(options.message||'改好文字后点「放到画布」。对话皮肤不能直接 NAI 出图。',false);
}

function close(){
var box=overlay();
if(box)box.hidden=true;
var studioIcon=document.querySelector('#sidebar .icon-wrapper[data-action="openSimulatorStudio"] i');
if(studioIcon)studioIcon.classList.remove('active');
}

function isOpen(){
var box=overlay();
return !!(box&&!box.hidden);
}

function bind(){
if(initialized)return;
initialized=true;
fillSelect(el('simStudioChatTemplate'),chatTemplates().map(function(item){return {id:item.id,name:item.name};}),'generic-chat-dark');
fillSelect(el('simStudioWebTemplate'),webTemplates().map(function(item){return {id:item.definition.id,name:item.definition.name};}),currentWebId);
fillSelect(el('simStudioPartSelect'),(root.NaiComicSiteUiParts?root.NaiComicSiteUiParts.list():[]).map(function(item){return {id:item.id,name:item.name};}),currentPartId);
fillChatStore();
fillWebStore();
fillPartStore();
renderWebForm({});
renderPartForm();
var bar=el('simStudioTabs');
if(bar)bar.addEventListener('click',function(event){
var button=event.target.closest('[data-studio-tab]');
if(button)setTab(button.getAttribute('data-studio-tab'));
});
var webSelect=el('simStudioWebTemplate');
if(webSelect)webSelect.addEventListener('change',function(){
currentWebId=webSelect.value;
markStore(el('simStudioWebStore'),currentWebId);
renderWebForm({});
});
var partSelect=el('simStudioPartSelect');
if(partSelect)partSelect.addEventListener('change',function(){
currentPartId=partSelect.value;
markStore(el('simStudioPartStore'),currentPartId);
renderPartForm();
});
var chatSelect=el('simStudioChatTemplate');
if(chatSelect)chatSelect.addEventListener('change',function(){markStore(el('simStudioChatStore'),chatSelect.value);});
var closeBtn=el('simStudioClose');
if(closeBtn)closeBtn.addEventListener('click',close);
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
var item=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(currentWebId);
renderWebForm(item?item.normalize({}):{});
setStatus('已载入示例文字，改完再放到画布。',false);
});
var partInsert=el('simStudioPartInsert');
if(partInsert)partInsert.addEventListener('click',function(){insertPart().catch(function(error){setStatus(error.message,true);});});
var partLoad=el('simStudioPartLoad');
if(partLoad)partLoad.addEventListener('click',loadPartSelected);
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
close();
});
}

root.NaiComicSimulatorStudio={
open:open,
close:close,
isOpen:isOpen,
insertChat:insertChat,
insertWeb:insertWeb,
insertPart:insertPart
};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
