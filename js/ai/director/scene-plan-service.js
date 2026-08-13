(function(root){
"use strict";
var lastApply=null;
function currentCanvas(){return root.canvas||null;}
function guid(object){if(typeof getGUID==='function')return getGUID(object);object.guid='plan_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);return object.guid;}
function preview(value){var validation=root.NaiScenePlanSchema.validate(value);return {ok:validation.ok,errors:validation.errors,warnings:validation.warnings,plan:validation.plan,summary:{pages:validation.plan.pages.length,panels:validation.plan.pages.reduce(function(total,page){return total+page.panels.length;},0)}};}
function makeNormalPanel(panel,x,y,width,height){var api=root.fabric;var rect=new api.Rect({left:x,top:y,width:width,height:height,fill:'rgba(148,163,184,.18)',stroke:'#94a3b8',strokeWidth:3,originX:'left',originY:'top'});var label=new api.Textbox(String(panel.description||'分镜 '+panel.panel),{left:x+18,top:y+18,width:width-36,fontSize:24,fill:'#e2e8f0',originX:'left',originY:'top'});return new api.Group([rect,label],{left:0,top:0,originX:'left',originY:'top'});}
function renderSimulatorPanel(panel){
var extraRenderer=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(panel.template||'');
if(extraRenderer){
var extraScene=extraRenderer.normalize({title:panel.description||'计划分镜',events:panel.events||[],messages:panel.dialogue||[]});
return Promise.resolve(extraRenderer.render(extraScene));
}
var scene={schemaVersion:1,sceneType:'chat',templateId:panel.template||'generic-chat-dark',title:panel.description||'计划分镜',participants:[{id:'director_a',name:'角色 A',side:'left',avatar:''},{id:'director_b',name:'角色 B',side:'right',avatar:''}],messages:Array.isArray(panel.dialogue)&&panel.dialogue.length?panel.dialogue.map(function(item,index){return {id:'plan_message_'+index,type:'text',speaker:item.speaker||'director_a',content:item.content||String(item),time:item.time||'',image:'',status:''};}):[{id:'plan_message_0',type:'text',speaker:'director_a',content:panel.description||'',time:'',image:'',status:''}]};
if(root.NaiComicChatRenderer&&root.NaiComicTemplateRegistry)return root.NaiComicChatRenderer.renderScene(scene,root.NaiComicTemplateRegistry.get(scene.templateId));
return Promise.reject(new Error('聊天模板渲染器未加载。'));
}
function apply(value){
var current=currentCanvas(),result=preview(value);if(!result.ok)return Promise.reject(new Error(result.errors.join('; ')));if(!current||!root.fabric)return Promise.reject(new Error('Canvas 或 Fabric 尚未初始化。'));
var applyId='plan_apply_'+Date.now().toString(36),created=[];var cursor=40;var tasks=[];
result.plan.pages.forEach(function(page,pageIndex){page.panels.forEach(function(panel,panelIndex){var x=cursor+(panelIndex%2)*((Number(current.width)||1000)/2-50),y=cursor+pageIndex*220+(Math.floor(panelIndex/2))*220,width=(Number(current.width)||1000)/2-70,height=180;if(panel.mode==='simulator'){tasks.push(renderSimulatorPanel(panel).then(function(object){object.set({left:x,top:y,scaleX:Math.min(1,width/(object.width||1)),scaleY:Math.min(1,height/(object.height||1)),scenePlanId:applyId,scenePlanPanelIndex:panelIndex});return object;}));}else{tasks.push(Promise.resolve(makeNormalPanel(panel,x,y,width,height)));}});});
return Promise.all(tasks).then(function(objects){if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();objects.forEach(function(object){guid(object);object.scenePlanId=applyId;current.add(object);created.push(object);});if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();current.renderAll();if(typeof updateLayerPanel==='function')updateLayerPanel();if(typeof saveStateByManual==='function')saveStateByManual();lastApply={id:applyId,objects:created};return {applyId:applyId,objects:objects,plan:result.plan};});
}
function rollback(){var current=currentCanvas();if(!lastApply||!current)return false;if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();lastApply.objects.forEach(function(object){if(object.canvas===current)current.remove(object);});if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();current.renderAll();if(typeof updateLayerPanel==='function')updateLayerPanel();if(typeof saveStateByManual==='function')saveStateByManual();var result=lastApply;lastApply=null;return {rolledBack:true,applyId:result.id};}
function retryStep(value,pageIndex,panelIndex){var plan=root.NaiScenePlanSchema.parse(value),page=plan.pages[Number(pageIndex)||0],panel=page&&page.panels[Number(panelIndex)||0];if(!panel) return Promise.reject(new Error('ScenePlan 步骤不存在。'));return apply({schemaVersion:1,title:plan.title,pages:[{page:page.page,panels:[panel]}]});}
root.NaiScenePlanService={preview:preview,apply:apply,rollback:rollback,retryStep:retryStep,getLastApply:function(){return lastApply;}};
})(typeof window!=='undefined'?window:globalThis);
