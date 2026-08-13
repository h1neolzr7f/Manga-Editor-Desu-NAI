function escapePromptHtml(value){
return (value||'').toString()
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;')
.replace(/"/g,'&quot;');
}

function renderDirectorPlan(plan){
var box=$("naiDirectorPlanPreview");
if(!box)return;
if(!plan){
box.innerHTML='';
box.classList.remove('active');
return;
}
var rows=[
['模式',plan.mode],
['画幅',plan.canvas_fit],
['来源',plan.api_director?'导演 API':'本地导演'],
['镜头',plan.camera],
['构图',plan.composition],
['光影',plan.lighting],
['氛围',plan.atmosphere],
['边框',plan.border],
['备注',plan.api_notes||plan.notes||plan.final_composition]
].filter(function(row){return row[1];});
box.innerHTML='<div class="nai-director-plan-title">导演方案</div>'+
rows.map(function(row){
return '<div class="nai-director-plan-row"><span>'+escapePromptHtml(row[0])+'</span><b>'+escapePromptHtml(row[1])+'</b></div>';
}).join('');
box.classList.add('active');
}

async function buildDirectorDraft(layer,type){
if(!window.NovelAICompositionDirector||typeof window.NovelAICompositionDirector.writeLayerPromptAsync!=='function'){
createToastError('AI 导演','导演模块还没有加载完成。',2500);
return null;
}
var roughPrompt=$("text2img_prompt")?$("text2img_prompt").value:layer.text2img_prompt;
var button=$("naiDirectorDraft");
if(button){
button.disabled=true;
button.textContent='导演思考中...';
}
var result=null;
try{
result=await window.NovelAICompositionDirector.writeLayerPromptAsync(layer,type,roughPrompt);
}catch(error){
createToastError('AI 导演',error.message||'导演 API 调用失败，已停止。',5000);
uiLogger.error('AI director failed:',error);
return null;
}finally{
if(button){
button.disabled=false;
button.textContent='AI 导演写提示词';
}
}
if(!result)return null;
if($("text2img_prompt"))$("text2img_prompt").value=layer.text2img_prompt||'';
if($("text2img_negative"))$("text2img_negative").value=layer.text2img_negative||'';
renderDirectorPlan(result.plan);
var storeDrafts=$("naiDirectorStoreDrafts");
if(!storeDrafts||storeDrafts.checked){
layer.naiDirectorDraft={
prompt:result.prompt,
negative_prompt:result.negative_prompt,
plan:result.plan,
source_prompt:roughPrompt,
created_at:new Date().toISOString()
};
}
var detail=result.plan?[
'模式：'+result.plan.mode,
'画幅：'+result.plan.canvas_fit,
result.plan.api_director?'来源：导演 API':'来源：本地导演'
]:['已生成当前分镜提示词'];
createToast('AI 导演',detail,2400);
return result;
}

function renderNovelAILayerPrompt(layer,type){
var otherControlsMini=$("other-controls-mini");
if(!otherControlsMini)return;
var isImage=type==='I2I';
otherControlsMini.innerHTML=`
<div class="nai-layer-prompt-panel">
  <div class="nai-layer-help">可以直接写中文需求；AI 导演会理解角色、动作、场景、边框、画幅和氛围，并改写成 NovelAI 可用英文提示词。</div>
  <div class="control textarea-control nai-layer-textarea">
    <div class="textarea-label-wrapper">
      <label class="textarea-label" for="text2img_prompt">当前分镜正向提示词</label>
    </div>
    <textarea id="text2img_prompt" name="textarea" placeholder="例如：雨夜霓虹街道里，一个巫女站在粗黑边框漫画分镜内，氛围压抑但漂亮">${escapePromptHtml(layer.text2img_prompt)}</textarea>
  </div>
  <div class="control textarea-control nai-layer-textarea">
    <div class="textarea-label-wrapper">
      <label class="textarea-label" for="text2img_negative">当前分镜反向提示词</label>
    </div>
    <textarea id="text2img_negative" name="textarea" placeholder="例如：bad hands,lowres,text,watermark">${escapePromptHtml(layer.text2img_negative)}</textarea>
  </div>
  ${isImage?`
  <div class="nai-layer-compact-row">
    <label class="nai-mini-field"><span>重绘强度</span><input type="number" id="img2img_denoise" step="0.01" max="1" min="0" value="${layer.img2img_denoise||0.65}"></label>
    <label class="nai-mini-field"><span>画面缩放</span><input type="number" id="img2imgScale" step="0.1" min="0.1" value="${layer.img2imgScale||1.05}"></label>
  </div>`:''}
  <div class="nai-layer-action-row">
    <button id="naiDirectorDraft" class="nai-director-button" type="button">AI 导演写提示词</button>
    <button id="promptRun" class="nai-generate-button" type="button">${isImage?'用 NovelAI 图生图':'用 NovelAI 生成分镜'}</button>
  </div>
  <div id="naiDirectorPlanPreview" class="nai-director-plan-preview"></div>
  <div class="nai-layer-help nai-layer-flow">导演会去重并补充：画幅、镜头、主体位置、边框处理、整体氛围、光影和 Danbooru 风格标签锚点。</div>
</div>
`;

$("naiDirectorDraft").addEventListener("click",async function(){
await buildDirectorDraft(layer,isImage?'I2I':'T2I');
});

$("promptRun").addEventListener("click",function(){
if(!layer)return;
var spinner=createSpinner(getGUID(layer),isImage?'I2I':'T2I');
if(isImage){
I2I(layer,spinner);
}else{
T2I(layer,spinner);
}
});

$("text2img_prompt").addEventListener("input",function(){
layer.text2img_prompt=this.value;
});

$("text2img_negative").addEventListener("input",function(){
layer.text2img_negative=this.value;
});

if(isImage){
$("img2imgScale").addEventListener("input",function(){
layer.img2imgScale=this.value;
});
$("img2img_denoise").addEventListener("input",function(){
layer.img2img_denoise=this.value;
});
}

renderDirectorPlan(layer.naiDirectorPlan||(layer.naiDirectorDraft&&layer.naiDirectorDraft.plan));
setAutoSizeingControlMini();
}

function showT2IPrompts(layer){
renderNovelAILayerPrompt(layer,'T2I');
}

function showI2IPrompts(layer){
renderNovelAILayerPrompt(layer,'I2I');
}

function adjustToMultipleOfEight(elementId){
var inputElement=$(elementId);
if(!inputElement)return;
var value=parseInt(inputElement.value,10);
if(value!==-1){
inputElement.value=Math.round(value/8)*8;
}
}

function noShowPrompt(){
var otherControlsMini=$("other-controls-mini");
if(otherControlsMini){
otherControlsMini.innerHTML=`<div class="nai-layer-empty">选中一个分镜或图片后，可在这里填写当前对象的 NovelAI 提示词。</div>`;
}
setAutoSizeingControlMini();
}

if(typeof window!=='undefined'){
window.showT2IPrompts=showT2IPrompts;
window.showI2IPrompts=showI2IPrompts;
window.noShowPrompt=noShowPrompt;
}
