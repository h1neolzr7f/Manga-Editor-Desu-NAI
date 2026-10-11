/* exported putActionBarSeparator, putActionButton, putDeleteButton, putMoveLockButton, putRembgButton, putViewButton */

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

function visibleChange(obj){
obj.visible=!obj.visible;
updateLayerPanel();
canvas.requestRenderAll();
// show/hide is an edit: record it so Ctrl+Z brings a layer back (and auto-save sees the change)
if(typeof saveStateByManual==='function')saveStateByManual();
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
