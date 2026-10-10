//{guid, { imageLink, blob }} blob is lz4
const btmProjectsMap=new Map();

const btmDrawer=$("btm-drawer");
const btmDrawerHandle=$("btm-drawer-handle");
const btmImageContainer=$("btm-image-container");
const btmScrollLeftBtn=$("btm-scroll-left");
const btmScrollRightBtn=$("btm-scroll-right");

var btmSaveStateThreshold=2;
let btmScrollPosition=0;
let btmIsDragging=false;
let btmIgnoreClose=false;
var btmNavLeft=null;
var btmNavCenter=null;
var btmNavRight=null;

function btmToggleDrawer() {
btmDrawer.classList.toggle("btm-closed");
btmUpdateHandleText();
btmUpdateScrollButtons();
}

function btmCloseDrawer() {
btmDrawer.classList.add("btm-closed");
btmUpdateHandleText();
}

function btmUpdateHandleText() {
if(!btmNavCenter)return;
var isClosed=btmDrawer.classList.contains("btm-closed");
var stateText=isClosed?"展开页面":"收起页面";
var totalPages=btmGetGuidsSize();
var currentGuid=getCanvasGUID();
var currentIndex=btmGetGuidIndex(currentGuid);
var pageText=totalPages>0?" "+(currentIndex+1)+"/"+totalPages+" 页":"";
var ctrlKey=isMacOs?"⌘+B":"Ctrl+B";
btmNavCenter.textContent=stateText+pageText+" ("+ctrlKey+")";
if(currentIndex>0){
btmNavLeft.textContent="\u2190 "+currentIndex+"(Alt+\u2190)";
btmNavLeft.style.visibility="visible";
}else{
btmNavLeft.textContent="";
btmNavLeft.style.visibility="hidden";
}
if(currentIndex>=0&&currentIndex<totalPages-1){
btmNavRight.textContent=(currentIndex+2)+"\u2192(Alt+\u2192)";
btmNavRight.style.visibility="visible";
}else{
btmNavRight.textContent="";
btmNavRight.style.visibility="hidden";
}
}

async function btmNavigatePage(direction) {
var currentGuid=getCanvasGUID();
var currentIndex=btmGetGuidIndex(currentGuid);
var targetIndex=currentIndex+direction;
if(targetIndex<0||targetIndex>=btmGetGuidsSize())return;
var targetGuid=btmGetGuidByIndex(targetIndex);
await chengeCanvasByGuid(targetGuid,true);
btmUpdateHandleText();
}

function btmAddImage(imageLink,blob,guid,openDrawer=true) {
uiLogger.info("[btmAddImage] guid="+guid+" openDrawer="+openDrawer+" hasImageLink="+(!!imageLink)+" hasBlob="+(!!blob)+" btmProjectsMap.size="+btmProjectsMap.size);
const projectData=btmProjectsMap.get(guid);
uiLogger.info("[btmAddImage] existingProject="+(!!projectData)+" (update="+(!!projectData)+", create="+(!projectData)+")");

if (projectData) {
btmProjectsMap.set(guid,{imageLink,blob});
const image=document.querySelector(`.btm-image[data-index="${guid}"]`);
if (image&&imageLink&&imageLink.href) {
image.src=imageLink.href;
const pageNumber=image.parentElement.querySelector(".btm-page-number");
if (pageNumber) {
pageNumber.textContent=btmGetGuidIndex(guid)+1;
}
}
} else {
const imageWrapper=document.createElement("div");
imageWrapper.className="btm-image-wrapper";

const pageNumber=document.createElement("div");
pageNumber.className="btm-page-number";

let index=btmGetGuidIndex(guid);
if (index===-1) {
pageNumber.textContent=btmGetGuidsSize()+1;
} else {
pageNumber.textContent=index+1;
}

const moveLeftBtn=document.createElement("button");
moveLeftBtn.innerHTML="←";
moveLeftBtn.className="btm-move-btn btm-move-left";
moveLeftBtn.title="把这一页往前挪一位";
moveLeftBtn.addEventListener("click",(e)=>{
e.stopPropagation();
const currentIndex=btmGetGuidIndex(guid);
if (currentIndex>0) {
const previousGuid=btmGetGuidByIndex(currentIndex-1);
swapImages(guid,previousGuid);
updateAllPageNumbers();
}
});

const image=document.createElement("img");
if(imageLink&&imageLink.href)image.src=imageLink.href;
image.className="btm-image";
image.dataset.index=guid;
image.addEventListener("click",async ()=>{
await chengeCanvasByGuid(guid,true);
btmUpdateHandleText();
});

const moveRightBtn=document.createElement("button");
moveRightBtn.innerHTML="→";
moveRightBtn.className="btm-move-btn btm-move-right";
moveRightBtn.title="把这一页往后挪一位";
moveRightBtn.addEventListener("click",(e)=>{
e.stopPropagation();
const currentIndex=btmGetGuidIndex(guid);
if (currentIndex<btmGetGuidsSize()-1) {
const nextGuid=btmGetGuidByIndex(currentIndex+1);
swapImages(guid,nextGuid);
updateAllPageNumbers();
}
});

const deleteBtn=document.createElement("button");
deleteBtn.textContent="🗑";
deleteBtn.className="btm-delete-btn";
deleteBtn.title="删除这一页（删除后 20 秒内可撤销）";
deleteBtn.addEventListener("click",async (e)=>{
e.stopPropagation();
if(window.NaiPageLoading||window.NaiHistoryLoading)return;
// One misclick on 🗑 used to drop a whole page for good: keep its saved data so it can be restored.
if(getCanvasGUID()===guid)await btmSaveProjectFile(null,false);
var removedPage={guid:guid,index:btmGetGuidIndex(guid),data:btmProjectsMap.get(guid)};
if(btmGetGuidsSize()>1){
var isCurrentPage=(getCanvasGUID()===guid);
var deletedIndex=btmGetGuidIndex(guid);
btmProjectsMap.delete(guid);
imageWrapper.remove();
if(isCurrentPage){
var targetIndex=Math.min(deletedIndex,btmGetGuidsSize()-1);
var targetGuid=btmGetGuidByIndex(targetIndex);
await chengeCanvasByGuid(targetGuid);
}
}else{
isCurrentPage=(getCanvasGUID()===guid);
btmProjectsMap.delete(guid);
imageWrapper.remove();
if(isCurrentPage&&getObjectCount()===0){
initImageHistory();
setCanvasGUID();
await btmSaveProjectFile();
}
}
btmUpdateScrollButtons();
updateAllPageNumbers();
btmUpdateHandleText();
btmOfferPageRestore(removedPage);
});

var addBtn=document.createElement("button");
addBtn.textContent="+";
addBtn.className="btm-add-btn";
addBtn.title="在这一页后面新建空白页";
addBtn.addEventListener("click",function(e){
e.stopPropagation();
btmShowAddPageDialog(guid);
});

imageWrapper.appendChild(pageNumber);
imageWrapper.appendChild(moveLeftBtn);
imageWrapper.appendChild(image);
imageWrapper.appendChild(moveRightBtn);
const dupBtn=document.createElement("button");
dupBtn.className="btm-dup-btn";
dupBtn.textContent="⧉";
dupBtn.title="复制这一页（副本插在它后面）";
dupBtn.addEventListener("click",async (e)=>{
e.stopPropagation();
if(window.NaiPageLoading||window.NaiHistoryLoading)return;
await btmDuplicatePage(guid);
});
imageWrapper.appendChild(dupBtn);
imageWrapper.appendChild(deleteBtn);
imageWrapper.appendChild(addBtn);
btmImageContainer.appendChild(imageWrapper);
btmProjectsMap.set(guid,{imageLink,blob});
}

btmDrawer.style.display="block";
if (openDrawer) {
if (btmDrawer.classList.contains("btm-closed")) {
btmIgnoreClose=true;
btmToggleDrawer();
setTimeout(()=>{btmIgnoreClose=false;},200);
} else {
btmUpdateScrollButtons();
btmUpdateHandleText();
}
} else {
btmUpdateHandleText();
}
}

function updateAllPageNumbers() {
const pageNumbers=document.querySelectorAll(".btm-page-number");
pageNumbers.forEach((numberElement,index)=>{
numberElement.textContent=index+1;
});
btmUpdateHandleText();
}

function swapImages(guid1,guid2) {
const wrapper1=document.querySelector(
`.btm-image[data-index="${guid1}"]`
).parentElement;
const wrapper2=document.querySelector(
`.btm-image[data-index="${guid2}"]`
).parentElement;

const tempElement=document.createElement("div");
btmImageContainer.insertBefore(tempElement,wrapper1);
btmImageContainer.insertBefore(wrapper1,wrapper2);
btmImageContainer.insertBefore(wrapper2,tempElement);
tempElement.remove();

const guids=btmGetGuids();
const newMap=new Map();

guids.forEach((guid)=>{
if (guid===guid1) {
newMap.set(guid2,btmProjectsMap.get(guid2));
} else if (guid===guid2) {
newMap.set(guid1,btmProjectsMap.get(guid1));
} else {
newMap.set(guid,btmProjectsMap.get(guid));
}
});

btmProjectsMap.clear();
newMap.forEach((value,key)=>{
btmProjectsMap.set(key,value);
});

updateAllPageNumbers();
}

function reorderImages(targetIndex,newGuid) {
const newWrapper=document.querySelector(
`.btm-image[data-index="${newGuid}"]`
).parentElement;
const targetWrapper=document.querySelector(
`.btm-image[data-index="${btmGetGuidByIndex(targetIndex)}"]`
).parentElement;
btmImageContainer.insertBefore(newWrapper,targetWrapper);

const newMap=new Map();
const guids=btmGetGuids();
const newGuidData=btmProjectsMap.get(newGuid);

guids.forEach((guid,index)=>{
if (index===targetIndex) {
newMap.set(newGuid,newGuidData);
}
if (guid!==newGuid) {
newMap.set(guid,btmProjectsMap.get(guid));
}
});

btmProjectsMap.clear();
newMap.forEach((value,key)=>{
btmProjectsMap.set(key,value);
});

updateAllPageNumbers();
}

function btmUpdateScrollButtons() {
const containerWidth=btmDrawer.querySelector(
".btm-drawer-content"
).offsetWidth;
const scrollWidth=btmImageContainer.scrollWidth;
btmScrollLeftBtn.style.display=btmScrollPosition>0 ? "block" : "none";
btmScrollRightBtn.style.display=
scrollWidth>containerWidth&&
btmScrollPosition<scrollWidth-containerWidth
? "block"
: "none";
}

function btmScroll(direction) {
const containerWidth=btmDrawer.querySelector(
".btm-drawer-content"
).offsetWidth;
btmScrollPosition+=direction*containerWidth;
btmScrollPosition=Math.max(
0,
Math.min(btmScrollPosition,btmImageContainer.scrollWidth-containerWidth)
);
btmImageContainer.style.transform=`translateX(-${btmScrollPosition}px)`;
btmUpdateScrollButtons();
}

document.addEventListener("DOMContentLoaded",function () {
btmDrawerHandle.textContent="";
btmNavLeft=document.createElement("span");
btmNavLeft.className="btm-nav-left";
btmNavLeft.addEventListener("click",function(e){
e.stopPropagation();
btmNavigatePage(-1);
});
btmNavCenter=document.createElement("span");
btmNavCenter.className="btm-nav-center";
btmNavRight=document.createElement("span");
btmNavRight.className="btm-nav-right";
btmNavRight.addEventListener("click",function(e){
e.stopPropagation();
btmNavigatePage(1);
});
btmDrawerHandle.appendChild(btmNavLeft);
btmDrawerHandle.appendChild(btmNavCenter);
btmDrawerHandle.appendChild(btmNavRight);
btmUpdateHandleText();
btmDrawerHandle.addEventListener("click",btmToggleDrawer);
btmScrollLeftBtn.addEventListener("click",()=>btmScroll(-1));
btmScrollRightBtn.addEventListener("click",()=>btmScroll(1));

document.addEventListener("mousedown",function (event) {
if (
!btmDrawer.contains(event.target)&&
!btmDrawer.classList.contains("btm-closed")
) {
btmIsDragging=false;
}
});

document.addEventListener("mouseup",function (event) {
if (
!btmDrawer.contains(event.target)&&
!btmDrawer.classList.contains("btm-closed")&&
!btmIsDragging&&
!btmIgnoreClose
) {
btmCloseDrawer();
}
btmIsDragging=false;
});

function btmStartDrag(e) {
e.preventDefault();
isDragging=true;
let startX=e.clientX;
let scrollLeft=btmScrollPosition;

function btmDrag(e) {
const diff=startX-e.clientX;
btmScrollPosition=scrollLeft+diff;
btmImageContainer.style.transform=`translateX(-${btmScrollPosition}px)`;
}

function btmStopDrag() {
document.removeEventListener("mousemove",btmDrag);
document.removeEventListener("mouseup",btmStopDrag);
const containerWidth=btmDrawer.querySelector(
".btm-drawer-content"
).offsetWidth;
btmScrollPosition=Math.max(
0,
Math.min(
btmScrollPosition,
btmImageContainer.scrollWidth-containerWidth
)
);
btmImageContainer.style.transform=`translateX(-${btmScrollPosition}px)`;
btmUpdateScrollButtons();
}

document.addEventListener("mousemove",btmDrag);
document.addEventListener("mouseup",btmStopDrag);
}

btmImageContainer.addEventListener("mousedown",btmStartDrag);
window.addEventListener("resize",btmUpdateScrollButtons);
});

async function chengeCanvasByGuid(guid,saveCurrent=false){
if(window.NaiPageLoading||window.NaiHistoryLoading)return false;
const projectData=btmProjectsMap.get(guid);
if(!projectData||!projectData.blob)return false;
window.NaiPageLoading=true;
try{
if(saveCurrent&&stateStack.length>=btmSaveStateThreshold)await btmSaveProjectFile();
return await loadLz4BlobProjectFile(projectData.blob,guid,true);
}catch(error){
uiLogger.error("Error loading ZIP:",error);
throw error;
}finally{
window.NaiPageLoading=false;
}
}

//return [string, string]
function btmGetGuids() {
return Array.from(btmProjectsMap.keys());
}

//return number
function btmGetGuidIndex(targetGuid) {
const guids=Array.from(btmProjectsMap.keys());
return guids.indexOf(targetGuid);
}

//return number
function btmGetGuidsSize() {
return btmProjectsMap.size;
}

//return guid
function btmGetGuidByIndex(index) {
const guids=Array.from(btmProjectsMap.keys());
return guids[index];
}

// Create an empty w x h page right after `guid` and switch to it. Caller holds window.NaiPageLoading.
// "Undo delete" bar for a page removed from the page bar (20 s). Restores thumbnail, saved
// content and position, then opens the page.
// Copy a page (content and thumbnail) right after itself under a new guid and open the copy.
async function btmDuplicatePage(guid){
if(getCanvasGUID()===guid)await btmSaveProjectFile(null,false);
var src=btmProjectsMap.get(guid);
if(!src||!src.blob){if(typeof createToastError==='function')createToastError('无法复制','这一页还没有保存内容，先画点东西再复制。');return null;}
var newGuid=generateGUID();
btmAddImage(src.imageLink?{href:src.imageLink.href}:src.imageLink,src.blob,newGuid,true);
var idx=btmGetGuidIndex(guid)+1;
if(idx<btmGetGuidsSize()-1)reorderImages(idx,newGuid);
updateAllPageNumbers();
btmUpdateScrollButtons();
btmUpdateHandleText();
await chengeCanvasByGuid(newGuid,true);
return newGuid;
}

function btmOfferPageRestore(removed){
if(!removed||!removed.data)return;
var old=document.getElementById('btmPageRestoreBar');
if(old)old.remove();
var bar=document.createElement('div');
bar.id='btmPageRestoreBar';
bar.setAttribute('role','status');
bar.style.cssText='position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:12000;background:#1d2b38;color:#eef6fb;border:1px solid #4f7590;border-radius:8px;padding:8px 12px;font:13px/1.4 sans-serif;box-shadow:0 6px 20px #0008;display:flex;gap:10px;align-items:center';
var text=document.createElement('span');
text.textContent='已删除第 '+(removed.index+1)+' 页。';
var btn=document.createElement('button');
btn.type='button';
btn.id='btmPageRestoreButton';
btn.textContent='撤销删除';
btn.style.cssText='cursor:pointer;background:#2c6a8f;color:#fff;border:1px solid #5aa0c8;border-radius:6px;padding:4px 10px';
var timer=setTimeout(function(){bar.remove();},20000);
btn.addEventListener('click',async function(){
clearTimeout(timer);
bar.remove();
if(btmProjectsMap.has(removed.guid))return;
btmAddImage(removed.data.imageLink,removed.data.blob,removed.guid,true);
if(removed.index<btmGetGuidsSize()-1)reorderImages(removed.index,removed.guid);
updateAllPageNumbers();
btmUpdateScrollButtons();
btmUpdateHandleText();
if(typeof chengeCanvasByGuid==='function')await chengeCanvasByGuid(removed.guid);
});
bar.appendChild(text);
bar.appendChild(btn);
document.body.appendChild(bar);
}

async function btmCreatePageAfter(guid,w,h){
// Save the current page first: on a fresh project it has no page-bar entry yet, and an index
// of -1 would insert the new page BEFORE it (imported pages came out in reverse order).
await btmSaveProjectFile(null,false);
var currentIndex=btmGetGuidIndex(guid);
var newGuid=generateGUID();
var pc=document.createElement('canvas');
pc.width=100;
pc.height=Math.round(100*h/w);
var pctx=pc.getContext('2d');
pctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--color-tertiary').trim()||'#505050';
pctx.fillRect(0,0,pc.width,pc.height);
var placeholderUrl=pc.toDataURL('image/jpeg',0.5);
btmAddImage({href:placeholderUrl},null,newGuid,true);
reorderImages(currentIndex+1,newGuid);
changeDoNotSaveHistory();
resizeCanvasToObject(w,h);
changeDoSaveHistory();
initImageHistory();
setCanvasGUID(newGuid);
await btmSaveProjectFile(newGuid,false);
updateAllPageNumbers();
btmUpdateHandleText();
return newGuid;
}

function btmShowAddPageDialog(guid) {
var dialog=document.createElement("div");
dialog.className="btm-dialog-overlay";
var portrait=typeof NaiMangaPageSize!=="undefined"?NaiMangaPageSize.defaultMangaPageSize(false):{width:1654,height:2339};
var landscape=typeof NaiMangaPageSize!=="undefined"?NaiMangaPageSize.defaultMangaPageSize(true):{width:2339,height:1654};
var portraitLabel=portrait.width+"\u00d7"+portrait.height;
var landscapeLabel=landscape.width+"\u00d7"+landscape.height;
dialog.innerHTML='<div class="btm-dialog"><div class="btm-dialog-content">'+
'<h3>选择新页尺寸</h3>'+
'<p class="btm-dialog-help">底图按 A4 约 200dpi 建，用来拼 NovelAI 出的格子。出图单格仍走安全尺寸。</p>'+
'<div class="btm-radio-group">'+
'<label><input type="radio" name="page-size" value="portrait" checked>竖页 '+portraitLabel+'</label>'+
'<label><input type="radio" name="page-size" value="landscape">横页 '+landscapeLabel+'</label>'+
'</div>'+
'<div class="btm-dialog-buttons">'+
'<button class="btm-dialog-button" id="btm-dialog-cancel">取消</button>'+
'<button class="btm-dialog-button btm-dialog-submit" id="btm-dialog-submit">创建</button>'+
'</div></div></div>';
document.body.appendChild(dialog);
var cancelButton=document.getElementById("btm-dialog-cancel");
var submitButton=document.getElementById("btm-dialog-submit");
cancelButton.addEventListener("click",function(){
document.body.removeChild(dialog);
});
submitButton.addEventListener("click",async function(){
if(window.NaiPageLoading||window.NaiHistoryLoading)return;
window.NaiPageLoading=true;
try{
var selectedSize=document.querySelector('input[name="page-size"]:checked').value;
document.body.removeChild(dialog);
var w,h;
if(selectedSize==="portrait"){w=portrait.width;h=portrait.height;}
else{w=landscape.width;h=landscape.height;}
await btmCreatePageAfter(guid,w,h);
}finally{
window.NaiPageLoading=false;
}
});
}
