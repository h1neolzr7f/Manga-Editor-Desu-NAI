function rundomPanelCut() {
var panel=getRandomPanel();
var maxRetryCount=2;

if (panel===null) {
createToastError("还没有分镜格子。请先点左侧「模板」放一个分镜。");
return;
}

var vRandomCount=generateRandomInt($("verticalRandomPanelCount").value);
var hRandomCount=generateRandomInt($("horizontalRandomPanelCount").value);

// console.log("vRandomCount", vRandomCount);
// console.log("hRandomCount", hRandomCount);


try {
changeDoNotSaveHistory();

var cuts=createCuts(vRandomCount,hRandomCount);

var maxRetryCountSum=maxRetryCount*cuts.length;
var retry=0;

while (cuts.length>0) {
if (retry>maxRetryCountSum) {
// console.log("split retryCount over.");
return;
}

var currentCut=cuts[0];
var isSplit=blindSplitPanel(panel,currentCut==='vertical');

if (isSplit) {
cuts.shift();
panel=getRandomPanel();
} else {
retry++;
}
}
} finally {
changeDoSaveHistory();
canvas.requestRenderAll();
}
}


function createCuts(vRandomCount,hRandomCount) {
var cuts=[];
const alternateCount=Math.min(4,Math.min(vRandomCount,hRandomCount)*2);
for (let i=0;i<alternateCount;i++) {
cuts.push(i%2===0 ? 'vertical' : 'horizontal');
}
const remainingV=Math.max(0,vRandomCount-alternateCount/2);
const remainingH=Math.max(0,hRandomCount-alternateCount/2);
for (let i=0;i<remainingV;i++) cuts.push('vertical');
for (let i=0;i<remainingH;i++) cuts.push('horizontal');

if (cuts.length>4) {
const fixed=cuts.slice(0,4);
const rest=cuts.slice(4).sort(()=>Math.random()-0.5);
cuts=[...fixed,...rest];
}

return cuts;
}



async function generateMultipage(){
const pageCount=Number(($("pageCount")||{}).value)||0;
if(pageCount>1&&typeof window!=='undefined'&&typeof window.confirm==='function'){
if(!window.confirm('将创建 '+pageCount+' 张空白分镜页，不会花 NovelAI 积分。页数多会比较难改。确定吗？'))return;
}
const loading=OP_showLoading({icon: 'process',step: 'Step1',substep: 'Multi Page',progress: 0});
await new Promise(requestAnimationFrame);

try{
var newPage=false;
const selectedValue=getSelectedValueByGroup("multiPageType");
const useVaried=$('panelVariedMangaPerPage')&&$('panelVariedMangaPerPage').checked;
const variedTemplates=['manga-4-varied','manga-5-dynamic','manga-v-flow','top-2bottom','left-2right','classic-5'];
let templateIdx=0;
let fw=$('flexGenW') ? parseInt($('flexGenW').value,10) : 0;
let fh=$('flexGenH') ? parseInt($('flexGenH').value,10) : 0;

for (let page=1;page<=pageCount;page++) {

OP_updateLoadingState(loading,{
icon: 'process',step: 'Step2',substep: 'Page:'+page,progress: 50
});
await new Promise(requestAnimationFrame);

panelLogger.debug("----- "+page+" -----")
if(selectedValue==='mPortrait'){
await loadBookSize(210,297,true,newPage);
}
if(selectedValue==='mLandscape'){
await loadBookSize(297,210,true,newPage);
}

if (useVaried&&!isPanelLayoutRandomMode()) {
// 用原漫画预设灵感 + 日漫多样：每页换不同模板，实现“每个分镜不能一样”
var t=variedTemplates[templateIdx%variedTemplates.length];
templateIdx++;
var sel=$('panelLayoutTemplateSelect');
if (sel) {
var old=sel.value;
sel.value=t;
applyPanelLayoutForCurrentPage();
sel.value=old;
} else {
applyPanelLayoutTemplate(t);
}
// 灵活尺寸每页微调（不同页不同构图需求，打破死板）
if (fw>0&&fh>0&&typeof applyFlexGenSizeToPanels==='function') {
var varyW=(page%2===0) ? fw : Math.max(832,fw-64);
var varyH=(page%3===0) ? fh+128 : fh;
applyFlexGenSizeToPanels(varyW,varyH);
}
} else {
applyPanelLayoutForCurrentPage();
if (fw>0&&fh>0&&typeof applyFlexGenSizeToPanels==='function') {
applyFlexGenSizeToPanels(fw,fh);
}
}

newPage=true;
}
await btmSaveProjectFile();
} finally {
OP_hideLoading(loading);
}
}
$on($("panelRandomCutButton"),"click",()=>rundomPanelCut());
$on($("multiPageGenerate"),"click",()=>generateMultipage());