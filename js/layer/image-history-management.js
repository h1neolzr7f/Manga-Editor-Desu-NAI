const imageMap=new Map();
var stateStack=[];
var currentStateIndex=-1;
var isSaveHistory=true;
window.NaiHistoryLoading=false;


fabric.Object.prototype.toObject=(function (toObject) {
return function (propertiesToInclude) {
propertiesToInclude=(propertiesToInclude||[]).concat(["clipTo"]);
return toObject.apply(this,[propertiesToInclude]);
};
})(fabric.Object.prototype.toObject);

function isSave(){
return isSaveHistory;
}
function notSave(){
return!(isSave());
}

function setNotSave(activeObject){
activeObject.saveHistory=false;
return activeObject;
}
function setSave(activeObject){
activeObject.saveHistory=true;
return activeObject;
}


function isSaveObject(activeObject){
if(activeObject){
if(activeObject.saveHistory==true){
return true;
}
if(activeObject.saveHistory==false){
return false;
}
if(activeObject.target===undefined){
return true;
}

if(activeObject.target.saveHistory===undefined){
return true;
}
return false;
}else{
return false;
}
}

function isNotSaveObject(activeObject){
return!(isSaveObject(activeObject)) ;
}

function changeDoNotSaveHistory(){
isSaveHistory=false;
}

function changeDoSaveHistory(){
isSaveHistory=true;
}

function removeByNotSave(obj){
if (obj) {
changeDoNotSaveHistory();
canvas.remove(obj);
changeDoSaveHistory();
}
}

function addByNotSave(obj){
if (obj) {
changeDoNotSaveHistory();
canvas.add(obj);
changeDoSaveHistory();
}
}

function saveStateByListener(event,eventType) {
if(!event){
return;
}
if (notSave()) {
return;
}
if(eventType==='object:removed'){
//ok
}
if(isNotSaveObject(event)){
return;
}
saveState();
}

function saveStateByManual() {
saveState();
}

function generateHash(imageData) {
return CryptoJS.SHA256(imageData).toString(CryptoJS.enc.Hex);
}

async function blobUrlToDataUrl(blobUrl){
try{
const response=await fetch(blobUrl);
const blob=await response.blob();
return new Promise((resolve,reject)=>{
const reader=new FileReader();
reader.onloadend=()=>resolve(reader.result);
reader.onerror=reject;
reader.readAsDataURL(blob);
});
}catch(e){
layerLogger.error("Failed to convert blob URL:",blobUrl,e);
return null;
}
}

async function convertImageMapBlobUrls(){
const entries=Array.from(imageMap.entries());
for(const [hash,value] of entries){
if(typeof value==='string'&&value.startsWith('blob:')){
const dataUrl=await blobUrlToDataUrl(value);
if(dataUrl){
imageMap.set(hash,dataUrl);
}
}
}
}

function customToJSON() {
const json=canvas.toJSON(commonProperties);
json.objects=json.objects.map(obj=>{
if (obj.type==='image'&&obj.src&&typeof obj.src==='string'&&(obj.src.startsWith('data:')||obj.src.startsWith('blob:'))) {
const hash=generateHash(obj.src);
if (!imageMap.has(hash)) {
imageMap.set(hash,obj.src);
}
obj.src=hash;
}

if(obj.speechBubbleGrid&&typeof obj.speechBubbleGrid==='object'){
const gridStr=JSON.stringify(obj.speechBubbleGrid);
const hash=generateHash(gridStr);
if (!imageMap.has(hash)) {
imageMap.set(hash,gridStr);
}
obj.speechBubbleGrid="GUID:"+hash;
}

return obj;
});

return json;
}

function restoreImage(json) {
const parsedJson=JSON.parse(json);
parsedJson.objects=parsedJson.objects.map(obj=>{
if (obj.type==='image'&&imageMap.has(obj.src)) {
obj.src=imageMap.get(obj.src);
}
if (obj.speechBubbleGrid&&typeof obj.speechBubbleGrid==='string') {
const hash=obj.speechBubbleGrid.replace('GUID:','');
const gridData=imageMap.get(hash);
if(gridData){
if(typeof gridData==='string'){
try{
obj.speechBubbleGrid=JSON.parse(gridData);
}catch(e){
obj.speechBubbleGrid=gridData;
}
}else{
obj.speechBubbleGrid=gridData;
}
}
}
if (obj.textBaseline==='alphabetical') {
obj.textBaseline='alphabetic';
}
commonProperties.forEach(prop=>{
if (obj[prop]!==undefined) {
obj[prop]=obj[prop];
}
});
return obj;
});
return parsedJson;
}

// UI hydration assigns these fields without changing the visible document.
function historyVisualSignature(state){
return JSON.stringify(state,function(key,value){return key==='name'||key==='guid'||key==='guids'?undefined:value;});
}

function saveState() {
if(notSave()){
return ;
}
canvas.renderAll();
const state=customToJSON();
const json=JSON.stringify(state);
if(currentStateIndex>=0&&historyVisualSignature(JSON.parse(stateStack[currentStateIndex]))===historyVisualSignature(state)){
stateStack[currentStateIndex]=json;
return false;
}
if (currentStateIndex<stateStack.length-1)stateStack.splice(currentStateIndex+1);
stateStack.push(json);
currentStateIndex++;
updateLayerPanel();
return true;
}

function hydratePageStudioAfterLoad(){
if(window.NaiPageStudio&&typeof window.NaiPageStudio.hydrateAll==='function'){
window.NaiPageStudio.hydrateAll();
}
}

function restoreHistoryState(index,guid=null,allowPageLoad=false){
if(window.NaiHistoryLoading||(window.NaiPageLoading&&!allowPageLoad))return false;
if(!Number.isInteger(index)||index<0||index>=stateStack.length)return false;
const state=restoreImage(stateStack[index]);
const wasSaving=isSaveHistory;
window.NaiHistoryLoading=true;
changeDoNotSaveHistory();
return new Promise((resolve,reject)=>{
try{
clearJSTSGeometry();
canvas.loadFromJSON(state,function(){
try{
currentStateIndex=index;
state.objects.forEach((stateObj,objectIndex)=>{
const canvasObj=canvas.getObjects()[objectIndex];
if(canvasObj&&stateObj.selectable!==undefined)canvasObj.selectable=stateObj.selectable;
});
reSetSpeechBubbleText();
setCanvasGUID(guid||state.canvasGuid);
hydratePageStudioAfterLoad();
canvas.renderAll();
updateLayerPanel();
resetEventHandlers();
customSpeechBubbleAllRelocation();
resolve(true);
}catch(error){
reject(error);
}finally{
isSaveHistory=wasSaving;
window.NaiHistoryLoading=false;
}
});
}catch(error){
isSaveHistory=wasSaving;
window.NaiHistoryLoading=false;
reject(error);
}
});
}

function undo(){
if(currentStateIndex>=1)return restoreHistoryState(currentStateIndex-1);
return false;
}

function jumpToHistoryIndex(index){
return restoreHistoryState(index);
}

function redo(){
return restoreHistoryState(currentStateIndex+1);
}

function lastRedo(guid=null,allowPageLoad=false){
return restoreHistoryState(stateStack.length-1,guid,allowPageLoad);
}

function reSetSpeechBubbleText(){
canvas.getObjects().forEach(obj=>{
if(isSpeechBubbleSVG(obj)||isFreehandBubblePath(obj)){
const childObjects=canvas.getObjects().filter((childObj)=>obj.guids.includes(childObj.guid));
childObjects.forEach(childObject=>{
childObject.targetObject=obj;
});
}
});
}


function allRemove() {
changeDoNotSaveHistory();
canvas.clear();
var bgColorInput=$("bg-color");
canvas.backgroundColor=bgColorInput.value;
changeDoSaveHistory();
saveStateByManual();
updateLayerPanel();
currentImage=null;

imageMap.clear();
stateStack=[];
currentStateIndex=-1;
}
function initImageHistory(){
allRemove();
imageMap.clear();
stateStack=[];
currentStateIndex=-1;
}

document.addEventListener('DOMContentLoaded',function() {
saveState();
});



function resetEventHandlers() {
const objectMap={};
canvas.getObjects().forEach(obj=>{
if (obj.guid) {
objectMap[obj.guid]=obj;
}
});
canvas.getObjects().forEach(obj=>{
if(isSpeechBubbleSVG(obj)||isFreehandBubblePath(obj)){
return;
}
if (obj.guids) {
obj.guids.forEach(guid=>{
if (objectMap[guid]) {
moveSettings(objectMap[guid],obj);
}
});
}
});
}
