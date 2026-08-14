(function(root){
"use strict";

function engine(){return root.NaiComicStoryEngine;}

function beatsFromStory(story){
var api=engine();
var value=api?api.normalize(story):story;
var beats=[];
(value.nodes||[]).forEach(function(node){
if(['speech','aside','narrator','title','hint'].indexOf(node.type)<0)return;
var character=node.speaker&&api?api.getCharacter(value,node.speaker):null;
var content=node.content||((node.choices||[]).map(function(choice){return choice.label;}).join(' / '));
beats.push({
type:node.type,
speaker:character?character.name:'',
content:content||'',
description:(character?character.name+'：':'')+(content||node.type)
});
});
if(!beats.length)beats.push({type:'narrator',speaker:'',content:value.title||'场景',description:value.title||'场景'});
return beats;
}

function layoutCells(width,height,count){
count=Math.max(1,Number(count)||1);
width=Number(width)||1000;
height=Number(height)||1400;
var cols=count===1?1:(count<=4?2:3);
var rows=Math.ceil(count/cols);
var margin=36;
var gap=18;
var cellW=(width-margin*2-gap*(cols-1))/cols;
var cellH=(height-margin*2-gap*(rows-1))/rows;
var cells=[];
for(var index=0;index<count;index++){
var col=index%cols;
var row=Math.floor(index/cols);
cells.push({
x:margin+col*(cellW+gap),
y:margin+row*(cellH+gap),
width:cellW,
height:cellH
});
}
return {cols:cols,rows:rows,cells:cells};
}

function storyToPlan(story){
var value=engine()?engine().normalize(story):story;
var beats=beatsFromStory(value);
return {
schemaVersion:1,
title:value.title||'剧情分镜',
pages:[{
page:1,
panels:beats.map(function(beat,index){
return {
panel:index+1,
mode:'normal',
description:beat.description,
characters:beat.speaker?[beat.speaker]:[],
dialogue:beat.content?[{speaker:beat.speaker||'旁白',content:beat.content}]:[],
template:'',
story:undefined
};
})
}]
};
}

function fillDirectorPrompt(story){
var value=engine()?engine().normalize(story):story;
var beats=beatsFromStory(value);
var lines=[value.title||'剧情分镜','漫画分镜边框, cinematic manga page'];
beats.forEach(function(beat,index){
lines.push('分镜'+(index+1)+'：'+beat.description);
});
var text=lines.join('\n');
if(typeof document!=='undefined'){
var target=document.getElementById('naiBatchDirectorPrompt');
if(target)target.value=text;
}
return text;
}

function makeMangaPanel(panel,x,y,width,height){
if(!root.fabric)throw new Error('Fabric 尚未加载。');
var fillEl=typeof document!=='undefined'?document.getElementById('panelFillColor'):null;
var strokeEl=typeof document!=='undefined'?document.getElementById('panelStrokeColor'):null;
var widthEl=typeof document!=='undefined'?document.getElementById('panelStrokeWidth'):null;
var rect=new root.fabric.Rect({
left:x,
top:y,
width:width,
height:height,
fill:(fillEl&&fillEl.value)||'rgba(255,255,255,1)',
stroke:(strokeEl&&strokeEl.value)||'rgba(0,0,0,1)',
strokeWidth:widthEl?parseFloat(widthEl.value)||2:2,
strokeUniform:true,
originX:'left',
originY:'top',
objectCaching:false,
isPanel:true,
name:'分镜 '+(panel.panel||'')
});
if(typeof setText2ImageInitPrompt==='function')setText2ImageInitPrompt(rect);
if(typeof setPanelValue==='function')setPanelValue(rect);
if(panel.prompt)rect.text2img_prompt=panel.prompt;
if(panel.negative_prompt)rect.text2img_negative=panel.negative_prompt;
rect.scenePlanPanelIndex=panel.panel;
return rect;
}

function enrichPlanWithDirector(plan){
var director=root.NovelAICompositionDirector;
if(!director||typeof director.draftLayerPromptAsync!=='function'){
return Promise.resolve({plan:plan,source:'heuristic'});
}
var tasks=[];
plan.pages.forEach(function(page){
page.panels.forEach(function(panel){
if(panel.mode==='simulator')return;
var rough=panel.description||'';
tasks.push(director.draftLayerPromptAsync({text2img_prompt:rough},'T2I',rough).then(function(result){
panel.prompt=result.prompt;
panel.negative_prompt=result.negative_prompt;
panel.directorSource=result.apiResult?'api':(result.apiError?'local-fallback':'local');
}));
});
});
if(!tasks.length)return Promise.resolve({plan:plan,source:'heuristic'});
return Promise.all(tasks).then(function(){
var sources=[];
plan.pages.forEach(function(page){
page.panels.forEach(function(panel){
if(panel.directorSource)sources.push(panel.directorSource);
});
});
var source=sources.indexOf('api')>=0?'api':(sources.length?'local':'heuristic');
return {plan:plan,source:source};
});
}

function createPanelsFromPlan(plan,options){
var current=root.canvas;
if(!current||!root.fabric)return Promise.reject(new Error('Canvas 尚未初始化。'));
var parsed=root.NaiScenePlanSchema?root.NaiScenePlanSchema.parse(plan):plan;
var panels=[];
parsed.pages.forEach(function(page){
page.panels.forEach(function(panel){
if(panel.mode!=='simulator')panels.push(panel);
});
});
if(!panels.length)return Promise.reject(new Error('这段剧情没有可生成的漫画分镜。'));
var layout=layoutCells(current.width,current.height,panels.length);
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
var created=[];
panels.forEach(function(panel,index){
var cell=layout.cells[index];
var object=makeMangaPanel(panel,cell.x,cell.y,cell.width,cell.height);
if(typeof getGUID==='function')getGUID(object);
current.add(object);
created.push(object);
});
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
current.renderAll();
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
return Promise.resolve({objects:created,plan:parsed,layout:layout});
}

root.NaiComicStoryToManga={
beatsFromStory:beatsFromStory,
layoutCells:layoutCells,
storyToPlan:storyToPlan,
fillDirectorPrompt:fillDirectorPrompt,
makeMangaPanel:makeMangaPanel,
enrichPlanWithDirector:enrichPlanWithDirector,
createPanelsFromPlan:createPanelsFromPlan
};
})(typeof window!=='undefined'?window:globalThis);
