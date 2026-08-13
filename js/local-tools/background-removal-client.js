(function(root){
"use strict";

var client=null;

function getCanvas(){
if(typeof canvas!=="undefined"&&canvas)return canvas;
return root.canvas||null;
}

function element(id){
return typeof document!=="undefined"?document.getElementById(id):null;
}

function valueOf(id,fallback){
var target=element(id);
if(!target)return fallback;
if(target.type==="checkbox")return target.checked;
return target.value;
}

function setStatus(message,isError){
["backgroundRemovalStatus","cutoutStatus"].forEach(function(id){
var target=element(id);
if(!target)return;
target.textContent=message;
target.classList.toggle("is-error",!!isError);
});
}

function getClient(){
if(!client)client=new root.NaiLocalToolsClient(valueOf("cutoutServiceUrl","http://127.0.0.1:8765"));
return client;
}

function resetClient(){
client=null;
}

function getSelectedImage(layer){
if(layer&&layer.type==="image")return layer;
var current=getCanvas();
var active=current&&typeof current.getActiveObject==="function"?current.getActiveObject():null;
if(!active||active.type!=="image")throw new Error("请先选中一个普通图片图层。");
return active;
}

function dataUrlToBlob(dataUrl){
return fetch(dataUrl).then(function(response){return response.blob();});
}

function collectOptions(){
var engine=valueOf("backgroundRemovalEngine","rembg");
var model=valueOf("backgroundRemovalModel","isnet-anime");
if(engine==="color-key")model="color-key";
return{
engine:engine,
model:model,
alpha_matting:!!element("backgroundRemovalAlphaMatting")&&element("backgroundRemovalAlphaMatting").checked,
fg_threshold:parseInt(valueOf("backgroundRemovalFgThreshold",240),10),
bg_threshold:parseInt(valueOf("backgroundRemovalBgThreshold",10),10),
erode_size:parseInt(valueOf("backgroundRemovalErode",10),10),
post_process_mask:!!element("backgroundRemovalPostMask")&&element("backgroundRemovalPostMask").checked,
only_mask:!!element("backgroundRemovalOnlyMask")&&element("backgroundRemovalOnlyMask").checked,
crop:!!element("backgroundRemovalCrop")&&element("backgroundRemovalCrop").checked,
feather:parseInt(valueOf("backgroundRemovalFeather",0),10),
key_color:valueOf("backgroundRemovalKeyColor","#ffffff"),
key_tolerance:parseInt(valueOf("backgroundRemovalKeyTolerance",28),10),
invert:!!element("backgroundRemovalInvert")&&element("backgroundRemovalInvert").checked,
action:valueOf("backgroundRemovalAction","new")
};
}

function applyOptions(options){
if(!options)return;
function setValue(id,value){
var target=element(id);
if(!target||value===undefined||value===null)return;
if(target.type==="checkbox")target.checked=!!value;
else target.value=value;
}
setValue("backgroundRemovalEngine",options.engine);
setValue("backgroundRemovalModel",options.model);
setValue("backgroundRemovalAlphaMatting",options.alpha_matting);
setValue("backgroundRemovalFgThreshold",options.fg_threshold);
setValue("backgroundRemovalBgThreshold",options.bg_threshold);
setValue("backgroundRemovalErode",options.erode_size);
setValue("backgroundRemovalPostMask",options.post_process_mask);
setValue("backgroundRemovalOnlyMask",options.only_mask);
setValue("backgroundRemovalCrop",options.crop);
setValue("backgroundRemovalFeather",options.feather);
setValue("backgroundRemovalKeyColor",options.key_color);
setValue("backgroundRemovalAction",options.action);
setValue("backgroundRemovalKeyTolerance",options.key_tolerance);
setValue("backgroundRemovalInvert",options.invert);
toggleEngineFields();
}

function toggleEngineFields(){
var engine=valueOf("backgroundRemovalEngine","rembg");
var rembg=document.querySelectorAll(".cutout-rembg-only");
var chroma=document.querySelectorAll(".cutout-chroma-only");
rembg.forEach(function(node){node.hidden=engine!=="rembg";});
chroma.forEach(function(node){node.hidden=engine!=="color-key";});
}

function refreshPresetSelect(selectedId){
var select=element("cutoutPresetSelect");
if(!select||!root.NaiCutoutPresets)return;
var current=selectedId||select.value;
select.innerHTML="";
root.NaiCutoutPresets.list().forEach(function(preset){
var option=document.createElement("option");
option.value=preset.id;
option.textContent=(preset.builtin?"[内置] ":"")+preset.name;
select.appendChild(option);
});
if(current)select.value=current;
}

function loadSelectedPreset(){
if(!root.NaiCutoutPresets)return;
var preset=root.NaiCutoutPresets.get(valueOf("cutoutPresetSelect",""));
if(!preset)return;
applyOptions(preset.options);
setStatus("已加载预设："+preset.name,false);
}

function saveCurrentPreset(){
if(!root.NaiCutoutPresets)return;
var name=window.prompt("预设名称",valueOf("cutoutPresetName","我的抠图预设"));
if(!name)return;
var saved=root.NaiCutoutPresets.saveUserPreset({name:name,options:collectOptions()});
refreshPresetSelect(saved.id);
setStatus("已保存自定义抠图预设："+saved.name,false);
}

function deleteCurrentPreset(){
if(!root.NaiCutoutPresets)return;
var preset=root.NaiCutoutPresets.get(valueOf("cutoutPresetSelect",""));
if(!preset)return;
if(preset.builtin){setStatus("内置预设不能删除。",true);return;}
root.NaiCutoutPresets.removeUserPreset(preset.id);
refreshPresetSelect();
setStatus("已删除预设："+preset.name,false);
}

function checkHealth(){
resetClient();
setStatus("正在检查本地抠图服务…",false);
return getClient().health().then(function(data){
var label=data&&data.rembg?"rembg + 颜色抠图":"颜色抠图可用（未安装 rembg）";
setStatus("抠图服务："+label,false);
return data;
}).catch(function(error){
setStatus("抠图服务不可用：请先启动本地工具，或点「一键启动」。"+error.message,true);
throw error;
});
}

function listModels(){
return getClient().models();
}

function fillModels(data){
var model=element("backgroundRemovalModel");
if(!model||!data||!Array.isArray(data.models))return;
var current=model.value;
model.innerHTML="";
data.models.forEach(function(item){
var option=document.createElement("option");
option.value=item.id;
option.textContent=item.label+(item.processorInstalled?"":"（需安装 rembg）");
model.appendChild(option);
});
if(current)model.value=current;
}

function setPreview(originalUrl,resultUrl){
["backgroundRemovalPreview","cutoutPreview"].forEach(function(id){
var wrapper=element(id);
if(wrapper)wrapper.hidden=!originalUrl&&!resultUrl;
});
var original=element("backgroundRemovalOriginalPreview")||element("cutoutOriginalPreview");
var result=element("backgroundRemovalResultPreview")||element("cutoutResultPreview");
if(original)original.src=originalUrl||"";
if(result)result.src=resultUrl||"";
}

function imageSize(object,axis){
if(typeof object["getScaled"+(axis==="width"?"Width":"Height")]==="function")return object["getScaled"+(axis==="width"?"Width":"Height")]();
return (object[axis]||1)*(axis==="width"?(object.scaleX||1):(object.scaleY||1));
}

function copyPlacement(source,target){
target.set({
left:source.left||0,
top:source.top||0,
scaleX:imageSize(source,"width")/(target.width||1),
scaleY:imageSize(source,"height")/(target.height||1),
angle:source.angle||0,
flipX:!!source.flipX,
flipY:!!source.flipY,
opacity:source.opacity===undefined?1:source.opacity,
originX:source.originX,
originY:source.originY
});
if(source.guid)target.guid=source.guid;
if(source.name)target.name=source.name+(source.name.indexOf("抠图")<0?"（抠图）":"");
}

function createFabricImage(dataUrl){
return new Promise(function(resolve,reject){
if(!root.fabric||!root.fabric.Image||typeof root.fabric.Image.fromURL!=="function"){
reject(new Error("Fabric 图片工厂不可用。"));
return;
}
root.fabric.Image.fromURL(dataUrl,function(image){
if(!image){reject(new Error("抠图结果无法载入画布。"));return;}
resolve(image);
});
});
}

function saveCanvasHistory(){
if(typeof updateLayerPanel==="function")updateLayerPanel();
if(typeof saveStateByManual==="function")saveStateByManual();
}

function applyResult(source,result,action){
var current=getCanvas();
if(!current)throw new Error("Canvas 尚未初始化。");
return createFabricImage(result.image).then(function(processed){
copyPlacement(source,processed);
processed.backgroundRemovalResult=true;
processed.backgroundRemovalModel=result.model||collectOptions().model;
processed.backgroundRemovalSourceGuid=source.guid||"";
processed.backgroundRemovalAction=action;
if(typeof changeDoNotSaveHistory==="function")changeDoNotSaveHistory();
if(action==="replace"){
current.remove(source);
current.add(processed);
}else if(action==="new"){
current.add(processed);
}else{
processed.left=(source.left||0)+20;
processed.top=(source.top||0)+20;
current.add(processed);
}
if(typeof changeDoSaveHistory==="function")changeDoSaveHistory();
current.setActiveObject(processed);
current.renderAll();
saveCanvasHistory();
return processed;
});
}

function processSelected(mode,action,layer){
var image;
try{image=getSelectedImage(layer);}catch(error){setStatus(error.message,true);return Promise.reject(error);}
var dataUrl=typeof image.toDataURL==="function"?image.toDataURL({format:"png"}):"";
if(!dataUrl){var noDataError=new Error("选中图层没有可读取的图片数据。");setStatus(noDataError.message,true);return Promise.reject(noDataError);}
var options=collectOptions();
if(mode)options.model=mode;
var selectedAction=action||options.action||"new";
setStatus("正在处理选中图层，原图会保持可撤销…",false);
return dataUrlToBlob(dataUrl).then(function(blob){
return getClient().removeBackground(blob,options.model,options);
}).then(function(data){
if(!data||!data.ok||!data.image)throw new Error("抠图服务没有返回有效透明 PNG。");
setPreview(dataUrl,data.image);
return applyResult(image,data,selectedAction);
}).then(function(result){
setStatus("抠图完成："+(result.backgroundRemovalModel||options.model)+"，可继续编辑或撤销。",false);
return result;
}).catch(function(error){
setStatus("抠图未完成，原图保持不变："+error.message,true);
throw error;
});
}

function processLayer(layer){
var current=getCanvas();
if(current&&layer)current.setActiveObject(layer);
return processSelected(null,null,layer);
}

function bind(){
refreshPresetSelect();
toggleEngineFields();
var health=element("backgroundRemovalHealthButton")||element("cutoutHealthButton");
if(health)health.addEventListener("click",function(){checkHealth().then(listModels).then(fillModels).catch(function(){});});
var run=element("backgroundRemovalRunButton")||element("cutoutRunButton");
if(run)run.addEventListener("click",function(){processSelected().catch(function(){});});
var engine=element("backgroundRemovalEngine");
if(engine)engine.addEventListener("change",toggleEngineFields);
var load=element("cutoutPresetLoadButton");
if(load)load.addEventListener("click",loadSelectedPreset);
var save=element("cutoutPresetSaveButton");
if(save)save.addEventListener("click",saveCurrentPreset);
var remove=element("cutoutPresetDeleteButton");
if(remove)remove.addEventListener("click",deleteCurrentPreset);
var exportBtn=element("cutoutPresetExportButton");
if(exportBtn)exportBtn.addEventListener("click",function(){
var blob=new Blob([root.NaiCutoutPresets.exportPack()],{type:"application/json"});
var url=URL.createObjectURL(blob);
var link=document.createElement("a");
link.href=url;
link.download="cutout-presets.json";
link.click();
URL.revokeObjectURL(url);
});
var importInput=element("cutoutPresetImportInput");
if(importInput)importInput.addEventListener("change",function(){
var file=importInput.files&&importInput.files[0];
if(!file)return;
file.text().then(function(text){
var count=root.NaiCutoutPresets.importPack(text);
refreshPresetSelect();
setStatus("已导入 "+count+" 个自定义抠图预设。",false);
}).catch(function(error){setStatus("导入失败："+error.message,true);});
});
listModels().then(fillModels).catch(function(){});
checkHealth().catch(function(){});
}

root.NaiBackgroundRemovalClient={
checkHealth:checkHealth,
listModels:listModels,
processSelected:processSelected,
processLayer:processLayer,
getSelectedImage:getSelectedImage,
setPreview:setPreview,
collectOptions:collectOptions,
applyOptions:applyOptions
};

if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",bind);
})(typeof window!=="undefined"?window:globalThis);
