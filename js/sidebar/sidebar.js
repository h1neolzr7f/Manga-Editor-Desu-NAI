document.addEventListener("DOMContentLoaded",function () {
bindSidebarMore();
toggleVisibility("svg-container-template");
bindSpeechBubbleTabs();
});

function setSidebarMoreOpen(open){
var btn=document.getElementById("sidebarMoreToggle");
var box=document.getElementById("sidebarMore");
if(!btn||!box)return;
box.hidden=!open;
btn.setAttribute("aria-expanded",open?"true":"false");
btn.textContent=open?"收起 ▲":"更多 ▼";
try{localStorage.setItem("nai_sidebar_more",open?"1":"0");}catch(e){}
}

function bindSidebarMore(){
var btn=document.getElementById("sidebarMoreToggle");
var box=document.getElementById("sidebarMore");
if(!btn||!box||btn.getAttribute("data-bound")==="1")return;
btn.setAttribute("data-bound","1");
var open=false;
try{open=localStorage.getItem("nai_sidebar_more")==="1";}catch(e){}
setSidebarMoreOpen(open);
btn.addEventListener("click",function(){
setSidebarMoreOpen(box.hidden);
});
}

function revealSidebarMoreIfNeeded(id){
var more=document.getElementById("sidebarMore");
if(!more||!id)return;
if(more.querySelector('[data-target="'+id+'"]'))setSidebarMoreOpen(true);
}

function bindSpeechBubbleTabs(){
var bar=document.getElementById("speechBubbleTabs");
if(!bar||bar.getAttribute("data-bound")==="1")return;
bar.setAttribute("data-bound","1");
bar.addEventListener("click",function(event){
var button=event.target.closest("[data-bubble-tab]");
if(!button)return;
var tab=button.getAttribute("data-bubble-tab");
bar.querySelectorAll("[data-bubble-tab]").forEach(function(node){
node.classList.toggle("is-active",node.getAttribute("data-bubble-tab")===tab);
});
var area1=document.getElementById("speech-bubble-area1");
var area2=document.getElementById("speech-bubble-area2");
if(area1)area1.hidden=tab!=="template";
if(area2)area2.hidden=tab!=="free";
if(tab==="template"&&typeof lazyLoadSvgData==="function")lazyLoadSvgData("speech-bubble-area1");
});
}

function toggleVisibility(id) {
if(window.NaiComicSimulatorStudio&&typeof window.NaiComicSimulatorStudio.close==='function'){
window.NaiComicSimulatorStudio.close();
}
var element=$(id);
if(!element)return;
var opening=element.style.display==="none";
if(typeof selectMoveTool==="function"&&typeof canvas!=="undefined"&&canvas&&canvas.isDrawingMode){
if(!opening||id!=="tool-area")selectMoveTool();
}
if(opening)revealSidebarMoreIfNeeded(id);
var wrappers=document.querySelectorAll('#sidebar .icon-wrapper[data-target]');
wrappers.forEach(function(wrapper){
var icon=wrapper.querySelector('i');
if(!icon)return;
if(wrapper.dataset.target===id){
icon.classList.toggle("active",element.style.display==="none");
}else{
icon.classList.remove("active");
}
});

if (element.style.display==="none") {
$("svg-container-template").style.display="none";
$("panel-manager-area").style.display="none";
$("auto-generate-area").style.display="none";
$("prompt-manager-area").style.display="none";
$("simulator-chat-area").style.display="none";
$("asset-library-area").style.display="none";
var speech=$("speech-bubble-area");
if(speech)speech.style.display="none";
$("text-area").style.display="none";
$("text-area2").style.display="none";
$("tool-area").style.display="none";
$("cutout-area").style.display="none";
$("manga-tone-area").style.display="none";
$("manga-effect-area").style.display="none";
$("shape-area").style.display="none";
$("control-area").style.display="none";
element.style.display="block";
lazyLoadSvgData(id);
} else {
element.style.display="none";
}
adjustCanvasSize();
}

function switchTemplateOrientation(){
var checkbox=$("template-orientation-toggle");
var vertical=$("svg-preview-area-vertical");
var landscape=$("svg-preview-area-landscape");
var toggleLabel=document.querySelector(".template-toggle-label");
if(checkbox.checked){
vertical.style.display="none";
landscape.style.display="block";
toggleLabel.classList.add("landscape");
lazyLoadSvgData("svg-container-landscape");
}else{
vertical.style.display="block";
landscape.style.display="none";
toggleLabel.classList.remove("landscape");
lazyLoadSvgData("svg-container-vertical");
}
}
