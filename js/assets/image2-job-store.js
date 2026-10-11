(function(root){
"use strict";
var KEY='nai_comic_image2_jobs_v1';
var STATUSES=['queued','running','succeeded','failed'];
function clone(value){return JSON.parse(JSON.stringify(value));}
function storage(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch(error){return null;}}
function safeText(value){
return String(value||'').replace(/\b(?:Bearer\s+|sk-)[a-zA-Z0-9._~+\/-]+/gi,'[redacted]').replace(/((?:api[_-]?key|access[_-]?token|authorization|password|secret)\s*[=:]\s*)[^\s&,;]+/gi,'$1[redacted]');
}
function positive(value,fallback){var number=Number(value);return Number.isFinite(number)&&number>0?number:fallback;}
function normalize(input){
var value=input||{},now=new Date().toISOString();
return {id:safeText(value.id),status:STATUSES.indexOf(value.status)>=0?value.status:'queued',prompt:safeText(value.prompt),negativePrompt:safeText(value.negativePrompt),width:positive(value.width,1024),height:positive(value.height,1024),transparent:value.transparent===true,tags:Array.isArray(value.tags)?value.tags.map(safeText):['original','image2'],assetName:safeText(value.assetName)||'generated_asset',providerId:safeText(value.providerId),attempts:Math.max(0,Math.floor(Number(value.attempts)||0)),error:safeText(value.error),failureStage:value.failureStage==='persistence'?'persistence':value.failureStage==='generation'?'generation':'',createdAt:safeText(value.createdAt)||now,updatedAt:safeText(value.updatedAt)||now,resultAssetId:safeText(value.resultAssetId)};
}
function JobStore(){this.jobs=[];this.load();}
JobStore.prototype.load=function(){
var target=storage();if(!target)return this;
try{var raw=target.getItem(KEY);if(raw){var parsed=JSON.parse(raw);this.jobs=Array.isArray(parsed)?parsed.filter(function(job){return job&&job.id;}).map(function(value){var job=normalize(value);if(job.status==='running'||job.status==='queued'){job.status='failed';job.error='任务已中断，请手动重试。';job.failureStage=job.failureStage||'generation';}return job;}):[];this.save();}}catch(error){this.jobs=[];}
return this;
};
JobStore.prototype.save=function(){var target=storage();if(target){try{target.setItem(KEY,JSON.stringify(this.jobs));}catch(error){}}return this;};
JobStore.prototype.create=function(input){
var job=normalize(Object.assign({},input||{},{id:'image2_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),status:'queued',attempts:0,error:'',failureStage:'',resultAssetId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
this.jobs.unshift(job);this.save();return clone(job);
};
JobStore.prototype.update=function(id,patch){
var index=this.jobs.findIndex(function(item){return item.id===id;});if(index<0)return null;
var previous=this.jobs[index];var next=normalize(Object.assign({},previous,patch||{},{id:previous.id,createdAt:previous.createdAt,updatedAt:new Date().toISOString()}));
this.jobs[index]=next;this.save();return clone(next);
};
JobStore.prototype.get=function(id){var job=this.jobs.find(function(item){return item.id===id;});return job?clone(job):null;};
JobStore.prototype.list=function(){return this.jobs.map(clone);};
root.NaiImage2JobStore=JobStore;
root.NaiImage2JobStoreDefault=new JobStore();
})(typeof window!=='undefined'?window:globalThis);
