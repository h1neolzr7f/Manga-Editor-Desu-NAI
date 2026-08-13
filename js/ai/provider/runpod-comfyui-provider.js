// RunPod ComfyUIプロバイダー: クラウド上のComfyUIに認証付きHTTPS接続
class RunPodComfyUIProvider extends AIProvider{
constructor(){
super('runpodComfyUI','ComfyUI (RunPod)');
}
getSupportedRoles(){
return[
AI_ROLES.Text2Image,
AI_ROLES.RemoveBG,
AI_ROLES.Upscaler,
AI_ROLES.Image2Image,
AI_ROLES.Inpaint,
AI_ROLES.I2I_Angle
];
}
needsApiKey(){
return false;
}
getApiKey(){
return '';
}
getEndpointUrl(){
return $('runpodComfyUIUrl').value;
}
async heartbeat(){
return comfyUIExecWithProvider(this,()=>comfyuiApiHeartbeat());
}
async executeT2I(layer,spinnerId){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'T2I'));
}
async executeI2I(layer,spinnerId){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'I2I'));
}
async executeRembg(layer,spinnerId){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'Rembg'));
}
async executeUpscale(layer,spinnerId){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'Upscaler'));
}
async executeInpaint(layer,spinnerId){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'Inpaint'));
}
async executeAngle(layer,spinnerId,anglePrompt){
return comfyUIExecWithProvider(this,()=>comfyuiHandleProcessQueue(layer,spinnerId,'I2I_Angle',{anglePrompt:anglePrompt}));
}
async fetchDiffusionInformation(){
return comfyUIExecWithProvider(this,()=>{
comfyuiFetchModels();
comfyuiFetchSampler();
comfyuiFetchUpscaler();
comfyuiVaeLoader();
comfyuiClipModels();
});
}
}
