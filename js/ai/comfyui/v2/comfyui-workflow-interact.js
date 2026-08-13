class ComfyUIWorkflowWindow {
constructor(options) {
options=options||{};
this.element=null;
this.x=0;
this.y=0;
this.editorRef=options.editorRef||null;
this.provider=options.provider||null;
}

buildContentHTML(){
var addWorkflowLabel=getText("comfyUI_addWorkflow");
var testGenerate=getText("comfyUI_testGenerate");
var workflowHelp=getText("comfyUI_workflowHelp");
return `
<div class="comfui-container" style="width: 100%; height: 100%; background-color: var(--background-color-A); margin: 0; padding: 8px; border-radius: 0;">
 <div class="comfui-sidebar">
<div class="comfui-sidebar-header" style="cursor: default;">
 <label class="comfui-file-input-button">
+ ${addWorkflowLabel}
<input type="file" id="workflowFile" accept=".json,.txt" multiple>
 </label>
</div>
<div class="comfui-tab-list" id="tabList"></div>
 </div>

 <div class="comfui-main-content">
<div class="comfui-tab-content-container" id="tabContentContainer"></div>
 </div>

 <div class="comfui-right-sidebar">
<div id="apiSettingsUrlHelpe">
 <label class="comfui-connection-label">Connection:</label>
</div>
<button id="comfyUIFwGenerateButton" class="comfui-sidebar-button">${testGenerate}</button>
<div id="generatedImageContainer" class="comfui-generated-image-container">
 <div id="generatedImagePlaceholder" class="comfui-image-placeholder" style="display:flex;align-items:center;justify-content:center;height:150px;border:2px dashed rgba(255,215,0,0.3);border-radius:8px;color:#888;font-size:12px;text-align:center;padding:10px;">Test Generate to preview</div>
 <img id="generatedImage" style="display:none;cursor:pointer;max-width:100%;border-radius:8px;" title="Click to enlarge">
</div>

<div>
<label>
${workflowHelp}
</label>
</div>
 </div>
</div>`;
}

setupImageEnlarge(){
var generatedImage=this.element.querySelector("#generatedImage");
generatedImage.addEventListener("click",function(){
if(!generatedImage.src)return;
var overlay=document.createElement("div");
overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;";
var img=document.createElement("img");
img.src=generatedImage.src;
img.style.cssText="max-width:95%;max-height:95%;object-fit:contain;";
overlay.appendChild(img);
overlay.addEventListener("click",function(){overlay.remove();});
document.body.appendChild(overlay);
});
}

setupTestGenerateListener(){
var self=this;
var comfyUIFwGenerateButton=this.element.querySelector("#comfyUIFwGenerateButton");
var testGenerateText=getText("comfyUI_testGenerate");
comfyUIFwGenerateButton.addEventListener("click",async function(){
var editor=self.editorRef||comfyUIWorkflowEditor;
if(!editor)return;
var tabId=editor.activeTabId;
if(!tabId)return;
var tab=editor.tabs.get(tabId);
if(!tab)return;
comfyUIFwGenerateButton.disabled=true;
comfyUIFwGenerateButton.innerHTML='<span class="spinner-border spinner-border-sm text-light"></span> <span class="comfyui-test-progress"></span>';
var progressSpan=comfyUIFwGenerateButton.querySelector('.comfyui-test-progress');
aiProgressState.onStepProgress=function(value,max){
if(progressSpan&&max>0){
progressSpan.textContent=value+'/'+max;
}
};
try{
async function doGenerate(){return await comfyui_put_queue_v2(tab.workflow);}
var result;
if(self.provider){
result=await comfyUIExecWithProvider(self.provider,doGenerate);
}else{
result=await doGenerate();
}
if(result&&result.error){
if(typeof ComfyUIGuide!=='undefined'){
ComfyUIGuide.showGenerationErrorGuide(result.message);
}
}else if(result){
var generatedImage=self.element.querySelector("#generatedImage");
var placeholder=self.element.querySelector("#generatedImagePlaceholder");
if(generatedImage){
generatedImage.src=result;
generatedImage.style.display="block";
}
if(placeholder){
placeholder.style.display="none";
}
}
}finally{
aiProgressState.onStepProgress=null;
comfyUIFwGenerateButton.disabled=false;
comfyUIFwGenerateButton.textContent=testGenerateText;
}
});
}

initializeInContainer(container){
if(this.element)return;
this.element=container;
container.innerHTML=this.buildContentHTML();
this.setupImageEnlarge();
this.setupTestGenerateListener();
}

initializeWindow() {
if (this.element) return;

this.element=document.createElement("div");
this.element.style.position="fixed";
this.element.style.top="50%";
this.element.style.left="50%";
this.element.style.transform="translate(-50%, -50%)";
this.element.style.backgroundColor="var(--background-color-A)";
this.element.style.boxShadow="0 0 0 1px var(--color-border), 0 4px 30px rgba(0, 0, 0, 0.7)";
this.element.style.border="2px solid var(--color-accent)";
this.element.style.borderRadius="8px";
this.element.style.display="none";
this.element.style.width="97vw";
this.element.style.height="97vh";
this.element.style.zIndex="1000";

this.element.innerHTML=`
<button id="closeButton" style="position: absolute; right: -30px; top: 0; padding: 5px 10px; background: var(--background-color-B); border: 1px solid var(--color-border); color: var(--component-text-color); cursor: pointer; z-index: 1001; font-size: 16px; border-radius: 4px;">✕</button>`+this.buildContentHTML();

document.body.appendChild(this.element);

var self=this;
var closeButton=this.element.querySelector("#closeButton");
closeButton.addEventListener("click",function(){self.hide();});

this.setupImageEnlarge();
this.setupEventListeners();
}

setupEventListeners() {
interact(this.element)
.draggable({
enabled: false,
ignoreFrom: 'textarea, input[type="text"]',
inertia: true,
modifiers: [
interact.modifiers.restrictRect({
restriction: "parent",
endOnly: true,
}),
],
listeners: {
start: ()=>{
const rect=this.element.getBoundingClientRect();
this.x=rect.left;
this.y=rect.top;
},
move: (event)=>{
this.x+=event.dx;
this.y+=event.dy;

this.element.style.transform=`translate(0, 0)`;
this.element.style.top=`${this.y}px`;
this.element.style.left=`${this.x}px`;
},
},
})
.resizable({
edges: {left: true,right: true,bottom: true,top: true},
restrictEdges: {
outer: "parent",
endOnly: true,
},
restrictSize: {
min: {width: 400,height: 300},
},
inertia: true,
})
.on("resizemove",(event)=>{
Object.assign(event.target.style,{
width: `${event.rect.width}px`,
height: `${event.rect.height}px`,
});
});

this.setupTestGenerateListener();
}

show() {
if (!this.element) {
this.initializeWindow();
}
this.element.style.display="block";
setTimeout(function(){
if(typeof ComfyUIGuide!=='undefined'){
comfyui_apiHeartbeat_v2().then(function(isOnline){
ComfyUIGuide.showSetupGuide(isOnline);
});
}
},300);
}

hide() {
if (this.element) {
this.element.style.display="none";
}
}
}
let comfyUIWorkflowWindow=null;

document.addEventListener("DOMContentLoaded",function(){
var openButton=document.getElementById("openWorkflowButton");
if(openButton){
openButton.addEventListener("click",function(){
if(!comfyUIWorkflowWindow){
comfyUIWorkflowWindow=new ComfyUIWorkflowWindow();
}
comfyUIWorkflowWindow.show();
if(!comfyUIWorkflowEditor){
comfyUIWorkflowEditor=new ComfyUIWorkflowEditor();
comfyUIWorkflowEditor.initialize();
comfyui_monitorConnection_v2();
}
});
}
});
