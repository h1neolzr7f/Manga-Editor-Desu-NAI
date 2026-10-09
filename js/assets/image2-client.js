(function(root){
"use strict";
var providers=Object.create(null);
// Output stays in memory until durable storage succeeds. Retrying storage never generates again.
var pendingResults=new Map();
var EXTENSIONS={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'};
function clone(value){return JSON.parse(JSON.stringify(value));}
function register(provider){
if(!provider||!provider.id||typeof provider.generate!=='function')throw new Error('Image2 Provider 需要 id 和 generate 函数。');
providers[provider.id]=provider;return provider;
}
function get(id){return providers[id]||null;}
function list(){return Object.keys(providers).map(function(id){return {id:id,name:providers[id].name||id};});}
function uniqueName(store,base,extension){
var stem=String(base||'generated_asset').replace(/\.(png|jpe?g|webp|gif)$/i,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'generated_asset';
var suffix=extension||'.png';var candidate=stem+suffix;var index=1;
while(store.list().some(function(asset){return asset.name.toLowerCase()===candidate.toLowerCase();})){candidate=stem+'_'+index+suffix;index+=1;}
return candidate;
}
function imageFile(result){
if(!result)return Promise.reject(new Error('Image2 Provider 未返回素材。'));
if(result.file&&typeof result.file.arrayBuffer==='function')return Promise.resolve(result.file);
var value=result.image;
if(value&&typeof value.arrayBuffer==='function')return Promise.resolve(value);
if(typeof value!=='string')return Promise.reject(new Error('Image2 Provider 未返回素材文件。'));
var match=/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/i.exec(value);
if(match){
if(match[2].length>Math.ceil(50*1024*1024*4/3)+4)return Promise.reject(new Error('Image2 素材超过大小限制。'));
try{var binary=atob(match[2]);var bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return Promise.resolve(new Blob([bytes],{type:match[1].toLowerCase()}));}
catch(error){return Promise.reject(new Error('Image2 返回的素材数据无效。'));}
}
// Download output without forwarding session credentials; adapter credentials never enter jobs.
if(/^https?:\/\//i.test(value)&&typeof fetch==='function')return fetch(value,{credentials:'omit'}).then(function(response){if(!response.ok)throw new Error('素材下载失败。');return response.blob();});
return Promise.reject(new Error('Image2 返回的素材格式不受支持。'));
}
function validateFile(file){
var mime=String(file&&file.type||'').toLowerCase();
if(!EXTENSIONS[mime]||!file.size||file.size>50*1024*1024)throw new Error('Image2 返回的素材格式或大小不受支持。');
return file.arrayBuffer().then(function(buffer){
var bytes=new Uint8Array(buffer);
var header=Array.from(bytes.slice(0,12)).map(function(value){return String.fromCharCode(value);}).join('');
var valid=mime==='image/png'?header.slice(0,8)==='\x89PNG\r\n\x1a\n':mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/gif'?/^GIF8[79]a/.test(header):header.slice(0,4)==='RIFF'&&header.slice(8,12)==='WEBP';
if(!valid)throw new Error('Image2 返回的素材数据无效。');
return file;
});
}
function prepareOutput(pending){
if(pending.file)return Promise.resolve(pending);
return imageFile(pending.result).then(validateFile).then(function(file){pending.file=file;return pending;});
}
function safeSource(value){
// Signed URLs and embedded credentials are not part of persistent provenance.
var match=/^(https?:\/\/)([^/?#]+)([^?#]*)/i.exec(String(value||''));
return match?match[1]+match[2].replace(/^.*@/,'')+match[3]:'';
}
function addResultToAssets(job,pending){
var store=root.NaiComicAssetStoreDefault;
if(!store||typeof store.persistGenerated!=='function')return Promise.reject(new Error('素材库持久化尚未就绪。'));
return Promise.resolve().then(function(){
var file=pending.file;
var name=uniqueName(store,job.assetName,EXTENSIONS[file.type.toLowerCase()]);
var result=pending.result;
var record={name:name,type:'image',mime:file.type.toLowerCase(),size:file.size,width:job.width,height:job.height,sourceType:'generated',creator:'Image2 Provider',sourceUrl:safeSource(result.sourceUrl),tags:Array.from(new Set(job.tags.concat(job.transparent?['transparent']:[]))),license:{type:'project-original',source:'Image2 generation record '+job.id,publicAllowed:true},thumbnail:/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(result.thumbnail||'')?result.thumbnail:'',path:''};
var registered=store.register(record,file);
return store.persistGenerated(registered.asset,file).catch(function(){store.remove(registered.asset.id);throw new Error('生成素材保存失败，请手动重试保存。');});
});
}
function Client(options){this.jobs=(options&&options.jobs)||root.NaiImage2JobStoreDefault;}
Client.prototype.run=function(job,storageOnly){
var self=this;
if(!job||job.status==='running'||job.status==='succeeded')return Promise.reject(new Error('Image2 任务正在执行或已经完成。'));
var provider=get(job.providerId);
if(!storageOnly&&!provider){self.jobs.update(job.id,{status:'failed',error:'Image2 Provider 未配置。',failureStage:'generation'});return Promise.reject(new Error('Image2 Provider 未配置。'));}
if(storageOnly&&!pendingResults.has(job.id))return Promise.reject(new Error('生成结果已不在内存中，无法重试保存。请检查素材库后创建新任务。'));
self.jobs.update(job.id,{status:'running',attempts:job.attempts+(storageOnly?0:1),error:'',failureStage:storageOnly?'persistence':'generation'});
var output=storageOnly?Promise.resolve(pendingResults.get(job.id)):Promise.resolve().then(function(){return provider.generate(clone(self.jobs.get(job.id)));}).then(function(result){
if(!result||(!result.image&&!result.file))throw new Error('Image2 Provider 未返回素材。');
var pending={result:result,file:null};pendingResults.set(job.id,pending);self.jobs.update(job.id,{failureStage:'persistence'});return pending;
});
return output.then(prepareOutput).then(function(pending){return addResultToAssets(job,pending).then(function(asset){
self.jobs.update(job.id,{status:'succeeded',resultAssetId:asset.id,error:'',failureStage:''});pendingResults.delete(job.id);return {job:self.jobs.get(job.id),asset:asset,result:pending.result};
});}).catch(function(){
var current=self.jobs.get(job.id);var persistence=current.failureStage==='persistence';
var message=persistence?'生成素材保存失败，请手动重试保存。':'Image2 生成失败，请检查 Provider 设置后手动重试。';
// Never store or surface raw provider exceptions: they can contain authorization headers.
self.jobs.update(job.id,{status:'failed',error:message});throw new Error(message);
});
};
Client.prototype.submit=function(input){return this.run(this.jobs.create(input||{}),false);};
Client.prototype.retry=function(id){var job=this.jobs.get(id);if(!job)return Promise.reject(new Error('Image2 任务不存在。'));if(job.status!=='failed')return Promise.reject(new Error('只有失败的 Image2 任务可以重试。'));return this.run(job,job.failureStage==='persistence');};
root.NaiImage2ProviderRegistry={register:register,get:get,list:list};
root.NaiImage2Client=Client;
root.NaiImage2UniqueName=uniqueName;
})(typeof window!=='undefined'?window:globalThis);
