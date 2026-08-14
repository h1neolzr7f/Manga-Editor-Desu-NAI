(function(root){
"use strict";

var SCHEMA_VERSION=1;
var NODE_TYPES=['speech','aside','narrator','hint','image','choice','title','background'];
var POSITIONS=['left','center','right'];
var EFFECTS=['none','dim-others','shake','fade'];
var idCounter=0;

function clone(value){
return JSON.parse(JSON.stringify(value));
}

function createId(prefix){
idCounter+=1;
return prefix+'_'+Date.now().toString(36)+'_'+idCounter.toString(36);
}

function textValue(value,fallback){
return typeof value==='string'?value:(fallback||'');
}

function createDefaultStory(){
return {
schemaVersion:SCHEMA_VERSION,
title:'未命名剧情',
background:'#172033',
backgroundImage:'',
characters:[
{id:'character_a',name:'角色A',avatar:'',portrait:'',nameColor:'#fbbf24',position:'left'},
{id:'character_b',name:'角色B',avatar:'',portrait:'',nameColor:'#38bdf8',position:'right'}
],
nodes:[
{id:'node_title',type:'title',speaker:'',content:'深夜',image:'',choices:[],visible:[],background:'',effect:'none'},
{id:'node_1',type:'speech',speaker:'character_a',content:'你终于来了。',image:'',choices:[],visible:['character_a','character_b'],background:'',effect:'dim-others'},
{id:'node_2',type:'aside',speaker:'character_b',content:'心跳得有点快。',image:'',choices:[],visible:['character_a','character_b'],background:'',effect:'dim-others'},
{id:'node_3',type:'speech',speaker:'character_b',content:'我就在楼下。',image:'',choices:[],visible:['character_a','character_b'],background:'',effect:'dim-others'},
{id:'node_4',type:'choice',speaker:'',content:'',image:'',choices:[{label:'跟着下去',target:''},{label:'先发一条消息',target:''}],visible:['character_a','character_b'],background:'',effect:'none'}
],
currentIndex:1
};
}

function normalizeCharacter(character,index){
character=character&&typeof character==='object'?character:{};
var position=POSITIONS.indexOf(character.position)>=0?character.position:(index%2?'right':'left');
return {
id:textValue(character.id,'character_'+(index+1)),
name:textValue(character.name,'角色'+(index+1)),
avatar:textValue(character.avatar,''),
portrait:textValue(character.portrait,''),
nameColor:textValue(character.nameColor,''),
position:position
};
}

function normalizeChoice(choice,index){
if(typeof choice==='string')return {label:choice,target:''};
choice=choice&&typeof choice==='object'?choice:{};
return {
label:textValue(choice.label,'选项'+(index+1)),
target:textValue(choice.target,'')
};
}

function normalizeNode(node,index){
node=node&&typeof node==='object'?node:{};
var type=NODE_TYPES.indexOf(node.type)>=0?node.type:'speech';
var choices=Array.isArray(node.choices)?node.choices.map(normalizeChoice):[];
if(type==='choice'&&!choices.length&&textValue(node.content,'')){
choices=textValue(node.content,'').split(/\r?\n|[|/／]/).map(function(line){return line.trim();}).filter(Boolean).map(normalizeChoice);
}
return {
id:textValue(node.id,createId('node')),
type:type,
speaker:textValue(node.speaker,''),
content:textValue(node.content,''),
image:textValue(node.image,''),
choices:choices,
visible:Array.isArray(node.visible)?node.visible.map(String).filter(Boolean):[],
background:textValue(node.background,''),
effect:EFFECTS.indexOf(node.effect)>=0?node.effect:'none'
};
}

function normalize(story){
var source=story&&typeof story==='object'?clone(story):createDefaultStory();
var defaults=createDefaultStory();
var characters=(Array.isArray(source.characters)&&source.characters.length?source.characters:defaults.characters).map(normalizeCharacter);
var nodes=(Array.isArray(source.nodes)&&source.nodes.length?source.nodes:defaults.nodes).map(normalizeNode);
var currentIndex=Number(source.currentIndex);
if(!Number.isFinite(currentIndex))currentIndex=0;
currentIndex=Math.max(0,Math.min(nodes.length-1,currentIndex));
return {
schemaVersion:SCHEMA_VERSION,
title:textValue(source.title,defaults.title),
background:textValue(source.background,defaults.background),
backgroundImage:textValue(source.backgroundImage,''),
characters:characters,
nodes:nodes,
currentIndex:currentIndex
};
}

function validate(story){
var value=normalize(story);
var errors=[];
var warnings=[];
var ids=Object.create(null);
if(!value.title.trim())warnings.push('剧情标题为空。');
if(!value.characters.length)errors.push('至少需要一个角色。');
value.characters.forEach(function(character){
if(ids[character.id])errors.push('角色 ID 重复：'+character.id);
ids[character.id]=true;
if(!character.name.trim())warnings.push('存在未命名角色：'+character.id);
});
if(!value.nodes.length)errors.push('至少需要一个剧情节点。');
value.nodes.forEach(function(node,index){
var label='第 '+(index+1)+' 个节点';
if((node.type==='speech'||node.type==='aside'||node.type==='image')&&node.speaker&&!ids[node.speaker]){
errors.push(label+' 引用了已删除角色：'+node.speaker);
}
if(node.type==='choice'&&!node.choices.length)warnings.push(label+' 还没有选项。');
if(node.type==='image'&&!node.image)warnings.push(label+' 还没有图片。');
if(node.type!=='choice'&&node.type!=='background'&&node.type!=='image'&&!node.content.trim()){
warnings.push(label+' 内容为空。');
}
});
return {ok:errors.length===0,errors:errors,warnings:warnings,story:value};
}

function getCharacter(story,id){
return normalize(story).characters.find(function(character){return character.id===id;})||null;
}

function currentNode(story){
var value=normalize(story);
return value.nodes[value.currentIndex]||null;
}

function visibleCharacters(story,node){
var value=normalize(story);
var target=node||currentNode(value);
if(!target)return value.characters.slice();
if(target.visible&&target.visible.length){
return value.characters.filter(function(character){return target.visible.indexOf(character.id)>=0;});
}
return value.characters.slice();
}

function seek(story,index){
var value=normalize(story);
value.currentIndex=Math.max(0,Math.min(value.nodes.length-1,Number(index)||0));
return value;
}

function appendNode(story,node){
var value=normalize(story);
value.nodes.push(normalizeNode(node,value.nodes.length));
value.currentIndex=value.nodes.length-1;
return value;
}

function repeatLast(story){
var value=normalize(story);
if(!value.nodes.length)return appendNode(value,{type:'speech',content:''});
var last=clone(value.nodes[value.nodes.length-1]);
last.id=createId('node');
value.nodes.push(last);
value.currentIndex=value.nodes.length-1;
return value;
}

function removeNode(story,id){
var value=normalize(story);
value.nodes=value.nodes.filter(function(node){return node.id!==id;});
if(!value.nodes.length)value.nodes=createDefaultStory().nodes.slice(0,1);
value.currentIndex=Math.max(0,Math.min(value.nodes.length-1,value.currentIndex));
return value;
}

function upsertCharacter(story,character){
var value=normalize(story);
var next=normalizeCharacter(character,value.characters.length);
var index=value.characters.findIndex(function(item){return item.id===next.id;});
if(index>=0)value.characters[index]=Object.assign({},value.characters[index],next);
else value.characters.push(next);
return value;
}

function removeCharacter(story,id){
var value=normalize(story);
if(value.characters.length<=1)return value;
value.characters=value.characters.filter(function(character){return character.id!==id;});
return value;
}

function parseScript(text,options){
var source=String(text||'');
var title=options&&options.title?String(options.title):'自然语言剧情';
var lines=source.split(/\r?\n/);
var characters=[];
var byName=Object.create(null);
var nodes=[];

function ensureCharacter(name){
var key=String(name||'').trim();
if(!key)return '';
if(byName[key])return byName[key].id;
var id='character_'+(characters.length+1);
var created=normalizeCharacter({
id:id,
name:key,
position:POSITIONS[characters.length%POSITIONS.length],
nameColor:['#fbbf24','#38bdf8','#f472b6','#a3e635'][characters.length%4]
},characters.length);
characters.push(created);
byName[key]=created;
return created.id;
}

lines.forEach(function(raw){
var line=String(raw||'').trim();
if(!line)return;
if(/^(选项|choices?)[：:]/i.test(line)||(/[|/／]/.test(line)&&line.indexOf('：')<0&&line.indexOf(':')<0)){
var parts=line.replace(/^(选项|choices?)[：:]/i,'').split(/[|/／]/).map(function(item){return item.trim();}).filter(Boolean);
if(parts.length){
nodes.push(normalizeNode({type:'choice',choices:parts},nodes.length));
return;
}
}
var match=line.match(/^(.{1,24}?)[：:](.*)$/);
if(match){
var name=match[1].trim();
var content=match[2].trim();
if(/^(旁白|系统|narrator)$/i.test(name)){
nodes.push(normalizeNode({type:'narrator',content:content},nodes.length));
return;
}
if(/^(标题|title)$/i.test(name)){
nodes.push(normalizeNode({type:'title',content:content},nodes.length));
return;
}
if(/^(提示|hint)$/i.test(name)){
nodes.push(normalizeNode({type:'hint',content:content},nodes.length));
return;
}
if(/^(独白|内心|aside)$/i.test(name)){
var speaker=characters.length?characters[characters.length-1].id:ensureCharacter('角色A');
nodes.push(normalizeNode({type:'aside',speaker:speaker,content:content},nodes.length));
return;
}
nodes.push(normalizeNode({type:'speech',speaker:ensureCharacter(name),content:content},nodes.length));
return;
}
nodes.push(normalizeNode({type:'narrator',content:line},nodes.length));
});

if(!characters.length)characters=createDefaultStory().characters.map(normalizeCharacter);
if(!nodes.length){
nodes=[normalizeNode({type:'speech',speaker:characters[0].id,content:source.trim()||'……'},0)];
}
return normalize({
title:title.slice(0,48)||'自然语言剧情',
characters:characters,
nodes:nodes,
currentIndex:0
});
}

root.NaiComicStoryEngine={
SCHEMA_VERSION:SCHEMA_VERSION,
NODE_TYPES:NODE_TYPES,
clone:clone,
createId:createId,
createDefaultStory:createDefaultStory,
normalize:normalize,
validate:validate,
getCharacter:getCharacter,
currentNode:currentNode,
visibleCharacters:visibleCharacters,
seek:seek,
appendNode:appendNode,
repeatLast:repeatLast,
removeNode:removeNode,
upsertCharacter:upsertCharacter,
removeCharacter:removeCharacter,
parseScript:parseScript,
serialize:function(story){return JSON.stringify(normalize(story));},
deserialize:function(value){
if(typeof value==='object'&&value!==null)return normalize(value);
try{return normalize(JSON.parse(value));}catch(error){throw new Error('剧情数据无效：'+error.message);}
}
};
})(typeof window!=='undefined'?window:globalThis);
