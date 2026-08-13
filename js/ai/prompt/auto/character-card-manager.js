(function(){
'use strict';

var STORAGE_KEY='naiCharacterCards';
var MATERIAL_CATEGORIES=[
{label:'发型/发色',paths:[['Hair','Hair Detail'],['Hair','Hair Style'],['Hair','Hair Length'],['Hair','Hair Color']]},
{label:'眼睛/脸部',paths:[['Face','Eye Detail'],['Face','Eyes'],['Face','Mouth'],['Expression','Core Emotion']]},
{label:'服装',paths:[['Clothing','School Uniform'],['Clothing','Traditional Outfit'],['Clothing','Fantasy Outfit'],['Clothing','Tops'],['Clothing','Dress'],['Clothing','Accessories']]},
{label:'姿势/镜头',paths:[['Pose','Hand Gesture'],['Pose','Action Pose'],['Camera','Framing'],['Camera','Director Composition']]},
{label:'风格/质量',paths:[['Quality','NAI Quality'],['Art Style','Linework'],['Set Style','NAI Render Style'],['Custom Set']]},
{label:'场景/氛围',paths:[['Background','Story Locations'],['Background','Fantasy Scene'],['Background','Urban'],['Light Source','Director Lighting'],['Light Source','Mood Atmosphere']]}
];

function byId(id){
return typeof $==='function'?$(id):document.getElementById(id);
}

function textOf(value){
return (value===undefined||value===null)?'':String(value);
}

function splitTags(value){
return textOf(value).split(/[,，;；\n]+/).map(function(item){return item.trim();}).filter(Boolean);
}

function uniqueTags(list){
var seen={};
var result=[];
(list||[]).forEach(function(item){
item=textOf(item).trim();
if(!item)return;
var key=item.toLowerCase();
if(seen[key])return;
seen[key]=true;
result.push(item);
});
return result;
}

function getProjectStore(){
if(typeof basePrompt!=='undefined'&&basePrompt){
if(!Array.isArray(basePrompt.naiCharacterCards))basePrompt.naiCharacterCards=[];
return basePrompt.naiCharacterCards;
}
return null;
}

function normalizeTagExamples(list){
if(!Array.isArray(list))return [];
return list.map(function(item){
item=item||{};
return {
prompt:textOf(item.prompt||''),
negative_prompt:textOf(item.negative_prompt||''),
note:textOf(item.note||''),
created_at:textOf(item.created_at||'')
};
}).filter(function(item){return item.prompt;}).slice(0,12);
}

function normalizeCard(card,index){
card=card||{};
return {
id:card.id||('char_'+Date.now()+'_'+index),
name:textOf(card.name||('角色 '+(index+1))),
role:textOf(card.role||''),
description:textOf(card.description||''),
card_system:textOf(card.card_system||''),
card_preamble:textOf(card.card_preamble||''),
card_post:textOf(card.card_post||''),
tag_examples:normalizeTagExamples(card.tag_examples),
positive:uniqueTags(Array.isArray(card.positive)?card.positive:splitTags(card.positive)),
negative:uniqueTags(Array.isArray(card.negative)?card.negative:splitTags(card.negative)),
materials:Array.isArray(card.materials)?card.materials.map(function(item){
return {
tag:textOf(item.tag||''),
alias:textOf(item.alias||''),
category:textOf(item.category||''),
url:textOf(item.url||'')
};
}).filter(function(item){return item.tag;}):[]
};
}

function loadCards(options){
options=options||{};
var store=getProjectStore();
if(store&&store.length)return store.map(normalizeCard);
if(options.preferProject)return getDefaultCards();
try{
var saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
if(Array.isArray(saved)&&saved.length)return saved.map(normalizeCard);
}catch(error){
if(typeof uiLogger!=='undefined')uiLogger.warn('角色卡读取失败',error);
}
return getDefaultCards();
}

function getDefaultCards(){
return [normalizeCard({
name:'主角',
role:'主要角色',
description:'保持同一个角色，不要随分镜改变发型、瞳色、服装核心设计。',
positive:['solo focus','consistent character design'],
negative:['multiple views reference sheet','different outfit','different hairstyle']
},0)];
}

var cards=loadCards();
var materialIndex=[];
var activeCategoryIndex=0;

function saveCards(){
cards=cards.map(normalizeCard);
var store=getProjectStore();
if(store){
store.splice(0,store.length);
cards.forEach(function(card){store.push(card);});
}
try{
localStorage.setItem(STORAGE_KEY,JSON.stringify(cards));
}catch(error){
if(typeof uiLogger!=='undefined')uiLogger.warn('角色卡本地保存失败',error);
}
}

function getPathData(root,path){
var node=root;
for(var i=0;i<path.length;i++){
if(!node||!node[path[i]])return null;
node=node[path[i]];
}
return node;
}

function collectTagObjects(source,categoryLabel,out){
if(!source||typeof source!=='object')return;
Object.keys(source).forEach(function(key){
if(key==='en'||key==='hr'||key==='url'||key==='alias'||key.indexOf('horizontalLine')===0)return;
var value=source[key];
if(value&&typeof value==='object'&&value.hasOwnProperty('url')){
out.push({tag:key,alias:value.alias||key,url:value.url||'',category:categoryLabel});
}else if(value&&typeof value==='object'){
collectTagObjects(value,categoryLabel,out);
}
});
}

function mergePlain(target,source){
if(!source||typeof source!=='object')return target;
Object.keys(source).forEach(function(key){
var value=source[key];
if(value&&typeof value==='object'&&!Array.isArray(value)&&!value.hasOwnProperty('url')){
if(!target[key]||typeof target[key]!=='object')target[key]={};
mergePlain(target[key],value);
}else{
target[key]=value;
}
});
return target;
}

function collectMaterialRoot(){
var root={};
mergePlain(root,window.base||{});
mergePlain(root,window.novelai_materials||{});
try{
var customSet=JSON.parse(localStorage.getItem('CustomSet')||'{}');
if(customSet&&customSet['Custom Set'])root['Custom Set']=customSet['Custom Set'];
}catch(error){
}
return root;
}

function rebuildMaterialIndex(){
var root=collectMaterialRoot();
materialIndex=MATERIAL_CATEGORIES.map(function(category){
var tags=[];
category.paths.forEach(function(path){
collectTagObjects(getPathData(root,path),category.label,tags);
});
var seen={};
tags=tags.filter(function(item){
var key=item.tag.toLowerCase();
if(seen[key])return false;
seen[key]=true;
return true;
}).sort(function(a,b){
return (a.alias||a.tag).localeCompare(b.alias||b.tag,'zh-CN');
});
return {label:category.label,tags:tags};
});
}

function ensureMaterialDataLoaded(){
if(window.base&&window.novelai_materials){
rebuildMaterialIndex();
renderMaterialSelectors();
return;
}
if(typeof loadJS==='function'){
Promise.all([
window.base?Promise.resolve():loadJS('json_js/00_base.js','head'),
window.novelai_materials?Promise.resolve():loadJS('json_js/00_novelai_materials.js?v=8.0','head')
]).then(function(){
rebuildMaterialIndex();
renderMaterialSelectors();
}).catch(function(error){
if(typeof uiLogger!=='undefined')uiLogger.warn('素材库加载失败',error);
});
return;
}
var remaining=0;
function loadScript(src){
remaining++;
var script=document.createElement('script');
script.src=src;
script.onload=function(){
remaining--;
if(remaining<=0){
rebuildMaterialIndex();
renderMaterialSelectors();
}
};
script.onerror=function(){
if(typeof uiLogger!=='undefined')uiLogger.warn('素材库加载失败');
remaining--;
};
document.head.appendChild(script);
}
if(!window.base)loadScript('json_js/00_base.js');
if(!window.novelai_materials)loadScript('json_js/00_novelai_materials.js?v=8.0');
if(remaining===0){
rebuildMaterialIndex();
renderMaterialSelectors();
}
}

function updateTargetSelect(){
var select=byId('naiCharacterTargetSelect');
if(!select)return;
var current=select.value;
select.innerHTML='';
cards.forEach(function(card,index){
var option=document.createElement('option');
option.value=card.id;
option.textContent=(index+1)+'. '+(card.name||'角色');
select.appendChild(option);
});
if(cards.some(function(card){return card.id===current;}))select.value=current;
}

function renderMaterialSelectors(){
var catSelect=byId('naiCharacterMaterialCategory');
var tagSelect=byId('naiCharacterMaterialTag');
if(!catSelect||!tagSelect)return;
catSelect.innerHTML='';
materialIndex.forEach(function(category,index){
var option=document.createElement('option');
option.value=String(index);
option.textContent=category.label+'（'+category.tags.length+'）';
catSelect.appendChild(option);
});
if(activeCategoryIndex>=materialIndex.length)activeCategoryIndex=0;
catSelect.value=String(activeCategoryIndex);
tagSelect.innerHTML='';
var tags=(materialIndex[activeCategoryIndex]&&materialIndex[activeCategoryIndex].tags)||[];
tags.slice(0,240).forEach(function(tag){
var option=document.createElement('option');
option.value=tag.tag;
option.textContent=(tag.alias||tag.tag)+' | '+tag.tag;
option.dataset.alias=tag.alias||'';
option.dataset.url=tag.url||'';
option.dataset.category=tag.category||'';
tagSelect.appendChild(option);
});
}

function createInput(value,placeholder,onInput){
var input=document.createElement('input');
input.type='text';
input.value=value||'';
input.placeholder=placeholder||'';
input.addEventListener('input',function(){onInput(input.value);});
return input;
}

function createTextarea(value,placeholder,onInput){
var textarea=document.createElement('textarea');
textarea.value=value||'';
textarea.placeholder=placeholder||'';
textarea.addEventListener('input',function(){onInput(textarea.value);});
return textarea;
}

function renderTagChips(card,container){
container.innerHTML='';
card.materials.forEach(function(item,index){
var chip=document.createElement('span');
chip.className='nai-character-tag-chip';
var label=document.createElement('span');
label.textContent=(item.alias||item.tag);
label.title=item.category?item.category+'：'+item.tag:item.tag;
chip.appendChild(label);
var remove=document.createElement('button');
remove.type='button';
remove.textContent='×';
remove.title='移除';
remove.addEventListener('click',function(){
card.materials.splice(index,1);
card.positive=uniqueTags(card.positive.filter(function(tag){return tag!==item.tag;}));
saveCards();
renderCards();
});
chip.appendChild(remove);
container.appendChild(chip);
});
}

function renderCards(){
var list=byId('naiCharacterCardList');
if(!list)return;
list.innerHTML='';
cards.forEach(function(card,index){
card=normalizeCard(card,index);
cards[index]=card;
var box=document.createElement('div');
box.className='nai-character-card';

var title=document.createElement('div');
title.className='nai-character-card-title';
title.appendChild(createInput(card.name,'角色名',function(value){card.name=value;saveCards();updateTargetSelect();}));
var remove=document.createElement('button');
remove.type='button';
remove.className='nai-character-mini-button';
remove.textContent='删除';
remove.disabled=cards.length<=1;
remove.addEventListener('click',function(){
cards.splice(index,1);
saveCards();
renderAll();
});
title.appendChild(remove);
box.appendChild(title);

var roleLabel=document.createElement('label');
roleLabel.textContent='身份 / 功能';
box.appendChild(roleLabel);
box.appendChild(createInput(card.role,'例如：白发巫女、冷静侦探、反派同学',function(value){card.role=value;saveCards();}));

var descLabel=document.createElement('label');
descLabel.textContent='中文设定';
box.appendChild(descLabel);
box.appendChild(createTextarea(card.description,'写外貌、性格、服装核心、不要变的地方',function(value){card.description=value;saveCards();}));

var systemLabel=document.createElement('label');
systemLabel.textContent='破甲 system（进 API system，优先于通用导演）';
box.appendChild(systemLabel);
var systemArea=createTextarea(card.card_system,'粘贴破甲角色卡 system / 首要人设正文',function(value){card.card_system=value;saveCards();});
systemArea.className='nai-character-card-system';
box.appendChild(systemArea);

var preambleLabel=document.createElement('label');
preambleLabel.textContent='破甲 preamble（可选）';
box.appendChild(preambleLabel);
box.appendChild(createTextarea(card.card_preamble,'破甲卡前置补充',function(value){card.card_preamble=value;saveCards();}));

var postLabel=document.createElement('label');
postLabel.textContent='破甲 post（可选）';
box.appendChild(postLabel);
box.appendChild(createTextarea(card.card_post,'尾部输出约束，如必须 Danbooru 英文 tag',function(value){card.card_post=value;saveCards();}));

var dnaLabel=document.createElement('label');
dnaLabel.textContent='Tag DNA 示例（'+((card.tag_examples||[]).length)+' 条）';
box.appendChild(dnaLabel);
var dnaBox=document.createElement('div');
dnaBox.className='nai-character-dna-list';
(card.tag_examples||[]).forEach(function(example,dnaIndex){
var line=document.createElement('div');
line.className='nai-character-dna-item';
line.textContent=(example.prompt||'').slice(0,120)+((example.prompt||'').length>120?'…':'');
var dnaRemove=document.createElement('button');
dnaRemove.type='button';
dnaRemove.textContent='删';
dnaRemove.className='nai-character-mini-button';
dnaRemove.addEventListener('click',function(){
card.tag_examples.splice(dnaIndex,1);
saveCards();
renderCards();
});
line.appendChild(dnaRemove);
dnaBox.appendChild(line);
});
box.appendChild(dnaBox);

var positiveLabel=document.createElement('label');
positiveLabel.textContent='固定正向 tags';
box.appendChild(positiveLabel);
box.appendChild(createTextarea(card.positive.join(', '),'white hair, blue eyes, miko, hakama',function(value){card.positive=uniqueTags(splitTags(value));saveCards();}));

var negativeLabel=document.createElement('label');
negativeLabel.textContent='固定反向 tags';
box.appendChild(negativeLabel);
box.appendChild(createInput(card.negative.join(', '),'different hairstyle, different outfit',function(value){card.negative=uniqueTags(splitTags(value));saveCards();}));

var chips=document.createElement('div');
chips.className='nai-character-tag-row';
renderTagChips(card,chips);
box.appendChild(chips);

list.appendChild(box);
});
updateTargetSelect();
}

function renderAll(){
renderCards();
renderMaterialSelectors();
}

function addCard(){
if(cards.length>=4){
if(typeof createToast==='function')createToast('角色设定卡','最多 4 个主要角色，避免提示词过长。',2400);
return;
}
cards.push(normalizeCard({
name:'角色 '+(cards.length+1),
role:'配角',
description:'固定外貌、服装和性格功能。',
positive:['consistent character design'],
negative:['different hairstyle','different outfit']
},cards.length));
saveCards();
renderAll();
}

function addSelectedMaterial(){
var targetSelect=byId('naiCharacterTargetSelect');
var tagSelect=byId('naiCharacterMaterialTag');
if(!targetSelect||!tagSelect||!tagSelect.value)return;
var card=cards.find(function(item){return item.id===targetSelect.value;})||cards[0];
var option=tagSelect.options[tagSelect.selectedIndex];
var item={
tag:tagSelect.value,
alias:option?option.dataset.alias||'':'',
url:option?option.dataset.url||'':'',
category:option?option.dataset.category||'':''
};
card.materials=card.materials||[];
if(!card.materials.some(function(existing){return existing.tag===item.tag;})){
card.materials.push(item);
}
card.positive=uniqueTags((card.positive||[]).concat([item.tag]));
saveCards();
renderCards();
}

function bind(){
var add=byId('naiCharacterAddCard');
if(add)add.addEventListener('click',addCard);
var addMaterial=byId('naiCharacterAddMaterial');
if(addMaterial)addMaterial.addEventListener('click',addSelectedMaterial);
var catSelect=byId('naiCharacterMaterialCategory');
if(catSelect)catSelect.addEventListener('change',function(){
activeCategoryIndex=parseInt(catSelect.value,10)||0;
renderMaterialSelectors();
});
}

function getCardsForDirector(){
return cards.map(function(card,index){
card=normalizeCard(card,index);
return {
id:card.id,
name:card.name,
role:card.role,
description:card.description,
card_system:card.card_system,
card_preamble:card.card_preamble,
card_post:card.card_post,
tag_examples:card.tag_examples.slice(),
positive_tags:uniqueTags(card.positive.concat(card.materials.map(function(item){return item.tag;}))),
negative_tags:uniqueTags(card.negative),
material_anchors:card.materials.map(function(item){
return {tag:item.tag,alias:item.alias,category:item.category};
})
};
}).filter(function(card){
return card.name||card.description||card.card_system||card.positive_tags.length||card.material_anchors.length;
});
}

function appendTagExampleToCard(cardId,prompt,negativePrompt,note){
prompt=textOf(prompt).trim();
if(!prompt)return false;
var card=cards.find(function(item){return item.id===cardId;})||cards[0];
if(!card)return false;
card=normalizeCard(card,cards.indexOf(card));
card.tag_examples=card.tag_examples||[];
card.tag_examples.unshift({
prompt:prompt,
negative_prompt:textOf(negativePrompt||'').trim(),
note:textOf(note||'').trim(),
created_at:new Date().toISOString()
});
card.tag_examples=normalizeTagExamples(card.tag_examples);
var cardIndex=cards.findIndex(function(item){return item.id===card.id;});
if(cardIndex>=0)cards[cardIndex]=card;
saveCards();
renderAll();
return true;
}

function appendTagExampleFromPanel(panel,note){
if(!panel||!panel.text2img_prompt)return false;
var targetSelect=byId('naiCharacterTargetSelect');
var cardId=targetSelect?targetSelect.value:'';
return appendTagExampleToCard(cardId,panel.text2img_prompt,panel.text2img_negative,note||'来自分镜验收');
}

function init(){
if(!byId('naiCharacterCardList'))return;
bind();
ensureMaterialDataLoaded();
renderAll();
saveCards();
}

if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',init);
}else{
setTimeout(init,0);
}

window.NaiCharacterCards={
getCards:getCardsForDirector,
render:renderAll,
save:saveCards,
load:function(options){cards=loadCards(options);renderAll();saveCards();}
};
window.getNaiCharacterCardsForDirector=getCardsForDirector;
window.appendNaiTagExampleToCard=appendTagExampleToCard;
window.appendNaiTagExampleFromPanel=appendTagExampleFromPanel;
})();
