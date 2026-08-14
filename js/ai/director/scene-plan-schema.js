(function(root){
"use strict";
var VERSION=1;
function clone(value){return JSON.parse(JSON.stringify(value));}
function defaultPlan(){return {schemaVersion:VERSION,title:'未命名场景',pages:[{page:1,panels:[{panel:1,mode:'normal',description:'',characters:[],dialogue:[]}]}]};}
function normalize(value){
var source=value&&typeof value==='object'?clone(value):defaultPlan(),plan={schemaVersion:VERSION,title:String(source.title||'未命名场景'),pages:[]};
(Array.isArray(source.pages)?source.pages:[]).forEach(function(page,pageIndex){var target={page:Number(page.page)||pageIndex+1,panels:[]};(Array.isArray(page.panels)?page.panels:[]).forEach(function(panel,panelIndex){target.panels.push({panel:Number(panel.panel)||panelIndex+1,mode:['normal','simulator'].indexOf(panel.mode)>=0?panel.mode:'normal',description:String(panel.description||''),characters:Array.isArray(panel.characters)?panel.characters.map(String):[],dialogue:Array.isArray(panel.dialogue)?clone(panel.dialogue):[],template:String(panel.template||''),events:Array.isArray(panel.events)?clone(panel.events):[],prompt:String(panel.prompt||''),negative_prompt:String(panel.negative_prompt||''),directorSource:String(panel.directorSource||''),story:panel.story&&typeof panel.story==='object'?clone(panel.story):undefined});});if(target.panels.length)plan.pages.push(target);});
if(!plan.pages.length)plan=defaultPlan();return plan;
}
function parse(value){if(typeof value==='object'&&value!==null)return normalize(value);try{return normalize(JSON.parse(value));}catch(error){throw new Error('ScenePlan JSON 无法解析：'+error.message);}}
function validate(value){
var plan=normalize(value),errors=[],warnings=[];
if(!plan.title.trim())errors.push('ScenePlan 缺少标题。');
plan.pages.forEach(function(page,pageIndex){if(!page.panels.length)errors.push('第 '+(pageIndex+1)+' 页没有分镜。');page.panels.forEach(function(panel,panelIndex){if(panel.mode==='simulator'&&!panel.template)warnings.push('第 '+(pageIndex+1)+' 页第 '+(panelIndex+1)+' 个模拟器分镜未指定模板，将使用通用模板。');if(!panel.description&&!panel.dialogue.length)warnings.push('第 '+(pageIndex+1)+' 页第 '+(panelIndex+1)+' 个分镜缺少描述。');});});
return {ok:errors.length===0,errors:errors,warnings:warnings,plan:plan};
}
root.NaiScenePlanSchema={VERSION:VERSION,clone:clone,defaultPlan:defaultPlan,normalize:normalize,parse:parse,validate:validate};
})(typeof window!=='undefined'?window:globalThis);
