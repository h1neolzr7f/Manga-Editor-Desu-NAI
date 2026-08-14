
function putActionButton(container,icon,labelKey,onclick,requiredRole){
if(requiredRole&&hasNotRole(requiredRole)){return;}
var button=document.createElement("button");
button.className="layer-action-btn";
var label=document.createElement("span");
label.setAttribute("data-i18n",labelKey);
label.textContent=i18next.t(labelKey);
button.appendChild(label);
button.onclick=function(e){e.stopPropagation();onclick();};
container.appendChild(button);
}

function putActionBarSeparator(container){
var sep=document.createElement("span");
sep.className="layer-action-sep";
container.appendChild(sep);
}

function putCropImageDownloadButton(buttonsDiv,layer,index) {
var button=document.createElement("button");
button.innerHTML='<i class="material-icons">download</i>';

button.onclick=function (e) {
e.stopPropagation();

imageObject2DataURLByCrop(layer)
.then((croppedDataURL)=>{
if (croppedDataURL) {
link=getLink(croppedDataURL);
link.click();
} else {
layerLogger.warn("No valid activeObject");
}
})
.catch((err)=>{
layerLogger.error("Error cropping image:",err);
});
};

addTooltipByElement(button,"imageCropDownloadButton");
buttonsDiv.appendChild(button);
}


function putRembgButton(buttonsDiv,layer,index) {
if(!layer||layer.type!=='image'){return;}
var button=document.createElement("button");
button.innerHTML='<i class="material-icons">content_cut</i>';
button.onclick=function (e) {
e.stopPropagation();
if(window.NaiBackgroundRemovalClient&&typeof window.NaiBackgroundRemovalClient.processLayer==='function'){
window.NaiBackgroundRemovalClient.processLayer(layer).catch(function(){});
}else if(typeof toggleVisibility==='function'){
toggleVisibility('cutout-area');
}
};
addTooltipByElement(button,"rembg");
buttonsDiv.appendChild(button);
}

function putTempButton(buttonsDiv,layer,index) {
return;
if(hasNotRole(AI_ROLES.Temp)){return;}

var button=document.createElement("button");
button.innerHTML='<i class="material-icons">pets</i>';

button.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinner(getGUID(layer),'BG');
sdWebUI_RembgProcessQueue(layer,spinner.id);
};

buttonsDiv.appendChild(button);
}



function putImageDownloadButton(buttonsDiv,layer,index) {
var button=document.createElement("button");
button.innerHTML='<i class="material-icons">download</i>';

button.onclick=function (e) {
e.stopPropagation();
dataURL=imageObject2DataURL(layer);
link=getLink(dataURL);
link.click();
};

addTooltipByElement(button,"imageDownloadButton");
buttonsDiv.appendChild(button);
}


function putInterrogateDanbooruButtons(buttonsDiv,layer,index) {
return;
if(hasNotRole(AI_ROLES.Image2Prompt_DEEPDOORU)){return;}

var deepDooruButton=document.createElement("button");
deepDooruButton.innerHTML="📦";
deepDooruButton.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinnerSuccess(getGUID(layer),'TAG');
sdwebuiInterrogate(layer,"deepdanbooru",spinner.id);
};
addTooltipByElement(deepDooruButton,"deepDooruButton");
buttonsDiv.appendChild(deepDooruButton);
}


function putInterrogateClipButtons(buttonsDiv,layer,index) {
return;
if(hasNotRole(AI_ROLES.Image2Prompt_CLIP)){return;}

var clipButton=document.createElement("button");
clipButton.innerHTML="📎";

clipButton.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinnerSuccess(getGUID(layer),'TAG');
sdwebuiInterrogate(layer,"clip",spinner.id);
};
addTooltipByElement(clipButton,"clipButton");

buttonsDiv.appendChild(clipButton);
}


function putPromptButton(buttonsDiv,layer,index) {
if(hasNotRole(AI_ROLES.PutPrompt)){return;}

var promptButton=document.createElement("button");
promptButton.innerHTML='<i class="material-icons">text_snippet</i>';
promptButton.onclick=function (e) {
e.stopPropagation();
if (layer.tempPrompt) {
layer.text2img_prompt=layer.tempPrompt;
createToast("已套用提示词",layer.text2img_prompt);
} else {
createToastError("没有可套用的提示词","");
}
if (layer.tempNegative) {
layer.text2img_negative=layer.tempNegative;
createToast("已套用反向提示词",layer.text2img_negative);
} else {
createToastError("没有可套用的反向提示词","");
}
};

addTooltipByElement(promptButton,"promptButton");
buttonsDiv.appendChild(promptButton);
}


function putUpscalerButton(buttonsDiv,layer,index) {
return;
if(hasNotRole(AI_ROLES.Upscaler)){return;}

var button=document.createElement("button");
button.innerHTML='<i class="material-icons">photo_size_select_large</i>';
button.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinner(getGUID(layer),'UP');
aiUpscale(layer,spinner);
};

addTooltipByElement(button,"upscaleButton");
buttonsDiv.appendChild(button);
}




function visibleChange(obj){
obj.visible=!obj.visible;
updateLayerPanel();
canvas.requestRenderAll();
}

function putViewButton(buttonsDiv,layer,index) {
var viewButton=document.createElement("button");
viewButton.id="viewButton-"+index;
if(layer.visible){
viewButton.innerHTML='<i class="material-icons">visibility</i>';
}else{
viewButton.innerHTML='<i class="material-icons">visibility_off</i>';
}

viewButton.onclick=function (e) {
visibleChange(layer);
};

addTooltipByElement(viewButton,"viewButton");
buttonsDiv.appendChild(viewButton);
}


function putRunI2IButton(buttonsDiv,layer,index) {
if(hasNotRole(AI_ROLES.Text2Image)){return;}

var runButton=document.createElement("button");
runButton.id="runButton-"+index;
runButton.innerHTML='<i class="material-icons">directions_run</i>';
runButton.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinner(getGUID(layer),'I2I');
I2I(layer,spinner);
};

addTooltipByElement(runButton,"runButton");

buttonsDiv.appendChild(runButton);
}



function putDeleteButton(buttonsDiv,layer,index) {
var deleteButton=document.createElement("button");
deleteButton.textContent="✕";
deleteButton.className="delete-layer-button";
deleteButton.onclick=function (e) {
e.stopPropagation();
removeLayer(layer);
};
addTooltipByElement(deleteButton,"deleteButton");
buttonsDiv.appendChild(deleteButton);
}

function putSeedButton(buttonsDiv,layer,index) {
if(hasNotRole(AI_ROLES.PutSeed)){return;}

var seedButton=document.createElement("button");
seedButton.innerHTML='<i class="material-icons">recycling</i>';
seedButton.onclick=function (e) {
e.stopPropagation();
if (layer.tempSeed) {
layer.text2img_seed=layer.tempSeed;
createToast("已套用种子",layer.text2img_seed);
} else {
createToastError("没有可套用的种子","");
}
};

addTooltipByElement(seedButton,"seedButton");
buttonsDiv.appendChild(seedButton);
}

function putRunT2IButton(buttonsDiv,layer,index) {
if(hasNotRole(AI_ROLES.Image2Image)){return;}

var runButton=document.createElement("button");
runButton.id="runButton-"+index;
runButton.innerHTML='<i class="material-icons">directions_run</i>';
runButton.onclick=function (e) {
e.stopPropagation();
var spinner=createSpinner(getGUID(layer),'T2I');
T2I(layer,spinner);
};
addTooltipByElement(runButton,"runButton");
buttonsDiv.appendChild(runButton);
}



async function AllRun(){
var objescts=getPanelObjectList();
for(var i=0;i<objescts.length;i++){
var layer=objescts[i];
var spinner=createSpinner(getGUID(layer),'T2I');
await T2I(layer,spinner);
while(typeof existsWaitQueue==='function'&&existsWaitQueue()){
await new Promise(function(r){setTimeout(r,500);});
}
}
}




function moveLockChange(obj){
obj.selectable=!obj.selectable;
canvas.discardActiveObject();
canvas.renderAll();
updateLayerPanel();
}

function putMoveLockButton(buttonsDiv,layer,index) {
var button=document.createElement("button");
button.id="moveLock-"+index;
if(!layer.selectable){
button.innerHTML='<i class="material-icons">lock</i>';
}else{
button.innerHTML='<i class="material-icons">control_camera</i>';
}

button.onclick=function (e) {
e.stopPropagation();
moveLockChange(layer);
};
addTooltipByElement(button,"moveLockButton");
buttonsDiv.appendChild(button);
}
