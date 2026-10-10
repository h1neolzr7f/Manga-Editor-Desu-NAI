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
AUTO_OK:'生图完成（旧版未审阅）',
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
// 兼容旧调用：当前没有检查生成画面的自动审查器。
setPanelPipelineStatusSafe(panel,'GEN_OK',detail||'生图完成，尚未审阅');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

function onPanelGenerationSuccess(panel,type){
if(!panel)return;
// 返回图片只证明生图成功，不能代替画面质量检查。
if(isManualReviewAfterGenEnabled()){
markPanelForManualReview(panel,(type||'T2I')+' 完成，请检查后可手调/I2I/重生成');
}else{
setPanelPipelineStatusSafe(panel,'GEN_OK',(type||'T2I')+' 完成，尚未审阅');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}
}

function onPanelGenerationFailure(panel,message){
if(!panel)return;
setPanelPipelineStatusSafe(panel,'GEN_FAIL',message||'生图失败');
if(typeof updateLayerPanel==='function')updateLayerPanel();
}

async function finishBatchGenerationReview(){
var list=getPanelObjectList();
var reviewCount=0;
var genOkCount=0;
list.forEach(function(panel){
if(panel.naiPipelineStatus==='GEN_OK'||panel.naiPipelineStatus==='AUTO_OK'){
genOkCount++;
}
if(panel.naiPipelineStatus==='MANUAL_REVIEW'||panel.naiPipelineStatus==='AUTO_FLAGGED') reviewCount+=1;
});
if(typeof updateLayerPanel==='function')updateLayerPanel();
var msg='全书生图结束。';
if(genOkCount>0)msg+=' '+genOkCount+' 格生图完成，尚未审阅。';
if(reviewCount>0)msg+=' '+reviewCount+' 格仍需人工确认。';
createToast('生图与审阅',msg,8000);
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
if(list[i].naiPipelineStatus==='MANUAL_REVIEW'||list[i].naiPipelineStatus==='AUTO_FLAGGED')return list[i];
}
for(var j=0;j<start;j++){
if(list[j].naiPipelineStatus==='MANUAL_REVIEW'||list[j].naiPipelineStatus==='AUTO_FLAGGED')return list[j];
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
if(await chengeCanvasByGuid(guids[i])===false)throw new Error('页面正在切换或不可用，请等待后重试。');
await new Promise(function(r){requestAnimationFrame(r);});
var dataUrl=canvas.toDataURL({format:'png',multiplier:1});
var link=getLinkDownload(dataUrl,'manga-page-'+(String(i+1).padStart(2,'0'))+'.png');
link.click();
await new Promise(function(r){setTimeout(r,180);});
}
if(homeGuid)if(await chengeCanvasByGuid(homeGuid)===false)throw new Error('页面正在切换或不可用，请等待后重试。');
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
