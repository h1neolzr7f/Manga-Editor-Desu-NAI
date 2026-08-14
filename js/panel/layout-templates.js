/**
 * 常见漫画分镜模板（直线切分，可后期手调刀线）
 */
var PANEL_LAYOUT_TEMPLATE_STORAGE_KEY='panelLayoutTemplateId';
var PANEL_LAYOUT_MODE_STORAGE_KEY='panelLayoutMode';

var PANEL_LAYOUT_TEMPLATES={
random:{id:'random',label:'随机切分（原逻辑）'},
'grid-2x2':{id:'grid-2x2',label:'四格 2×2'},
'rows-3':{id:'rows-3',label:'三行均分'},
'cols-2':{id:'cols-2',label:'左右两格'},
'top-2bottom':{id:'top-2bottom',label:'上大 + 下二'},
'left-2right':{id:'left-2right',label:'左大 + 右二'},
'classic-5':{id:'classic-5',label:'五格（上 1 + 下 2×2）'},
'grid-3x2':{id:'grid-3x2',label:'六格 3×2'},
// 新增：日本漫画风多样分镜（非均匀，使用原故事预设灵感，不同页不同节奏）
'manga-4-varied':{id:'manga-4-varied',label:'日漫风4格（大上+下三变）'},
'manga-5-dynamic':{id:'manga-5-dynamic',label:'日漫风5格（动态大中小）'},
'manga-v-flow':{id:'manga-v-flow',label:'日漫风纵向流（左大+右叠）'},
'splash-full':{id:'splash-full',label:'整页开场（不切分）'},
'widescreen-top':{id:'widescreen-top',label:'宽银幕（上横条+下大）'},
'rows-4':{id:'rows-4',label:'四行均分'},
'nine-grid':{id:'nine-grid',label:'九宫格 3×3'},
'manga-inset':{id:'manga-inset',label:'日漫风嵌套（上条+中二+底条）'}
};

var GUIDED_SPLIT_RATIO_CANDIDATES=[0.5,0.45,0.55,0.4,0.6,0.35,0.65,0.33,0.67];

function getSelectedPanelLayoutTemplateId(){
var el=$('panelLayoutTemplateSelect');
if(!el)return 'grid-2x2';
return el.value||'grid-2x2';
}

function isPanelLayoutRandomMode(){
if(typeof getSelectedValueByGroup==='function'){
try{return getSelectedValueByGroup('panelLayoutMode')==='random';}catch(error){return false;}
}
return false;
}

function savePanelLayoutPrefs(){
try{
localStorage.setItem(PANEL_LAYOUT_TEMPLATE_STORAGE_KEY,getSelectedPanelLayoutTemplateId());
localStorage.setItem(PANEL_LAYOUT_MODE_STORAGE_KEY,isPanelLayoutRandomMode()?'random':'template');
}catch(error){/* ignore */}
if(typeof saveSettingsLocalStrage==='function')saveSettingsLocalStrage(true);
}

function loadPanelLayoutPrefs(data){
var templateId=localStorage.getItem(PANEL_LAYOUT_TEMPLATE_STORAGE_KEY)||'grid-2x2';
var mode=localStorage.getItem(PANEL_LAYOUT_MODE_STORAGE_KEY)||'template';
if(data){
if(data.panelLayoutTemplate)templateId=data.panelLayoutTemplate;
if(data.panelLayoutMode)mode=data.panelLayoutMode;
}
var select=$('panelLayoutTemplateSelect');
if(select)select.value=templateId;
var modeGroup=document.querySelector('[data-group="panelLayoutMode"]');
if(modeGroup){
modeGroup.querySelectorAll('button').forEach(function(btn){
btn.classList.toggle('selected',btn.dataset.value===mode);
});
}
syncPanelLayoutTemplateWrap();
}

function syncPanelLayoutTemplateWrap(){
var templateWrap=$('panelLayoutTemplateWrap');
if(!templateWrap)return;
templateWrap.style.display=isPanelLayoutRandomMode()?'none':'block';
}

function getSingleFullPagePanel(){
var list=getPanelObjectList();
if(!list||!list.length)return null;
if(list.length===1)return list[0];
var largest=list[0];
var largestArea=largest.width*largest.height;
list.forEach(function(panel){
var area=panel.width*panel.height;
if(area>largestArea){largest=panel;largestArea=area;}
});
return largest;
}

function removePanelTree(panel){
if(!panel)return;
if(panel.guids&&panel.guids.length){
canvas.getObjects().slice().forEach(function(obj){
if(obj.guid&&panel.guids.indexOf(obj.guid)!==-1){
canvas.remove(obj);
}
});
}
if(typeof removeLayer==='function')removeLayer(panel);
else canvas.remove(panel);
}

function preparePageForLayoutTemplate(){
var list=getPanelObjectList();
if(!list||!list.length)return null;
if(list.length===1)return list[0];
var keep=getSingleFullPagePanel();
var removed=0;
list.forEach(function(panel){
if(panel!==keep){
removePanelTree(panel);
removed+=1;
}
});
if(removed>0){
createToast('分镜模板','已移除 '+removed+' 块多余分镜，保留整页主框。',3200);
}
return keep;
}

function guidedSplitPanelWithRetry(panel,isVertical,preferredRatio){
var ratios=[preferredRatio].concat(GUIDED_SPLIT_RATIO_CANDIDATES);
var seen={};
for(var i=0;i<ratios.length;i++){
var ratio=ratios[i];
var key=(isVertical?'v':'h')+':'+ratio;
if(seen[key])continue;
seen[key]=true;
var result=guidedSplitPanel(panel,isVertical,ratio);
if(result&&result.isSplit)return result;
}
return {isSplit:false};
}

function applyPanelLayoutTemplate(templateId){
templateId=templateId||getSelectedPanelLayoutTemplateId();
savePanelLayoutPrefs();
if(templateId==='random'){
rundomPanelCut();
return true;
}
var panel=preparePageForLayoutTemplate();
if(!panel){
createToastError('分镜模板','当前页没有可切分的整页分镜框。请先新建页。',5000);
return false;
}
try{
changeDoNotSaveHistory();
var ok=false;
switch(templateId){
case 'grid-2x2':ok=applyLayoutGrid2x2(panel);break;
case 'rows-3':ok=applyLayoutRows3(panel);break;
case 'cols-2':ok=applyLayoutCols2(panel);break;
case 'top-2bottom':ok=applyLayoutTop2Bottom(panel);break;
case 'left-2right':ok=applyLayoutLeft2Right(panel);break;
case 'classic-5':ok=applyLayoutClassic5(panel);break;
case 'grid-3x2':ok=applyLayoutGrid3x2(panel);break;
case 'manga-4-varied':ok=applyLayoutManga4Varied(panel);break;
case 'manga-5-dynamic':ok=applyLayoutManga5Dynamic(panel);break;
case 'manga-v-flow':ok=applyLayoutMangaVFlow(panel);break;
case 'splash-full':ok=true;break;
case 'widescreen-top':ok=applyLayoutWidescreenTop(panel);break;
case 'rows-4':ok=applyLayoutRows4(panel);break;
case 'nine-grid':ok=applyLayoutNineGrid(panel);break;
case 'manga-inset':ok=applyLayoutMangaInset(panel);break;
default:
createToastError('分镜模板','未知模板：'+templateId,4000);
return false;
}
if(!ok){
createToastError('分镜模板','切分失败，已尝试多种比例。请缩小页边距或换模板。',5000);
return false;
}
createToast('分镜模板',PANEL_LAYOUT_TEMPLATES[templateId].label+' 已套用，可用刀工具微调。',2600);
return true;
}finally{
changeDoSaveHistory();
canvas.requestRenderAll();
if(typeof updateLayerPanel==='function')updateLayerPanel();
}
}

function applyLayoutGrid2x2(panel){
var splitV=guidedSplitPanelWithRetry(panel,true,0.5);
if(!splitV.isSplit)return false;
var leftOk=guidedSplitPanelWithRetry(splitV.polygon1,false,0.5).isSplit;
var rightOk=guidedSplitPanelWithRetry(splitV.polygon2,false,0.5).isSplit;
return leftOk&&rightOk;
}

function applyLayoutRows3(panel){
var first=guidedSplitPanelWithRetry(panel,false,1/3);
if(!first.isSplit)return false;
return guidedSplitPanelWithRetry(first.polygon2,false,0.5).isSplit;
}

function applyLayoutCols2(panel){
return guidedSplitPanelWithRetry(panel,true,0.5).isSplit;
}

function applyLayoutTop2Bottom(panel){
var top=guidedSplitPanelWithRetry(panel,false,0.55);
if(!top.isSplit)return false;
return guidedSplitPanelWithRetry(top.polygon2,true,0.5).isSplit;
}

function applyLayoutLeft2Right(panel){
var left=guidedSplitPanelWithRetry(panel,true,0.38);
if(!left.isSplit)return false;
return guidedSplitPanelWithRetry(left.polygon2,false,0.5).isSplit;
}

function applyLayoutClassic5(panel){
var top=guidedSplitPanelWithRetry(panel,false,0.38);
if(!top.isSplit)return false;
var bottom=guidedSplitPanelWithRetry(top.polygon2,false,0.5);
if(!bottom.isSplit)return false;
var bl=guidedSplitPanelWithRetry(bottom.polygon1,true,0.5);
var br=guidedSplitPanelWithRetry(bottom.polygon2,true,0.5);
return bl.isSplit&&br.isSplit;
}

function applyLayoutGrid3x2(panel){
var splitV=guidedSplitPanelWithRetry(panel,true,0.5);
if(!splitV.isSplit)return false;
return applyLayoutRows3(splitV.polygon1)&&applyLayoutRows3(splitV.polygon2);
}

// 日本漫画风格多样分镜实现（非死板网格，每个分镜大小/比例不同，适合故事节奏）
function applyLayoutManga4Varied(panel){
// 上大（约55-60%）+ 下三格（左小 中中 右小，不对称）
var top=guidedSplitPanelWithRetry(panel,false,0.58);
if(!top.isSplit) return false;
var bottom=top.polygon2;
// 下左小 (0.28)
var b1=guidedSplitPanelWithRetry(bottom,true,0.28);
if(!b1.isSplit) return false;
// 下中 (剩余约0.42 of bottom)
var b2=guidedSplitPanelWithRetry(b1.polygon2,true,0.42);
if(!b2.isSplit) return false;
return true;
}

function applyLayoutManga5Dynamic(panel){
// 动态5格：上1/3宽 + 中左大 + 中右小 + 下两变 （模拟日漫情感/动作切换，不同大小）
var top=guidedSplitPanelWithRetry(panel,false,0.32);
if(!top.isSplit) return false;
var mid=top.polygon2;
var midV=guidedSplitPanelWithRetry(mid,true,0.62);
if(!midV.isSplit) return false;
var lower=guidedSplitPanelWithRetry(midV.polygon2,false,0.48);
if(!lower.isSplit) return false;
var bl=guidedSplitPanelWithRetry(lower.polygon1,true,0.38);
var br=guidedSplitPanelWithRetry(lower.polygon2,true,0.55);
return bl.isSplit&&br.isSplit;
}

function applyLayoutMangaVFlow(panel){
var left=guidedSplitPanelWithRetry(panel,true,0.42);
if(!left.isSplit) return false;
var right=left.polygon2;
var r1=guidedSplitPanelWithRetry(right,false,0.25);
if(!r1.isSplit) return false;
var r2=guidedSplitPanelWithRetry(r1.polygon2,false,0.35);
if(!r2.isSplit) return false;
return true;
}

function applyLayoutWidescreenTop(panel){
return guidedSplitPanelWithRetry(panel,false,0.28).isSplit;
}

function applyLayoutRows4(panel){
var first=guidedSplitPanelWithRetry(panel,false,0.25);
if(!first.isSplit)return false;
var second=guidedSplitPanelWithRetry(first.polygon2,false,1/3);
if(!second.isSplit)return false;
return guidedSplitPanelWithRetry(second.polygon2,false,0.5).isSplit;
}

function applyLayoutNineGrid(panel){
var c1=guidedSplitPanelWithRetry(panel,true,1/3);
if(!c1.isSplit)return false;
var c2=guidedSplitPanelWithRetry(c1.polygon2,true,0.5);
if(!c2.isSplit)return false;
return applyLayoutRows3(c1.polygon1)&&applyLayoutRows3(c2.polygon1)&&applyLayoutRows3(c2.polygon2);
}

function applyLayoutMangaInset(panel){
var top=guidedSplitPanelWithRetry(panel,false,0.18);
if(!top.isSplit)return false;
var bot=guidedSplitPanelWithRetry(top.polygon2,false,0.78);
if(!bot.isSplit)return false;
return guidedSplitPanelWithRetry(bot.polygon1,true,0.5).isSplit;
}

function recommendPanelLayouts(panelCount){
var count=Math.max(1,Number(panelCount)||1);
var map={
1:[{id:'splash-full',reason:'整页开场或满版插图'},{id:'widescreen-top',reason:'上横条适合标题镜头'},{id:'manga-4-varied',reason:'日漫风四格适合开场'}],
2:[{id:'cols-2',reason:'两格左右对切'},{id:'widescreen-top',reason:'上横条+下大'},{id:'top-2bottom',reason:'上大下小适合反应镜头'}],
3:[{id:'rows-3',reason:'三行均分'},{id:'top-2bottom',reason:'上大+下二'},{id:'left-2right',reason:'左大+右二'}],
4:[{id:'grid-2x2',reason:'四格整齐排版'},{id:'manga-4-varied',reason:'上大下三，更像日漫节奏'},{id:'rows-4',reason:'四行时间推进'},{id:'manga-inset',reason:'上下条+中间对切'}],
5:[{id:'classic-5',reason:'上1下4 的经典五格'},{id:'manga-5-dynamic',reason:'大小变化的动态五格'}],
6:[{id:'grid-3x2',reason:'六格网格'},{id:'manga-v-flow',reason:'左大右叠的纵向流'}],
9:[{id:'nine-grid',reason:'九宫格适合快速节拍'}]
};
return (map[count]||[{id:'manga-4-varied',reason:'当前格数较少见，先用日漫风四格再手调'},{id:'classic-5',reason:'或改成经典五格'}]).map(function(item){
var template=PANEL_LAYOUT_TEMPLATES[item.id];
return {id:item.id,label:template?template.label:item.id,reason:item.reason,count:count};
});
}

function currentPanelCount(){
if(typeof getPanelObjectList==='function'){
var list=getPanelObjectList();
return list&&list.length?list.length:0;
}
return 0;
}

function renderPanelLayoutRecommendations(){
var host=typeof document!=='undefined'?document.getElementById('panelLayoutRecommendList'):null;
if(!host)return [];
var count=currentPanelCount()||1;
var items=recommendPanelLayouts(count);
host.innerHTML='';
items.forEach(function(item){
var button=document.createElement('button');
button.type='button';
button.className='nai-character-mini-button';
button.textContent=item.label+' · '+item.reason;
button.addEventListener('click',function(){applyPanelLayoutTemplate(item.id);});
host.appendChild(button);
});
return items;
}

function applyPanelLayoutForCurrentPage(){
if(isPanelLayoutRandomMode()){
rundomPanelCut();
savePanelLayoutPrefs();
return;
}
applyPanelLayoutTemplate(getSelectedPanelLayoutTemplateId());
}

function populatePanelLayoutTemplateSelect(){
var select=$('panelLayoutTemplateSelect');
if(!select)return;
select.innerHTML='';
Object.keys(PANEL_LAYOUT_TEMPLATES).forEach(function(key){
if(key==='random')return;
var item=PANEL_LAYOUT_TEMPLATES[key];
var option=document.createElement('option');
option.value=item.id;
option.textContent=item.label;
select.appendChild(option);
});
}

document.addEventListener('DOMContentLoaded',function(){
populatePanelLayoutTemplateSelect();
loadPanelLayoutPrefs();
var select=$('panelLayoutTemplateSelect');
if(select){
select.addEventListener('change',savePanelLayoutPrefs);
}
var applyBtn=$('panelLayoutTemplateButton');
if(applyBtn)applyBtn.addEventListener('click',applyPanelLayoutForCurrentPage);
var recommendBtn=$('panelLayoutRecommendButton');
if(recommendBtn)recommendBtn.addEventListener('click',renderPanelLayoutRecommendations);
var modeGroup=document.querySelector('[data-group="panelLayoutMode"]');
if(modeGroup){
modeGroup.querySelectorAll('button').forEach(function(btn){
btn.addEventListener('click',function(){setTimeout(function(){
syncPanelLayoutTemplateWrap();
savePanelLayoutPrefs();
},0);});
});
}
});

if(typeof window!=='undefined'){
window.applyPanelLayoutTemplate=applyPanelLayoutTemplate;
window.applyPanelLayoutForCurrentPage=applyPanelLayoutForCurrentPage;
window.loadPanelLayoutPrefs=loadPanelLayoutPrefs;
window.PANEL_LAYOUT_TEMPLATES=PANEL_LAYOUT_TEMPLATES;
window.recommendPanelLayouts=recommendPanelLayouts;
window.renderPanelLayoutRecommendations=renderPanelLayoutRecommendations;
}