function changeExternalAPI(button,showToast) {
if(button)changeSelected(button);

apiMode=apis.NOVELAI;
providerRegistry.syncFromApiMode(apiMode);

var helpTitle=getText("help_api_connect_settings");
if(showToast)createToast("已切换到 NovelAI","出图将使用 NovelAI。",2000);
if($('apiSettingsUrlHelpe'))$('apiSettingsUrlHelpe').innerHTML='';

updateWorkflowType();
updateLayerPanel();
apiHeartbeat();
}

function changeAiModelType(button) {
changeSelected(button);
updateWorkflowType()

const generateModelGroup=getSelectedValueByGroup("generateModelGroup");
if (generateModelGroup==="Flux") {
if($("basePrompt_cfg_scale").value>3){
$("basePrompt_cfg_scale").value=1.5;
}
}
if(typeof modelSettingsWindow!=='undefined')modelSettingsWindow.updateSdWebuiVisibility();
}


function changeWorkflowType(button) {
changeSelected(button);
updateWorkflowType();
if(typeof modelSettingsWindow!=='undefined')modelSettingsWindow.updateSdWebuiVisibility();
}
function isComfyUIMode(groupValue){
return groupValue==="comfyUIButton"||groupValue==="runpodComfyUIButton";
}
function getExternalApiGroupFromRoles(){
return 'novelaiButton';
}
function updateWorkflowType() {
showById("prompt-A");
showById("prompt-E");
showById("prompt-F");

hideById("comfyUIWorkflowId");
showById("negativeAreaId");
}
