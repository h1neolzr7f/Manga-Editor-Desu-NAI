(function(root){
"use strict";

var selected=null;
var currentTemplateId='visual-novel-generic';
var initialized=false;

function element(id){return typeof document!=='undefined'?document.getElementById(id):null;}
function canvas(){return typeof root.canvas!=='undefined'&&root.canvas?root.canvas:(typeof window!=='undefined'&&window.canvas?window.canvas:null);}
function setStatus(message,isError){var target=element('simulatorExtraStatus');if(target){target.textContent=message;target.classList.toggle('is-error',!!isError);}}
function hostPanel(){return document.querySelector('#simulator-chat-area .simulator-chat-panel');}
function movePanel(){var panel=element('simulator-extra-section'),host=hostPanel();if(panel&&host&&panel.parentNode!==host)host.appendChild(panel);}
function renderer(id){return root.NaiComicExtraRendererRegistry&&root.NaiComicExtraRendererRegistry.get(id);}
function currentGroup(){
var current=canvas();
if(!current||typeof current.getActiveObject!=='function')return selected;
var object=current.getActiveObject();
if(object&&object.customType==='simulatorExtra')return object;
if(object&&object.group&&object.group.customType==='simulatorExtra')return object.group;
return selected&&selected.canvas?selected:null;
}
function fit(group,current){
if(root.NaiComicChatRenderer&&typeof root.NaiComicChatRenderer.fitGroupToCanvas==='function')return root.NaiComicChatRenderer.fitGroupToCanvas(group,current);
var width=Number(group.width)||1,height=Number(group.height)||1,maxWidth=(Number(current.width)||1000)-40,maxHeight=(Number(current.height)||1000)-40,scale=Math.min(maxWidth/width,maxHeight/height,1);
group.set({scaleX:scale,scaleY:scale,left:((Number(current.width)||1000)-width*scale)/2,top:((Number(current.height)||1000)-height*scale)/2});
return group;
}
function readJson(){
var input=element('simulatorExtraSceneJson');
try{return input?root.NaiComicSceneSerializer.deserialize(input.value):{};}catch(error){setStatus(error.message,true);return null;}
}
function writeJson(scene){var input=element('simulatorExtraSceneJson');if(input)input.value=root.NaiComicSceneSerializer.serialize(scene);}
function loadExample(id){
var target=id||currentTemplateId;
var item=renderer(target);
if(!item){setStatus('模板不存在：'+target,true);return null;}
currentTemplateId=target;
var scene=item.normalize({});
writeJson(scene);
setStatus('已载入 '+item.definition.name+' 示例。',false);
return scene;
}
function insertOrUpdate(){
var current=canvas();
if(!current){setStatus('Canvas 尚未初始化。',true);return Promise.reject(new Error('Canvas 尚未初始化。'));}
var item=renderer(currentTemplateId),scene=readJson();
if(!item||!scene)return Promise.reject(new Error('模板或场景不可用。'));
var validation=item.validate(scene);
if(!validation.ok){setStatus(validation.errors.join('；'),true);return Promise.reject(new Error(validation.errors.join('; ')));}
return Promise.resolve(item.render(validation.scene)).then(function(group){
fit(group,current);
var previous=currentGroup();
if(typeof changeDoNotSaveHistory==='function')changeDoNotSaveHistory();
if(previous&&previous.canvas===current)current.remove(previous);
current.add(group);
if(typeof changeDoSaveHistory==='function')changeDoSaveHistory();
selected=group;
current.setActiveObject(group);
current.renderAll();
if(typeof updateLayerPanel==='function')updateLayerPanel();
if(typeof saveStateByManual==='function')saveStateByManual();
setStatus('模板已插入画布，可继续编辑或保存。',false);
return group;
});
}
function loadSelected(){
var group=currentGroup();
if(!group){setStatus('请先选中一个模拟器对象。',true);return false;}
var item=renderer(group.simulatorTemplateId);
if(!item){setStatus('选中对象的模板未安装：'+group.simulatorTemplateId,true);return false;}
currentTemplateId=item.definition.id;
var scene=item.normalize(root.NaiComicSceneSerializer.deserialize(group.simulatorScene||'{}'));
writeJson(scene);setStatus('已读取选中模板。',false);return true;
}
function exportSelected(){
var current=canvas(),group=currentGroup();
if(!current||!group){setStatus('请先选中一个模拟器对象。',true);return false;}
var bounds=group.getBoundingRect(true,true),data=current.toDataURL({format:'png',left:Math.max(0,bounds.left),top:Math.max(0,bounds.top),width:bounds.width,height:bounds.height,multiplier:1}),link=document.createElement('a');
link.href=data;link.download=(group.name||'simulator')+'.png';link.click();setStatus('已导出模拟器 PNG。',false);return true;
}
function bind(){
if(initialized)return;
initialized=true;movePanel();
var select=element('simulatorExtraTemplate');
if(select&&root.NaiComicExtraRendererRegistry){
root.NaiComicExtraRendererRegistry.list().forEach(function(item){var option=document.createElement('option');option.value=item.definition.id;option.textContent=item.definition.name;select.appendChild(option);});
select.value=currentTemplateId;
select.addEventListener('change',function(){currentTemplateId=select.value;loadExample(currentTemplateId);});
}
var load=element('simulatorExtraLoadButton');if(load)load.addEventListener('click',function(){loadExample(currentTemplateId);});
var insert=element('simulatorExtraInsertButton');if(insert)insert.addEventListener('click',function(){insertOrUpdate().catch(function(error){setStatus(error.message,true);});});
var selectedButton=element('simulatorExtraLoadSelectedButton');if(selectedButton)selectedButton.addEventListener('click',loadSelected);
var exportButton=element('simulatorExtraExportButton');if(exportButton)exportButton.addEventListener('click',exportSelected);
var current=canvas();
if(current&&typeof current.on==='function'){current.on('selection:created',function(event){selected=event&&event.selected&&event.selected[0];});current.on('selection:updated',function(event){selected=event&&event.selected&&event.selected[0];});}
loadExample(currentTemplateId);
}

root.NaiComicSimulatorController={loadExample:loadExample,insertOrUpdate:insertOrUpdate,loadSelected:loadSelected,exportSelected:exportSelected};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',bind);
})(typeof window!=='undefined'?window:globalThis);
