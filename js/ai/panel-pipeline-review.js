/**
 * 分镜流水线状态 + 生图后人工审阅
 */
var NAI_PIPELINE_STATUS_LABELS={
DIR_OK:'导演OK',
DIR_FALLBACK:'导演兜底',
DIR_REFUSED:'导演拒绝',
PROMPT_OK:'批量词OK',
PROMPT_FALLBACK:'批量词兜底',
GEN_OK:'生图完成',
GEN_FAIL:'生图失败',
AUTO_OK:'自动审查通过',
AUTO_FLAGGED:'自动标记待改',
MANUAL_REVIEW:'待人工改',
MANUAL_OK:'人工已确认'
};

function textOfPipeline(value){
return (value==null?'':String(value)).trim();
}

function isManualReviewAfterGenEnabled(){
var el=$('naiMarkPanelsForManualReview');
return!el||el.checked;
}

function setPanelPipelineStatusSafe(panel,status,detail){
if(typeof setPanelPipelineStatus==='function'){
setPanelPipelineStatus(panel,status,detail);
return;
}
if(!panel)return;
panel.naiPipelineStatus=status||'';
panel.naiPipelineStatusDetail=textOfPipeline(detail||'');
}

function getPanelPipelineStatusLabel(panel){
if(!panel||!panel.naiPipelineStatus)return '';
return NAI_PIPELINE_STATUS_LABELS[panel.naiPipelineStatus]||panel.naiPipelineStatus;
}

function markPanelForManualReview(panel,detail){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'MANUAL_REVIEW',detail||'生图完成，请检查后可手调/I2I/重生成');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function markPanelManualOk(panel,detail){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'MANUAL_OK',detail||'人工已确认');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function markPanelAutoOk(panel,detail){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'AUTO_OK',detail||'自动审查通过（生成成功，提示词符合导演规划）');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function markPanelAutoFlagged(panel,detail){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'AUTO_FLAGGED',detail||'自动审查标记：建议检查或重生成');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function onPanelGenerationSuccess(panel,type){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'GEN_OK',(type||'T2I')+' 完成');
// 优先自动审查：成功即自动通过，减少人工负担，成品更快
markPanelAutoOk(panel,'自动审查通过 - 可选：仍可手调或点图层确认');
// 保留原有手动审阅作为额外选项（用户可勾选）
if(isManualReviewAfterGenEnabled()){
// 额外标记待人工，作为双保险
// 但默认不覆盖 AUTO_OK 状态，层级显示两者
panel.naiPipelineStatus=panel.naiPipelineStatus||'AUTO_OK';// 保持自动
// 如需同时显示待改，可在此额外处理
}
}

function onPanelGenerationFailure(panel,message){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'GEN_FAIL',message||'生图失败');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function countPanelsByStatus(statusList){
var counts={};
(statusList||[]).forEach(function(panel){
var key=panel.naiPipelineStatus||'UNKNOWN';
counts[key]=(counts[key]||0)+1;
});
return counts;
}

function summarizeProjectPipelineReview(){
var guids=typeof btmGetGuids==='function'?btmGetGuids():[];
var totalPanels=0;
var review=0;
var ok=0;
var genOk=0;
var fail=0;
guids.forEach(function(guid){
var data=typeof btmProjectsMap!=='undefined'?btmProjectsMap.get(guid):null;
if(!data||!data.panelSnapshots)return;
(data.panelSnapshots||[]).forEach(function(snap){
totalPanels+=1;
if(snap.status==='MANUAL_REVIEW')review+=1;
else if(snap.status==='MANUAL_OK')ok+=1;
else if(snap.status==='GEN_OK')genOk+=1;
else if(snap.status==='GEN_FAIL')fail+=1;
});
});
return {pages:guids.length,totalPanels:totalPanels,review:review,ok:ok,genOk:genOk,fail:fail};
}

function collectPanelSnapshotsOnCanvas(){
return getPanelObjectList().map(function(panel,index){
return {
guid:getGUID(panel),
name:panel.name||('panel '+(index+1)),
status:panel.naiPipelineStatus||'',
detail:panel.naiPipelineStatusDetail||''
};
});
}

async function finishBatchGenerationReview(){
var list=getPanelObjectList();
var reviewCount=0;
var autoOkCount=0;
list.forEach(function(panel){
if(panel.naiPipelineStatus==='GEN_OK'){
// 自动审查主流程
markPanelAutoOk(panel);
autoOkCount++;
}
if(panel.naiPipelineStatus==='MANUAL_REVIEW'||panel.naiPipelineStatus==='AUTO_FLAGGED') reviewCount+=1;
});
if(typeof updateLayerPanel==='function')updateLayerPanel();
var msg=autoOkCount>0
? ('全书生图结束：'+autoOkCount+' 格已自动审查通过。'+(reviewCount>0 ? (reviewCount+' 格仍需人工确认。') : '大部分为成品，可直接导出或微调。'))
: (reviewCount>0 ? '全书生图结束：'+reviewCount+' 格标记待改。' : '全书生图结束。');
createToast('自动审查',msg,8000);
}

function findNextManualReviewPanel(afterPanel){
var list=getPanelObjectList();
if(!list.length)return null;
var start=0;
if(afterPanel){
var idx=list.indexOf(afterPanel);
start=idx>=0?idx+1:0;
}
for(var i=start;i<list.length;i++){
if(list[i].naiPipelineStatus==='MANUAL_REVIEW')return list[i];
}
for(var j=0;j<start;j++){
if(list[j].naiPipelineStatus==='MANUAL_REVIEW')return list[j];
}
return null;
}

function focusPanelForReview(panel){
if(!panel)return;
canvas.setActiveObject(panel);
canvas.requestRenderAll();
if(typeof highlightActiveLayerByCanvas==='function'){
highlightActiveLayerByCanvas(panel);
}else if(typeof updateLayerPanel==='function'){
updateLayerPanel();
}
var detail=panel.naiPipelineStatusDetail||'';
createToast('审阅分镜',(panel.name||'分镜')+'：'+getPanelPipelineStatusLabel(panel)+(detail?(' — '+detail):''),5000);
}

function goToNextManualReviewPanel(){
var active=canvas.getActiveObject();
var next=findNextManualReviewPanel(isPanel(active)?active:null);
if(!next){
createToast('人工审阅','当前页没有更多「待人工改」分镜。',3500);
return;
}
focusPanelForReview(next);
}

function renderPanelPipelineStatusChip(layer,detailsDiv){
if(!isPanel(layer)||!detailsDiv)return;
var chip=document.createElement('span');
chip.className='nai-pipeline-status-chip nai-pipeline-status-'+(layer.naiPipelineStatus||'none').toLowerCase();
chip.textContent=getPanelPipelineStatusLabel(layer)||'';
if(!chip.textContent){
chip.style.display='none';
return;
}
var detail=layer.naiPipelineStatusDetail;
if(detail)chip.title=detail;
detailsDiv.appendChild(chip);
}

function getLinkDownload(dataUrl,filename){
var link=document.createElement('a');
link.href=dataUrl;
link.download=filename;
return link;
}

async function exportAllPagesAsPng(){
if(typeof btmGetGuids!=='function'||typeof chengeCanvasByGuid!=='function'){
createToastError('导出','未找到多页工程接口。',4000);
return;
}
var guids=btmGetGuids();
if(!guids.length){
createToastError('导出','没有可导出的页面。',4000);
return;
}
var homeGuid=typeof getCanvasGUID==='function'?getCanvasGUID():null;
var loading=typeof OP_showLoading==='function'?OP_showLoading({icon:'process',step:'导出',substep:'准备…',progress:0},true):null;
try{
for(var i=0;i<guids.length;i++){
if(loading&&typeof OP_updateLoadingState==='function'){
OP_updateLoadingState(loading,{icon:'process',step:'导出 PNG',substep:'第 '+(i+1)+' / '+guids.length+' 页',progress:Math.round((i/guids.length)*100)});
}
await chengeCanvasByGuid(guids[i]);
await new Promise(function(r){requestAnimationFrame(r);});
var dataUrl=canvas.toDataURL({format:'png',multiplier:1});
var link=getLinkDownload(dataUrl,'manga-page-'+(String(i+1).padStart(2,'0'))+'.png');
link.click();
await new Promise(function(r){setTimeout(r,180);});
}
if(homeGuid)await chengeCanvasByGuid(homeGuid);
createToast('导出','已触发 '+guids.length+' 页 PNG 下载（浏览器可能需允许多文件）。',6000);
} catch(error){
createToastError('导出',error.message||'导出失败',6000);
} finally{
if(loading&&typeof OP_hideLoading==='function')OP_hideLoading(loading);
}
}

document.addEventListener('DOMContentLoaded',function(){
var nextBtn=$('naiGoNextReviewPanelButton');
if(nextBtn){
nextBtn.addEventListener('click',function(e){
e.stopPropagation();
goToNextManualReviewPanel();
});
}
var exportBtn=$('naiExportAllPagesPngButton');
if(exportBtn){
exportBtn.addEventListener('click',function(e){
e.stopPropagation();
exportAllPagesAsPng();
});
}
});

if(typeof window!=='undefined'){
window.NaiPanelPipelineReview={
onPanelGenerationSuccess:onPanelGenerationSuccess,
onPanelGenerationFailure:onPanelGenerationFailure,
markPanelForManualReview:markPanelForManualReview,
markPanelManualOk:markPanelManualOk,
finishBatchGenerationReview:finishBatchGenerationReview,
goToNextManualReviewPanel:goToNextManualReviewPanel,
focusPanelForReview:focusPanelForReview,
exportAllPagesAsPng:exportAllPagesAsPng,
renderPanelPipelineStatusChip:renderPanelPipelineStatusChip,
getPanelPipelineStatusLabel:getPanelPipelineStatusLabel
};
}