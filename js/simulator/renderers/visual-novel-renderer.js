(function(root){
"use strict";

var factory=root.NaiComicExtraRendererFactory;
var defaults={
sceneType:'visual-novel',
templateId:'visual-novel-generic',
title:'章节标题',
background:'#172033',
backgroundImage:'',
characters:[
{id:'character_a',name:'角色 A',position:'left',portrait:'',avatar:'',nameColor:'#fbbf24',onStage:true},
{id:'character_b',name:'角色 B',position:'right',portrait:'',avatar:'',nameColor:'#38bdf8',onStage:true}
],
dialogue:[{speaker:'角色 A',speakerId:'character_a',type:'speech',content:'这里是视觉小说对白。'}],
activeNodeIndex:0,
choices:[],
events:[]
};
var definition={
id:'visual-novel-generic',
name:'通用视觉小说',
category:'visual-novel',
canvas:{width:1000,height:1800},
theme:{background:'#172033',primaryColor:'#f8fafc',secondaryColor:'#cbd5e1',accentColor:'#fbbf24',fontFamily:'system-ui',nameplate:'#0f172a',dialogueBox:'rgba(2,6,23,.9)'},
editableFields:['title','background','backgroundImage','characters','dialogue','choices','events'],
license:{type:'original',source:'',publicAllowed:true}
};

function normalize(scene){
var value=root.NaiComicSceneSerializer.normalize(scene,'visual-novel',defaults);
if(!Array.isArray(value.characters)||!value.characters.length)value.characters=defaults.characters.slice();
if(!Array.isArray(value.dialogue)||!value.dialogue.length)value.dialogue=defaults.dialogue.slice();
value.activeNodeIndex=Math.max(0,Math.min(value.dialogue.length-1,Number(value.activeNodeIndex)||0));
if(!Array.isArray(value.choices))value.choices=[];
return value;
}

function validate(scene){
var normalized=normalize(scene);
var result=root.NaiComicSceneSerializer.validate(normalized,'visual-novel');
if(!normalized.dialogue.length)result.errors.push('视觉小说至少需要一条对白。');
return {ok:result.errors.length===0,errors:result.errors,scene:normalized};
}

function standeeX(position){
if(position==='right')return 670;
if(position==='center')return 360;
return 50;
}

function currentLine(value){
if(typeof value.activeNodeIndex==='number'&&value.dialogue[value.activeNodeIndex])return value.dialogue[value.activeNodeIndex];
return value.dialogue[value.dialogue.length-1]||{};
}

async function portraitItems(character,active,theme){
var x=standeeX(character.position);
var y=240;
var width=280;
var height=820;
var fill=active?'#334155':'#1e293b';
var opacity=active?1:0.42;
var items=[factory.rect({left:x,top:y,width:width,height:height,rx:22,ry:22,fill:fill,opacity:opacity})];
if(character.portrait||character.avatar){
var image=await factory.loadImage(character.portrait||character.avatar);
if(image){
factory.fitImage(image,width-16,height-16);
image.set({left:x+8,top:y+8,originX:'left',originY:'top',opacity:opacity});
items.push(image);
}
}else{
items.push(factory.text((character.name||'?').slice(0,1),{left:x+90,top:y+280,fontSize:96,fontWeight:'bold',fill:theme.primaryColor,opacity:opacity}));
}
items.push(factory.text(character.name||'',{left:x+16,top:y+height-56,width:width-32,textAlign:'center',fontSize:24,fill:character.nameColor||theme.primaryColor,opacity:opacity}));
return items;
}

async function render(scene){
var value=normalize(scene);
var theme=Object.assign({},definition.theme,value.theme||{});
var items=[];
var line=currentLine(value);
items.push(factory.rect({left:0,top:0,width:definition.canvas.width,height:definition.canvas.height,fill:value.background||theme.background}));
if(value.backgroundImage){
var background=await factory.loadImage(value.backgroundImage);
if(background){
factory.fitImage(background,definition.canvas.width,definition.canvas.height);
background.set({left:0,top:0,originX:'left',originY:'top'});
items.push(background);
}
}
items.push(factory.text(value.title,{left:48,top:40,fontSize:28,fontWeight:'bold',fill:theme.primaryColor}));
items.push(factory.text((value.activeNodeIndex+1)+' / '+value.dialogue.length,{left:780,top:46,width:170,textAlign:'right',fontSize:18,fill:theme.secondaryColor}));

var speakerId=line.speakerId||'';
var onStage=value.characters.filter(function(character){return character.onStage!==false;});
if(!onStage.length)onStage=value.characters;
for(var i=0;i<onStage.length;i++){
var character=onStage[i];
var active=!speakerId||character.id===speakerId||character.name===line.speaker;
var standee=await portraitItems(character,active,theme);
items=items.concat(standee);
}

if(line.type==='title'){
items.push(factory.rect({left:80,top:760,width:840,height:160,rx:12,ry:12,fill:'rgba(2,6,23,.82)',stroke:theme.accentColor,strokeWidth:2}));
items.push(factory.text(line.content||value.title,{left:110,top:812,width:780,textAlign:'center',fontSize:40,fontWeight:'bold',fill:theme.accentColor}));
}else{
var boxY=1240;
items.push(factory.rect({left:36,top:boxY,width:928,height:line.type==='choice'?420:360,rx:18,ry:18,fill:theme.dialogueBox,stroke:theme.accentColor,strokeWidth:2}));
if(line.type!=='narrator'&&line.type!=='hint'&&line.type!=='choice'){
items.push(factory.rect({left:56,top:boxY-28,width:220,height:48,rx:8,ry:8,fill:theme.nameplate,stroke:theme.accentColor,strokeWidth:2}));
items.push(factory.text(line.speaker||'旁白',{left:70,top:boxY-18,width:192,fontSize:22,fontWeight:'bold',fill:theme.accentColor}));
}
if(line.type==='image'&&line.image){
var shot=await factory.loadImage(line.image);
if(shot){
factory.fitImage(shot,840,220);
shot.set({left:80,top:boxY+48,originX:'left',originY:'top'});
items.push(shot);
}
}else if(line.type!=='choice'){
items.push(factory.text(line.content||'……',{
left:70,
top:boxY+48,
width:860,
fontSize:line.type==='aside'||line.type==='hint'?26:30,
fontStyle:line.type==='aside'?'italic':'normal',
lineHeight:1.35,
fill:line.type==='aside'||line.type==='hint'?theme.secondaryColor:theme.primaryColor
}));
}
var choices=line.type==='choice'?(line.choices||[]).map(function(choice){return choice.label||choice;}):value.choices;
choices.slice(0,4).forEach(function(choice,index){
var top=boxY+70+index*70;
items.push(factory.rect({left:90,top:top,width:820,height:54,rx:12,ry:12,fill:'transparent',stroke:theme.accentColor,strokeWidth:2}));
items.push(factory.text(String(choice),{left:110,top:top+12,width:780,textAlign:'center',fontSize:22,fill:theme.primaryColor}));
});
}
return factory.makeGroup(items,definition,value);
}

factory.register({definition:definition,normalize:normalize,validate:validate,render:render,exportModel:normalize});
})(typeof window!=='undefined'?window:globalThis);
