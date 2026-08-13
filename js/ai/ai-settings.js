
document.addEventListener('DOMContentLoaded',()=>{
migrateSavedDirectorModel();
providerRegistry.register(new NovelAIProvider());
providerRegistry.mapApiMode(apis.NOVELAI,'novelai');
apiMode=apis.NOVELAI;
providerRegistry.syncFromApiMode(apiMode);

var DIRECTOR_FALLBACK_MODELS=[
'deepseek-v4-flash',
'deepseek-v4-pro',
'deepseek-v3.2',
'qwen3.5-flash',
'qwen3.5-plus',
'qwen3-max',
'glm-4.5-air',
'glm-5',
'kimi-k2.5',
'minimax-m2.7'
];

function getDirectorProxyBaseUrl(){
if(window.location&&window.location.protocol==='file:')return'http://127.0.0.1:8000';
return window.location.origin;
}

function getDirectorUpstreamUrl(){
var input=$('naiDirectorApiUrl');
var url=input&&input.value?input.value.trim():'https://tokendance.space/gateway/v1';
url=url.replace(/\/+$/,'');
if(/\/chat\/completions$/i.test(url))return url;
if(/\/v1$/i.test(url))return url+'/chat/completions';
return url+'/chat/completions';
}

function setDirectorModel(value){
var input=$('naiDirectorModel');
if(!input)return;
input.value=(value||'').toString().trim().toLowerCase();
input.dispatchEvent(new Event('input',{bubbles:true,cancelable:true}));
renderDirectorModelChips(window.naiDirectorAvailableModels||DIRECTOR_FALLBACK_MODELS);
}

function normalizeDirectorModelValue(){
var input=$('naiDirectorModel');
if(!input)return;
var value=(input.value||'').trim().toLowerCase();
if(!value||value==='qwen3.5-flash'||value.indexOf('gpt-')===0||value.indexOf('chatgpt-')===0){
value='deepseek-v4-flash';
}
input.value=value;
}

function migrateSavedDirectorModel(){
try{
var stored=localStorage.getItem('localSettingsData');
if(!stored)return;
var data=JSON.parse(stored);
if(!data)return;
var current=(data.naiDirectorModel||'').toString().trim().toLowerCase();
if(!current||current==='qwen3.5-flash'||current.indexOf('gpt-')===0||current.indexOf('chatgpt-')===0){
data.naiDirectorModel='deepseek-v4-flash';
localStorage.setItem('localSettingsData',JSON.stringify(data));
}
}catch(error){
if(typeof logger!=='undefined')logger.warn('Failed to migrate director model',error);
}
}

function renderDirectorModelChips(models){
var box=$('naiDirectorModelList');
if(!box)return;
models=(models&&models.length?models:DIRECTOR_FALLBACK_MODELS).map(function(item){
return typeof item==='string'?{id:item,name:item}:item;
}).filter(function(item){return item&&item.id;});
window.naiDirectorAvailableModels=models;
var current=(($('naiDirectorModel')&&$('naiDirectorModel').value)||'').trim().toLowerCase();
box.innerHTML=models.slice(0,32).map(function(item){
var id=(item.id||'').toString().trim().toLowerCase();
var title=(item.name||id)+'\n'+(item.description||'');
return '<button type="button" class="nai-director-model-chip '+(id===current?'active':'')+'" data-model="'+id.replace(/"/g,'&quot;')+'" title="'+title.replace(/"/g,'&quot;')+'">'+id+'</button>';
}).join('');
box.querySelectorAll('.nai-director-model-chip').forEach(function(btn){
btn.addEventListener('click',function(event){
event.stopPropagation();
setDirectorModel(this.dataset.model);
});
});
}

async function refreshDirectorModels(showNotice){
var button=$('naiDirectorRefreshModels');
if(button){
button.disabled=true;
button.textContent='刷新中';
}
try{
var headers={'Accept':'application/json','X-Director-Api-Url':getDirectorUpstreamUrl()};
var key=$('naiDirectorApiKey')&&$('naiDirectorApiKey').value?$('naiDirectorApiKey').value.trim():'';
if(key)headers.Authorization=/^Bearer\s+/i.test(key)?key:'Bearer '+key;
var response=await fetch(getDirectorProxyBaseUrl()+'/director-proxy/models',{headers:headers});
var json=await response.json();
if(!response.ok)throw new Error(json.error||('模型列表读取失败：'+response.status));
var models=(json.data||[]).map(function(item){return {
id:(item.id||'').toString().trim().toLowerCase(),
name:item.name||item.id,
description:item.description||''
};}).filter(function(item){return item.id;});
renderDirectorModelChips(models);
var current=(($('naiDirectorModel')&&$('naiDirectorModel').value)||'').trim().toLowerCase();
var hasCurrent=models.some(function(item){return item.id===current;});
if((!current||current.indexOf('gpt-')===0||current.indexOf('chatgpt-')===0||!hasCurrent)&&models[0]){
setDirectorModel((json.default||models[0].id).toString().toLowerCase());
}
if(showNotice){
createToast('AI 导演',(json.fallback?'使用内置兜底模型列表：':'已刷新模型列表：')+models.length+' 个可用模型',json.fallback?4200:2200);
}
}catch(error){
renderDirectorModelChips(DIRECTOR_FALLBACK_MODELS);
if(showNotice)createToastError('AI 导演',error.message||'模型列表刷新失败。',5000);
}finally{
if(button){
button.disabled=false;
button.textContent='刷新';
}
}
}

if($('novelaiApiKeyToggle'))$('novelaiApiKeyToggle').addEventListener('click',function(event){
event.stopPropagation();
var input=$('novelaiApiKey');
input.type=input.type==='password'?'text':'password';
this.textContent=input.type==='password'?'显示':'隐藏';
});
if($('naiDirectorApiKeyToggle'))$('naiDirectorApiKeyToggle').addEventListener('click',function(event){
event.stopPropagation();
var input=$('naiDirectorApiKey');
if(!input)return;
input.type=input.type==='password'?'text':'password';
this.textContent=input.type==='password'?'显示':'隐藏';
});
if($('naiDirectorRefreshModels'))$('naiDirectorRefreshModels').addEventListener('click',function(event){
event.stopPropagation();
refreshDirectorModels(true);
});
if($('naiDirectorModel'))$('naiDirectorModel').addEventListener('blur',function(){
this.value=(this.value||'').trim().toLowerCase();
if(!this.value||this.value==='qwen3.5-flash'||this.value.indexOf('gpt-')===0||this.value.indexOf('chatgpt-')===0)this.value='deepseek-v4-flash';
renderDirectorModelChips(window.naiDirectorAvailableModels||DIRECTOR_FALLBACK_MODELS);
});
if($('naiDirectorTestApi'))$('naiDirectorTestApi').addEventListener('click',async function(event){
event.stopPropagation();
if(!window.NovelAICompositionDirector||typeof window.NovelAICompositionDirector.testDirectorApi!=='function'){
createToastError('AI 导演','导演模块还没有加载完成。',2500);
return;
}
var oldText=this.textContent;
this.disabled=true;
this.textContent='测试中';
try{
var result=await window.NovelAICompositionDirector.testDirectorApi();
if(result&&result.prompt){
createToast('AI 导演','API 已返回提示词：'+result.prompt.slice(0,80),4000);
}else{
createToastError('AI 导演','API 有响应，但没有返回 prompt JSON。',5000);
}
}catch(error){
createToastError('AI 导演',error.message||'导演 API 测试失败。',6000);
}finally{
this.disabled=false;
this.textContent=oldText;
}
});
if($('novelaiApiUrlDefaultUrl'))$('novelaiApiUrlDefaultUrl').addEventListener('click',function(event){
event.stopPropagation();
$('novelaiApiUrl').value='https://image.novelai.net';
});
if($('novelaiDashboard'))$('novelaiDashboard').addEventListener('click',function(event){
event.stopPropagation();
window.open('https://novelai.net/account','_blank');
});
if($('novelaiApiKey'))$('novelaiApiKey').addEventListener('change',function(){
if(typeof debouncedSettingsSave==='function')debouncedSettingsSave();
else if(typeof saveSettingsLocalStrage==='function')saveSettingsLocalStrage(true);
apiHeartbeat();
});
if($('novelaiModel'))$('novelaiModel').addEventListener('change',function(){
if(typeof debouncedSettingsSave==='function')debouncedSettingsSave();
else if(typeof saveSettingsLocalStrage==='function')saveSettingsLocalStrage(true);
apiHeartbeat();
});
['novelaiApiUrl','novelaiUseLocalProxy','novelaiSampler','novelaiSteps','novelaiScale','novelaiUcPreset','novelaiCfgRescale','novelaiI2IStrength','novelaiI2INoise','novelaiQualityToggle','novelaiSM','novelaiSMDyn','novelaiConcurrency','naiCompositionAgent','naiDirectorAdjustCanvas','naiDirectorUseTagAnchors','naiDirectorHonorCharacterCards','naiDirectorMessageMode','naiBatchAcceptanceGate','naiBatchAutoGenerateAfterPrompts','naiDirectorStoreDrafts','naiDirectorUseApi','naiDirectorUseProxy','naiDirectorApiUrl','naiDirectorApiKey','naiDirectorModel','naiDirectorTimeout','naiDirectorSystemPrompt'].forEach(function(id){
var el=$(id);
if(!el)return;
var eventName=(el.type==='checkbox'||el.tagName==='SELECT')?'change':'input';
el.addEventListener(eventName,function(){
if(typeof debouncedSettingsSave==='function')debouncedSettingsSave();
else if(typeof saveSettingsLocalStrage==='function')saveSettingsLocalStrage(true);
});
});
if($('naiDirectorResetSystemPrompt'))$('naiDirectorResetSystemPrompt').addEventListener('click',function(event){
event.stopPropagation();
if(window.NovelAICompositionDirector&&typeof window.NovelAICompositionDirector.resetSystemPrompt==='function'){
window.NovelAICompositionDirector.resetSystemPrompt();
createToast('AI 导演','已恢复默认导演设定。',1800);
var el=$('naiDirectorSystemPrompt');
if(el)el.dispatchEvent(new Event('input',{bubbles:true,cancelable:true}));
}
});
if($('naiBatchAcceptanceButton'))$('naiBatchAcceptanceButton').addEventListener('click',async function(event){
event.stopPropagation();
if(typeof naiBatchRunAcceptancePanel!=='function'){
createToastError('验收格','批量导演模块未加载。',3000);
return;
}
var scenarioPromptSelecter=$('ScenarioPromptSelecter')?$('ScenarioPromptSelecter').value:'';
try{
await naiBatchRunAcceptancePanel(generatePageList(),scenarioPromptSelecter);
}catch(error){
createToastError('验收格',error.message||'验收格失败。',5000);
}
});
if($('naiBatchAcceptanceConfirmButton'))$('naiBatchAcceptanceConfirmButton').addEventListener('click',function(event){
event.stopPropagation();
if(typeof naiBatchConfirmAcceptance!=='function'){
createToastError('验收格','批量导演模块未加载。',3000);
return;
}
var scenarioPromptSelecter=$('ScenarioPromptSelecter')?$('ScenarioPromptSelecter').value:'';
naiBatchConfirmAcceptance(generatePageList(),scenarioPromptSelecter);
});
if($('naiBatchSaveTagDnaButton'))$('naiBatchSaveTagDnaButton').addEventListener('click',function(event){
event.stopPropagation();
if(typeof appendNaiTagExampleFromPanel!=='function'){
createToastError('Tag DNA','角色卡模块未加载。',3000);
return;
}
var panel=null;
if(typeof canvas!=='undefined'&&canvas&&typeof canvas.getActiveObject==='function'){
var active=canvas.getActiveObject();
if(active&&active.text2img_prompt)panel=active;
}
if(!panel&&typeof getPanelObjectList==='function'){
var list=getPanelObjectList();
panel=list.length?list[0]:null;
}
if(!panel||!panel.text2img_prompt){
createToastError('Tag DNA','请先选中带提示词的分镜，或确保当前页有分镜。',4000);
return;
}
if(appendNaiTagExampleFromPanel(panel,'当前分镜')){
createToast('Tag DNA','已写入当前角色卡的 Tag DNA 示例。',2400);
}else{
createToastError('Tag DNA','写入失败。',3000);
}
});

function getNovelAiToolToken(){
var input=$('novelaiApiKey');
return input&&input.value?input.value.trim():'';
}

function getToolBaseUrl(){
if(window.location&&window.location.protocol==='file:')return'http://127.0.0.1:8000';
return window.location.origin;
}

async function startNovelAiToolJob(path,title,body){
var token=getNovelAiToolToken();
var headers={
'Content-Type':'application/json',
'Accept':'application/json'
};
if(token){
headers.Authorization=/^Bearer\s+/i.test(token)?token:'Bearer '+token;
}
var response=await fetch(getToolBaseUrl()+path,{
method:'POST',
headers:headers,
body:JSON.stringify(body||{})
});
var json=await response.json();
if(!response.ok){
throw new Error(json.error||('任务启动失败：'+response.status));
}
if(json.status==='completed'&&!json.job_id){
if(json.preview_status){
var total=json.preview_status.total||0;
var missing=json.preview_status.missing||0;
createToast(title,[
'素材状态：'+(total-missing)+'/'+total,
'剩余缺失：'+missing,
'已补齐，无需重复启动批量任务。'
],4200);
}else{
createToast(title,json.message||'任务已完成。',3000);
}
return json;
}
localStorage.setItem('naiLastToolJobId',json.job_id);
createToast(title,['任务已启动：'+json.job_id,'点击“查看任务”可查看最近日志。'],5000);
return json;
}

async function showNovelAiToolJobStatus(){
var jobId=localStorage.getItem('naiLastToolJobId');
if(!jobId){
createToastError('本地批量任务','还没有任务记录。',3000);
return;
}
var response=await fetch(getToolBaseUrl()+'/nai-tools/job?id='+encodeURIComponent(jobId));
var json=await response.json();
if(!response.ok){
throw new Error(json.error||'任务不存在');
}
var logs=(json.logs||[]).slice(-8);
createToast('本地批量任务',[
'状态：'+json.status,
'类型：'+json.kind,
'退出码：'+(json.exit_code===null?'运行中':json.exit_code)
].concat(logs),9000);
}

async function getMaterialPreviewStatus(){
var response=await fetch(getToolBaseUrl()+'/nai-tools/missing-material-previews');
var json=await response.json();
if(!response.ok){
throw new Error(json.error||('素材状态读取失败：'+response.status));
}
return json;
}

async function showMaterialPreviewStatus(){
var json=await getMaterialPreviewStatus();
var done=Math.max(0,(json.total||0)-(json.missing||0));
createToast('素材预览状态',[
'素材条目：'+done+'/'+(json.total||0),
'剩余缺失：'+(json.missing||0),
(json.missing?'可点击“补齐素材预览图”继续生成。':'全部素材预览已补齐，不需要重复生成。')
],5200);
return json;
}

async function showNovelAiHealthStatus(){
var headers={'Accept':'application/json'};
var token=getNovelAiToolToken();
if(token)headers.Authorization=/^Bearer\s+/i.test(token)?token:'Bearer '+token;
var response=await fetch(getToolBaseUrl()+'/nai-proxy/health',{headers:headers});
var json=await response.json();
if(!response.ok||!json.ok){
throw new Error(json.error||('NAI 检查失败：'+response.status));
}
createToast('NovelAI 状态',[
'订阅：'+(json.active?'已激活':'未激活'),
'会员层级：'+(json.tier===undefined?'未知':json.tier),
'无限生图：'+(json.unlimitedImageGeneration?'是':'否'),
'代理：'+(json.proxy||'未使用'),
'安全请求：samples=1，总像素≤1024×1024，队列并发=1'
],6500);
return json;
}

if($('naiGenerateMaterialPreviews'))$('naiGenerateMaterialPreviews').addEventListener('click',async function(event){
event.stopPropagation();
try{
var status=await getMaterialPreviewStatus();
if(status&&status.missing===0){
await showMaterialPreviewStatus();
return;
}
await startNovelAiToolJob('/nai-tools/start-material-previews','素材预览图',{steps:28,scale:7});
}catch(error){
createToastError('素材预览图',error.message||'任务启动失败。',7000);
}
});

if($('naiMaterialPreviewStatus'))$('naiMaterialPreviewStatus').addEventListener('click',async function(event){
event.stopPropagation();
try{
await showMaterialPreviewStatus();
}catch(error){
createToastError('素材预览状态',error.message||'无法读取素材状态。',6000);
}
});

if($('naiHealthCheck'))$('naiHealthCheck').addEventListener('click',async function(event){
event.stopPropagation();
try{
await showNovelAiHealthStatus();
}catch(error){
createToastError('NovelAI 状态',error.message||'无法读取 NovelAI 状态。',7000);
}
});

if($('naiGenerateComicDemo'))$('naiGenerateComicDemo').addEventListener('click',async function(event){
event.stopPropagation();
try{
await startNovelAiToolJob('/nai-tools/start-comic-demo','5 页漫画样稿',{});
}catch(error){
createToastError('5 页漫画样稿',error.message||'任务启动失败。',7000);
}
});

if($('naiToolJobStatus'))$('naiToolJobStatus').addEventListener('click',async function(event){
event.stopPropagation();
try{
await showNovelAiToolJobStatus();
}catch(error){
createToastError('本地批量任务',error.message||'无法读取任务状态。',6000);
}
});

setInterval(apiHeartbeat,1000*60);
if($('apiHeartbeatCheckbox'))$('apiHeartbeatCheckbox').addEventListener('change',function () {
apiHeartbeat();
});
if(typeof enforceNovelAIOnlyMode==='function'){
enforceNovelAIOnlyMode();
}
normalizeDirectorModelValue();
renderDirectorModelChips(DIRECTOR_FALLBACK_MODELS);
refreshDirectorModels(false);
apiHeartbeat();
});
