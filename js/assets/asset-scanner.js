(function(root){
"use strict";

var MIME_TYPES={'image/png':true,'image/jpeg':true,'image/webp':true,'image/gif':true,'image/svg+xml':true};
var MAX_FILE_SIZE=50*1024*1024;

function hashBytes(bytes){
var hash=2166136261;
for(var i=0;i<bytes.length;i++){hash^=bytes[i];hash=Math.imul(hash,16777619);}
return ('00000000'+(hash>>>0).toString(16)).slice(-8);
}

function readArrayBuffer(file){
if(file&&typeof file.arrayBuffer==='function')return file.arrayBuffer();
return Promise.reject(new Error('当前浏览器不支持读取素材文件。'));
}

function hashFile(file){
return readArrayBuffer(file).then(function(buffer){
var bytes=new Uint8Array(buffer);
if(root.crypto&&root.crypto.subtle&&typeof root.crypto.subtle.digest==='function'){
return root.crypto.subtle.digest('SHA-256',buffer).then(function(digest){
return Array.from(new Uint8Array(digest)).map(function(value){return value.toString(16).padStart(2,'0');}).join('');
});
}
return hashBytes(bytes);
});
}

function fileDataUrl(file){
return new Promise(function(resolve,reject){
var reader=new FileReader();
reader.onload=function(event){resolve(event.target.result);};
reader.onerror=function(){reject(new Error('读取素材失败。'));};
reader.readAsDataURL(file);
});
}

function thumbnail(file,maxSize){
var size=Number(maxSize)||240;
if(typeof document==='undefined'||typeof FileReader==='undefined')return Promise.resolve('');
return fileDataUrl(file).then(function(dataUrl){
return new Promise(function(resolve){
var image=new Image();
image.onload=function(){
var scale=Math.min(size/image.width,size/image.height,1);
var canvas=document.createElement('canvas');
canvas.width=Math.max(1,Math.round(image.width*scale));
canvas.height=Math.max(1,Math.round(image.height*scale));
var context=canvas.getContext('2d');
if(!context){resolve('');return;}
context.drawImage(image,0,0,canvas.width,canvas.height);
resolve(canvas.toDataURL('image/jpeg',.78));
};
image.onerror=function(){resolve('');};
image.src=dataUrl;
});
});
}

function inspect(file,options){
var opts=options||{};
if(!file) return Promise.reject(new Error('素材文件为空。'));
var mime=String(file.type||'').toLowerCase();
if(!MIME_TYPES[mime])return Promise.reject(new Error('不支持的素材类型：'+(mime||'unknown')));
if(Number(file.size||0)>Number(opts.maxSize||MAX_FILE_SIZE))return Promise.reject(new Error('素材超过大小限制。'));
return Promise.all([hashFile(file),thumbnail(file,opts.thumbnailSize)]).then(function(result){
var name=String(file.name||'asset');
var path=String(file.webkitRelativePath||name);
var record={
name:name,type:'image',path:path,relativePath:path,mime:mime,size:Number(file.size||0),hash:result[0],thumbnail:result[1],
sourceType:opts.sourceType||'imported',creator:opts.creator||'',license:opts.license||{type:'unknown',publicAllowed:false},tags:opts.tags||[]
};
return {record:record,file:file,thumbnail:result[1]};
});
}

function scan(files,options){
var list=Array.from(files||[]);
var accepted=[];
var rejected=[];
return Promise.all(list.map(function(file){
return inspect(file,options).then(function(value){accepted.push(value);}).catch(function(error){rejected.push({file:file,error:error.message});});
})).then(function(){return {accepted:accepted,rejected:rejected};});
}

root.NaiComicAssetScanner={
MAX_FILE_SIZE:MAX_FILE_SIZE,
hashFile:hashFile,
thumbnail:thumbnail,
inspect:inspect,
scan:scan
};
})(typeof window!=='undefined'?window:globalThis);
