(function(root){
"use strict";

function objectHeight(object){
if(object&&typeof object.getScaledHeight==='function')return object.getScaledHeight();
return (Number(object&&object.height)||0)*(Number(object&&object.scaleY)||1);
}
function objectTop(object){return Number(object&&object.top)||0;}

function paginateGroup(group,pageHeight){
var height=Number(group&&group.height)||0;
var limit=Math.max(1,Number(pageHeight)||1800);
if(height<=limit)return [{top:0,height:height,index:0}];
var objects=group&&typeof group.getObjects==='function'?group.getObjects():[];
var pages=[];
var start=0;
var boundary=limit;
objects.forEach(function(object,index){
var top=objectTop(object),bottom=top+objectHeight(object);
if(index>0&&bottom>boundary&&top>start){pages.push({top:start,height:Math.max(1,top-start),index:pages.length});start=top;boundary=start+limit;}
while(bottom>boundary){pages.push({top:start,height:Math.max(1,boundary-start),index:pages.length});start=boundary;boundary=start+limit;}
});
if(start<height)pages.push({top:start,height:height-start,index:pages.length});
return pages;
}

function downloadDataUrl(dataUrl,filename){
if(typeof document==='undefined')return false;
var link=document.createElement('a');link.href=dataUrl;link.download=filename;link.click();return true;
}

function capturePages(canvas,group,pageHeight,baseName,download){
if(!canvas||!group)throw new Error('Canvas 或模拟器对象不可用。');
var bounds=group.getBoundingRect(true,true),scale=Number(group.scaleY)||1,pages=paginateGroup(group,pageHeight),name=baseName||'simulator';
var outputs=pages.map(function(page){
var data=canvas.toDataURL({format:'png',left:Math.max(0,bounds.left),top:Math.max(0,bounds.top+page.top*scale),width:bounds.width,height:Math.max(1,page.height*scale),multiplier:1});
return {index:page.index,top:page.top,height:page.height,dataUrl:data,filename:name+'_'+String(page.index+1).padStart(3,'0')+'.png'};
});
if(download)outputs.forEach(function(item){downloadDataUrl(item.dataUrl,item.filename);});
return outputs;
}

function exportPages(canvas,group,pageHeight,baseName){return capturePages(canvas,group,pageHeight,baseName,true);}
root.NaiComicLongShot={paginateGroup:paginateGroup,capturePages:capturePages,exportPages:exportPages,downloadDataUrl:downloadDataUrl};
})(typeof window!=='undefined'?window:globalThis);
