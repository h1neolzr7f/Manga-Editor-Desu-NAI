var tmpCanvasRainTone=null;
var tmpCtxRainTone=null;
var isDrawingRainTone=false;
var nowRainTone=null;
var rainToneDensity=null;
var rainToneLength=null;
var rainToneWidth=null;
var rainToneAngle=null;
var rainToneColor=null;
var rainToneOpacity=null;

function rainToneStart(){
var activeObject=typeof mangaToneRequireTarget==='function'?mangaToneRequireTarget():(typeof getLastObject==='function'?getLastObject():null);
if(!activeObject)return false;
tmpCanvasRainTone=document.createElement('canvas');
if(typeof isPanel==='function'&&isPanel(activeObject)){
tmpCanvasRainTone.width=(activeObject.width*activeObject.scaleX)*3;
tmpCanvasRainTone.height=(activeObject.height*activeObject.scaleY)*3;
}else{
tmpCanvasRainTone.width=Math.max(1,(activeObject.width||1)*(activeObject.scaleX||1))*3;
tmpCanvasRainTone.height=Math.max(1,(activeObject.height||1)*(activeObject.scaleY||1))*3;
}
tmpCtxRainTone=tmpCanvasRainTone.getContext('2d');
tmpCtxRainTone.scale(3,3);
return true;
}

function rainToneEnd(){
nowRainTone=null;
if(tmpCanvasRainTone&&tmpCanvasRainTone.parentNode)tmpCanvasRainTone.parentNode.removeChild(tmpCanvasRainTone);
tmpCanvasRainTone=null;
tmpCtxRainTone=null;
isDrawingRainTone=false;
}

function addRainToneEventListener(){
rainToneDensity=$(MODE_TONE_RAIN+'-density');
rainToneLength=$(MODE_TONE_RAIN+'-length');
rainToneWidth=$(MODE_TONE_RAIN+'-width');
rainToneAngle=$(MODE_TONE_RAIN+'-angle');
rainToneColor=$(MODE_TONE_RAIN+'-color');
rainToneOpacity=$(MODE_TONE_RAIN+'-opacity');
[rainToneDensity,rainToneLength,rainToneWidth,rainToneAngle,rainToneColor,rainToneOpacity].forEach(function(input){
if(input)$on(input,'input',generateRainTone);
});
}

function generateRainTone(){
if(!tmpCtxRainTone||!tmpCanvasRainTone)return;
tmpCtxRainTone.clearRect(0,0,tmpCanvasRainTone.width,tmpCanvasRainTone.height);
var density=parseInt(rainToneDensity&&rainToneDensity.value||400,10);
var length=parseInt(rainToneLength&&rainToneLength.value||36,10);
var lineWidth=parseFloat(rainToneWidth&&rainToneWidth.value||1.1);
var angle=parseInt(rainToneAngle&&rainToneAngle.value||18,10);
var opacity=parseInt(rainToneOpacity&&rainToneOpacity.value||55,10)/100;
var color=rainToneColor&&rainToneColor.value||'#9eb6c9';
var rgb=typeof parseColor==='function'?parseColor(color):{r:158,g:182,b:201};
var width=tmpCanvasRainTone.width/3;
var height=tmpCanvasRainTone.height/3;
for(var i=0;i<density;i++){
var x=Math.random()*width;
var y=Math.random()*height;
var drop=length*(0.45+Math.random());
tmpCtxRainTone.save();
tmpCtxRainTone.translate(x,y);
tmpCtxRainTone.rotate((angle*Math.PI)/180);
tmpCtxRainTone.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(opacity*(0.25+Math.random()*0.75))+')';
tmpCtxRainTone.lineWidth=lineWidth*(0.6+Math.random());
tmpCtxRainTone.beginPath();
tmpCtxRainTone.moveTo(0,0);
tmpCtxRainTone.lineTo(0,drop);
tmpCtxRainTone.stroke();
tmpCtxRainTone.restore();
}
updateRainTone();
}

function updateRainTone(){
if(isDrawingRainTone||!tmpCanvasRainTone)return;
isDrawingRainTone=true;
if(nowRainTone){
canvas.remove(nowRainTone);
nowRainTone=null;
}
var dataURL=tmpCanvasRainTone.toDataURL({format:'png'});
fabric.Image.fromURL(dataURL,function(img){
var activeObject=typeof mangaToneTarget==='function'?mangaToneTarget():(typeof getLastObject==='function'?getLastObject():null);
if(typeof isPanel==='function'&&isPanel(activeObject)&&typeof putImageInFrame==='function'){
var canvasX=activeObject.left+(activeObject.width*activeObject.scaleX)/2;
var canvasY=activeObject.top+(activeObject.height*activeObject.scaleY)/2;
putImageInFrame(img,canvasX,canvasY,true,false,true,activeObject);
img.name='雨网点';
nowRainTone=img;
}else if(activeObject&&typeof isImage==='function'&&isImage(activeObject)){
img.set({left:activeObject.left,top:activeObject.top});
img.scaleToWidth(Math.max(8,(activeObject.width||1)*(activeObject.scaleX||1)));
img.name='雨网点';
canvas.add(img);
canvas.renderAll();
nowRainTone=img;
}else{
if(typeof createToast==='function')createToast('网点贴在格子上','请先点一个分镜格子或一张图，再点雨线。整页下雨请用「更多 → 页面」的画面效果。',4500);
}
isDrawingRainTone=false;
});
}
