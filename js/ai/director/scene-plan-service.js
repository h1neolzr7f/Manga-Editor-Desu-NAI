(function(root){
"use strict";
var lastApply=null;
function currentCanvas(){return root.canvas||null;}
function guid(object){if(typeof getGUID==='function')return getGUID(object);object.guid='plan_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);return object.guid;}
function preview(value){var validation=root.NaiScenePlanSchema.validate(value);return {ok:validation.ok,errors:validation.errors,warnings:validation.warnings,plan:validation.plan,summary:{pages:validation.plan.pages.length,panels:validation.plan.pages.reduce(function(total,page){return total+page.panels.length;},0)}};}
function layoutFor(current,count){
if(root.NaiComicStoryToManga&&typeof root.NaiComicStoryToManga.layoutCells==='function'){
return root.NaiComicStoryToManga.layoutCells(current.width,current.height,count);
}
var width=Number(current.width)||1000,height=Number(current.height)||1400,cols=count<=1?1:2,rows=Math.ceil(count/cols),margin=40,gap=20;
var cellW=(width-margin*2-gap*(cols-1))/cols,cellH=(height-margin*2-gap*(rows-1))/rows,cells=[];
for(var index=0;index<count;index++)cells.push({x:margin+(index%cols)*(cellW+gap),y:margin+Math.floor(index/cols)*(cellH+gap),width:cellW,height:cellH});
return {cells:cells};
}
function makeNormalPanel(panel,x,y,width,height){
if(root.NaiComicStoryToManga&&typeof root.NaiComicStoryToManga.makeMangaPanel==='function'){
return root.NaiComicStoryToManga.makeMangaPanel(panel,x,y,width,height);
}
var api=root.fabric;var rect=new api.Rect({left:x,top:y,width:width,height:height,fill:'rgba(255,255,255,1)',stroke:'#111827',strokeWidth:2,originX:'left',originY:'top',isPanel:true});
if(typeof setText2ImageInitPrompt==='function')setText2ImageInitPrompt(rect);
if(panel.prompt)rect.text2img_prompt=panel.prompt;
if(panel.negative_prompt)rect.text2img_negative=panel.negative_prompt;
return rect;
}
function storyFromPanel(panel){
if(!root.NaiComicStoryEngine)return null;
if(panel.story)return root.NaiComicStoryEngine.normalize(panel.story);
var lines=[];
if(Array.isArray(panel.dialogue)&&panel.dialogue.length){
panel.dialogue.forEach(function(item){
if(typeof item==='string')lines.push(item);
else lines.push((item.speaker||'角色')+'：'+(item.content||''));
});
}else if(panel.description){
lines.push(String(panel.description));
}
if(!lines.length)return root.NaiComicStoryEngine.createDefaultStory();
return root.NaiComicStoryEngine.parseScript(lines.join('\n'),{title:panel.description||'计划分镜'});
}
function renderSimulatorPanel(panel){
var templateId=panel.template||'generic-chat-dark';
var story=storyFromPanel(panel);
var extraRenderer=root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(templateId);
if(extraRenderer){
var extraScene=story&&root.NaiComicStoryAdapters?root.NaiComicStoryAdapters.toTemplate(story,templateId):extraRenderer.normalize({title:panel.description||'计划分镜',events:panel.events||[],messages:panel.dialogue||[],dialogue:panel.dialogue||[]});
return Promise.resolve(extraRenderer.render(extraScene));
}
var scene=story&&root.NaiComicStoryAdapters?root.NaiComicStoryAdapters.toChat(story,templateId):{schemaVersion:1,sceneType:'chat',templateId:templateId,title:panel.description||'计划分镜',participants:[{id:'director_a',name:'角色 A',side:'left',avatar:''},{id:'director_b',name:'角色 B',side:'right',avatar:''}],messages:Array.isArray(panel.dialogue)&&panel.dialogue.length?panel.dialogue.map(function(item,index){return {id:'plan_message_'+index,type:'text',speaker:item.speaker||'director_a',content:item.content||String(item),time:item.time||'',image:'',status:''};}):[{id:'plan_message_0',type:'text',speaker:'director_a',content:panel.description||'',time:'',image:'',status:''}]};
if(root.NaiComicChatRenderer&&root.NaiComicTemplateRegistry)return root.NaiComicChatRenderer.renderScene(scene,root.NaiComicTemplateRegistry.get(scene.templateId));
return Promise.reject(new Error('聊天模板渲染器未加载。'));
}
function apply(value){
var current=currentCanvas(),result=preview(value);if(!result.ok)return Promise.reject(new Error(result.errors.join('; ')));if(!current||!root.fabric)return Promise.reject(new Error('Canvas 或 Fabric 尚未初始化。'));
var applyId='plan_apply_'+Date.now().toString(36),created=[];var tasks=[];
var flat=[];
result.plan.pages.forEach(function(page){page.panels.forEach(function(panel){flat.push(panel);});});
var layout=layoutFor(current,Math.max(1,flat.length));
flat.forEach(function(panel,panelIndex){
var cell=layout.cells[panelIndex]||layout.cells[0];
var x=cell.x,y=cell.y,width=cell.width,height=cell.height;
if(panel.mode==='simulator'){tasks.push(renderSimulatorPanel(panel).then(function(object){object.set({left:x,top:y,scaleX:Math.min(1,width/(object.width||1)),scaleY:Math.min(1,height/(object.height||1)),scenePlanId:applyId,scenePlanPanelIndex:panelIndex});return object;}));}
else{tasks.push(Promise.resolve(makeNormalPanel(panel,x,y,width,height)));}
});
return Promise.all(tasks).then(function(objects){if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();objects.forEach(function(object){guid(object);object.scenePlanId=applyId;current.add(object);created.push(object);});if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();current.renderAll();if(typeof updateLayerPanel==='function')updateLayerPanel();if(typeof saveStateByManual==='function')saveStateByManual();lastApply={id:applyId,objects:created};return {applyId:applyId,objects:objects,plan:result.plan};});
}
function rollback(){var current=currentCanvas();if(!lastApply||!current)return false;if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();lastApply.objects.forEach(function(object){if(object.canvas===current)current.remove(object);});if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();current.renderAll();if(typeof updateLayerPanel==='function')updateLayerPanel();if(typeof saveStateByManual==='function')saveStateByManual();var result=lastApply;lastApply=null;return {rolledBack:true,applyId:result.id};}
function retryStep(value,pageIndex,panelIndex){var plan=root.NaiScenePlanSchema.parse(value),page=plan.pages[Number(pageIndex)||0],panel=page&&page.panels[Number(panelIndex)||0];if(!panel) return Promise.reject(new Error('ScenePlan 步骤不存在。'));return apply({schemaVersion:1,title:plan.title,pages:[{page:page.page,panels:[panel]}]});}
root.NaiScenePlanService={preview:preview,apply:apply,rollback:rollback,retryStep:retryStep,getLastApply:function(){return lastApply;}};
})(typeof window!=='undefined'?window:globalThis);
