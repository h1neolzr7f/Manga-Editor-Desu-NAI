var neonIntensity=2;
var isNeonEnabled=false;
var textControlsSyncing=false;

function resolveTextControlObject(object) {
if(!object)return null;
if(object.type==="activeSelection"&&typeof object.getObjects==="function"){
var found=null;
object.getObjects().some(function(child){
found=resolveTextControlObject(child);
return !!found;
});
return found;
}
if(typeof fontManager!=="undefined"&&fontManager.resolveTextObject){
return fontManager.resolveTextObject(object);
}
if(typeof isSpeechBubbleSVG==="function"&&isSpeechBubbleSVG(object)&&typeof getSpeechBubbleTextBySVG==="function"){
return getSpeechBubbleTextBySVG(object)||null;
}
if(typeof isText==="function"&&isText(object))return object;
return null;
}

function cssColorFromFill(color) {
if(color===undefined||color===null||color==="")return "";
if(typeof color!=="string"){
if(color.colorStops)return "";
if(typeof color.toRgba==="function"){
try{return color.toRgba();}catch(e){return "";}
}
return "";
}
if(color==="null")return "";
return color;
}

function isSolidCssColor(color) {
return typeof color==="string"&&color.length>0&&color!=="null";
}

function isTransparentCssColor(color) {
return !color||color==="transparent"||color==="rgba(0,0,0,0)";
}

function letteringPaintColor(id) {
var el=$(id);
var color=el?el.value:"";
return isTransparentCssColor(color)?"":color;
}

function setJsColorValue(id,color) {
var el=$(id);
if(!el||!isSolidCssColor(color))return;
var value=color==="transparent"?"rgba(0,0,0,0)":color;
textControlsSyncing=true;
try{
el.value=value;
if(el.jscolor&&typeof el.jscolor.fromString==="function"){
el.jscolor.fromString(value);
}
}catch(e){}
textControlsSyncing=false;
}

function setRangeValue(id,value) {
var el=$(id);
if(!el||value===undefined||value===null||isNaN(value))return;
textControlsSyncing=true;
el.value=value;
textControlsSyncing=false;
}

function readControlArg(value,fallbackId) {
if(typeof value==="string")return value;
if(typeof value==="number"&&!isNaN(value))return String(value);
if(value&&value.target&&value.target.value!==undefined)return value.target.value;
var el=$(fallbackId);
return el?el.value:"";
}

function applyTextPropsToObject(object,props) {
var textObj=resolveTextControlObject(object);
if(!textObj||!props)return false;
textObj.set(props);
if(textObj.styles){
Object.keys(textObj.styles).forEach(function(lineKey){
var line=textObj.styles[lineKey];
if(!line)return;
Object.keys(line).forEach(function(charKey){
if(!line[charKey])return;
Object.keys(props).forEach(function(prop){
line[charKey][prop]=props[prop];
});
});
});
}
textObj.set("dirty",true);
if(typeof textObj.initDimensions==="function")textObj.initDimensions();
if(typeof textObj.updateDimensions==="function")textObj.updateDimensions();
if(typeof textObj.setCoords==="function")textObj.setCoords();
return true;
}

function updateTextControls(object) {
if(!object&&typeof canvas!=="undefined"&&canvas){
object=canvas.getActiveObject();
}
var textObj=resolveTextControlObject(object);
if(!textObj)return;
var fill=cssColorFromFill(textObj.fill);
if(isSolidCssColor(fill)){
setJsColorValue("textColorPicker",fill);
}
var stroke=cssColorFromFill(textObj.stroke);
if(isSolidCssColor(stroke)){
setJsColorValue("textOutlineColorPicker",stroke);
}
var bg=isVerticalText(textObj)?textObj.textBackgroundColor:textObj.backgroundColor;
bg=cssColorFromFill(bg);
if(!bg||isTransparentCssColor(bg)){
setJsColorValue("textBgColorPicker","rgba(0,0,0,0)");
}else if(isSolidCssColor(bg)){
setJsColorValue("textBgColorPicker",bg);
}
if(textObj.fontSize!==undefined){
setRangeValue("fontSizeSlider",parseInt(textObj.fontSize,10));
}
if(textObj.strokeWidth!==undefined){
setRangeValue("fontStrokeWidthSlider",parseInt(textObj.strokeWidth,10)||0);
}
if(textObj.fontFamily&&typeof FontSelectorManager!=="undefined"){
FontSelectorManager.syncSelected(textObj.fontFamily);
}
updateBoldToggleUI();
}

function applyCSSTextEffect() {
var firstTextEffectColorPicker=$('firstTextEffectColorPicker').value;
var secondTextEffectColorPicker=$('secondTextEffectColorPicker').value;

const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
if (!activeObject.shadow) {
// Apply a shadow using the first color picker's value
activeObject.set("shadow",firstTextEffectColorPicker+" 5px 5px 10px");
} else {
// Toggle shadow off
activeObject.set("shadow",null);
}
canvas.renderAll();
}
}


function applyVividGradientEffect() {
const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
var firstTextEffectColorPicker=$('firstTextEffectColorPicker').value;
var secondTextEffectColorPicker=$('secondTextEffectColorPicker').value;

const gradient=new fabric.Gradient({
type: "linear",
gradientUnits: "pixels",
coords: {x1: 0,y1: activeObject.height/2,x2: activeObject.width,y2: activeObject.height/2},
colorStops: [
{offset: 0,color: firstTextEffectColorPicker},
{offset: 0.5,color: secondTextEffectColorPicker,opacity: 0.5},
{offset: 1,color: firstTextEffectColorPicker}
]
});

if (isVerticalText(activeObject)) {
activeObject.set("fill",gradient);
canvas.renderAll();
} else {
activeObject.set("fill",gradient);
canvas.renderAll();
}
}
}

function applyInnerShadow() {
const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
if (!activeObject.shadow) {
activeObject.set({
shadow: {
color: "rgba(0, 0, 0, 0.8)",
blur: 10,
offsetX: 5,
offsetY: 5,
},
});
} else {
activeObject.set("shadow",null);
}
canvas.renderAll();
}
}


function drawNeonJitterEffect(textObject) {
const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
const gradient=new fabric.Gradient({
type: "linear",
gradientUnits: "pixels",
coords: {x1: 0,y1: 0,x2: canvas.width,y2: 0},
colorStops: [
{offset: 0,color: "red"},
{offset: 0.15,color: "orange"},
{offset: 0.3,color: "yellow"},
{offset: 0.5,color: "green"},
{offset: 0.65,color: "blue"},
{offset: 0.8,color: "indigo"},
{offset: 1,color: "violet"},
],
});
activeObject.set("fill",gradient);

// Jitter Effect
activeObject.initDimensions();
for (let i=0;i<10;i++) {
activeObject.clone(function (clonedText) {
clonedText.set({
shadow: `rgba(${255 * Math.random()}, ${255 * Math.random()}, ${255 * Math.random()
            }, 0.5) 10px 10px 10px`,
});
clonedText.set({
left: activeObject.left+Math.random()*5,
top: activeObject.top+Math.random()*5,
});
canvas.add(clonedText);
});
}
}
}



function applyInnerShadow() {
const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
activeObject.set({
shadow: {
color: "rgba(0, 0, 0, 0.8)",
blur: 10,
offsetX: 5,
offsetY: 5,
},
});
canvas.renderAll();
}
}

function applyNeonEffect() {
const activeObject=canvas.getActiveObject();
if (isText(activeObject)) {

var firstTextEffectColorPicker=$('firstTextEffectColorPicker').value;
var secondTextEffectColorPicker=$('secondTextEffectColorPicker').value;

if (!activeObject.fill||!activeObject.shadow) {
activeObject.set({
fill: firstTextEffectColorPicker,
shadow: {
color: secondTextEffectColorPicker,
blur: 20,
},
});
}
canvas.renderAll();
}
}

function alignText(alignment,button) {
var textAlignment=getSelectedValueByButton(button);
var activeObject=canvas.getActiveObject();

if(isVerticalText(activeObject)){
switch(alignment){
case "left":
textAlignment="top";
break
case "center":
textAlignment="middle";
break
case "right":
textAlignment="bottom";
break
}
activeObject.set('verticalAlign',textAlignment);
activeObject.set('dirty',true);
}else if(isText(activeObject)){
activeObject.set('textAlign',alignment);
}
canvas.renderAll();

changeSelected(button);
}

function createTextbox() {
var selectedFont=fontManager.getSelectedFont("fontSelector");
var fontsize=$("fontSizeSlider").value
var fontStrokeWidth=$("fontStrokeWidthSlider").value

textLogger.debug("selectedFont",selectedFont)
const selectedValue=getSelectedValueByGroup("align_group");
var textbox=new fabric.Textbox("New",{
top: 50,
left: 50,
fontSize: parseInt(fontsize,10)||32,
fontFamily: selectedFont,
fill: letteringPaintColor("textColorPicker")||"rgba(0,0,0,1)",
stroke: letteringPaintColor("textOutlineColorPicker"),
strokeWidth: parseInt(fontStrokeWidth,10)||0,
backgroundColor: letteringPaintColor("textBgColorPicker"),
textAlign: selectedValue,

cornerSize: 8,
transparentCorners: false,
cornerStyle: 'circle',
borderScaleFactor: 2,
padding: 10,
});

textbox.on('text:changed',function () {
var current=textbox.fontFamily||fontManager.getSelectedFont("fontSelector");
textbox.set({fontFamily: current});
canvas.requestRenderAll();
});

canvas.add(textbox);
canvas.setActiveObject(textbox);
canvas.requestRenderAll();
// updateLayerPanel();
}

function toggleShadow() {
var activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
var hasShadow=activeObject.shadow!=null;
activeObject.set(
"shadow",
hasShadow ? null : "rgba(0,0,0,0.3) 5px 5px 5px"
);
canvas.renderAll();
}
}

function toggleBold() {
var activeObject=resolveTextControlObject(canvas.getActiveObject());
if(isText(activeObject)){
var isBold=activeObject.fontWeight==="bold";
applyTextPropsToObject(activeObject,{fontWeight:isBold ? "" : "bold"});
canvas.renderAll();
}
updateBoldToggleUI();
}

function toggleBoldWithUI(btn) {
toggleBold();
}

function updateBoldToggleUI() {
var btn=$("bold-toggle-btn");
if(!btn) return;
var activeObject=resolveTextControlObject(canvas.getActiveObject());
if(!activeObject||!isText(activeObject)) {
btn.classList.remove("selected");
return;
}
var isBold=activeObject.fontWeight==="bold";
if(isBold) btn.classList.add("selected");
else btn.classList.remove("selected");
}

function changeFontSize(size) {
if(textControlsSyncing)return;
var textObj=resolveTextControlObject(canvas.getActiveObject());
if(!textObj)return;
var parsed=parseInt(readControlArg(size,"fontSizeSlider"),10);
if(isNaN(parsed))return;
applyTextPropsToObject(textObj,{fontSize:parsed});
setRangeValue("fontSizeSlider",parsed);
if(isSpeechBubbleText(textObj)&&typeof mainSpeechBubbleObjectResize==="function"){
let newSettings=mainSpeechBubbleObjectResize(textObj);
const svgObj=textObj.targetObject;
if(svgObj){
svgObj.set(newSettings);
updateShapeMetrics(svgObj);
}
}
canvas.renderAll();
}

function changeStrokeWidthSize(size) {
if(textControlsSyncing)return;
var textObj=resolveTextControlObject(canvas.getActiveObject());
if(!textObj)return;
var parsed=parseInt(readControlArg(size,"fontStrokeWidthSlider"),10);
if(isNaN(parsed))parsed=0;
applyTextPropsToObject(textObj,{strokeWidth:parsed});
setRangeValue("fontStrokeWidthSlider",parsed);
canvas.renderAll();
}


function changeTextColor(color) {
if(textControlsSyncing)return;
var textObj=resolveTextControlObject(canvas.getActiveObject());
if(!textObj)return;
var next=readControlArg(color,"textColorPicker");
if(!isSolidCssColor(next))return;
applyTextPropsToObject(textObj,{fill:next});
setJsColorValue("textColorPicker",next);
canvas.renderAll();
}
function changeOutlineTextColor(color) {
if(textControlsSyncing)return;
var textObj=resolveTextControlObject(canvas.getActiveObject());
if(!textObj)return;
var next=readControlArg(color,"textOutlineColorPicker");
if(!isSolidCssColor(next))return;
var props={stroke:isTransparentCssColor(next)?"":next};
if((!textObj.strokeWidth||textObj.strokeWidth===0)&&!isTransparentCssColor(next)){
props.strokeWidth=1;
setRangeValue("fontStrokeWidthSlider",1);
}
applyTextPropsToObject(textObj,props);
setJsColorValue("textOutlineColorPicker",isTransparentCssColor(next)?"rgba(0,0,0,0)":next);
canvas.renderAll();
}
function changeTextBgColor(color) {
if(textControlsSyncing)return;
var textObj=resolveTextControlObject(canvas.getActiveObject());
if(!textObj)return;
var next=readControlArg(color,"textBgColorPicker");
var isTransparent=isTransparentCssColor(next);
if(isVerticalText(textObj)){
applyTextPropsToObject(textObj,{textBackgroundColor:isTransparent?"":next});
}else{
applyTextPropsToObject(textObj,{backgroundColor:isTransparent?"":next});
}
setJsColorValue("textBgColorPicker",isTransparent?"rgba(0,0,0,0)":next);
canvas.renderAll();
}

function changeNeonColor(color) {
neonColor=color;
var activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
updateNeonEffect(activeObject);
}
}

function changeNeonIntensity(intensity) {
neonIntensity=parseFloat(intensity);
var activeObject=canvas.getActiveObject();
if (isText(activeObject)) {
updateNeonEffect(activeObject);
}
}

function updateNeonEffect(activeObject) {
if (isText(activeObject)) {
if (!isNeonEnabled) {
activeObject.set("shadow",null);
activeObject.set("stroke",null);
} else {
var neonColor=$("firstTextEffectColorPicker").value;
activeObject.set(
"shadow",
new fabric.Shadow({
color: neonColor,
blur: neonIntensity,
offsetX: 0,
offsetY: 0,
affectStroke: false,
opacity: neonIntensity,
})
);
activeObject.set("stroke",neonColor);
activeObject.set("strokeWidth",2);
}
canvas.renderAll();
}
}



function changeFont(font) {
$("text-preview-area").style.fontFamily=font;
}



function isFontAvailableForLanguage(font,text) {
const canvas=document.createElement('canvas');
const context=canvas.getContext('2d');
context.font='72px monospace';
const baselineSize=context.measureText(text).width;
context.font=`72px ${font}, monospace`;
const newSize=context.measureText(text).width;
return newSize!==baselineSize;
}
