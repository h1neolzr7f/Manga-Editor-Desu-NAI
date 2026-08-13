// ローカルSDWebUIプロバイダー: 既存のSDWebUI/Forge関数をAIProviderインターフェースでラップ
class LocalSDWebUIProvider extends AIProvider{
constructor(){
super('localSDWebUI','WebUI/Forge');
}
getSupportedRoles(){
return[
AI_ROLES.Text2Image,
AI_ROLES.Image2Image,
AI_ROLES.Image2Prompt_DEEPDOORU,
AI_ROLES.Image2Prompt_CLIP,
AI_ROLES.RemoveBG,
AI_ROLES.ADetailer,
AI_ROLES.PutPrompt,
AI_ROLES.PutSeed
];
}
getEndpointUrl(){
return $('sdWebUIPageUrl').value;
}
async heartbeat(){
return sdwebuiApiHeartbeat();
}
async executeT2I(layer,spinnerId){
return sdwebuiT2IProcessQueue(layer,spinnerId);
}
async executeI2I(layer,spinnerId){
return sdwebuiI2IProcessQueue(layer,spinnerId);
}
async executeRembg(layer,spinnerId){
return sdwebuiRembgProcessQueue(layer,spinnerId);
}
async fetchDiffusionInformation(){
try{
await fetchSDOptions();
fetchSdModels();
fetchSdSampler();
fetchSdUpscaler();
fetchSdAdModels();
fetchSdModules();
}catch(error){
this._logger.error('fetchDiffusionInformation:',error.message||error);
}
}
}
