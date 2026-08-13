var modelSettingsWindow=(function(){
var overlayEl=null;
var localEditor=null;
var localWindow=null;
var runpodEditor=null;
var runpodWindow=null;
var localInitialized=false;
var runpodInitialized=false;
var sdwebuiInitialized=false;
var activeTabIdx=0;

var sdwebuiOriginalParents=[];

function open(){
if(!overlayEl)overlayEl=$('modelSettingsOverlay');
overlayEl.classList.add('active');
switchTab(activeTabIdx);
}

function close(){
if(!overlayEl)return;
overlayEl.classList.remove('active');
}

function switchTab(idx){
activeTabIdx=idx;
if(!overlayEl)overlayEl=$('modelSettingsOverlay');
var tabs=overlayEl.querySelectorAll('.us-tab');
var contents=overlayEl.querySelectorAll('.us-tab-content');
tabs.forEach(function(t,i){
t.classList.toggle('active',i===idx);
});
contents.forEach(function(c,i){
c.classList.toggle('active',i===idx);
});
if(idx===0&&!localInitialized){
initLocalTab();
}else if(idx===1&&!runpodInitialized){
initRunpodTab();
}else if(idx===2&&!sdwebuiInitialized){
initSdWebuiTab();
}
}

function initLocalTab(){
localInitialized=true;
var container=$('msLocalContainer');
var localProvider=providerRegistry.get('localComfyUI');
localWindow=new ComfyUIWorkflowWindow({provider:localProvider});
localWindow.initializeInContainer(container);
localEditor=new ComfyUIWorkflowEditor({
providerKey:'local',
workflowRepo:comfyUIWorkflowRepo_local,
objectInfoRepo:comfyObjectInfoRepo_local,
provider:localProvider,
containerEl:container
});
localWindow.editorRef=localEditor;
localEditor.initialize();
comfyUIWorkflowEditor=localEditor;
comfyui_monitorConnection_v2();
setTimeout(function(){
if(typeof ComfyUIGuide!=='undefined'){
comfyui_apiHeartbeat_v2().then(function(isOnline){
ComfyUIGuide.showSetupGuide(isOnline);
});
}
},300);
}

function initRunpodTab(){
runpodInitialized=true;
var container=$('msRunpodContainer');
var runpodProvider=providerRegistry.get('runpodComfyUI');
runpodWindow=new ComfyUIWorkflowWindow({provider:runpodProvider});
runpodWindow.initializeInContainer(container);
runpodEditor=new ComfyUIWorkflowEditor({
providerKey:'runpod',
workflowRepo:comfyUIWorkflowRepo_runpod,
objectInfoRepo:comfyObjectInfoRepo_runpod,
provider:runpodProvider,
containerEl:container
});
runpodWindow.editorRef=runpodEditor;
runpodEditor.initialize();
monitorRunpodConnection(runpodProvider,container,runpodEditor);
}
async function monitorRunpodConnection(provider,container,editor){
var label=container.querySelector('.comfui-connection-label');
var rpOnline=false;
while(true){
var online=false;
try{
var result=await comfyUIExecWithProvider(provider,async function(){
var resp=await comfyuiFetch(comfyUIUrls.settings,{method:"GET",headers:{"Content-Type":"application/json",accept:"application/json"}});
return resp.ok;
});
online=!!result;
}catch(e){online=false;}
if(label){
label.innerHTML=provider.name+(online?' ON':' OFF');
label.style.color=online?'green':'red';
}
if(online!==rpOnline){
rpOnline=online;
if(online){
editor.updateObjectInfoAndWorkflows();
}
}
var interval=online?15000:5000;
await new Promise(function(r){setTimeout(r,interval);});
}
}

function moveEl(id,target){
var el=$(id);
if(!el)return null;
sdwebuiOriginalParents.push({el:el,parent:el.parentNode,next:el.nextSibling});
el.style.display='';
target.appendChild(el);
return el;
}
function moveWrapped(selector,target){
var el=document.querySelector(selector);
if(!el)return;
var wrapper=el.closest('.control');
if(wrapper){
sdwebuiOriginalParents.push({el:wrapper,parent:wrapper.parentNode,next:wrapper.nextSibling});
wrapper.style.display='';
target.appendChild(wrapper);
}
}
function initSdWebuiTab(){
sdwebuiInitialized=true;
var container=$('msSDWebuiContainer');
sdwebuiOriginalParents=[];
moveEl('manualSelectModelId',container);
moveEl('manualSelectWorkflowId',container);
var grid=document.createElement('div');
grid.className='ms-grid';
container.appendChild(grid);
var modelEl=moveEl('prompt-B',grid);
if(modelEl)modelEl.style.gridColumn='1/-1';
moveEl('prompt-C',grid);
moveEl('prompt-D',grid);
moveEl('prompt-I',grid);
var upSection=document.createElement('div');
upSection.className='ms-section';
container.appendChild(upSection);
var upGrid=document.createElement('div');
upGrid.className='ms-grid';
upSection.appendChild(upGrid);
moveEl('prompt-G',upGrid);
moveEl('prompt-H',upGrid);
var adSection=document.createElement('div');
adSection.className='ms-section';
container.appendChild(adSection);
moveWrapped('#AdetailerCheck',adSection);
var adGrid=document.createElement('div');
adGrid.className='ms-grid';
adSection.appendChild(adGrid);
moveWrapped('#AdetilerModels',adGrid);
moveWrapped('#AdetilerModelsPrompt',adGrid);
moveWrapped('#AdetilerModelsNegative',adGrid);
moveEl('checSD_WebUI_Announce',container);
updateSdWebuiVisibility();
}
function updateSdWebuiVisibility(){
if(!sdwebuiInitialized)return;
var model=getSelectedValueByGroup("generateModelGroup");
var workflow=getSelectedValueByGroup("generateWorkflow");
var isFlux=model==="Flux";
var isSD=model==="SD";
var showFn=function(id){var e=$(id);if(e)e.style.display='';};
var hideFn=function(id){var e=$(id);if(e)e.style.display='none';};
if(isSD){
hideFn('manualSelectWorkflowId');
showFn('clipDropdownControl');
hideFn('vaeDropdownControl');
}else if(isFlux){
showFn('manualSelectWorkflowId');
if(workflow==='Diffution'){
showFn('clipDropdownControl');
showFn('vaeDropdownControl');
}else{
hideFn('clipDropdownControl');
hideFn('vaeDropdownControl');
}
}
}

return{
open:open,
close:close,
switchTab:switchTab,
updateSdWebuiVisibility:updateSdWebuiVisibility
};
})();
