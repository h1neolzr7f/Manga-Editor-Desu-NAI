// NovelAI provider: direct browser call to the official image API.
class NovelAIProvider extends AIProvider{
constructor(){
super('novelai','NovelAI');
}
getSupportedRoles(){
return[
AI_ROLES.Text2Image,
AI_ROLES.Image2Image
];
}
needsApiKey(){
return true;
}
getApiKey(){
var el=$('novelaiApiKey');
return el?el.value.trim():'';
}
_proxyBaseUrl(){
if(window.location&&window.location.protocol==='file:')return'http://127.0.0.1:8000';
return window.location.origin;
}
getEndpointUrl(){
var el=$('novelaiApiUrl');
var url=el&&el.value?el.value.trim():'https://image.novelai.net';
return url.replace(/\/+$/,'');
}
_useLocalProxy(){
if(window.location&&window.location.protocol==='file:')return true;
var el=$('novelaiUseLocalProxy');
return el?el.checked:false;
}
_generateUrl(){
if(this._useLocalProxy())return this._proxyBaseUrl()+'/nai-proxy/generate-image';
return this.getEndpointUrl()+'/ai/generate-image';
}
_suggestTagsUrl(){
var query='model='+encodeURIComponent(this.getModel())+'&prompt=face';
if(this._useLocalProxy())return this._proxyBaseUrl()+'/nai-proxy/suggest-tags?'+query;
return this.getEndpointUrl()+'/ai/generate-image/suggest-tags?'+query;
}
_safeStatusUrl(){
return this._proxyBaseUrl()+'/nai-proxy/safe-status';
}
getModel(){
var el=$('novelaiModel');
return el&&el.value?el.value:'nai-diffusion-4-5-full';
}
_getAction(type){
if(type==='I2I')return'img2img';
return'generate';
}
_getParamNumber(id,defaultValue,min,max){
var el=$(id);
var value=el?parseFloat(el.value):defaultValue;
if(!isFinite(value))value=defaultValue;
if(min!==undefined)value=Math.max(min,value);
if(max!==undefined)value=Math.min(max,value);
return value;
}
_getParamInt(id,defaultValue,min,max){
return Math.round(this._getParamNumber(id,defaultValue,min,max));
}
_authHeaders(json){
var token=this.getApiKey();
var headers={
'Accept':'application/zip, application/json'
};
if(token)headers.Authorization=/^Bearer\s+/i.test(token)?token:'Bearer '+token;
if(json)headers['Content-Type']='application/json';
return headers;
}
_proxyOfflineMessage(){
return '无法连接本机代理 http://127.0.0.1:8000。请先运行「一键启动.bat」，再用 http://127.0.0.1:8000 打开编辑器。';
}
_wrapProxyError(error){
if(!this._useLocalProxy())return error;
var message=(error&&error.message)||String(error||'');
if(/Failed to fetch|NetworkError|ECONNREFUSED|Load failed/i.test(message)){
return new Error(this._proxyOfflineMessage());
}
return error instanceof Error?error:new Error(message);
}
_request(url,options){
var self=this;
options=options||{};
var request;
if(typeof fetch==='function'){
request=fetch(url,options);
}else{
request=new Promise((resolve,reject)=>{
var xhr=new XMLHttpRequest();
xhr.open(options.method||'GET',url,true);
xhr.responseType='blob';
var headers=options.headers||{};
Object.keys(headers).forEach(function(key){
xhr.setRequestHeader(key,headers[key]);
});
xhr.onload=()=>{
var blob=xhr.response||new Blob([]);
resolve({
ok:xhr.status>=200&&xhr.status<300,
status:xhr.status,
headers:{get:function(name){return xhr.getResponseHeader(name);}},
blob:function(){return Promise.resolve(blob);},
text:function(){return blob.text?blob.text():Promise.resolve('');},
json:function(){return blob.text().then(function(text){return JSON.parse(text||'{}');});}
});
};
xhr.onerror=()=>reject(new Error(self._proxyOfflineMessage()));
xhr.send(options.body||null);
});
}
return Promise.resolve(request).catch(function(error){throw self._wrapProxyError(error);});
}
_blobToText(blob){
if(blob&&typeof blob.text==='function'){
return blob.text();
}
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(){resolve(reader.result||'');};
reader.onerror=function(){reject(new Error('Failed to read response text'));};
reader.readAsText(blob);
});
}
async heartbeat(){
var apiKey=this.getApiKey();
if(!apiKey){
this._updateLabel(false);
return false;
}
try{
var headers={'Accept':'application/json'};
if(apiKey)headers.Authorization=/^Bearer\s+/i.test(apiKey)?apiKey:'Bearer '+apiKey;
var response=await this._request(this._safeStatusUrl(),{
headers:headers
});
var ok=response.ok;
this._updateLabel(ok);
return ok;
}catch(e){
this._updateLabel(false);
return false;
}
}
_updateLabel(isOn){
var labelfw=$('ExternalService_Heartbeat_Label_fw');
if(labelfw){
labelfw.innerHTML=this.name+(isOn?' ON':' OFF');
labelfw.style.color=isOn?'green':'red';
}
}
_normalizePrompt(prompt){
return (prompt||'').toString().replace(/\s+/g,' ').replace(/^,\s*/,'').trim();
}
_round64(value){
return Math.max(64,Math.round(value/64)*64);
}
_aspectSafeSize(width,height){
var maxPixels=1024*1024;
var maxEdge=1536;
var minEdge=512;
width=parseFloat(width)||1024;
height=parseFloat(height)||1024;
if(!isFinite(width)||!isFinite(height)||width<=0||height<=0){
width=1024;
height=1024;
}
var aspect=width/height;
if(!isFinite(aspect)||aspect<=0)aspect=1;
var targetHeight=Math.sqrt(maxPixels/aspect);
var targetWidth=targetHeight*aspect;
if(targetWidth>maxEdge){
targetWidth=maxEdge;
targetHeight=targetWidth/aspect;
}
if(targetHeight>maxEdge){
targetHeight=maxEdge;
targetWidth=targetHeight*aspect;
}
targetWidth=this._round64(targetWidth);
targetHeight=this._round64(targetHeight);
targetWidth=Math.max(64,Math.min(maxEdge,targetWidth));
targetHeight=Math.max(64,Math.min(maxEdge,targetHeight));
while(targetWidth*targetHeight>maxPixels){
if((targetWidth/targetHeight)>aspect&&targetWidth>64){
targetWidth-=64;
}else if(targetHeight>64){
targetHeight-=64;
}else{
break;
}
}
if(targetWidth<minEdge&&targetHeight<maxEdge){
var raisedWidth=minEdge;
var raisedHeight=this._round64(raisedWidth/aspect);
if(raisedWidth*raisedHeight<=maxPixels&&raisedHeight<=maxEdge){
targetWidth=raisedWidth;
targetHeight=Math.max(64,raisedHeight);
}
}
if(targetHeight<minEdge&&targetWidth<maxEdge){
var raisedHeight=minEdge;
var raisedWidth=this._round64(raisedHeight*aspect);
if(raisedWidth*raisedHeight<=maxPixels&&raisedWidth<=maxEdge){
targetHeight=raisedHeight;
targetWidth=Math.max(64,raisedWidth);
}
}
return {width:targetWidth,height:targetHeight};
}
_clampSize(width,height){
return this._aspectSafeSize(width,height);
}
_applySafeParameters(params){
var safeSize=this._aspectSafeSize(params.width,params.height);
params.width=safeSize.width;
params.height=safeSize.height;
params.n_samples=1;
return params;
}
_layerTargetSize(layer){
if(!layer)return {width:1024,height:1024};
var width=0;
var height=0;
if(layer.clipPath){
var cpBounds=layer.clipPath.getBoundingRect?layer.clipPath.getBoundingRect(true):null;
width=cpBounds?cpBounds.width:(layer.clipPath.width||layer.width||0)*(layer.clipPath.scaleX||1);
height=cpBounds?cpBounds.height:(layer.clipPath.height||layer.height||0)*(layer.clipPath.scaleY||1);
}
if(!width||!height){
var bounds=layer.getBoundingRect?layer.getBoundingRect(true):null;
width=bounds?bounds.width:(layer.width||0)*(layer.scaleX||1);
height=bounds?bounds.height:(layer.height||0)*(layer.scaleY||1);
}
return this._aspectSafeSize(width||1024,height||1024);
}
_baseRequestData(layer){
var seed=-1;
var width=-1;
var height=-1;

if(parseInt(layer.text2img_seed,10)===-2){
seed=parseInt(basePrompt.text2img_seed,10);
}else if(parseInt(layer.text2img_seed,10)>-1){
seed=parseInt(layer.text2img_seed,10);
}

if(isImage(layer)){
var scale=parseFloat(layer.img2imgScale)||1;
width=layer.width*layer.scaleX*scale;
height=layer.height*layer.scaleY*scale;
}else{
var layerSize=this._layerTargetSize(layer);
width=parseInt(layer.text2img_width,10)>0?parseInt(layer.text2img_width,10):layerSize.width;
height=parseInt(layer.text2img_height,10)>0?parseInt(layer.text2img_height,10):layerSize.height;
}
var safeSize=this._aspectSafeSize(width,height);

return {
prompt:basePrompt.text2img_prompt+', '+(layer.text2img_prompt||''),
negative_prompt:basePrompt.text2img_negative+', '+(layer.text2img_negative||''),
seed:seed,
width:safeSize.width,
height:safeSize.height,
steps:parseInt(basePrompt.text2img_samplingSteps,10)||28,
cfg_scale:parseFloat(basePrompt.text2img_cfg_scale)||5
};
}
async _cleanBaseRequest(layer,type){
var rd=this._baseRequestData(layer);
var promptDirector=(typeof window!=='undefined'&&window.NovelAICompositionDirector)
?window.NovelAICompositionDirector
:(typeof NovelAICompositionDirector!=='undefined'?NovelAICompositionDirector:null);
var director={requestData:rd,plan:null};
if(promptDirector){
if(typeof promptDirector.applyToRequestAsync==='function'){
director=await promptDirector.applyToRequestAsync(layer,rd,type);
}else{
director=promptDirector.applyToRequest(layer,rd,type);
}
}
rd=director.requestData;
var seed=parseInt(rd.seed,10);
var safeSize=this._aspectSafeSize(parseInt(rd.width,10)||1024,parseInt(rd.height,10)||1024);
return {
prompt:this._normalizePrompt(rd.prompt),
negative_prompt:this._normalizePrompt(rd.negative_prompt),
seed:seed>0?seed:Math.floor(Math.random()*4294967295),
width:safeSize.width,
height:safeSize.height,
steps:parseInt(rd.steps,10)||28,
cfg_scale:parseFloat(rd.cfg_scale)||5,
directorPlan:director.plan
};
}
_buildParameters(base,type,extra){
var qualityToggle=$('novelaiQualityToggle');
var params={
params_version:3,
width:base.width,
height:base.height,
scale:this._getParamNumber('novelaiScale',base.cfg_scale,1,30),
sampler:$('novelaiSampler')&&$('novelaiSampler').value?$('novelaiSampler').value:'k_euler_ancestral',
steps:this._getParamInt('novelaiSteps',base.steps,1,50),
n_samples:1,
ucPreset:this._getParamInt('novelaiUcPreset',2,0,4),
qualityToggle:qualityToggle?qualityToggle.checked:true,
sm:$('novelaiSM')&&$('novelaiSM').checked,
sm_dyn:$('novelaiSMDyn')&&$('novelaiSMDyn').checked,
autoSmea:false,
dynamic_thresholding:false,
controlnet_strength:1,
legacy:false,
add_original_image:false,
cfg_rescale:this._getParamNumber('novelaiCfgRescale',0,0,1),
uncond_scale:1,
noise_schedule:this.getModel().indexOf('nai-diffusion-4')===0?'karras':'native',
seed:base.seed,
negative_prompt:base.negative_prompt,
legacy_uc:false,
legacy_v3_extend:false,
skip_cfg_above_sigma:null,
use_coords:false,
normalize_reference_strength_multiple:true,
characterPrompts:[],
reference_image_multiple:[],
reference_information_extracted_multiple:[],
reference_strength_multiple:[],
deliberate_euler_ancestral_bug:false,
prefer_brownian:true
};
if(this.getModel().indexOf('nai-diffusion-4')===0){
params.v4_prompt={
caption:{
base_caption:base.prompt,
char_captions:[]
},
use_coords:false,
use_order:true
};
params.v4_negative_prompt={
caption:{
base_caption:base.negative_prompt,
char_captions:[]
},
legacy_uc:false
};
}
if(type==='I2I'&&extra){
params.image=extra.image;
params.strength=this._getParamNumber('novelaiI2IStrength',extra.strength||0.65,0,1);
params.noise=this._getParamNumber('novelaiI2INoise',0,0,1);
}
return this._applySafeParameters(params);
}
async _buildPayload(layer,type){
var base=await this._cleanBaseRequest(layer,type);
var extra=null;
if(type==='I2I'){
var base64Image=imageObject2Base64ImageEffectKeep(layer);
extra={
image:base64Image?base64Image.split(',')[1]:'',
strength:layer.img2img_denoise||0.65
};
}
return {
input:base.prompt,
model:this.getModel(),
action:this._getAction(type),
parameters:this._buildParameters(base,type,extra),
_directorPlan:base.directorPlan
};
}
_isRetryableNovelAiError(status,errorText){
errorText=(errorText===undefined||errorText===null)?'':String(errorText);
if(status===429)return true;
if(status>=500&&status<600)return true;
return/concurrent generation is locked|rate limit|too many requests/i.test(errorText);
}
_delay(ms){
return new Promise(function(resolve){setTimeout(resolve,ms);});
}
async _runGenerate(payload){
var apiKey=this.getApiKey();
if(!apiKey)throw new Error('请先填写 NovelAI API Token。本地代理不会再用环境变量代替浏览器里的 Token。');
var maxAttempts=8;
var lastError=null;
for(var attempt=1;attempt<=maxAttempts;attempt++){
var response=await this._request(this._generateUrl(),{
method:'POST',
headers:this._authHeaders(true),
body:JSON.stringify({
input:payload.input,
model:payload.model,
action:payload.action,
parameters:payload.parameters
})
});
if(response.ok){
return this._parseGenerateResponse(response);
}
var errorText=await response.text();
lastError=new Error('NovelAI failed: '+response.status+' '+errorText);
if(attempt>=maxAttempts||!this._isRetryableNovelAiError(response.status,errorText)){
throw lastError;
}
await this._delay(Math.min(60000,3500*attempt));
}
throw lastError||new Error('NovelAI generation failed');
}
async _parseGenerateResponse(response){
var contentType=response.headers.get('content-type')||'';
if(contentType.indexOf('application/json')!==-1){
var json=await response.json();
if(json&&json.image)return 'data:image/png;base64,'+json.image;
if(json&&json.images&&json.images[0])return 'data:image/png;base64,'+json.images[0];
throw new Error('NovelAI returned JSON without an image');
}
var blob=await response.blob();
return this._extractImageFromBlob(blob);
}
async _extractImageFromBlob(blob){
if(blob.type&&blob.type.indexOf('image/')===0){
return this._blobToDataUrl(blob);
}
if(typeof JSZip==='undefined'){
throw new Error('NovelAI returned a zip but JSZip is not loaded');
}
var zip=await JSZip.loadAsync(blob);
var imageFile=null;
zip.forEach(function(path,file){
if(!imageFile&&/\.(png|jpe?g|webp)$/i.test(path)){
imageFile=file;
}
});
if(!imageFile)throw new Error('NovelAI zip did not contain an image');
var imageBlob=await imageFile.async('blob');
return this._blobToDataUrl(imageBlob);
}
_blobToDataUrl(blob){
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(){resolve(reader.result);};
reader.onerror=function(){reject(new Error('Failed to read NovelAI image blob'));};
reader.readAsDataURL(blob);
});
}
_dataUrlToFabricImage(dataUrl){
return new Promise(function(resolve,reject){
fabric.Image.fromURL(dataUrl,function(img){
if(img)resolve(img);
else reject(new Error('Failed to create fabric.Image from NovelAI result'));
},{crossOrigin:'anonymous'});
});
}
_registerTask(layer){
var canvasGuid=getCanvasGUID();
var layerType='unknown';
var targetLayerGuid=null;
if(isPanel(layer)){
layerType='panel';
targetLayerGuid=getGUID(layer);
}else if(layer.clipPath){
layerType='clipPath';
targetLayerGuid=layer.relatedPoly?getGUID(layer.relatedPoly):getGUID(layer);
}else{
layerType='standalone';
}
var center=calculateCenter(layer);
registerGenerationTask(canvasGuid,{
layerGuid:getGUID(layer),
layerType:layerType,
centerX:center.centerX,
centerY:center.centerY,
targetLayerGuid:targetLayerGuid
});
return canvasGuid;
}
_placeResult(result,layer,canvasGuid,type){
if(isPageChanged(canvasGuid)){
return applyGeneratedImageToOriginalPage(canvasGuid,result).then(applied=>{
if(!applied){
removeGenerationTask(canvasGuid);
this._placeOnCanvas(result,layer,type);
}
});
}
removeGenerationTask(canvasGuid);
this._placeOnCanvas(result,layer,type);
}
_placeOnCanvas(result,layer,type){
result.name=type==='I2I'?'novelai-i2i':'novelai-t2i';
if(isPanel(layer)){
var c=calculateCenter(layer);
putImageInFrame(result,c.centerX,c.centerY,false,false,true,layer);
}else if(layer.clipPath){
var cc=calculateCenter(layer);
var targetParent=layer.relatedPoly||layer;
layer.saveHistory=false;
canvas.remove(layer);
putImageInFrame(result,cc.centerX,cc.centerY,false,false,true,targetParent);
}else{
layer.saveHistory=false;
canvas.remove(layer);
replaceImageObject(layer,result,type);
}
}
_handleError(error,type,canvasGuid){
removeGenerationTask(canvasGuid);
if(error.message==='Queue cancelled'||error.message==='Task cancelled'){
this._logger.debug('Generation cancelled by user');
return;
}
DashboardUI.recordFailure(type);
var message=error.message||'NovelAI generation failed';
if(message.indexOf('Failed to fetch')!==-1||message.indexOf('CORS')!==-1){
message='NovelAI request failed. If the browser blocks direct calls, run through a local proxy server.';
}
createToastError('NovelAI',message,8000);
this._logger.error(type+' error:',message);
}
async _execute(layer,spinnerId,type){
var startTime=Date.now();
var canvasGuid=this._registerTask(layer);
var p=novelaiQueue.add(async()=>{
setCurrentAiTask(spinnerId);
var payload=await this._buildPayload(layer,type);
var dataUrl=await this._runGenerate(payload);
var img=await this._dataUrlToFabricImage(dataUrl);
img.tempPrompt=payload.input;
img.tempNegative=payload.parameters.negative_prompt;
img.tempSeed=payload.parameters.seed;
if(payload._directorPlan){
img.naiDirectorPlan=payload._directorPlan;
}
return {img:img,payload:payload};
});
updateAiTaskCancelInfo(spinnerId,{queueName:'novelai',queueItemId:p._queueItemId});
return p.then(result=>{
if(result&&result.img){
DashboardUI.recordGeneration(type,Date.now()-startTime,result.payload.input,result.payload.model);
this._placeResult(result.img,layer,canvasGuid,type);
if(isPanel(layer)&&window.NaiPanelPipelineReview&&typeof window.NaiPanelPipelineReview.onPanelGenerationSuccess==='function'){
window.NaiPanelPipelineReview.onPanelGenerationSuccess(layer,type);
}
}
}).catch(error=>{
if(isPanel(layer)&&window.NaiPanelPipelineReview&&typeof window.NaiPanelPipelineReview.onPanelGenerationFailure==='function'){
window.NaiPanelPipelineReview.onPanelGenerationFailure(layer,error&&error.message);
}
this._handleError(error,type,canvasGuid);
}).finally(()=>{
removeSpinner(spinnerId);
});
}
async executeT2I(layer,spinnerId){
return this._execute(layer,spinnerId,'T2I');
}
async executeI2I(layer,spinnerId){
return this._execute(layer,spinnerId,'I2I');
}
}
