var initialCanvasWidth=0;
var initialCanvasHeight=0;
var aspectRatio=0;
var viewUserScale=1;
var resizableContainer=0;

let resizeTimer;
function initResizeCanvas(event) {
canvasLogger.debug("initResizeCanvas");
if(event){
event.stopPropagation();
event.preventDefault();
}
var parent=getCanvasViewParent();
if(!parent)return;
var containerWidth=parent.clientWidth;
var containerHeight=parent.clientHeight;

if (
containerWidth<minCanvasSizeWidth||
containerHeight<minCanvasSizeHeight
) {
return;
}

if (resizeTimer) {
clearTimeout(resizeTimer);
}
resizeTimer=setTimeout(function () {
if(typeof canvas==="undefined"||!canvas||!canvas.getWidth()){
if(typeof loadBookSize==="function"){
var page=typeof NaiMangaPageSize!=="undefined"?NaiMangaPageSize.defaultMangaPageSize(false):{width:1654,height:2339};
loadBookSize(page.width,page.height,false);
}
}
fitCanvasViewToContainer(true);
if(typeof initMessage==="function")initMessage();
},15);
}

function getCanvasViewParent(){
return $("resizable-container")||$("canvas-container");
}

function resolvePagePixels(width,height){
if(typeof NaiMangaPageSize!=="undefined"&&typeof NaiMangaPageSize.resolveMangaPageSize==="function"){
return NaiMangaPageSize.resolveMangaPageSize(width,height);
}
return {width:parseFloat(width)||1654,height:parseFloat(height)||2339};
}

function updatePageSizeBadge(){
var badge=$("naiPageSizeBadge");
if(!badge||typeof canvas==="undefined"||!canvas)return;
var w=Math.round(canvas.getWidth()||0);
var h=Math.round(canvas.getHeight()||0);
badge.textContent=w&&h?("底图 "+w+"\u00d7"+h):"底图";
badge.title="组装漫画用的页面分辨率。出图单格仍按 NovelAI 安全尺寸，不会因为底图变大而多花积分。";
}

function fitCanvasViewToContainer(forced){
var parent=getCanvasViewParent();
var container=$("canvas-container");
if(!parent||!container||typeof canvas==="undefined"||!canvas)return;
var cw=canvas.getWidth();
var ch=canvas.getHeight();
var pw=parent.clientWidth;
var ph=parent.clientHeight;
if(!cw||!ch||!pw||!ph)return;
var fit=Math.min(pw/cw,ph/ch);
if(!isFinite(fit)||fit<=0)fit=1;
if(!viewUserScale||viewUserScale<0.2)viewUserScale=1;
var scale=fit*viewUserScale;
if(!forced&&Math.abs((canvasContinerScale||0)-scale)<0.0005){
updatePageSizeBadge();
updateZoomLabel();
return;
}
canvasContinerScale=scale;
container.style.maxWidth="none";
container.style.maxHeight="none";
container.style.width=cw+"px";
container.style.height=ch+"px";
container.style.transformOrigin="top left";
container.style.transform="scale("+scale+")";
container.style.marginRight=(cw*(scale-1))+"px";
container.style.marginBottom=(ch*(scale-1))+"px";
updatePageSizeBadge();
updateZoomLabel();
}

function resizeCanvasByNum(newWidth,newHeight) {
var size=resolvePagePixels(newWidth,newHeight);
canvas.setWidth(size.width);
canvas.setHeight(size.height);
initialCanvasWidth=canvas.getWidth();
initialCanvasHeight=canvas.getHeight();
aspectRatio=initialCanvasWidth/initialCanvasHeight;
canvas.renderAll();
fitCanvasViewToContainer(true);
syncExportPagePlan();
scheduleExportSizeEstimate();
}

function resizeCanvas(newWidth,newHeight) {
if(!newWidth||!newHeight||isNaN(newWidth)||isNaN(newHeight)){
return;
}
canvas.setDimensions({width: newWidth,height: newHeight});
canvas.getObjects().forEach((obj)=>{
if(!obj||!obj.initial)return;

var scaleX=newWidth/obj.initial.canvasWidth;
var scaleY=newHeight/obj.initial.canvasHeight;

obj.set({
scaleX: obj.initial.scaleX*scaleX,
scaleY: obj.initial.scaleY*scaleY,
left: obj.initial.left*scaleX,
top: obj.initial.top*scaleY,
strokeWidth: obj.initial.strokeWidth*scaleX,
});

if (obj.clipPath&&obj.clipPath.initial) {
scaleX=newWidth/obj.clipPath.initial.canvasWidth;
scaleY=newHeight/obj.clipPath.initial.canvasHeight;
const clipPath=obj.clipPath;
clipPath.set({
scaleX: obj.clipPath.initial.scaleX*scaleX,
scaleY: obj.clipPath.initial.scaleY*scaleY,
left: obj.clipPath.initial.left*scaleX,
top: obj.clipPath.initial.top*scaleY,
});
clipPath.setCoords();
}
saveInitialState(obj);
obj.setCoords();
});
canvas.renderAll();
fitCanvasViewToContainer(true);
syncExportPagePlan();
scheduleExportSizeEstimate();
}

function forcedAdjustCanvasSize() {
adjustCanvasSize(true);
}


function adjustCanvasSize(forced) {
if(typeof canvas==="undefined"||!canvas||!canvas.getWidth())return;
aspectRatio=canvas.getWidth()/Math.max(1,canvas.getHeight());
initialCanvasWidth=canvas.getWidth();
initialCanvasHeight=canvas.getHeight();
fitCanvasViewToContainer(!!forced);
}

window.addEventListener("resize",function(){
adjustCanvasSize(true);
});

function adjustCanvasSizeWithContainer(windowWidth,windowHeight) {
fitCanvasViewToContainer(true);
}

function addInitialImageToCanvas(img) {
resizeCanvasByNum(img.width,img.height);
initialPutImage(img);
fitCanvasViewToContainer(true);
}


function resizeCanvasToObject(objectWidth,objectHeight) {
var size=resolvePagePixels(objectWidth,objectHeight);
if(!size.width||!size.height)return;
canvas.setDimensions({width:size.width,height:size.height});
initialCanvasWidth=size.width;
initialCanvasHeight=size.height;
aspectRatio=initialCanvasWidth/initialCanvasHeight;
canvas.renderAll();
viewUserScale=1;
fitCanvasViewToContainer(true);
syncExportPagePlan();
scheduleExportSizeEstimate();
}

document.addEventListener('DOMContentLoaded',function() {
$('bg-color').addEventListener('input',function (event) {
var color=event.target.value;
canvas.setBackgroundColor(color,canvas.renderAll.bind(canvas));
syncExportBackgroundLabel();
});
$('bg-color').addEventListener('input',function (event) {
resizableContainer=getCanvasViewParent();
});
resizableContainer=getCanvasViewParent();
bindExportBackgroundButton();
syncExportBackgroundLabel();
syncExportBitDepthState();
syncExportQualityAvailability();
syncExportPagePlan();
syncExportSizeEstimate();
});

// 画布背景の入力本体は 1px の不可視入力なので、行のボタンからピッカーを開く。
function bindExportBackgroundButton(){
var picker=$('bg-color');
var button=$('bgColorButton');
if(!picker||!button||button.dataset.pickerBound==='1')return;
button.dataset.pickerBound='1';
var open=function(event){
if(event){event.preventDefault();event.stopPropagation();}
if(picker.jscolor&&typeof picker.jscolor.show==='function')picker.jscolor.show();
};
button.addEventListener('click',open);
button.addEventListener('mousedown',function(event){event.preventDefault();event.stopPropagation();});
}

// 画布背景の十六進値ラベルと色の四角形を同期する。
function syncExportBackgroundLabel(){
var picker=$('bg-color');
var label=$('bgColorValue');
if(!picker)return;
var hex=typeof rgbToHex==='function'
?rgbToHex(String(picker.value||'')).toUpperCase()
:String(picker.value||'').toUpperCase();
if(label)label.textContent=hex;
var preview=$('bgColorSwatch');
if(preview)preview.style.backgroundColor=hex;
}

// 位深度は PNG のときだけ有効。jpeg/webp では無効だと分かるようにする。
function syncExportBitDepthState(){
var formatElement=$('outputImageFormat');
var bitDepthElement=$('outputBitDepth');
if(!formatElement||!bitDepthElement)return;
var update=function(){
var isPng=typeof resolveExportFormat==='function'
? resolveExportFormat(formatElement.value)==='png'
: formatElement.value==='png';
bitDepthElement.disabled=!isPng;
bitDepthElement.title=isPng?'PNG 实际写出的位深度。灰度 / 24位 RGB 会丢弃透明度。':'当前输出格式不是 PNG，位深度不生效。';
var hint=$('outputBitDepthHint');
if(hint)hint.style.display=isPng?'':'none';
syncExportPagePlan();
};
formatElement.addEventListener('change',update);
update();
}

var exportPagePlanSyncing=false;
// 「入力中」の欄。編集中は表示も値も触らず、フォーカスが外れた時にだけ検証と同期を行う。
var exportPixelEditing=null;
// DPI 欄を編集中かどうか。編集中は入力途中の値を勝手に直さない。
var exportDpiEditing=false;
// 直前に確定した有効な DPI。空欄や負数のような「意味の無い」入力が来た時は、
// 既定値 300 ではなくこの値へ戻す。打ち間違いで使っていた設定が飛ばないようにするため。
var lastValidExportDpi=null;

// 現在の画面が使う DPI。空欄・負数・非数値の間は既定値 300 ではなく
// 直前の有効値を使う。打ち間違いで設定が 300 に戻ってしまうのを避けるため。
function currentExportDpi(){
var element=$('outputDpi');
var raw=element?element.value:300;
if(typeof NaiMangaPageSize!=='undefined'&&typeof NaiMangaPageSize.normalizeExportDpi==='function'){
var normalized=NaiMangaPageSize.normalizeExportDpi(raw);
return normalized===null?exportDpiFallback():normalized;
}
return parseFloat(raw)||300;
}

// 直前の有効値。まだ一度も確定していなければ既定の 300。
function exportDpiFallback(){
if(lastValidExportDpi!==null)return lastValidExportDpi;
return typeof NaiMangaPageSize!=='undefined'?NaiMangaPageSize.EXPORT_DPI_DEFAULT:300;
}

// UI 入力の検証。意味のある数値なら 0.01 刻みの値、空欄・負数・非数値は null。
function normalizeExportDpiInput(raw){
return typeof NaiMangaPageSize!=='undefined'&&typeof NaiMangaPageSize.normalizeExportDpi==='function'
?NaiMangaPageSize.normalizeExportDpi(raw)
:null;
}

function setExportDpi(value){
var element=$('outputDpi');
if(!element)return;
// 画素欄からの逆算で書き換わった値も、次の「直前の有効値」になる。
var remembered=normalizeExportDpiInput(value);
if(remembered!==null)lastValidExportDpi=remembered;
var next=String(value);
if(element.value===next)return;
element.value=next;
// 画素欄から逆算した DPI はプログラムからの書き換えなので、change が発火しない。
// 設定の自動保存は input/change を拾うため、ここで明示的に知らせて保存対象にする。
element.dispatchEvent(new Event('input',{bubbles:true}));
}

function currentCanvasSizeForPreview(){
var width=Math.max(1,Math.round(
typeof canvas!=='undefined'&&canvas?canvas.getWidth():1654
));
var height=Math.max(1,Math.round(
typeof canvas!=='undefined'&&canvas?canvas.getHeight():2339
));
return {width:width,height:height};
}

// 横/竖それぞれの実出力画素を返す。下地は書き出し側と同じ画布の画素寸法を使う。
// A4 の mm 寸法を 200dpi で換算すると 1654x2339 とは 1px ずれるため、
// mm を下地にするとプレビューと実際の書き出しが食い違う。
function exportPlanForOrientation(dpi,landscape){
if(typeof NaiMangaPageSize==='undefined')return null;
var size=currentCanvasSizeForPreview();
var longEdge=Math.max(size.width,size.height);
var shortEdge=Math.min(size.width,size.height);
return landscape
?NaiMangaPageSize.planExportPage(dpi,longEdge,shortEdge)
:NaiMangaPageSize.planExportPage(dpi,shortEdge,longEdge);
}

// 出力画素のプレビュー。編集中の欄には絶対に触らない。
// 入力の途中で書き戻すと、打っている数字が勝手に戻ってしまうため。
function updateExportPagePlanDisplay(dpi,force){
if(typeof NaiMangaPageSize==='undefined')return;
var active=force?null:(exportPixelEditing||document.activeElement);
[false,true].forEach(function(landscape){
var plan=exportPlanForOrientation(dpi,landscape);
if(!plan)return;
var prefix=landscape?'exportPxLandscape':'exportPxPortrait';
var widthField=$(prefix+'Width');
var heightField=$(prefix+'Height');
if(widthField&&active!==widthField)widthField.value=plan.width;
if(heightField&&active!==heightField)heightField.value=plan.height;
});
var note=$('exportPxCappedNote');
var portraitPlan=exportPlanForOrientation(dpi,false);
if(note)note.style.display=(portraitPlan&&portraitPlan.capped)?'':'none';
}

// 保存された DPI が範囲外だと、欄の表示だけが実書き出しと食い違う。
// 編集中は触らず、確定済みのときだけ正規化後の値を書き戻す。
// 空欄・負数のような「意味の無い」値は既定値 300 ではなく直前の有効値へ戻す。
function syncExportDpiField(){
var element=$('outputDpi');
if(!element)return;
// 入力中は入力途中の値をそのまま見せる。
if(exportDpiEditing||document.activeElement===element)return;
var normalized=normalizeExportDpiInput(element.value);
if(normalized===null){
normalized=exportDpiFallback();
element.value=String(normalized);
}else if(element.value!==String(normalized)){
element.value=String(normalized);
}
lastValidExportDpi=normalized;
}

// 外部要因（canvas のリサイズ、設定読み込み、DPI 確定）からの同期。
// 編集中の欄は updateExportPagePlanDisplay 側が除外するので、ここでは触らない。
function syncExportPagePlan(){
if(typeof NaiMangaPageSize==='undefined')return;
if(exportPagePlanSyncing)return;
exportPagePlanSyncing=true;
try{
syncExportDpiField();
updateExportPagePlanDisplay(currentExportDpi());
}finally{
exportPagePlanSyncing=false;
}
}

// 画素欄の確定処理。フォーカスが外れた時にだけ呼ぶ。
// 入力中は値を書き換えないので、打っている途中で数字が戻ることはない。
// commitExportPixelEdge が「受け付けた / 受け付けなかった」を返し、
// 受け付けなかった時だけ他の欄と表示を確定値へ戻す。
function commitExportPixelEdge(input){
if(!input)return false;
if(typeof NaiMangaPageSize==='undefined')return false;
var typed=Math.round(parseFloat(input.value));
if(!isFinite(typed)||typed<=0){
syncExportPagePlan();
return false;
}
var size=currentCanvasSizeForPreview();
var landscape=input.id.indexOf('Landscape')>=0;
var isWidth=input.getAttribute('data-edge')==='width';
// 横向きの幅は長辺、縦向きの高さが長辺。それ以外は短辺として扱う。
var longEdgeIsWidth=landscape;
var useShortEdge=isWidth?!longEdgeIsWidth:longEdgeIsWidth;
var dpi=NaiMangaPageSize.resolveDpiForPixelEdge(size.width,size.height,typed,useShortEdge);
if(dpi===null){
notifyExportPixelRange(input);
updateExportPagePlanDisplay(currentExportDpi(),true);
return false;
}
setExportDpi(dpi);
exportPagePlanSyncing=true;
try{
updateExportPagePlanDisplay(dpi);
scheduleExportSizeEstimate();
}finally{
exportPagePlanSyncing=false;
}
// 逆算で書き換えた DPI は input イベントを出さないため、設定の自動保存に載らない。
// DPI 欄の input は自動保存とサイズ概算の両方を起動するので、同じ経路に載せる。
var dpiField=$('outputDpi');
if(dpiField)dpiField.dispatchEvent(new Event('input',{bubbles:true}));
return true;
}

// 上限を超える値を入れた時だけ、一度だけ知らせる。
function notifyExportPixelRange(input){
if(!input||input.dataset.planRejectNotified==='1')return;
input.dataset.planRejectNotified='1';
var size=currentCanvasSizeForPreview();
var capLong=NaiMangaPageSize.exportMaxLongEdge(Math.max(size.width,size.height),Math.min(size.width,size.height));
if(typeof createToastError==='function'){
createToastError('画布像素','输入的像素超出输出范围。画布最长边最多约 '+capLong+' 像素（输出上限）。',5000);
}
}

// 不正な DPI を入れた時だけ、一度だけ知らせる。
function notifyExportDpiRange(){
var dpiElement=$('outputDpi');
if(!dpiElement||dpiElement.dataset.dpiRejectNotified==='1')return;
dpiElement.dataset.dpiRejectNotified='1';
if(typeof createToastError!=='function')return;
var min=typeof NaiMangaPageSize!=='undefined'?NaiMangaPageSize.EXPORT_DPI_MIN:96;
var max=typeof NaiMangaPageSize!=='undefined'?NaiMangaPageSize.EXPORT_DPI_MAX:1800;
createToastError('下载 DPI','下载 DPI 需要在 '+min+' ～ '+max+' 之间。已恢复到上一次的有效值 '+exportDpiFallback()+'。',5000);
}

// DPI 欄の確定処理。フォーカスが外れた時と Enter でだけ呼ぶ。
// 負数や空欄は直前の有効値へ戻し、範囲外の正数は MIN/MAX へ丸める。
function commitExportDpi(){
var dpiElement=$('outputDpi');
if(!dpiElement)return;
exportDpiEditing=false;
var before=dpiElement.value;
var normalized=normalizeExportDpiInput(before);
if(normalized===null){
// 打ち間違い（-5 など）で設定が 300 に飛ばないよう、直前の有効値へ戻す。
var fallback=exportDpiFallback();
dpiElement.value=String(fallback);
lastValidExportDpi=fallback;
notifyExportDpiRange();
}else{
lastValidExportDpi=normalized;
if(before!==String(normalized))dpiElement.value=String(normalized);
}
// プログラム側で書き換えた確定値も設定の自動保存に載せる。
if(dpiElement.value!==before)dpiElement.dispatchEvent(new Event('input',{bubbles:true}));
syncExportPagePlan();
scheduleExportSizeEstimate();
}

function bindExportPagePlanEvents(){
var dpiElement=$('outputDpi');
if(dpiElement&&dpiElement.dataset.planBound!=='1'){
dpiElement.dataset.planBound='1';
// 起動時に欄へ入っている値が、最初の「直前の有効値」。
lastValidExportDpi=normalizeExportDpiInput(dpiElement.value);
dpiElement.addEventListener('focus',function(){
exportDpiEditing=true;
delete dpiElement.dataset.dpiRejectNotified;
});
dpiElement.addEventListener('input',function(){
// 空欄や負数のように意味の無い値の間は、換算結果も概算も触らない。
// 確定前の値を画面に出さないため、反映は blur / Enter に任せる。
if(normalizeExportDpiInput(dpiElement.value)===null)return;
// 画素欄を編集中でなければ、その場で換算結果を追従させる。
syncExportPagePlan();
scheduleExportSizeEstimate();
});
// blur（フォーカスが外れた時）と change（Enter 確定）の両方で一度だけ確定する。
// Enter ではフォーカスが残るため、blur だけに任せると画素欄が古いままになる。
dpiElement.addEventListener('blur',commitExportDpi);
dpiElement.addEventListener('change',commitExportDpi);
dpiElement.addEventListener('keydown',function(event){
if(event.key!=='Enter')return;
event.preventDefault();
commitExportDpi();
});
}
['exportPxPortraitWidth','exportPxPortraitHeight','exportPxLandscapeWidth','exportPxLandscapeHeight'].forEach(function(id){
var element=$(id);
if(!element||element.dataset.planBound==='1')return;
element.dataset.planBound='1';
// 入力中は記録だけ。ここで表示や他の欄を触ると打っている数字が戻ってしまう。
element.addEventListener('focus',function(){
exportPixelEditing=element;
delete element.dataset.planRejectNotified;
});
element.addEventListener('input',function(){exportPixelEditing=element;});
// フォーカスが外れた時に、ここで初めて検証して確定値を反映する。
element.addEventListener('blur',function(){
if(exportPixelEditing===element)exportPixelEditing=null;
commitExportPixelEdge(element);
});
// Enter での確定（change）も同じ経路に乗せる。押下だけでフォーカスが残る場合がある。
// commitExportPixelEdge は編集中の欄を書き換えないので、ここで確定しても打った値は残る。
element.addEventListener('change',function(){commitExportPixelEdge(element);});
// number の change はブラウザ次第で発火しないため、Enter は明示的に拾う。
element.addEventListener('keydown',function(event){
if(event.key!=='Enter')return;
event.preventDefault();
commitExportPixelEdge(element);
});
});
}

// PNG はロスレスなので品質は効かない。選べないことが分かるように無効化する。
function syncExportQualityAvailability(){
var formatElement=$('outputImageFormat');
var qualityElement=$('outputImageQuality');
if(!formatElement||!qualityElement)return;
var update=function(){
var lossless=typeof resolveExportFormat==='function'
? resolveExportFormat(formatElement.value)==='png'
: formatElement.value==='png';
qualityElement.disabled=lossless;
qualityElement.title=lossless?'PNG 是无损格式，品质设置不生效。':'JPEG / WebP 的压缩品质。';
syncExportSizeEstimate();
};
formatElement.addEventListener('change',update);
update();
}

// 出力サイズの概算表示。実際に数タイル書き出すため重い。連打と編集中の連続更新を避けるため遅延させる。
var exportEstimateTimer=null;
var exportEstimateRunning=false;
var exportEstimatePending=false;
// canvas のイベント登録は 1 回だけ。何度 syncExportSizeEstimate が呼ばれても
// リスナーを積み増さない（積み増すと 1 操作で何度も排程される）。
var exportEstimateCanvasBound=false;

function renderExportSizeEstimate(){
var label=$('outputImageEstimate');
if(!label)return;
if(typeof estimateExportSize!=='function'||typeof formatByteSize!=='function'){
label.textContent='-';
return;
}
if(exportEstimateRunning){
exportEstimatePending=true;
return;
}
var formatElement=$('outputImageFormat');
var qualityElement=$('outputImageQuality');
var dpiElement=$('outputDpi');
var dpi=parseFloat(dpiElement?dpiElement.value:300);
if(!isFinite(dpi)||dpi<=0){
label.textContent='-';
label.title='';
return;
}
var format=formatElement?formatElement.value:'png';
var quality=qualityElement?qualityElement.value:0.92;
var multiplier=resolveExportMultiplierForDpi(dpi,canvas.width,canvas.height);
label.textContent='计算中…';
exportEstimateRunning=true;
// 直前の描画を先に反映させてから、同期処理の書き出しに入る。
setTimeout(function(){
var result=null;
try{
result=estimateExportSize(format,quality,multiplier,canvas.width,canvas.height);
}catch(error){
result=null;
}
exportEstimateRunning=false;
var node=$('outputImageEstimate');
if(!node)return;
if(!result){
node.textContent='-';
node.title='画布尺寸无法用于估算。';
}else{
var isUpperBound=result.upperBound!==null&&result.upperBound!==undefined;
node.textContent=(isUpperBound?'至多 ':'')+formatByteSize(result.bytes)+(isUpperBound?'':' 左右');
// 実出力は fabric の toCanvasElement を通り、canvas 幅は切り捨てられる。
// Math.round だと 1px 大きく出て、下の画素プレビュー（floor 基準）と食い違う。
// 一緛性を保つため、プレビューと同じ planExportPage を使う。
var dimensionPlan=typeof NaiMangaPageSize!=='undefined'
?NaiMangaPageSize.planExportPage(currentExportDpi(),canvas.width,canvas.height)
:null;
var dimension=dimensionPlan
?dimensionPlan.width+' x '+dimensionPlan.height
:Math.floor(canvas.width*result.multiplier)+' x '+Math.floor(canvas.height*result.multiplier);
var detail;
if(isUpperBound){
detail='当前画面接近纯色，压缩率无法从取样推断，因此给的是上限：'+formatByteSize(result.bytes)+' 以内。\n';
}else{
var range=formatByteSize(result.low)+' ~ '+formatByteSize(result.high);
detail='按当前设置导出约为 '+formatByteSize(result.bytes)+'（多数情况落在 '+range+'）。\n';
}
detail+='输出像素 '+dimension+'，格式 '+result.format.toUpperCase();
if(result.quality!==null&&result.quality!==undefined)detail+='，品质 '+Math.round(result.quality*100)+'%';
if(result.capped)detail+='。\n已触及导出上限，实际尺寸小于设定 DPI。';
node.title=detail;
}
if(exportEstimatePending){
exportEstimatePending=false;
scheduleExportSizeEstimate();
}
},0);
}

function scheduleExportSizeEstimate(delay){
if(exportEstimateTimer)clearTimeout(exportEstimateTimer);
exportEstimateTimer=setTimeout(function(){
exportEstimateTimer=null;
renderExportSizeEstimate();
},typeof delay==='number'?delay:350);
}

function syncExportSizeEstimate(){
bindExportPagePlanEvents();
var label=$('outputImageEstimate');
if(!label)return;
['outputImageFormat','outputImageQuality','outputDpi'].forEach(function(id){
var element=$(id);
if(!element||element.dataset.estimateBound)return;
element.dataset.estimateBound='1';
element.addEventListener('change',function(){scheduleExportSizeEstimate();});
element.addEventListener('input',function(){scheduleExportSizeEstimate();});
});
if(!exportEstimateCanvasBound&&typeof canvas!=='undefined'&&canvas&&canvas.on){
exportEstimateCanvasBound=true;
['object:added','object:modified','object:removed'].forEach(function(eventName){
canvas.on(eventName,function(){scheduleExportSizeEstimate();});
});
}
scheduleExportSizeEstimate(600);
}

let canvasContinerScale=1;

function zoomPercent(){
return Math.round((viewUserScale||1)*100);
}

function updateZoomLabel(){
var pct=zoomPercent();
var text=pct+"%";
["naiZoomLabel","naiZoomLabelHeader"].forEach(function(id){
var node=$(id);
if(!node)return;
node.textContent=text;
node.title=pct===100?"当前是适应窗口。Ctrl+滚轮或 + − 可放大。不是原图像素 100%。":"画布缩放 "+pct+"%（相对适应窗口）";
});
}

function zoomBy(step,event){
var parent=getCanvasViewParent();
var container=$("canvas-container");
var oldScale=canvasContinerScale||1;
var canvasX=0;
var canvasY=0;
if(event&&container){
var box=container.getBoundingClientRect();
canvasX=(event.clientX-box.left)/oldScale;
canvasY=(event.clientY-box.top)/oldScale;
}
viewUserScale=Math.min(4,Math.max(0.25,(viewUserScale||1)+step));
fitCanvasViewToContainer(true);
if(event&&parent&&container){
var next=container.getBoundingClientRect();
parent.scrollLeft+=(next.left+canvasX*(canvasContinerScale||oldScale))-event.clientX;
parent.scrollTop+=(next.top+canvasY*(canvasContinerScale||oldScale))-event.clientY;
}
}

function zoomIn() {
zoomBy(0.15);
}

function zoomFit() {
viewUserScale=1;
fitCanvasViewToContainer(true);
var parent=getCanvasViewParent();
if(parent){
parent.scrollLeft=0;
parent.scrollTop=0;
}
}

function zoomOut() {
zoomBy(-0.15);
}

function currentCanvas(){
return typeof canvas!=="undefined"&&canvas?canvas:window.canvas;
}

function selectedPageId(current){
var object=current&&typeof current.getActiveObject==="function"?current.getActiveObject():null;
if(!object)return "";
if(object.simulatorPageId)return object.simulatorPageId;
if(object.type==="activeSelection"&&typeof object.getObjects==="function"){
var found="";
object.getObjects().some(function(item){
if(item&&item.simulatorPageId){found=item.simulatorPageId;return true;}
return false;
});
return found;
}
if(object.group&&object.group.simulatorPageId)return object.group.simulatorPageId;
return "";
}

function rememberPageId(pageId){
if(pageId&&window.NaiCanvasView)window.NaiCanvasView.lastPageId=pageId;
}

function rememberActiveContext(current){
if(!current)return;
var object=current.getActiveObject&&current.getActiveObject();
if(!object)return;
if(isMangaPanel(object)&&window.NaiCanvasView)window.NaiCanvasView.lastPanel=object;
var pageId=selectedPageId(current);
if(pageId)rememberPageId(pageId);
}

function resolveScalePageId(current,allowFallback){
var pageId=selectedPageId(current);
if(pageId){
rememberPageId(pageId);
return pageId;
}
if(!allowFallback){
var active=current&&current.getActiveObject&&current.getActiveObject();
if(active)return "";
}
var fallback=window.NaiCanvasView&&window.NaiCanvasView.lastPageId;
if(!fallback)return "";
var factory=window.NaiComicExtraRendererFactory;
if(factory&&typeof factory.pageObjects==="function"&&factory.pageObjects(current,fallback).length)return fallback;
return "";
}

function hintNeedSelection(message){
if(window.NaiBeginnerGuide&&typeof window.NaiBeginnerGuide.flashHelp==="function"){
window.NaiBeginnerGuide.flashHelp(message||"先点选画布上的模拟器或图层。");
}
}

function reselectPage(current,pageId){
var factory=window.NaiComicExtraRendererFactory;
if(current&&pageId&&factory&&typeof factory.selectPage==="function")factory.selectPage(current,pageId);
}

function scaleOneObject(obj,factor){
if(!obj||typeof obj.set!=="function")return;
var box=typeof obj.getBoundingRect==="function"?obj.getBoundingRect(true,true):null;
var ox=box?box.left+box.width/2:(Number(obj.left)||0);
var oy=box?box.top+box.height/2:(Number(obj.top)||0);
var left=Number(obj.left)||0;
var top=Number(obj.top)||0;
obj.set({
left:ox+(left-ox)*factor,
top:oy+(top-oy)*factor,
scaleX:(Number(obj.scaleX)||1)*factor,
scaleY:(Number(obj.scaleY)||1)*factor
});
if(typeof obj.setCoords==="function")obj.setCoords();
}

function scaleSelected(factor,allowFallback){
var current=currentCanvas();
if(!current)return false;
rememberActiveContext(current);
var factory=window.NaiComicExtraRendererFactory;
var pageId=resolveScalePageId(current,allowFallback===true);
if(typeof changeDoNotSaveHistory==="function")changeDoNotSaveHistory();
var ok=false;
if(pageId&&factory&&typeof factory.scalePage==="function"){
ok=factory.scalePage(current,pageId,factor);
if(ok)reselectPage(current,pageId);
}else{
var object=current.getActiveObject&&current.getActiveObject();
if(object&&object.type==="activeSelection"&&typeof object.getObjects==="function"){
object.getObjects().forEach(function(item){scaleOneObject(item,factor);});
ok=true;
}else if(object){
scaleOneObject(object,factor);
ok=true;
}
if(ok){
if(typeof current.requestRenderAll==="function")current.requestRenderAll();
else current.renderAll();
}
}
if(typeof changeDoSaveHistory==="function")changeDoSaveHistory();
if(ok&&typeof saveStateByManual==="function")saveStateByManual();
if(!ok)hintNeedSelection("先点选画布上的模拟器或图层，再放大缩小。");
return ok;
}

function isMangaPanel(item){
return !!(item&&item.isPanel&&!item.simulatorPageId&&item.simulatorRole!=="panel");
}

function panelBox(item){
if(!item)return null;
if(typeof item.getBoundingRect==="function")return item.getBoundingRect(true,true);
return null;
}

function resolveFitPanel(current,pageId){
var active=current.getActiveObject&&current.getActiveObject();
if(isMangaPanel(active))return active;
if(active&&active.type==="activeSelection"&&typeof active.getObjects==="function"){
var selectedPanel=null;
active.getObjects().some(function(item){
if(isMangaPanel(item)){selectedPanel=item;return true;}
return false;
});
if(selectedPanel)return selectedPanel;
}
var remembered=window.NaiCanvasView&&window.NaiCanvasView.lastPanel;
if(remembered&&typeof current.getObjects==="function"&&current.getObjects().indexOf(remembered)>=0&&isMangaPanel(remembered))return remembered;
return nearestMangaPanel(current,pageId);
}

function nearestMangaPanel(current,pageId){
var objects=typeof current.getObjects==="function"?current.getObjects():[];
var panels=objects.filter(isMangaPanel);
if(!panels.length)return null;
var factory=window.NaiComicExtraRendererFactory;
var bounds=pageId&&factory&&typeof factory.pageBounds==="function"?factory.pageBounds(current,pageId):null;
if(!bounds)return panels[0];
var cx=bounds.left+bounds.width/2;
var cy=bounds.top+bounds.height/2;
var best=null;
var bestScore=Infinity;
panels.forEach(function(panel){
var box=panelBox(panel);
if(!box)return;
var contained=cx>=box.left&&cx<=box.left+box.width&&cy>=box.top&&cy<=box.top+box.height;
var dx=(box.left+box.width/2)-cx;
var dy=(box.top+box.height/2)-cy;
var score=(dx*dx+dy*dy)+(contained?0:100000000);
if(score<bestScore){bestScore=score;best=panel;}
});
return best||panels[0];
}

function fitRectForPage(current,pageId){
var target=resolveFitPanel(current,pageId);
if(target){
var box=panelBox(target);
if(box&&box.width&&box.height){
var pad=Math.min(8,box.width*0.04,box.height*0.04);
return {left:box.left+pad,top:box.top+pad,width:Math.max(8,box.width-pad*2),height:Math.max(8,box.height-pad*2)};
}
}
return {left:40,top:40,width:Math.max(80,(Number(current.width)||1000)-80),height:Math.max(80,(Number(current.height)||1000)-80)};
}

function moveObjectToRect(object,rect,box){
if(!object||!rect||!box)return;
object.set({
left:(Number(object.left)||0)+(rect.left-box.left),
top:(Number(object.top)||0)+(rect.top-box.top)
});
if(typeof object.setCoords==="function")object.setCoords();
}

function fitSelected(){
var current=currentCanvas();
if(!current)return false;
rememberActiveContext(current);
var factory=window.NaiComicExtraRendererFactory;
var pageId=resolveScalePageId(current,true);
if(typeof changeDoNotSaveHistory==="function")changeDoNotSaveHistory();
var ok=false;
if(pageId&&factory&&typeof factory.fitPageToRect==="function"){
ok=factory.fitPageToRect(current,pageId,fitRectForPage(current,pageId));
if(ok)reselectPage(current,pageId);
}else{
var object=current.getActiveObject&&current.getActiveObject();
if(object){
var box=typeof object.getBoundingRect==="function"?object.getBoundingRect(true,true):null;
var rect=fitRectForPage(current,"");
if(box&&box.width&&box.height){
scaleOneObject(object,Math.min(rect.width/box.width,rect.height/box.height));
var next=typeof object.getBoundingRect==="function"?object.getBoundingRect(true,true):null;
if(next)moveObjectToRect(object,rect,next);
else object.set({left:rect.left,top:rect.top});
if(typeof object.setCoords==="function")object.setCoords();
ok=true;
if(typeof current.requestRenderAll==="function")current.requestRenderAll();
else current.renderAll();
}
}
}
if(typeof changeDoSaveHistory==="function")changeDoSaveHistory();
if(ok&&typeof saveStateByManual==="function")saveStateByManual();
if(!ok)hintNeedSelection("先点选画布上的模拟器，再贴合分镜。");
return ok;
}

function bindCanvasViewControls(){
var parent=getCanvasViewParent();
var host=$("canvas-area")||parent;
if(host&&host.getAttribute("data-nai-zoom-bound")!=="1"){
host.setAttribute("data-nai-zoom-bound","1");
host.addEventListener("wheel",function(event){
if(!(event.ctrlKey||event.metaKey))return;
if(event.target&&event.target.closest&&event.target.closest(".sim-studio-overlay,input,textarea,select"))return;
event.preventDefault();
if(event.altKey){
scaleSelected(event.deltaY<0?1.08:1/1.08);
return;
}
zoomBy(event.deltaY<0?0.12:-0.12,event);
},{passive:false});
}
if(document.documentElement.getAttribute("data-nai-zoom-doc")!=="1"){
document.documentElement.setAttribute("data-nai-zoom-doc","1");
document.addEventListener("wheel",function(event){
if(!(event.ctrlKey||event.metaKey))return;
if(!event.target||!event.target.closest||!event.target.closest(".sim-studio-overlay"))return;
event.preventDefault();
},{passive:false,capture:true});
}
var current=currentCanvas();
if(current&&typeof current.on==="function"&&current.__naiScaleBound!==true){
current.__naiScaleBound=true;
current.on("selection:created",function(){rememberActiveContext(current);});
current.on("selection:updated",function(){rememberActiveContext(current);});
}
function onClick(id,handler){
var node=$(id);
if(!node||node.getAttribute("data-bound")==="1")return;
node.setAttribute("data-bound","1");
node.addEventListener("click",handler);
}
onClick("naiZoomInBtn",function(){zoomIn();});
onClick("naiZoomOutBtn",function(){zoomOut();});
onClick("naiZoomFitBtn",function(){zoomFit();});
onClick("naiObjectBiggerBtn",function(){scaleSelected(1.12);});
onClick("naiObjectSmallerBtn",function(){scaleSelected(1/1.12);});
onClick("naiObjectFitBtn",function(){fitSelected();});
updateZoomLabel();
}

document.addEventListener("DOMContentLoaded",bindCanvasViewControls);

window.NaiCanvasView={
zoomIn:zoomIn,
zoomOut:zoomOut,
zoomFit:zoomFit,
zoomBy:zoomBy,
scaleSelected:scaleSelected,
fitSelected:fitSelected,
zoomPercent:zoomPercent,
updateZoomLabel:updateZoomLabel,
lastPageId:"",
lastPanel:null
};

function inputImageFile() {
$('imageInput').click();
}

document.addEventListener('DOMContentLoaded',function() {
$('imageInput').addEventListener('change',function(e) {
var files=e.target.files;
for (var i=0;i<files.length;i++) {
(function(file) {
var reader=new FileReader();
reader.onload=function(f) {
var data=f.target.result;
fabric.Image.fromURL(data,function(img) {

if (stateStack.length>2) {
canvasLogger.debug("imageInput stateStack.length > 2");
var scaleFactor=Math.min(canvas.width/img.width,canvas.height/img.height);
img.scale(scaleFactor);
canvas.add(img);
canvas.renderAll();
}else{
canvasLogger.debug("imageInput resizeCanvasByNum ");
addInitialImageToCanvas(img);
}
});
};
reader.readAsDataURL(file);
})(files[i]);
}
});
});



function changeView(elementId,isVisible) {
var element=$(elementId);
if (isVisible) {
element.style.display="block";
} else {
element.style.display="none";
}
adjustCanvasSize(true);
}
