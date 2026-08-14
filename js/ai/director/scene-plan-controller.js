(function(root){
"use strict";
var initialized=false;
function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function status(message,isError){var target=element('naiScenePlanStatus');if(target){target.textContent=message;target.classList.toggle('is-error',!!isError);}}
function parseJson(){var input=element('naiScenePlanJson');try{return root.NaiScenePlanSchema.parse(input&&input.value||'');}catch(error){status(error.message,true);return null;}}
function digitCount(value){
var digitMap={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
var match=String(value||'').match(/([一二三四五六七八九十\d]+)格/);
if(!match)return 1;
return Math.min(12,digitMap[match[1]]||Number(match[1])||1);
}
function heuristic(text){
var value=String(text||'');
var template=root.NaiComicStoryAdapters&&typeof root.NaiComicStoryAdapters.pickTemplate==='function'?root.NaiComicStoryAdapters.pickTemplate(value):'generic-chat-dark';
var wantsSimulator=/聊天|对话|剧情|立绘|手机|论坛|直播|社交|推特|微信|短信|discord|gal|视觉小说|频道/.test(value);
var mode=wantsSimulator?'simulator':'normal';
if(!wantsSimulator)template='';
var count=digitCount(value);
var story=root.NaiComicStoryEngine&&typeof root.NaiComicStoryEngine.parseScript==='function'?root.NaiComicStoryEngine.parseScript(value,{title:value.slice(0,32)||'自然语言场景'}):null;
var dialogue=story?story.nodes.filter(function(node){return node.type==='speech'||node.type==='aside'||node.type==='narrator';}).map(function(node){
var character=story.characters.find(function(item){return item.id===node.speaker;});
return {speaker:character?character.id:'director_a',content:node.content||node.choices&&node.choices.map(function(choice){return choice.label;}).join('/')||''};
}):[{speaker:'director_a',content:value||'请继续'}];
var panels=[];
for(var index=1;index<=count;index++){
var last=index===count;
panels.push({
panel:index,
mode:last?mode:'normal',
description:last&&mode==='simulator'?value:'分镜 '+index,
template:last?template:'',
characters:story?story.characters.map(function(character){return character.name;}):[],
dialogue:last?dialogue:[],
story:last&&story?story:undefined
});
}
return {schemaVersion:1,title:value.slice(0,32)||'自然语言场景',pages:[{page:1,panels:panels}]};
}
function bind(){
if(initialized)return;
initialized=true;
var input=element('naiScenePlanInput'),json=element('naiScenePlanJson');
var generate=element('naiScenePlanGenerate'),preview=element('naiScenePlanPreview'),apply=element('naiScenePlanApply'),rollback=element('naiScenePlanRollback'),retry=element('naiScenePlanRetry');
if(generate)generate.addEventListener('click',function(){
status('正在生成计划（调用导演写提示词，不会生图）...',false);
var sourceText=input&&input.value||'';
var plan=heuristic(sourceText);
var enrich=root.NaiComicStoryToManga&&typeof root.NaiComicStoryToManga.enrichPlanWithDirector==='function'?root.NaiComicStoryToManga.enrichPlanWithDirector(plan):Promise.resolve({plan:plan,source:'heuristic'});
enrich.then(function(result){
if(json)json.value=JSON.stringify(result.plan,null,2);
var label=result.source==='api'?'导演 API':(result.source==='local'||result.source==='local-fallback'?'本地导演':'规则拆分');
status('计划已生成（'+label+'）。请先预览，再应用到画布。不会自动生图。',false);
}).catch(function(error){
if(json)json.value=JSON.stringify(plan,null,2);
status('导演失败，已回退规则拆分：'+error.message,true);
});
});
if(preview)preview.addEventListener('click',function(){var value=parseJson();if(!value)return;var result=root.NaiScenePlanService.preview(value);status('预览：'+result.summary.pages+' 页、'+result.summary.panels+' 个分镜。'+(result.warnings.length?' '+result.warnings.join('；'):''),!result.ok);});
if(apply)apply.addEventListener('click',function(){var value=parseJson();if(!value)return;root.NaiScenePlanService.apply(value).then(function(result){status('计划已应用：'+result.applyId+'。可回滚。',false);}).catch(function(error){status(error.message,true);});});
if(rollback)rollback.addEventListener('click',function(){var result=root.NaiScenePlanService.rollback();status(result?'已回滚本次计划。':'没有可回滚的计划。',!result);});
if(retry)retry.addEventListener('click',function(){var value=parseJson();if(!value)return;root.NaiScenePlanService.retryStep(value,0,0).then(function(){status('第 1 页第 1 个分镜已重试。',false);}).catch(function(error){status(error.message,true);});});
}
root.NaiScenePlanController={heuristic:heuristic};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
