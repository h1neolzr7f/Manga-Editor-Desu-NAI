async function autoMultiGenerate(skipDirectorPrep) {
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.generatePreflight==='function'&&!window.NaiBeginnerGuide.generatePreflight())return;
if(!skipDirectorPrep&&typeof window!=='undefined'&&typeof window.confirm==='function'){
var n=($("onePanelGenerateNumber")&&$("onePanelGenerateNumber").value)||1;
var pages=(typeof btmGetGuids==='function'&&btmGetGuids())||[];
var count=Array.isArray(pages)?pages.length:0;
if(!window.confirm('将用 NovelAI 生成画布上的分镜（约 '+count+' 格 × '+n+' 次）。会花积分，确定吗？'))return;
}
if(!skipDirectorPrep&&typeof isBatchDirectorEnabled==='function'&&isBatchDirectorEnabled()&&typeof naiBatchDirectorSetPrompts==='function'){
let scenarioPromptSelecter=$('ScenarioPromptSelecter')?$('ScenarioPromptSelecter').value:'';
let batchPageList=generatePageList();
let signature=typeof getBatchDirectorSignature==='function'?getBatchDirectorSignature(batchPageList,scenarioPromptSelecter):'';
if(typeof isBatchAcceptanceGateEnabled==='function'&&isBatchAcceptanceGateEnabled()&&typeof isBatchAcceptancePassed==='function'&&!isBatchAcceptancePassed(signature)){
createToastError('AI 导演','已开启验收格：请先点「验收格」通过第一格，再生成全书。',6000);
return;
}
let needsRun=typeof naiBatchDirectorNeedsRun==='function'
?await naiBatchDirectorNeedsRun(batchPageList,signature)
:(!signature||window.naiLastBatchDirectorSignature!==signature);
if(needsRun){
let prepared=await naiBatchDirectorSetPrompts(batchPageList,scenarioPromptSelecter);
if(prepared===false)return;
}
if(OP_isCancelled())return;
if(typeof OP_resetCancel==='function')OP_resetCancel();
}else if(!skipDirectorPrep&&typeof getBatchDirectorUserPrompt==='function'&&getBatchDirectorUserPrompt()){
createToastError('AI 导演','已填写批量需求，但未开启“生成所有页面前自动运行 AI 导演”。请先开启或点“AI导演批量写提示词”。',6000);
return;
}

const loading=OP_showLoading({icon: 'process',step: '正在生成',substep: '多页出图',progress: 0},true);
await new Promise(requestAnimationFrame);

try{
let onePanelNumber=$("onePanelGenerateNumber").value;

let guidList=btmGetGuids();
for (const [index,guid] of guidList.entries()) {

if(OP_isCancelled()){
OP_updateLoadingState(loading,{
icon: 'process',step: typeof getText==='function'?getText('op_cancelled'):'已取消',substep: '',progress: 100
});
break;
}

OP_updateLoadingState(loading,{
icon: 'process',step: '正在生成',substep: '第 '+(index+1)+' / '+guidList.length+' 页',progress: Math.round((index/guidList.length)*100)
});
await new Promise(requestAnimationFrame);

await chengeCanvasByGuid(guid);

for (let i=0;i<onePanelNumber;i++) {

if(OP_isCancelled()){
break;
}

let panelList=getPanelObjectList();

for(let panelIndex=0;panelIndex<panelList.length;panelIndex++){
if(OP_isCancelled())break;
var panel=panelList[panelIndex];
var spinner=createSpinner(getGUID(panel),'T2I');
await T2I(panel,spinner);
while(existsWaitQueue()){
if(OP_isCancelled())break;
await new Promise((r)=>setTimeout(r,500));
}
}

if(OP_isCancelled()){
break;
}

while (true) {
if(OP_isCancelled()){
break;
}
if (existsWaitQueue()) {
await new Promise((r)=>setTimeout(r,2000));
continue;
} else {
break;
}
}

}

if(!OP_isCancelled()){
await btmSaveProjectFile();
if(window.NaiPanelPipelineReview&&typeof window.NaiPanelPipelineReview.finishBatchGenerationReview==='function'){
window.NaiPanelPipelineReview.finishBatchGenerationReview();
}
}
}
}finally{
OP_hideLoading(loading);
}
}

if(typeof window!=='undefined'){
window.autoMultiGenerate=autoMultiGenerate;
}
