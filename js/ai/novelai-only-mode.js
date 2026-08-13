function enforceNovelAIOnlyMode(){
apiMode=apis.NOVELAI;
providerRegistry.syncFromApiMode(apis.NOVELAI);
var assignments={};
assignments[AI_ROLES.Text2Image]='novelai';
assignments[AI_ROLES.Image2Image]='novelai';
providerRegistry.loadRoleAssignments(assignments);

try{
var stored=localStorage.getItem('localSettingsData');
if(stored){
var data=JSON.parse(stored);
if(data&&data.roleAssignments){
data.externalAI=apis.NOVELAI;
data.roleAssignments=assignments;
localStorage.setItem('localSettingsData',JSON.stringify(data));
}
}
}catch(error){
logger.warn('Failed to migrate legacy AI assignments',error);
}

var lang=(document.documentElement.lang||'en').toLowerCase();
var isZh=lang.indexOf('zh')===0;

var externalGroup=document.querySelector('[data-group="externalApiGroup"]');
if(externalGroup){
externalGroup.querySelectorAll('button').forEach(function(btn){
var opensSettings=btn.getAttribute('onclick')&&btn.getAttribute('onclick').indexOf('unifiedSettingsWindow.open')!==-1;
if(opensSettings){
btn.style.display='';
btn.classList.add('selected');
btn.dataset.value='novelaiButton';
btn.textContent=isZh?'NovelAI 设置':'NovelAI Settings';
}else{
btn.style.display='none';
btn.classList.remove('selected');
}
});
}

document.querySelectorAll('[onclick*="modelSettingsWindow.open"]').forEach(function(el){
el.style.display='none';
});

var roleHead=document.querySelector('.role-matrix thead tr');
if(roleHead){
roleHead.innerHTML='<th></th><th>NovelAI</th>';
}

var table=document.querySelector('.us-conn-table tbody');
if(table){
Array.from(table.children).forEach(function(row){
if(row.textContent.indexOf('NovelAI')===-1&&row.querySelector('[id*="sdWebUI"],[id*="comfyUI"],[id*="falai"],[id*="runpodComfyUI"]')){
row.classList.add('legacy-ai-setting-row');
row.style.display='none';
}
});
}

var title=document.querySelector('#unifiedSettingsOverlay .us-header h2');
if(title)title.textContent=isZh?'NovelAI 生图设置':'NovelAI Image Settings';
var serviceTitle=document.querySelector('#unifiedSettingsOverlay .us-left .us-panel-title');
if(serviceTitle)serviceTitle.textContent=isZh?'NovelAI 生成能力':'NovelAI';
var connService=document.querySelector('[data-i18n="usConnService"]');
if(connService)connService.textContent=isZh?'服务':'Service';
var connSettings=document.querySelector('[data-i18n="usConnSettings"]');
if(connSettings)connSettings.textContent=isZh?'地址 / 令牌':'URL / API Key';
var note=document.querySelector('.role-assign-note');
if(note){
note.className='nai-only-note';
note.innerHTML=isZh
?'<strong>NovelAI 专用</strong>文本生图和图生图都会统一使用 NovelAI API；构图代理会按画布比例自动补充镜头、构图和质量标签。'
:'<strong>NovelAI Only</strong>Text2Image and Image2Image use the NovelAI API; the composition director adds camera, framing, and quality tags for the canvas.';
}

var statusLabel=document.querySelector('.provider-status-label');
if(statusLabel)statusLabel.textContent=isZh?'NovelAI 连接状态':'NovelAI Status';
var otherHeader=document.querySelector('#otherControlsPanel .area-header');
if(otherHeader)otherHeader.textContent=isZh?'▼ 当前分镜提示词':'▼ Current Panel Prompt';

hideById('manualSelectModelId');
hideById('manualSelectWorkflowId');
hideById('comfyUIWorkflowId');
showById('negativeAreaId');
hideLegacyAiControls();
setTimeout(hideLegacyAiControls,200);
setTimeout(hideLegacyAiControls,900);
}

function hideLegacyAiControls(){
var legacyNeedles=[
'ComfyUI',
'SD WebUI',
'Stable Diffusion',
'Forge',
'RunPod',
'Fal',
'Workflow',
'工作流'
];
document.querySelectorAll('button,label,option,li,tr,.param-group,.input-group,.us-row,.us-field-label').forEach(function(node){
var text=(node.textContent||'').trim();
var id=node.id||'';
var legacyId=/sdwebui|sdWebUI|comfy|falai|runpod|workflow/i.test(id);
var legacyText=legacyNeedles.some(function(needle){return text.indexOf(needle)!==-1;});
var keepNovelAI=text.indexOf('NovelAI')!==-1||text.indexOf('NAI')!==-1;
if((legacyId||legacyText)&&!keepNovelAI){
node.classList.add('legacy-ai-setting-row');
node.style.display='none';
}
});
hideById('manualSelectModelId');
hideById('manualSelectWorkflowId');
hideById('comfyUIWorkflowId');
hideById('sdWebUISettings');
hideById('comfyUISettings');
hideById('runpodComfyUISettings');
hideById('falaiSettings');
if(typeof window!=='undefined'){
window.ComfyUIGuide={
init:function(){},
showSetupGuide:function(){},
showGenerationErrorGuide:function(){},
showWorkflowGuide:function(){}
};
}
}

document.addEventListener('DOMContentLoaded',function(){
enforceNovelAIOnlyMode();
});
