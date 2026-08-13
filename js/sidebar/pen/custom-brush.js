(function(root){
"use strict";

function clamp(value,min,max){
return Math.max(min,Math.min(max,value));
}

function hexToRgb(color){
var canvasColor=(root.fabric&&root.fabric.Color)?new root.fabric.Color(color||"#111111"):null;
if(canvasColor){
var source=canvasColor.getSource();
return{r:source[0],g:source[1],b:source[2],a:source[3]===undefined?1:source[3]};
}
return{r:17,g:17,b:17,a:1};
}

function makeTipCanvas(preset,color){
var size=Math.max(8,Math.round(preset.size||16));
var canvasEl=document.createElement("canvas");
canvasEl.width=size;
canvasEl.height=size;
var ctx=canvasEl.getContext("2d");
var rgb=hexToRgb(color||preset.color);
var hardness=clamp(preset.hardness===undefined?0.75:preset.hardness,0,1);
var radius=size/2;
var inner=Math.max(0.5,radius*hardness);
var gradient=ctx.createRadialGradient(radius,radius,inner,radius,radius,radius);
gradient.addColorStop(0,"rgba("+rgb.r+","+rgb.g+","+rgb.b+",1)");
gradient.addColorStop(1,"rgba("+rgb.r+","+rgb.g+","+rgb.b+",0)");
ctx.clearRect(0,0,size,size);
if(preset.shape==="line"){
ctx.translate(radius,radius);
ctx.rotate(-Math.PI/2);
ctx.fillStyle="rgba("+rgb.r+","+rgb.g+","+rgb.b+",1)";
ctx.fillRect(-radius*0.12,-radius,radius*0.24,size);
}else{
ctx.fillStyle=hardness>=0.98?"rgba("+rgb.r+","+rgb.g+","+rgb.b+",1)":gradient;
ctx.beginPath();
ctx.arc(radius,radius,radius,0,Math.PI*2);
ctx.fill();
}
return canvasEl;
}

function loadTipImage(preset,color,done){
if(preset.tip&&preset.tip.indexOf("data:image/")===0){
var image=new Image();
image.onload=function(){
var size=Math.max(8,Math.round(preset.size||16));
var canvasEl=document.createElement("canvas");
canvasEl.width=size;
canvasEl.height=size;
var ctx=canvasEl.getContext("2d");
ctx.drawImage(image,0,0,size,size);
var rgb=hexToRgb(color||preset.color);
ctx.globalCompositeOperation="source-in";
ctx.fillStyle="rgba("+rgb.r+","+rgb.g+","+rgb.b+",1)";
ctx.fillRect(0,0,size,size);
done(canvasEl);
};
image.src=preset.tip;
return;
}
done(makeTipCanvas(preset,color));
}

function applyPreset(brush,preset){
brush.preset=preset;
brush.width=preset.size||16;
brush.color=preset.color||"#111111";
brush.opacity=preset.opacity===undefined?1:preset.opacity;
brush.spacing=preset.spacing===undefined?0.16:preset.spacing;
brush.hardness=preset.hardness===undefined?0.75:preset.hardness;
brush.scatter=preset.scatter||0;
brush.angleJitter=preset.angleJitter||0;
brush.taperStart=preset.taperStart||0;
brush.taperEnd=preset.taperEnd||0;
brush.smoothing=preset.smoothing||0;
brush.followPath=preset.followPath!==false;
}

if(root.fabric){
root.fabric.CustomStampBrush=root.fabric.util.createClass(root.fabric.BaseBrush,{
type:"customStamp",
initialize:function(canvas,preset){
this.canvas=canvas;
this.points=[];
this.lastStamp=null;
this.tipCanvas=null;
this._offscreenCanvas=null;
this._offscreenCtx=null;
applyPreset(this,preset||root.NaiBrushPresets.get("marker-flat"));
this._prepareTip();
},
_prepareTip:function(){
var self=this;
loadTipImage(this.preset,this.color,function(tip){self.tipCanvas=tip;});
},
_initOffscreen:function(){
if(!this._offscreenCanvas){
this._offscreenCanvas=document.createElement("canvas");
this._offscreenCanvas.width=this.canvas.width;
this._offscreenCanvas.height=this.canvas.height;
this._offscreenCtx=this._offscreenCanvas.getContext("2d");
}
},
_copyToContextTop:function(){
var ctx=this.canvas.contextTop;
ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
ctx.drawImage(this._offscreenCanvas,0,0);
},
onMouseDown:function(pointer){
this._initOffscreen();
this._offscreenCtx.clearRect(0,0,this._offscreenCanvas.width,this._offscreenCanvas.height);
this.points=[pointer];
this.lastStamp=null;
this._stamp(pointer,0);
this._copyToContextTop();
},
onMouseMove:function(pointer){
if(!this.points.length)return;
var previous=this.points[this.points.length-1];
this.points.push(pointer);
this._stampAlong(previous,pointer);
this._copyToContextTop();
},
onMouseUp:function(){
this.points=[];
this.lastStamp=null;
},
_stampAlong:function(from,to){
var dx=to.x-from.x;
var dy=to.y-from.y;
var distance=Math.sqrt(dx*dx+dy*dy);
var step=Math.max(1,this.width*(this.spacing||0.16));
var angle=Math.atan2(dy,dx);
if(!this.lastStamp){
this._stamp(from,angle);
this.lastStamp={x:from.x,y:from.y};
}
var travelled=Math.sqrt(Math.pow(to.x-this.lastStamp.x,2)+Math.pow(to.y-this.lastStamp.y,2));
while(travelled>=step){
var t=step/Math.max(distance,0.0001);
var next={x:this.lastStamp.x+dx*t,y:this.lastStamp.y+dy*t};
this._stamp(next,angle);
this.lastStamp=next;
travelled=Math.sqrt(Math.pow(to.x-this.lastStamp.x,2)+Math.pow(to.y-this.lastStamp.y,2));
}
},
_stamp:function(pointer,angle){
if(!this.tipCanvas||!this._offscreenCtx)return;
var scatter=this.scatter||0;
var x=pointer.x+(Math.random()*2-1)*this.width*scatter;
var y=pointer.y+(Math.random()*2-1)*this.width*scatter;
var rotation=this.followPath?angle:0;
rotation+=(Math.random()*2-1)*((this.angleJitter||0)*Math.PI/180);
var ctx=this._offscreenCtx;
ctx.save();
ctx.globalAlpha=this.opacity;
ctx.translate(x,y);
ctx.rotate(rotation);
ctx.drawImage(this.tipCanvas,-this.tipCanvas.width/2,-this.tipCanvas.height/2);
ctx.restore();
},
_render:function(){}
});

root.fabric.TaperBrush=root.fabric.util.createClass(root.fabric.BaseBrush,{
type:"taper",
initialize:function(canvas,preset){
this.canvas=canvas;
this.points=[];
this._offscreenCanvas=null;
this._offscreenCtx=null;
applyPreset(this,preset||root.NaiBrushPresets.get("ink-taper"));
},
_initOffscreen:function(){
if(!this._offscreenCanvas){
this._offscreenCanvas=document.createElement("canvas");
this._offscreenCanvas.width=this.canvas.width;
this._offscreenCanvas.height=this.canvas.height;
this._offscreenCtx=this._offscreenCanvas.getContext("2d");
}
},
_copyToContextTop:function(){
var ctx=this.canvas.contextTop;
ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
ctx.drawImage(this._offscreenCanvas,0,0);
},
onMouseDown:function(pointer){
this._initOffscreen();
this._offscreenCtx.clearRect(0,0,this._offscreenCanvas.width,this._offscreenCanvas.height);
this.points=[pointer];
this._drawStroke();
},
onMouseMove:function(pointer){
this.points.push(pointer);
if(this.points.length>3&&this.smoothing>0){
var last=this.points.length-1;
var amount=this.smoothing;
this.points[last]={
x:this.points[last-1].x*(1-amount)+pointer.x*amount,
y:this.points[last-1].y*(1-amount)+pointer.y*amount
};
}
this._drawStroke();
},
onMouseUp:function(){
this._drawStroke();
this.points=[];
},
_radiusAt:function(index,total){
if(total<=1)return this.width/2;
var t=index/Math.max(1,total-1);
var start=1-this.taperStart;
var end=1-this.taperEnd;
var scale=1;
if(t<this.taperStart&&this.taperStart>0)scale=Math.max(0.12,t/this.taperStart);
else if(t>1-this.taperEnd&&this.taperEnd>0)scale=Math.max(0.12,(1-t)/this.taperEnd);
return (this.width/2)*clamp(scale,0.12,Math.max(start,end,1));
},
_drawStroke:function(){
if(!this._offscreenCtx||this.points.length===0)return;
var ctx=this._offscreenCtx;
ctx.clearRect(0,0,this._offscreenCanvas.width,this._offscreenCanvas.height);
ctx.save();
ctx.lineCap="round";
ctx.lineJoin="round";
ctx.strokeStyle=this.color;
ctx.fillStyle=this.color;
ctx.globalAlpha=this.opacity;
var i;
for(i=0;i<this.points.length;i++){
var point=this.points[i];
var radius=this._radiusAt(i,this.points.length);
ctx.beginPath();
ctx.arc(point.x,point.y,Math.max(0.6,radius),0,Math.PI*2);
ctx.fill();
if(i>0){
var previous=this.points[i-1];
ctx.beginPath();
ctx.lineWidth=Math.max(1.2,radius*2);
ctx.moveTo(previous.x,previous.y);
ctx.lineTo(point.x,point.y);
ctx.stroke();
}
}
ctx.restore();
this._copyToContextTop();
},
_render:function(){}
});
}

function getCustomBrush(preset){
var targetCanvas=(typeof canvas!=="undefined"&&canvas)||root.canvas;
var settings=root.NaiBrushPresets.normalize(preset||root.NaiBrushPresets.get("ink-taper"));
var brush;
if(settings.engine==="stamp"){
brush=new root.fabric.CustomStampBrush(targetCanvas,settings);
}else{
brush=new root.fabric.TaperBrush(targetCanvas,settings);
}
if(typeof enhanceBrush==="function")brush=enhanceBrush(brush,true);
return brush;
}

root.NaiCustomBrush={
makeTipCanvas:makeTipCanvas,
loadTipImage:loadTipImage,
applyPreset:applyPreset,
getCustomBrush:getCustomBrush
};
})(typeof window!=="undefined"?window:globalThis);
