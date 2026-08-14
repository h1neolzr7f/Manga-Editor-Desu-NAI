(function(root){
"use strict";

var story=null;
var selectedCharacterId='';
var nodeType='speech';
var currentTemplateId='story-log-dark';
var selectedGroup=null;
var initialized=false;

function engine(){return root.NaiComicStoryEngine;}
function adapters(){return root.NaiComicStoryAdapters;}
function el(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function canvas(){return root.canvas||null;}
function text(value){return document.createTextNode(String(value));}

function setStatus(message,isError){
var target=el('storyComposerStatus');
if(!target)return;
target.textContent=message;
target.classList.toggle('is-error',!!isError);
}

function ensureStory(){
if(!story)story=engine().createDefaultStory();
story=engine().normalize(story);
if(!selectedCharacterId&&story.characters[0])selectedCharacterId=story.characters[0].id;
return story;
}

function renderCharacters(){
var container=el('storyComposerCharacters');
if(!container)return;
container.innerHTML='';
ensureStory().characters.forEach(function(character){
var chip=document.createElement('button');
chip.type='button';
chip.className='story-character-chip'+(character.id===selectedCharacterId?' is-active':'');
chip.appendChild(text(character.name));
chip.addEventListener('click',function(){
selectedCharacterId=character.id===selectedCharacterId?'':character.id;
renderCharacters();
});
container.appendChild(chip);
});
var narrator=document.createElement('button');
narrator.type='button';
narrator.className='story-character-chip'+(!selectedCharacterId?' is-active':'');
narrator.appendChild(text('旁白'));
narrator.addEventListener('click',function(){selectedCharacterId='';renderCharacters();});
container.appendChild(narrator);
}

function typeLabel(type){
return {speech:'对话',aside:'独白',narrator:'旁白',hint:'提示',image:'图片',choice:'选项',title:'标题',background:'背景'}[type]||type;
}

function renderNodes(){
var container=el('storyComposerNodes');
if(!container)return;
container.innerHTML='';
var nodes=ensureStory().nodes||[];
if(!nodes.length){
var empty=document.createElement('div');
empty.className='story-node-empty';
empty.textContent='还没有对白。在上面输入一句，点「发送」。';
container.appendChild(empty);
return;
}
nodes.forEach(function(node,index){
var row=document.createElement('div');
row.className='story-node-row'+(index===story.currentIndex?' is-active':'');
var speaker=node.speaker?engine().getCharacter(story,node.speaker):null;
var summary=(speaker?speaker.name+'：':'')+(node.type==='choice'?node.choices.map(function(choice){return choice.label;}).join(' / '):node.content);
row.appendChild(text((index+1)+'. ['+typeLabel(node.type)+'] '+summary));
row.addEventListener('click',function(){
story=engine().seek(story,index);
renderNodes();
});
var remove=document.createElement('button');
remove.type='button';
remove.className='simulator-chat-small-button';
remove.appendChild(text('删除'));
remove.addEventListener('click',function(event){
event.stopPropagation();
story=engine().removeNode(story,node.id);
renderEditor();
});
row.appendChild(remove);
container.appendChild(row);
});
}

function fillTemplates(){
var select=el('storyComposerTemplate');
if(!select||select.getAttribute('data-filled')==='1')return;
adapters().listTemplateOptions().forEach(function(item){
var option=document.createElement('option');
option.value=item.id;
option.textContent=item.name;
select.appendChild(option);
});
select.value=currentTemplateId;
select.setAttribute('data-filled','1');
select.addEventListener('change',function(){currentTemplateId=select.value;});
}

function renderEditor(){
ensureStory();
var title=el('storyComposerTitle');
if(title)title.value=story.title;
renderCharacters();
renderNodes();
var validation=engine().validate(story);
if(validation.errors.length)setStatus('需要修复：'+validation.errors.join('；'),true);
else if(validation.warnings.length)setStatus('提示：'+validation.warnings.join('；'),false);
else setStatus('剧情可用，可套用模板插入画布。',false);
}

function readComposerInput(){
var input=el('storyComposerInput');
return input?input.value:'';
}

function clearComposerInput(){
var input=el('storyComposerInput');
if(input)input.value='';
}

function sendNode(){
ensureStory();
var content=readComposerInput().trim();
if(nodeType==='choice'){
var choices=content.split(/\r?\n|[|/／]/).map(function(item){return item.trim();}).filter(Boolean);
if(!choices.length){setStatus('请输入选项，一行一个或用 | 分隔。',true);return;}
story=engine().appendNode(story,{type:'choice',choices:choices,visible:story.characters.map(function(character){return character.id;})});
}else{
var type=nodeType;
if(!selectedCharacterId&&(type==='speech'||type==='aside'))type='narrator';
if(!content&&type!=='image'&&type!=='background'){setStatus('请输入对白内容。',true);return;}
story=engine().appendNode(story,{
type:type,
speaker:selectedCharacterId,
content:content,
visible:story.characters.map(function(character){return character.id;})
});
}
clearComposerInput();
renderEditor();
}

function parseScript(){
var text=readComposerInput();
if(!text.trim()){setStatus('请先粘贴「角色名：台词」剧本。',true);return;}
story=engine().parseScript(text,{title:ensureStory().title||'自然语言剧情'});
selectedCharacterId=story.characters[0]?story.characters[0].id:'';
renderEditor();
setStatus('已解析剧本，共 '+story.nodes.length+' 个节点。',false);
}

function addCharacter(){
ensureStory();
var index=story.characters.length+1;
var id='character_'+index;
while(story.characters.some(function(item){return item.id===id;})){index+=1;id='character_'+index;}
story=engine().upsertCharacter(story,{id:id,name:'角色'+index,position:index%2?'right':'left'});
selectedCharacterId=id;
renderEditor();
}

function currentGroup(){
var current=canvas();
var object=current&&typeof current.getActiveObject==='function'?current.getActiveObject():null;
var factory=root.NaiComicExtraRendererFactory;
var resolved=factory&&typeof factory.resolvePage==='function'?factory.resolvePage(object,current):null;
if(resolved){selectedGroup=resolved;return resolved;}
if(object&&(object.customType==='simulatorChat'||object.customType==='simulatorExtra'))return object;
if(object&&object.group&&(object.group.customType==='simulatorChat'||object.group.customType==='simulatorExtra'))return object.group;
return selectedGroup&&selectedGroup.canvas?selectedGroup:null;
}

function fit(group,current){
if(root.NaiComicChatRenderer&&typeof root.NaiComicChatRenderer.fitGroupToCanvas==='function'){
return root.NaiComicChatRenderer.fitGroupToCanvas(group,current);
}
return group;
}

function insertTemplate(templateId,options){
if(templateId){
currentTemplateId=templateId;
var select=el('storyComposerTemplate');
if(select)select.value=templateId;
}
return insertOrUpdate(options);
}

function insertOrUpdate(options){
options=options||{};
var current=canvas();
if(!current){setStatus('Canvas 尚未初始化。',true);return Promise.reject(new Error('Canvas 尚未初始化。'));}
var sourceStory=options.story?engine().normalize(options.story):ensureStory();
var validation=engine().validate(sourceStory);
if(!validation.ok){setStatus(validation.errors.join('；'),true);return Promise.reject(new Error(validation.errors.join('; ')));}
var templateId=(el('storyComposerTemplate')&&el('storyComposerTemplate').value)||currentTemplateId;
currentTemplateId=templateId;
var scene=adapters().toTemplate(sourceStory,templateId);
var extra=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(templateId);
var task=extra?Promise.resolve(extra.render(scene)):root.NaiComicChatRenderer.renderScene(scene,root.NaiComicTemplateRegistry.get(templateId));
return task.then(function(group){
var factory=root.NaiComicExtraRendererFactory;
var previous=options.replace===false?null:currentGroup();
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
var placed;
if(factory&&typeof factory.placeOnCanvas==='function'){
placed=factory.placeOnCanvas(group,current,{previous:previous});
}else{
fit(group,current);
if(previous&&previous.simulatorPageId&&factory&&typeof factory.removePage==='function')factory.removePage(current,previous.simulatorPageId);
else if(previous&&(previous.canvas===current||(typeof current.getObjects==='function'&&current.getObjects().indexOf(previous)>=0)))current.remove(previous);
current.add(group);
placed={root:group,objects:[group]};
}
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
selectedGroup=placed.root;
if(root.NaiBeginnerGuide&&typeof root.NaiBeginnerGuide.onTemplateInserted==='function'){
root.NaiBeginnerGuide.onTemplateInserted(current,placed);
}else{
current.setActiveObject(placed.root);
current.renderAll();
}
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
setStatus(group.simulatorExplode?'已套用对话模板「'+(extra?extra.definition.name:templateId)+'」。这是聊天界面，不能直接 NAI 出图。要出图请点「生成漫画分镜」或左侧「模板」。':'已套用「'+(extra?extra.definition.name:templateId)+'」插入画布。',false);
return placed.root;
});
}

function loadSelected(){
var group=currentGroup();
if(!group){setStatus('请先选中一个模拟器对象。',true);return false;}
try{
if(group.simulatorStory)story=engine().deserialize(group.simulatorStory);
else{
var scene=group.simulatorScene?JSON.parse(group.simulatorScene):group.simulatorSceneObject;
story=adapters().fromScene(scene||{});
}
selectedCharacterId=story.characters[0]?story.characters[0].id:'';
currentTemplateId=group.simulatorTemplateId||currentTemplateId;
var select=el('storyComposerTemplate');
if(select)select.value=currentTemplateId;
renderEditor();
setStatus('已读取选中对象中的剧情。',false);
return true;
}catch(error){
setStatus('读取剧情失败：'+error.message,true);
return false;
}
}

function exportJson(){
ensureStory();
var blob=new Blob([engine().serialize(story)],{type:'application/json'});
var link=document.createElement('a');
link.href=URL.createObjectURL(blob);
link.download=(story.title||'story')+'.json';
link.click();
setStatus('已导出剧情 JSON。',false);
}

function bindTypes(){
var container=el('storyComposerTypes');
if(!container||container.getAttribute('data-bound')==='1')return;
container.setAttribute('data-bound','1');
engine().NODE_TYPES.filter(function(type){return type!=='background'&&type!=='image';}).forEach(function(type){
var button=document.createElement('button');
button.type='button';
button.className='simulator-chat-small-button'+(type===nodeType?' is-active':'');
button.setAttribute('data-node-type',type);
button.appendChild(text(typeLabel(type)));
button.addEventListener('click',function(){
nodeType=type;
Array.prototype.forEach.call(container.querySelectorAll('[data-node-type]'),function(item){
item.classList.toggle('is-active',item.getAttribute('data-node-type')===nodeType);
});
});
container.appendChild(button);
});
}

function insertMangaPanels(){
ensureStory();
var manga=root.NaiComicStoryToManga;
if(!manga){setStatus('剧情转分镜模块未加载。',true);return Promise.reject(new Error('story-to-manga missing'));}
var plan=manga.storyToPlan(story);
manga.fillDirectorPrompt(story);
setStatus('正在用导演写各格提示词（不会生图）...',false);
return manga.enrichPlanWithDirector(plan).then(function(result){
return manga.createPanelsFromPlan(result.plan).then(function(created){
var label=result.source==='api'?'导演 API':(result.source==='heuristic'?'规则拆分':'本地导演');
setStatus('已生成 '+created.objects.length+' 个漫画分镜（'+label+'）。请到「自动生成」里验收后再出图。',false);
return created;
});
});
}

function bind(){
if(initialized)return;
initialized=true;
ensureStory();
fillTemplates();
bindTypes();
var title=el('storyComposerTitle');
if(title)title.addEventListener('input',function(){story.title=title.value;});
var send=el('storyComposerSend');if(send)send.addEventListener('click',sendNode);
var plus=el('storyComposerPlusOne');if(plus)plus.addEventListener('click',function(){story=engine().repeatLast(ensureStory());renderEditor();});
var parse=el('storyComposerParse');if(parse)parse.addEventListener('click',parseScript);
var add=el('storyComposerAddCharacter');if(add)add.addEventListener('click',addCharacter);
var insert=el('storyComposerInsert');if(insert)insert.addEventListener('click',function(){insertOrUpdate().catch(function(error){setStatus(error.message,true);});});
var manga=el('storyComposerManga');if(manga)manga.addEventListener('click',function(){insertMangaPanels().catch(function(error){setStatus(error.message,true);});});
var prompt=el('storyComposerFillPrompt');if(prompt)prompt.addEventListener('click',function(){if(root.NaiComicStoryToManga){root.NaiComicStoryToManga.fillDirectorPrompt(ensureStory());setStatus('已写入「AI 导演批量需求」，不会自动生图。',false);}});
var load=el('storyComposerLoad');if(load)load.addEventListener('click',loadSelected);
var selectPage=el('storyComposerSelectPage');if(selectPage)selectPage.addEventListener('click',function(){
if(root.NaiBeginnerGuide&&typeof root.NaiBeginnerGuide.selectWholePage==='function'){
if(!root.NaiBeginnerGuide.selectWholePage())setStatus('画布上还没有整页。先点「套用对话模板」或左侧「模板」。',true);
}else setStatus('整页选择未加载。',true);
});
var exported=el('storyComposerExportJson');if(exported)exported.addEventListener('click',exportJson);
var input=el('storyComposerInput');
if(input)input.addEventListener('keydown',function(event){
if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();sendNode();}
});
renderEditor();
}

root.NaiComicStoryComposer={
getStory:function(){return engine().clone(ensureStory());},
setStory:function(value){story=engine().normalize(value);renderEditor();return engine().clone(story);},
insertOrUpdate:insertOrUpdate,
insertTemplate:insertTemplate,
insertMangaPanels:insertMangaPanels,
loadSelected:loadSelected,
sendNode:sendNode
};

if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
